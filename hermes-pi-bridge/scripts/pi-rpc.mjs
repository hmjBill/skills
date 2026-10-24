#!/usr/bin/env node

/**
 * pi-rpc.mjs — Hermes <-> Pi native RPC adapter.
 *
 * Zero third-party dependencies (Node.js built-ins only). Drives `pi --mode rpc`
 * over Pi's JSONL protocol and returns a structured JSON result.
 *
 * Subcommands:
 *   run   <projectDir> <prompt...>   Run a task synchronously, print JSON result
 *   start <projectDir> <prompt...>   Run a task in the background, print taskId
 *   status <taskId>                  Summarize a background task
 *   result <taskId>                  Fetch the full result of a background task
 *   stop   <taskId>                  Kill a background task
 *   list                              List background tasks
 *   doctor                            Check the local environment
 *
 * Protocol notes (Pi docs/rpc.md):
 *   - stdout carries strict JSONL; split records on LF only, never on U+2028/U+2029.
 *   - commands carry an optional `id`; the matching response repeats it.
 *   - a `prompt` response only means "accepted"; `agent_settled` means "done".
 *   - extension dialogs (`extension_ui_request`) block Pi until answered.
 */

import { spawn, spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const IS_WINDOWS = process.platform === 'win32';

/** Bridge state lives outside the skill directory so a skill sync never wipes it. */
const STATE_DIR = resolve(
  process.env.PI_BRIDGE_HOME
    || (IS_WINDOWS
      ? join(process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local'), 'pi-bridge')
      : join(homedir(), '.pi-bridge')),
);
const TASKS_DIR = join(STATE_DIR, 'tasks');
const SESSIONS_DIR = join(STATE_DIR, 'sessions');

const DEFAULT_TIMEOUT_SEC = 1800;
const STARTUP_TIMEOUT_MS = 90_000;
const MAX_FILE_CHARS = 200_000;
const DIALOG_METHODS = new Set(['select', 'confirm', 'input', 'editor']);

const USAGE = `pi-rpc.mjs — Hermes <-> Pi RPC adapter

Usage:
  node pi-rpc.mjs run   <projectDir> <prompt...> [options]
  node pi-rpc.mjs start <projectDir> <prompt...> [options]
  node pi-rpc.mjs status <taskId>
  node pi-rpc.mjs result <taskId>
  node pi-rpc.mjs stop   <taskId>
  node pi-rpc.mjs list
  node pi-rpc.mjs doctor

Options:
  --timeout <sec>       Task timeout in seconds (default ${DEFAULT_TIMEOUT_SEC})
  --fresh               Start a brand-new Pi session instead of reusing this project's
  --session-id <id>     Use an explicit Pi session id
  --model <pattern>     Model pattern passed to Pi (e.g. provider/model)
  --provider <name>     Provider passed to Pi
  --thinking <level>    Thinking level (off|minimal|low|medium|high|xhigh|max)
  --approve             Trust project-local files (Pi's --approve)
  --ui-policy <policy>  How to answer Pi extension dialogs: deny|allow (default deny)
  --with-file <path>    Append a file's content to the prompt (repeatable)
  --prompt-file <path>  Read the prompt from a file instead of argv
  --pi <command>        Override the Pi executable (default: pi)
  --raw                 Print only the final assistant text
  --compact             Print single-line JSON
  --help                Show this help
`;

// ---------------------------------------------------------------------------
// small helpers
// ---------------------------------------------------------------------------

function die(message, code = 1) {
  process.stderr.write(`FAIL: ${message}\n`);
  process.exit(code);
}

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

/** Atomic JSON write so a reader never sees a half-written state file. */
function writeJsonAtomic(file, data) {
  ensureDir(resolve(file, '..'));
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  renameSync(tmp, file);
}

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function projectKey(projectDir) {
  return createHash('sha256').update(resolve(projectDir)).digest('hex').slice(0, 16);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

class TimeoutError extends Error {
  constructor(ms, what) {
    super(`${what} timed out after ${ms} ms`);
    this.name = 'TimeoutError';
  }
}

function withTimeout(promise, ms, what) {
  let timer;
  const guard = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(ms, what)), ms);
  });
  return Promise.race([promise, guard]).finally(() => clearTimeout(timer));
}

