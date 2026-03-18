/**
 * Request Throttler — Phase 3 (T-3.4).
 *
 * AIMD-style rate limiter for AI API calls. Manages concurrency limits,
 * minimum delay between requests, and adaptive backoff on 429 responses.
 * Includes exponential-backoff retry for transient errors.
 */

// ─── Retryable Error Patterns ───────────────────────────────

const RETRYABLE_PATTERNS = [
  'empty response',
  'failed to parse',
  'rate limit',
  'fetch failed',
  'network',
  'econnreset',
  'timeout',
];

function isRetryable(error: Error): boolean {
  const msg = error.message.toLowerCase();
  return RETRYABLE_PATTERNS.some((p) => msg.includes(p));
}

// ─── RequestThrottler Class ─────────────────────────────────

export class RequestThrottler {
  private _maxConcurrent: number;
  private _minDelayMs: number;
  private readonly _originalMaxConcurrent: number;
  private readonly _originalMinDelayMs: number;
  private _activeRequests = 0;
  private _lastRequestTime = 0;
  private _enabled = true;
  private _queue: Array<() => void> = [];

  constructor(maxConcurrent = 2, minDelayMs = 500) {
    this._maxConcurrent = maxConcurrent;
    this._minDelayMs = minDelayMs;
    this._originalMaxConcurrent = maxConcurrent;
    this._originalMinDelayMs = minDelayMs;
  }

  async throttle<T>(fn: () => Promise<T>): Promise<T> {
    if (!this._enabled) return fn();

    await this._acquireSlot();
    await this._waitForDelay();

    this._lastRequestTime = Date.now();
    try {
      return await fn();
    } finally {
      this._activeRequests--;
      this._releaseNext();
    }
  }

  async mapThrottled<T, R>(items: T[], fn: (item: T) => Promise<R>): Promise<R[]> {
    const results: R[] = [];
    for (const item of items) {
      results.push(await this.throttle(() => fn(item)));
    }
    return results;
  }

  setEnabled(enabled: boolean): void {
    this._enabled = enabled;
  }

  /** AIMD: multiplicative decrease on 429 */
  on429(): void {
    this._maxConcurrent = Math.max(1, Math.floor(this._maxConcurrent / 2));
    this._minDelayMs = this._minDelayMs * 2;
  }

  /** AIMD: additive increase on success */
  onSuccess(): void {
    if (this._minDelayMs > this._originalMinDelayMs) {
      this._minDelayMs = Math.max(this._originalMinDelayMs, this._minDelayMs * 0.9);
    }
    if (this._maxConcurrent < this._originalMaxConcurrent) {
      this._maxConcurrent = Math.min(this._originalMaxConcurrent, this._maxConcurrent + 1);
    }
  }

  getState(): { maxConcurrent: number; minDelayMs: number; activeRequests: number } {
    return {
      maxConcurrent: this._maxConcurrent,
      minDelayMs: this._minDelayMs,
      activeRequests: this._activeRequests,
    };
  }

  // ─── Private ──────────────────────────────────────────────

  private _acquireSlot(): Promise<void> {
    if (this._activeRequests < this._maxConcurrent) {
      this._activeRequests++;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      this._queue.push(() => {
        this._activeRequests++;
        resolve();
      });
    });
  }

  private _waitForDelay(): Promise<void> {
    const elapsed = Date.now() - this._lastRequestTime;
    const remaining = this._minDelayMs - elapsed;
    if (remaining <= 0) return Promise.resolve();
    return new Promise<void>((resolve) => setTimeout(resolve, remaining));
  }

  private _releaseNext(): void {
    if (this._queue.length > 0) {
      const next = this._queue.shift()!;
      next();
    }
  }
}

// ─── withRetry ──────────────────────────────────────────────

export async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxRetries = 3,
  baseDelayMs = 1000,
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));

      if (!isRetryable(error)) throw error;

      if (attempt === maxRetries) {
        throw new Error(`[${label}] Failed after ${maxRetries} retries: ${error.message}`);
      }

      const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
      console.warn(`[${label}] Retry ${attempt}/${maxRetries}: ${error.message} (waiting ${delayMs}ms)`);
      await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw new Error(`[${label}] Unexpected: exhausted retries`);
}

// ─── Default Instance ───────────────────────────────────────

export const apiThrottler = new RequestThrottler(2, 500);
