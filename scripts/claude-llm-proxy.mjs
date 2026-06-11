#!/usr/bin/env node
/**
 * Claude-LLM Proxy — local headless LLM backend for FRAME.
 *
 * Stands up a tiny HTTP server that speaks the OpenAI / Azure OpenAI
 * `chat/completions` protocol the app's `callAI()` (src/services/ai/aiClient.ts)
 * already uses, but answers each request by shelling out to the local
 * `claude` CLI in headless print mode (Sonnet). This lets you exercise every
 * LLM call site in the app — pipeline stages, BRP estimator, initiative flow,
 * doc-intel, chat — and eyeball the real inputs/outputs BEFORE pointing the app
 * at the live UBS/Azure endpoint.
 *
 * It accepts BOTH URL shapes so the app works as either provider:
 *   - Azure:  POST /openai/deployments/:deployment/chat/completions   (api-key header)
 *   - OpenAI: POST /chat/completions                                  (Bearer header)
 *
 * Every call is logged to the console AND appended as one JSON line to
 * .llm-proxy/calls.jsonl for review.
 *
 * Run:  node scripts/claude-llm-proxy.mjs       (or: npm run proxy)
 * Env:  LLM_PROXY_PORT (default 8787), CLAUDE_MODEL (default 'sonnet')
 */

import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdirSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PORT = Number(process.env.LLM_PROXY_PORT) || 8787;
const MODEL = process.env.CLAUDE_MODEL || 'sonnet';
// The local `claude` CLI is far slower than a real Azure endpoint. Normal stages
// finish in ~15–66s, but the heaviest (Mandatory: 2 Mermaid diagrams + 10–15 user
// stories + assembled epic; Coherence: whole-document review) need several minutes.
// 180s wasn't enough — they 502'd and aborted the pipeline. 600s gives them room.
const CALL_TIMEOUT_MS = Number(process.env.LLM_PROXY_TIMEOUT_MS) || 600_000;
// Cap concurrent `claude` subprocesses. The app's pipeline fans out many calls at
// once (classification ensemble, per-section structural calls, …); against a real
// Azure endpoint that's fine, but here each call spawns a `claude` CLI process.
// Running several heavy ones together starves the machine (and the Vite dev server,
// whose HMR socket then drops and force-reloads the page mid-run). Serialising to 1
// keeps each call as fast as possible and the environment stable; raise it via env
// (e.g. LLM_PROXY_CONCURRENCY=2) when you want more throughput on a beefier box.
const MAX_CONCURRENCY = Number(process.env.LLM_PROXY_CONCURRENCY) || 1;
const LOG_DIR = join(process.cwd(), '.llm-proxy');
const LOG_FILE = join(LOG_DIR, 'calls.jsonl');

try { mkdirSync(LOG_DIR, { recursive: true }); } catch { /* ignore */ }

// Minimal FIFO semaphore. `active` counts in-flight claude calls; queued
// requests park their resolver in `waiters` and are released in order.
let active = 0;
const waiters = [];
function acquireSlot() {
  if (active < MAX_CONCURRENCY) { active++; return Promise.resolve(); }
  return new Promise((resolve) => waiters.push(resolve));
}
function releaseSlot() {
  const next = waiters.shift();
  if (next) next();        // hand the slot straight to the next waiter
  else active--;           // otherwise free it
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, api-key, x-api-key',
  'Access-Control-Max-Age': '86400',
};

let callSeq = 0;

/** Strip ```json … ``` / ``` … ``` fences a chat model sometimes adds. */
function stripFences(text) {
  const t = text.trim();
  const m = t.match(/^```(?:json|JSON)?\s*\n?([\s\S]*?)\n?```$/);
  return m ? m[1].trim() : t;
}