/** Quote an argv entry for cmd.exe when it contains whitespace. */
function quoteArg(arg) {
  const s = String(arg);
  if (!/[\s"]/.test(s)) return s;
  return `"${s.replace(/"/g, '""')}"`;
}

// ---------------------------------------------------------------------------
// argument parsing
// ---------------------------------------------------------------------------

const VALUE_FLAGS = new Set([
  '--timeout',
  '--session-id',
  '--model',
  '--provider',
  '--thinking',
  '--ui-policy',
  '--with-file',
  '--prompt-file',
  '--pi',
]);

const BOOL_FLAGS = new Set([
  '--fresh',
  '--approve',
  '--raw',
  '--compact',
  '--no-session',
  '--help',
  '-h',
]);

function parseArgs(argv) {
  const opts = {
    timeoutSec: DEFAULT_TIMEOUT_SEC,
    uiPolicy: 'deny',
    withFiles: [],
    positional: [],
  };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    let flag = arg;
    let inlineValue;
    const eq = arg.indexOf('=');
    if (arg.startsWith('--') && eq > 0) {
      flag = arg.slice(0, eq);
      inlineValue = arg.slice(eq + 1);
    }
    if (VALUE_FLAGS.has(flag)) {
      const value = inlineValue !== undefined ? inlineValue : argv[++i];
      if (value === undefined) die(`option ${flag} needs a value`);
      applyFlag(opts, flag, value);
      continue;
    }
    if (BOOL_FLAGS.has(flag)) {
      applyFlag(opts, flag, true);
      continue;
    }
    if (arg.startsWith('-') && arg !== '-') die(`unknown option: ${arg}`);
    rest.push(arg);
  }
  opts.positional = rest;
  return opts;
}

function applyFlag(opts, flag, value) {
  switch (flag) {
    case '--timeout':
      opts.timeoutSec = Number(value);
      if (!Number.isFinite(opts.timeoutSec) || opts.timeoutSec <= 0) {
        die('--timeout must be a positive number of seconds');
      }
      break;
    case '--session-id':
      opts.sessionId = String(value);
      break;
    case '--model':
      opts.model = String(value);
      break;
    case '--provider':
      opts.provider = String(value);
      break;
    case '--thinking':
      opts.thinking = String(value);
      break;
    case '--approve':
      opts.approve = true;
      break;
    case '--fresh':
      opts.fresh = true;
      break;
    case '--ui-policy':
      if (value !== 'deny' && value !== 'allow') die('--ui-policy must be deny or allow');
      opts.uiPolicy = value;
      break;
    case '--with-file':
      opts.withFiles.push(String(value));
      break;
    case '--prompt-file':
      opts.promptFile = String(value);
      break;
    case '--pi':
      opts.pi = String(value);
      break;
    case '--raw':
      opts.raw = true;
      break;
    case '--compact':
      opts.compact = true;
      break;
    case '--no-session':
      opts.noSession = true;
      break;
    case '--help':
    case '-h':
      opts.help = true;
      break;
    default:
      break;
  }
}

// ---------------------------------------------------------------------------
// Pi RPC client
// ---------------------------------------------------------------------------

class PiRpcClient {
  constructor({ cwd, uiPolicy, command }) {
    this.cwd = cwd;
    this.uiPolicy = uiPolicy;
    this.command = command;
    this.child = null;
    this.pending = new Map();
    this.listeners = new Map();
    this.seq = 0;
    this.buffer = '';
    this.stderr = '';
    this.uiRequests = [];
    this.protocolErrors = [];
    this.exited = false;
  }

  on(event, handler) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(handler);
    return () => this.listeners.get(event)?.delete(handler);
  }

  emit(event, payload) {
    for (const handler of this.listeners.get(event) ?? []) {
      try {
        handler(payload);
      } catch {
        /* a broken listener must not kill the RPC loop */
      }
    }
  }

  async start() {
    const { command, args, shell } = buildPiArgs(this.command, this.opts ?? {});
    if (process.env.PI_BRIDGE_VERBOSE) {
      process.stderr.write(`[pi-bridge] spawn: ${command}${args.length ? ` ${args.join(' ')}` : ''}\n`);
    }
    this.child = spawn(command, args, {
      cwd: this.cwd,
      env: process.env,
      shell,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.child.stdout.setEncoding('utf8');
    this.child.stdout.on('data', (chunk) => this.#onStdout(chunk));
    this.child.stderr.setEncoding('utf8');
    this.child.stderr.on('data', (chunk) => {
      this.stderr += chunk;
      if (this.stderr.length > 64_000) this.stderr = this.stderr.slice(-64_000);
    });
    this.child.on('error', (err) => {
      this.#failPending(err);
      this.emit('fatal', err);
    });
    this.child.on('exit', (code, signal) => {
      this.exited = true;
      this.exitInfo = { code, signal };
      this.#failPending(new Error(`Pi process exited (code=${code}, signal=${signal ?? 'none'})`));
      this.emit('exit', this.exitInfo);
    });
  }

  /**
   * Split strictly on LF. Node's readline would also break on U+2028/U+2029,
   * which are legal inside JSON strings — Pi's docs call this out explicitly.
   */
  #onStdout(chunk) {
    this.buffer += chunk;
    let index;
    while ((index = this.buffer.indexOf('\n')) >= 0) {
      const line = this.buffer.slice(0, index).replace(/\r$/, '');
      this.buffer = this.buffer.slice(index + 1);
      if (!line.trim()) continue;
      let record;
      try {
        record = JSON.parse(line);
      } catch {
        this.protocolErrors.push(line.slice(0, 500));
        continue;
      }
      this.#handleRecord(record);
    }
  }

  #handleRecord(record) {
    if (record.type === 'response') {
      const waiter = record.id ? this.pending.get(record.id) : null;
      if (waiter) {
        this.pending.delete(record.id);
        if (record.success) waiter.resolve(record.data);
        else waiter.reject(new Error(record.error || `command ${record.command} failed`));
      } else {
        this.emit('response', record);
      }
      return;
    }
    if (record.type === 'extension_ui_request') {
      this.#handleExtensionUi(record);
      return;
    }
    this.emit('event', record);
    if (record.type === 'agent_settled') this.emit('settled', record);
  }

  /**
   * Pi blocks on dialog methods until the client answers. Fire-and-forget
   * methods (notify/setStatus/setWidget/setTitle/set_editor_text) expect no reply.
   */
  #handleExtensionUi(record) {
    const isDialog = DIALOG_METHODS.has(record.method);
    this.uiRequests.push({
      method: record.method,
      title: record.title || '',
      message: record.message || '',
      answered: isDialog ? this.uiPolicy : 'ignored',
    });
    if (!isDialog) return;

    if (this.uiPolicy === 'allow') {
      if (record.method === 'confirm') {
        this.#write({ type: 'extension_ui_response', id: record.id, confirmed: true });
      } else if (record.method === 'select') {
        this.#write({
          type: 'extension_ui_response',
          id: record.id,
          value: (record.options || [])[0] ?? '',
        });
      } else {
        this.#write({ type: 'extension_ui_response', id: record.id, value: '' });
      }
    } else {
      this.#write({ type: 'extension_ui_response', id: record.id, cancelled: true });
    }
  }

  #write(payload) {
    if (!this.child?.stdin?.writable) return false;
    try {
      this.child.stdin.write(`${JSON.stringify(payload)}\n`);
      return true;
    } catch {
      return false;
    }
  }

  /** Send a command and await its correlated response. */
  send(command) {
    const id = command.id || `c${++this.seq}`;
    const payload = { ...command, id };
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      if (!this.#write(payload)) {
        this.pending.delete(id);
        reject(new Error('failed to write command to Pi stdin'));
      }
    });
  }

  #failPending(error) {
    for (const [id, waiter] of this.pending) {
      this.pending.delete(id);
      waiter.reject(error);
    }
  }

  /** Ask Pi to stop the current run and wait for the session to go idle. */
  async abort() {
    try {
      await withTimeout(this.send({ type: 'abort' }), 15_000, 'abort');
    } catch {
      /* Pi may already be gone; the caller still tears the process down */
    }
  }

  async stop() {
    if (!this.child) return;
    if (this.exited) return;
    try {
      this.child.stdin.end();
    } catch {
      /* already closed */
    }
    await new Promise((resolveStop) => {
      const timer = setTimeout(() => {
        killTree(this.child.pid);
        resolveStop();
      }, 5000);
      this.child.once('exit', () => {
        clearTimeout(timer);
        resolveStop();
      });
    });
  }
}

