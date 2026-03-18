import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RequestThrottler, withRetry } from './throttler';

// ─── RequestThrottler ───────────────────────────────────────

describe('RequestThrottler', () => {
  // ─── throttle basics (fake timers) ─────────────────────

  it('executes function and returns result', async () => {
    vi.useFakeTimers();
    const throttler = new RequestThrottler(2, 50);
    const promise = throttler.throttle(() => Promise.resolve(42));
    await vi.advanceTimersByTimeAsync(100);
    expect(await promise).toBe(42);
    vi.useRealTimers();
  });

  it('propagates errors from throttled function', async () => {
    const throttler = new RequestThrottler(2, 0);
    await expect(throttler.throttle(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
  });

  // ─── minimum delay (real timers, short delay) ──────────

  it('enforces minimum delay between calls', async () => {
    const throttler = new RequestThrottler(2, 30);
    const timestamps: number[] = [];
    const fn = async () => {
      timestamps.push(Date.now());
      return 'ok';
    };

    await throttler.throttle(fn);
    await throttler.throttle(fn);

    expect(timestamps).toHaveLength(2);
    const gap = timestamps[1] - timestamps[0];
    expect(gap).toBeGreaterThanOrEqual(25); // allow small timing variance
  });

  // ─── concurrency limit (real timers) ───────────────────

  it('limits concurrent executions to maxConcurrent', async () => {
    const throttler = new RequestThrottler(2, 0); // no delay, just concurrency
    let running = 0;
    let maxRunning = 0;

    const fn = async () => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((r) => setTimeout(r, 20));
      running--;
      return 'done';
    };

    await Promise.all([
      throttler.throttle(fn),
      throttler.throttle(fn),
      throttler.throttle(fn),
      throttler.throttle(fn),
    ]);

    expect(maxRunning).toBeLessThanOrEqual(2);
  });

  // ─── mapThrottled (fake timers) ────────────────────────

  it('mapThrottled processes all items in order', async () => {
    vi.useFakeTimers();
    const throttler = new RequestThrottler(2, 10);
    const results: number[] = [];
    const promise = throttler.mapThrottled([1, 2, 3], async (n) => {
      results.push(n);
      return n * 10;
    });

    await vi.advanceTimersByTimeAsync(200);
    const mapped = await promise;

    expect(results).toEqual([1, 2, 3]);
    expect(mapped).toEqual([10, 20, 30]);
    vi.useRealTimers();
  });

  it('mapThrottled respects throttle limits', async () => {
    const throttler = new RequestThrottler(1, 0);
    let running = 0;
    let maxRunning = 0;

    await throttler.mapThrottled([1, 2, 3], async (n) => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((r) => setTimeout(r, 5));
      running--;
      return n;
    });

    expect(maxRunning).toBe(1);
  });

  // ─── setEnabled ─────────────────────────────────────────

  it('setEnabled(false) bypasses all throttling', async () => {
    const throttler = new RequestThrottler(1, 200);
    throttler.setEnabled(false);

    const start = Date.now();
    await throttler.throttle(() => Promise.resolve('a'));
    await throttler.throttle(() => Promise.resolve('b'));
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(50);
  });

  // ─── AIMD backoff ──────────────────────────────────────

  it('on429 halves maxConcurrent and doubles minDelay', () => {
    const throttler = new RequestThrottler(2, 50);
    throttler.on429();
    expect(throttler.getState().maxConcurrent).toBe(1);
    expect(throttler.getState().minDelayMs).toBe(100);
  });

  it('on429 does not reduce maxConcurrent below 1', () => {
    const throttler = new RequestThrottler(2, 50);
    throttler.on429(); // 2→1
    throttler.on429(); // stays 1
    expect(throttler.getState().maxConcurrent).toBe(1);
  });

  it('onSuccess gradually recovers toward original values', () => {
    const throttler = new RequestThrottler(2, 50);
    throttler.on429(); // maxConcurrent=1, minDelay=100
    throttler.onSuccess();
    const state = throttler.getState();
    expect(state.minDelayMs).toBeLessThanOrEqual(100);
    expect(state.minDelayMs).toBeGreaterThanOrEqual(50);
  });
});

// ─── withRetry ──────────────────────────────────────────────

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('succeeds on first attempt if no error', async () => {
    const result = await withRetry(() => Promise.resolve('ok'), 'test');
    expect(result).toBe('ok');
  });

  it('retries on retryable error and succeeds', async () => {
    let attempt = 0;
    const fn = async () => {
      attempt++;
      if (attempt < 3) throw new Error('Rate limit exceeded');
      return 'success';
    };

    const promise = withRetry(fn, 'retry-test', 3, 10);
    await vi.advanceTimersByTimeAsync(100);
    const result = await promise;

    expect(result).toBe('success');
    expect(attempt).toBe(3);
  });

  it('gives up after maxRetries', async () => {
    const fn = async () => {
      throw new Error('Rate limit exceeded');
    };

    const promise = withRetry(fn, 'fail-test', 3, 10).catch((e: Error) => e);
    await vi.advanceTimersByTimeAsync(200);
    const error = await promise;
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain('[fail-test] Failed after 3 retries');
  });

  it('does NOT retry on non-retryable error', async () => {
    let attempt = 0;
    const fn = async () => {
      attempt++;
      throw new Error('TypeError: cannot read property');
    };

    await expect(withRetry(fn, 'no-retry', 3, 10)).rejects.toThrow('cannot read property');
    expect(attempt).toBe(1);
  });

  it('uses exponential backoff (verify increasing delays)', async () => {
    const delays: number[] = [];
    let lastTime = Date.now();
    let attempt = 0;

    const fn = async () => {
      const now = Date.now();
      if (attempt > 0) delays.push(now - lastTime);
      lastTime = now;
      attempt++;
      if (attempt <= 3) throw new Error('empty response');
      return 'ok';
    };

    const promise = withRetry(fn, 'backoff-test', 4, 100);
    await vi.advanceTimersByTimeAsync(2000);
    await promise;

    expect(delays.length).toBe(3);
    expect(delays[0]).toBeGreaterThanOrEqual(90);  // ~100ms
    expect(delays[1]).toBeGreaterThanOrEqual(180); // ~200ms
    expect(delays[2]).toBeGreaterThanOrEqual(360); // ~400ms
  });

  it('includes label in error messages', async () => {
    const fn = async () => {
      throw new Error('Rate limit exceeded');
    };

    const promise = withRetry(fn, 'my-operation', 2, 10).catch((e: Error) => e);
    await vi.advanceTimersByTimeAsync(100);
    const error = await promise;
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain('[my-operation]');
  });

  it('retries on known retryable error patterns', async () => {
    const retryableErrors = [
      'empty response from API',
      'Failed to parse response',
      'Rate limit exceeded',
      'fetch failed',
      'network error occurred',
      'ECONNRESET',
      'timeout waiting for response',
    ];

    for (const errMsg of retryableErrors) {
      let attempt = 0;
      const fn = async () => {
        attempt++;
        if (attempt < 2) throw new Error(errMsg);
        return 'ok';
      };

      const promise = withRetry(fn, 'retry-pattern', 3, 10);
      await vi.advanceTimersByTimeAsync(50);
      const result = await promise;
      expect(result).toBe('ok');
    }
  });
});