/** Invoke the local claude CLI headlessly. Returns { content, usage, durationMs }. */
function callClaude({ system, user, wantsJson }) {
  return new Promise((resolve, reject) => {
    const sys = wantsJson
      ? `${system}\n\nIMPORTANT: Respond with ONLY the requested content — no preamble, no explanation, no markdown code fences. Output raw JSON only.`
      : `${system}\n\nIMPORTANT: Respond with ONLY the requested content — no preamble, no meta-commentary. Do not use any tools; answer directly from the prompt.`;

    const args = [
      '--print',
      '--model', MODEL,
      '--output-format', 'json',
      '--system-prompt', sys,
    ];

    // Neutral cwd so Claude Code doesn't treat the app repo as a coding task.
    const child = spawn('claude', args, {
      cwd: tmpdir(),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
    });

    let out = '';
    let err = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`claude call timed out after ${CALL_TIMEOUT_MS}ms`));
    }, CALL_TIMEOUT_MS);

    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { err += d; });
    child.on('error', (e) => { clearTimeout(timer); reject(e); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`claude exited ${code}: ${err.slice(0, 500)}`));
        return;
      }
      try {
        const parsed = JSON.parse(out);
        const content = stripFences(String(parsed.result ?? ''));
        const u = parsed.usage || {};
        resolve({
          content,
          durationMs: parsed.duration_ms ?? null,
          usage: {
            prompt_tokens: u.input_tokens ?? 0,
            completion_tokens: u.output_tokens ?? 0,
            total_tokens: (u.input_tokens ?? 0) + (u.output_tokens ?? 0),
          },
        });
      } catch (e) {
        // Not JSON envelope — treat raw stdout as the answer.
        resolve({ content: stripFences(out), durationMs: null, usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } });
      }
    });

    child.stdin.write(user);
    child.stdin.end();
  });
}

function send(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json', ...CORS_HEADERS });
  res.end(body);
}

function snippet(s, n = 200) {
  const one = String(s ?? '').replace(/\s+/g, ' ').trim();
  return one.length > n ? one.slice(0, n) + '…' : one;
}

const server = createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  // Strip query string (Azure appends ?api-version=…) before routing.
  const path = req.url.split('?')[0];

  if (req.method === 'GET' && path === '/health') {
    send(res, 200, { ok: true, model: MODEL });
    return;
  }

  if (req.method !== 'POST' || !path.endsWith('/chat/completions')) {
    send(res, 404, { error: { message: `No route for ${req.method} ${req.url}` } });
    return;
  }

  let raw = '';
  req.on('data', (c) => { raw += c; });
  req.on('end', async () => {
    const id = ++callSeq;
    let payload;
    try {
      payload = JSON.parse(raw || '{}');
    } catch {
      send(res, 400, { error: { message: 'Invalid JSON body' } });
      return;
    }

    const messages = Array.isArray(payload.messages) ? payload.messages : [];
    const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
    const userParts = messages
      .filter((m) => m.role !== 'system')
      .map((m) => (m.role === 'user' ? m.content : `[${m.role}]: ${m.content}`));
    const user = userParts.join('\n\n');
    const wantsJson = payload.response_format?.type === 'json_object'
      || payload.response_format?.type === 'json_schema';

    // Derive a friendly call-site label from the URL (azure deployment) for logs.
    const depMatch = path.match(/deployments\/([^/]+)\//);
    const label = depMatch ? depMatch[1] : 'openai';

    console.log(`\n→ [#${id}] LLM call (${label})  json=${wantsJson}`);
    console.log(`    sys:  ${snippet(system)}`);
    console.log(`    user: ${snippet(user)}`);
    if (active >= MAX_CONCURRENCY) console.log(`    (queued — ${waiters.length + 1} waiting, ${active} active)`);

    await acquireSlot();
    const startedAt = Date.now();

    try {
      const { content, usage, durationMs } = await callClaude({ system, user, wantsJson });
      const wallMs = Date.now() - startedAt;
      console.log(`← [#${id}] ${content ? 'OK' : 'EMPTY'}  ${usage.completion_tokens}tok  ${durationMs ?? wallMs}ms`);
      console.log(`    resp: ${snippet(content, 300)}`);

      try {
        appendFileSync(LOG_FILE, JSON.stringify({
          id, label, wantsJson, system, user, response: content, usage, wallMs,
        }) + '\n');
      } catch { /* ignore log errors */ }

      send(res, 200, {
        id: `chatcmpl-claude-${id}`,
        object: 'chat.completion',
        created: Math.floor(startedAt / 1000),
        model: `claude-${MODEL}`,
        choices: [{
          index: 0,
          message: { role: 'assistant', content },
          finish_reason: 'stop',
        }],
        usage,
      });
    } catch (e) {
      console.error(`✗ [#${id}] ${e.message}`);
      send(res, 502, { error: { message: `claude proxy error: ${e.message}`, type: 'proxy_error' } });
    } finally {
      releaseSlot();
    }
  });
});

server.listen(PORT, () => {
  console.log(`Claude-LLM proxy listening on http://localhost:${PORT}`);
  console.log(`  model=${MODEL}  (override with CLAUDE_MODEL=…)`);
  console.log(`  max concurrency=${MAX_CONCURRENCY}  (override with LLM_PROXY_CONCURRENCY=…)`);
  console.log(`  routes: POST /chat/completions  and  POST /openai/deployments/:dep/chat/completions`);
  console.log(`  logging every call to ${LOG_FILE}`);
});