// ---------------------------------------------------------------------------
// Pi launcher
// ---------------------------------------------------------------------------

function buildPiArgs(command, opts) {
  const args = ['--mode', 'rpc'];
  if (opts.sessionId) args.push('--session-id', opts.sessionId);
  if (opts.noSession) args.push('--no-session');
  if (opts.model) args.push('--model', opts.model);
  if (opts.provider) args.push('--provider', opts.provider);
  if (opts.thinking) args.push('--thinking', opts.thinking);
  if (opts.approve) args.push('--approve');

  // npm shims on Windows are .cmd files, which Node refuses to spawn without a
  // shell; on POSIX we spawn the binary directly so signals reach Pi itself.
  if (IS_WINDOWS) {
    const quoted = [command, ...args].map((part, index) => (index === 0 ? part : quoteArg(part)));
    return { command: quoted.join(' '), args: [], shell: true };
  }
  return { command, args, shell: false };
}

/** Kill a process and its children. */
function killTree(pid) {
  if (!pid) return;
  try {
    if (IS_WINDOWS) {
      spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      try {
        process.kill(-pid, 'SIGTERM');
      } catch {
        process.kill(pid, 'SIGTERM');
      }
    }
  } catch {
    /* already dead */
  }
}

// ---------------------------------------------------------------------------
// task execution
// ---------------------------------------------------------------------------

function buildPrompt(positional, opts) {
  if (opts.promptFile) {
    return readFileSync(opts.promptFile, 'utf8');
  }
  let prompt = positional.join(' ');
  if (prompt === '-' && !process.stdin.isTTY) {
    prompt = readFileSync(0, 'utf8');
  }
  const extras = [];
  for (const file of opts.withFiles) {
    const full = resolve(file);
    let content;
    try {
      content = readFileSync(full, 'utf8');
    } catch (err) {
      throw new Error(`cannot read --with-file ${full}: ${err.message}`);
    }
    let truncated = false;
    if (content.length > MAX_FILE_CHARS) {
      content = content.slice(0, MAX_FILE_CHARS);
      truncated = true;
    }
    extras.push(
      `=== 文件: ${full}${truncated ? '（已截断）' : ''} ===\n${content}`,
    );
  }
  if (extras.length) prompt = `${prompt}\n\n${extras.join('\n\n')}`;
  return prompt;
}

function sessionRegistryPath(projectDir) {
  return join(SESSIONS_DIR, `${projectKey(projectDir)}.json`);
}

function readSessionRegistry(projectDir) {
  return readJson(sessionRegistryPath(projectDir));
}

function writeSessionRegistry(projectDir, data) {
  ensureDir(SESSIONS_DIR);
  writeJsonAtomic(sessionRegistryPath(projectDir), data);
}

/**
 * Run one Pi task end to end. Returns a result object; never throws for
 * ordinary task failures (timeouts, aborts) — those are reported as status.
 */
async function runTask({ projectDir, prompt, opts, onProgress, onClient }) {
  const startedAt = Date.now();
  const project = resolve(projectDir);
  // The bridge owns one session id per project. Pi's own default is to continue
  // the most recent session of the working directory, which would silently
  // inherit a session started by a hand-run `pi` — so we always pass an
  // explicit id: a known one continues, a new one creates a fresh session.
  let sessionId = null;
  if (!opts.noSession) {
    const registry = readSessionRegistry(project);
    sessionId = opts.sessionId
      || (opts.fresh ? randomUUID() : registry?.sessionId || randomUUID());
  }

  const client = new PiRpcClient({
    cwd: project,
    uiPolicy: opts.uiPolicy,
    command: opts.pi || process.env.PI_BRIDGE_PI || 'pi',
  });
  client.opts = {
    sessionId,
    noSession: opts.noSession,
    model: opts.model,
    provider: opts.provider,
    thinking: opts.thinking,
    approve: opts.approve,
  };

  const tools = [];
  const toolNames = new Map();
  const assistantTexts = [];
  const errors = [];
  let settledRecord = null;
  let willRetry = false;
  let lastStopReason = null;
  let assistantError = null;

  client.on('event', (record) => {
    if (record.type === 'tool_execution_start') {
      toolNames.set(record.toolCallId, record.toolName);
    } else if (record.type === 'tool_execution_end') {
      tools.push({
        name: toolNames.get(record.toolCallId) || record.toolName || 'unknown',
        isError: Boolean(record.isError),
        durationMs: record.durationMs ?? null,
      });
    } else if (record.type === 'message_end' && record.message?.role === 'assistant') {
      const message = record.message;
      if (message.stopReason) lastStopReason = message.stopReason;
      // A provider error still ends the run as "settled" — surface it instead
      // of reporting a successful task with an empty result.
      if (message.stopReason === 'error') {
        assistantError = String(message.errorMessage || 'assistant turn failed');
        errors.push(assistantError);
      }
      const text = extractText(message);
      if (text) assistantTexts.push(text);
    } else if (record.type === 'message_update') {
      const inner = record.assistantMessageEvent;
      if (inner?.type === 'error' && inner.error) errors.push(String(inner.error));
    } else if (record.type === 'agent_end') {
      willRetry = Boolean(record.willRetry);
    }
    if (onProgress) onProgress(record);
  });

  const settled = new Promise((resolveSettled) => {
    client.on('settled', (record) => {
      settledRecord = record;
      resolveSettled(record);
    });
  });

  let status = 'failed';
  let error = null;
  let state = null;
  let disposition = null;
  let finalText = null;
  let usage = null;

  try {
    await client.start();
    if (onClient) onClient(client);
    state = await withTimeout(client.send({ type: 'get_state' }), STARTUP_TIMEOUT_MS, 'get_state');

    if (!prompt || !prompt.trim()) throw new Error('empty prompt');

    const promptResponse = await client.send({ type: 'prompt', message: prompt });
    disposition = promptResponse?.disposition ?? null;

    if (disposition !== 'handled') {
      try {
        await withTimeout(settled, opts.timeoutSec * 1000, 'agent_settled');
        status = settledRecord?.aborted ? 'aborted' : 'settled';
      } catch (err) {
        if (err instanceof TimeoutError) {
          status = 'timeout';
          error = err.message;
          await client.abort();
          await sleep(1000);
        } else {
          throw err;
        }
      }
    } else {
      status = 'handled';
    }

    try {
      const last = await withTimeout(
        client.send({ type: 'get_last_assistant_text' }),
        20_000,
        'get_last_assistant_text',
      );
      finalText = last?.text ?? null;
    } catch {
      finalText = null;
    }
    if (!finalText && assistantTexts.length) finalText = assistantTexts[assistantTexts.length - 1];

    try {
      usage = await withTimeout(client.send({ type: 'get_session_stats' }), 20_000, 'get_session_stats');
    } catch {
      usage = null;
    }
  } catch (err) {
    status = 'failed';
    error = err.message;
  } finally {
    await client.stop();
  }

  const resolvedSessionId = state?.sessionId || sessionId || null;
  // Always remember the newest session of this project: `--fresh` starts a new
  // conversation, and the next plain run should continue *that* one.
  if (resolvedSessionId && !opts.noSession) {
    writeSessionRegistry(project, {
      projectDir: project,
      sessionId: resolvedSessionId,
      sessionFile: state?.sessionFile ?? null,
      lastUsedAt: new Date().toISOString(),
    });
  }

  const ok = status === 'settled' || status === 'handled';
  // Never report a successful task that produced nothing: a provider error or
  // an empty answer is a failure, even though Pi settled the run cleanly.
  if (ok && assistantError) {
    status = 'failed';
    error = assistantError;
  } else if (ok && !finalText) {
    status = 'failed';
    error = 'Pi finished without producing any assistant text';
  }
  return {
    ok: status === 'settled' || status === 'handled',
    status,
    project,
    sessionId: resolvedSessionId,
    sessionFile: state?.sessionFile ?? null,
    model: state?.model?.id ?? null,
    provider: state?.model?.provider ?? null,
    disposition,
    durationMs: Date.now() - startedAt,
    result: finalText,
    stopReason: lastStopReason,
    tools,
    dialogs: client.uiRequests,
    usage,
    errors,
    willRetry,
    error,
    stderr: client.stderr.trim() || null,
    protocolErrors: client.protocolErrors,
  };
}

function extractText(message) {
  const content = message?.content;
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .filter((block) => block?.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('\n');
}

// ---------------------------------------------------------------------------
// background tasks
// ---------------------------------------------------------------------------

function taskDir(taskId) {
  return join(TASKS_DIR, taskId);
}

function taskFile(taskId) {
  return join(taskDir(taskId), 'job.json');
}

function startBackgroundTask({ projectDir, prompt, opts }) {
  ensureDir(TASKS_DIR);
  const taskId = `t-${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
  const job = {
    taskId,
    state: 'running',
    status: 'running',
    createdAt: new Date().toISOString(),
    finishedAt: null,
    durationMs: null,
    project: resolve(projectDir),
    prompt,
    options: {
      timeoutSec: opts.timeoutSec,
      uiPolicy: opts.uiPolicy,
      fresh: Boolean(opts.fresh),
      sessionId: opts.sessionId || null,
      noSession: Boolean(opts.noSession),
      model: opts.model || null,
      provider: opts.provider || null,
      thinking: opts.thinking || null,
      approve: Boolean(opts.approve),
    },
    workerPid: null,
    toolCount: 0,
    lastEventAt: null,
    result: null,
  };
  writeJsonAtomic(taskFile(taskId), job);

  const child = spawn(process.execPath, [SCRIPT_PATH, '__worker', taskFile(taskId)], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });
  child.unref();
  job.workerPid = child.pid;
  writeJsonAtomic(taskFile(taskId), job);

  return { ok: true, taskId, status: 'started', project: job.project };
}

async function runWorker(jobPath) {
  const job = readJson(jobPath);
  if (!job) die(`worker: cannot read job file ${jobPath}`);
  const opts = {
    timeoutSec: job.options.timeoutSec,
    uiPolicy: job.options.uiPolicy,
    fresh: job.options.fresh,
    sessionId: job.options.sessionId,
    noSession: job.options.noSession,
    model: job.options.model,
    provider: job.options.provider,
    thinking: job.options.thinking,
    approve: job.options.approve,
  };
  const result = await runTask({
    projectDir: job.project,
    prompt: job.prompt,
    opts,
    onProgress: () => {
      const current = readJson(jobPath);
      if (!current) return;
      current.lastEventAt = new Date().toISOString();
      writeJsonAtomic(jobPath, current);
    },
  });
  const current = readJson(jobPath) || job;
  current.state = 'finished';
  current.status = result.status;
  current.finishedAt = new Date().toISOString();
  current.durationMs = result.durationMs;
  current.toolCount = result.tools.length;
  current.result = result;
  writeJsonAtomic(jobPath, current);
}

function readTask(taskId) {
  const file = taskFile(taskId);
  if (!existsSync(file)) return null;
  return readJson(file);
}

// ---------------------------------------------------------------------------
// output helpers
// ---------------------------------------------------------------------------

function printResult(result, opts) {
  if (opts.raw) {
    process.stdout.write(`${result.result ?? ''}\n`);
    return;
  }
  process.stdout.write(
    `${opts.compact ? JSON.stringify(result) : JSON.stringify(result, null, 2)}\n`,
  );
}

// ---------------------------------------------------------------------------
// commands
// ---------------------------------------------------------------------------

async function cmdRun(argv) {
  const opts = parseArgs(argv);
  if (opts.help) {
    process.stdout.write(USAGE);
    return;
  }
  const [projectDir, ...rest] = opts.positional;
  if (!projectDir) die('run needs a project directory');
  if (!existsSync(resolve(projectDir))) die(`project directory not found: ${resolve(projectDir)}`);

  const prompt = buildPrompt(rest, opts);
  if (!prompt.trim()) die('empty prompt');

  const controller = { client: null };
  const onSignal = () => {
    if (controller.client) killTree(controller.client.child?.pid);
  };
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);

  const result = await runTask({
    projectDir,
    prompt,
    opts,
    onClient: (client) => {
      controller.client = client;
    },
    onProgress: (record) => {
      if (process.env.PI_BRIDGE_VERBOSE && record.type === 'event') {
        process.stderr.write(`[pi] ${record.type}\n`);
      }
    },
  });
  process.off('SIGINT', onSignal);
  process.off('SIGTERM', onSignal);

  printResult(result, opts);
  process.exitCode = result.ok ? 0 : 1;
}

function cmdStart(argv) {
  const opts = parseArgs(argv);
  if (opts.help) {
    process.stdout.write(USAGE);
    return;
  }
  const [projectDir, ...rest] = opts.positional;
  if (!projectDir) die('start needs a project directory');
  if (!existsSync(resolve(projectDir))) die(`project directory not found: ${resolve(projectDir)}`);

  const prompt = buildPrompt(rest, opts);
  if (!prompt.trim()) die('empty prompt');

  const info = startBackgroundTask({ projectDir, prompt, opts });
  process.stdout.write(`${JSON.stringify(info, null, 2)}\n`);
}

function cmdStatus(argv) {
  const opts = parseArgs(argv);
  const taskId = opts.positional[0];
  if (!taskId) die('status needs a task id');
  const job = readTask(taskId);
  if (!job) die(`unknown task: ${taskId}`);
  process.stdout.write(
    `${JSON.stringify(
      {
        taskId: job.taskId,
        state: job.state,
        status: job.status,
        project: job.project,
        createdAt: job.createdAt,
        finishedAt: job.finishedAt,
        durationMs: job.durationMs,
        toolCount: job.toolCount ?? 0,
        lastEventAt: job.lastEventAt,
        hasResult: Boolean(job.result),
      },
      null,
      2,
    )}\n`,
  );
}

function cmdResult(argv) {
  const opts = parseArgs(argv);
  const taskId = opts.positional[0];
  if (!taskId) die('result needs a task id');
  const job = readTask(taskId);
  if (!job) die(`unknown task: ${taskId}`);
  if (!job.result) {
    process.stdout.write(
      `${JSON.stringify(
        { ok: false, status: job.status, taskId: job.taskId, message: 'task has no result yet' },
        null,
        2,
      )}\n`,
    );
    process.exitCode = 1;
    return;
  }
  printResult(job.result, opts);
  process.exitCode = job.result.ok ? 0 : 1;
}

function cmdStop(argv) {
  const opts = parseArgs(argv);
  const taskId = opts.positional[0];
  if (!taskId) die('stop needs a task id');
  const job = readTask(taskId);
  if (!job) die(`unknown task: ${taskId}`);
  if (job.workerPid) killTree(job.workerPid);
  const current = readJson(taskFile(taskId)) || job;
  current.state = 'stopped';
  current.status = 'stopped';
  current.finishedAt = new Date().toISOString();
  writeJsonAtomic(taskFile(taskId), current);
  process.stdout.write(`${JSON.stringify({ ok: true, taskId, status: 'stopped' }, null, 2)}\n`);
}

function cmdList(argv) {
  const opts = parseArgs(argv);
  ensureDir(TASKS_DIR);
  const tasks = readdirSync(TASKS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => readJson(taskFile(entry.name)))
    .filter(Boolean)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .map((job) => ({
      taskId: job.taskId,
      state: job.state,
      status: job.status,
      project: job.project,
      createdAt: job.createdAt,
      durationMs: job.durationMs,
      toolCount: job.toolCount ?? 0,
    }));
  process.stdout.write(`${JSON.stringify(tasks, null, 2)}\n`);
}

function cmdDoctor(argv) {
  const opts = parseArgs(argv);
  const command = opts.pi || process.env.PI_BRIDGE_PI || 'pi';
  const probeCmd = IS_WINDOWS
    ? `${quoteArg(command)} --version`
    : `${command} --version`;
  const probe = spawnSync(
    IS_WINDOWS ? 'cmd.exe' : 'sh',
    IS_WINDOWS ? ['/d', '/s', '/c', probeCmd] : ['-c', probeCmd],
    { encoding: 'utf8', timeout: 30_000, windowsHide: true },
  );
  const version = (probe.stdout || '').trim().split(/\r?\n/)[0] || null;
  const report = {
    ok: probe.status === 0,
    node: process.version,
    platform: `${process.platform} ${process.arch}`,
    stateDir: STATE_DIR,
    pi: {
      command,
      spawn: IS_WINDOWS ? 'cmd.exe (shell)' : 'direct exec',
      version,
      found: probe.status === 0,
      error: probe.status === 0 ? null : (probe.stderr || '').trim() || `exit ${probe.status}`,
    },
    sessions: existsSync(SESSIONS_DIR) ? readdirSync(SESSIONS_DIR).filter((f) => f.endsWith('.json')).length : 0,
    tasks: existsSync(TASKS_DIR) ? readdirSync(TASKS_DIR, { withFileTypes: true }).filter((e) => e.isDirectory()).length : 0,
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = report.ok ? 0 : 1;
}

// ---------------------------------------------------------------------------
// entry point
// ---------------------------------------------------------------------------

async function main() {
  const argv = process.argv.slice(2);
  const command = argv[0];
  const rest = argv.slice(1);

  switch (command) {
    case 'run':
      return cmdRun(rest);
    case 'start':
      return cmdStart(rest);
    case 'status':
      return cmdStatus(rest);
    case 'result':
      return cmdResult(rest);
    case 'stop':
      return cmdStop(rest);
    case 'list':
      return cmdList(rest);
    case 'doctor':
      return cmdDoctor(rest);
    case '__worker':
      return runWorker(rest[0]);
    case undefined:
    case '--help':
    case '-h':
    case 'help':
      process.stdout.write(USAGE);
      return undefined;
    default:
      die(`unknown subcommand: ${command}\n\n${USAGE}`);
      return undefined;
  }
}

main().catch((err) => {
  die(err?.stack || String(err));
});
