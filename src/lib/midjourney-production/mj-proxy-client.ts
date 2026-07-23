/**
 * Midjourney proxy HTTP client (useapi.net-compatible + generic REST).
 *
 * Midjourney has no official public API. Production automation typically uses
 * a Discord-proxy service. Configure via env — never commit tokens.
 *
 * Required:
 *   MJ_PROXY_TOKEN          — proxy API bearer token
 *   MJ_DISCORD_TOKEN        — Discord account token used by the proxy
 *   MJ_DISCORD_SERVER_ID
 *   MJ_DISCORD_CHANNEL_ID
 * Optional:
 *   MJ_PROXY_BASE_URL       — default https://api.useapi.net/v2
 *   MJ_PROXY_MODE           — useapi | generic
 */
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';

export interface MjImagineRequest {
  prompt: string;
  /** Strip leading /imagine prompt: for APIs that want raw prompt */
  rawPrompt?: string;
  replyRef?: string;
}

export interface MjImagineJob {
  jobId: string;
  status: 'pending' | 'progress' | 'completed' | 'failed';
  progress?: number;
  imageUrls?: string[];
  error?: string;
  raw?: unknown;
}

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing env ${name} — required for Midjourney auto-generate`);
  return v;
}

function baseUrl(): string {
  return (process.env.MJ_PROXY_BASE_URL?.trim() || 'https://api.useapi.net/v2').replace(/\/$/, '');
}

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${requireEnv('MJ_PROXY_TOKEN')}`,
    'Content-Type': 'application/json',
  };
}

/** Extract prompt body from `/imagine prompt: ...` command */
export function stripImaginePrefix(command: string): string {
  return command
    .replace(/^\/imagine\s+prompt:\s*/i, '')
    .replace(/^\/imagine\s+/i, '')
    .trim();
}

export class MjProxyClient {
  async imagine(req: MjImagineRequest): Promise<MjImagineJob> {
    const prompt = req.rawPrompt ?? stripImaginePrefix(req.prompt);
    const mode = process.env.MJ_PROXY_MODE?.trim() || 'useapi';

    if (mode === 'generic') {
      return this.imagineGeneric(prompt, req.replyRef);
    }
    return this.imagineUseApi(prompt, req.replyRef);
  }

  private async imagineUseApi(prompt: string, replyRef?: string): Promise<MjImagineJob> {
    const body: Record<string, unknown> = {
      prompt,
      discord: requireEnv('MJ_DISCORD_TOKEN'),
      server: requireEnv('MJ_DISCORD_SERVER_ID'),
      channel: requireEnv('MJ_DISCORD_CHANNEL_ID'),
      maxJobs: Number(process.env.MJ_PROXY_MAX_JOBS ?? 1),
    };
    if (replyRef) body.replyRef = replyRef;

    const res = await fetch(`${baseUrl()}/jobs/imagine`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      throw new Error(
        `MJ imagine failed ${res.status}: ${JSON.stringify(json).slice(0, 400)}`
      );
    }
    const jobId = String(json.jobid ?? json.jobId ?? json.id ?? '');
    if (!jobId) throw new Error(`MJ imagine: no job id in response ${JSON.stringify(json).slice(0, 300)}`);
    return { jobId, status: 'pending', raw: json };
  }

  private async imagineGeneric(prompt: string, replyRef?: string): Promise<MjImagineJob> {
    const path = process.env.MJ_PROXY_IMAGINE_PATH?.trim() || '/imagine';
    const res = await fetch(`${baseUrl()}${path}`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        prompt,
        replyRef,
        discord: process.env.MJ_DISCORD_TOKEN,
        server: process.env.MJ_DISCORD_SERVER_ID,
        channel: process.env.MJ_DISCORD_CHANNEL_ID,
        relax: true,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      throw new Error(`MJ imagine failed ${res.status}: ${JSON.stringify(json).slice(0, 400)}`);
    }
    const jobId = String(json.jobid ?? json.jobId ?? json.id ?? json.task_id ?? '');
    if (!jobId) throw new Error('MJ imagine: no job id');
    return { jobId, status: 'pending', raw: json };
  }

  async getJob(jobId: string): Promise<MjImagineJob> {
    const mode = process.env.MJ_PROXY_MODE?.trim() || 'useapi';
    const url =
      mode === 'generic'
        ? `${baseUrl()}${process.env.MJ_PROXY_STATUS_PATH?.trim() || '/jobs/'}${jobId}`
        : `${baseUrl()}/jobs/?jobid=${encodeURIComponent(jobId)}`;

    const res = await fetch(url, { headers: authHeaders() });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      return { jobId, status: 'failed', error: `status ${res.status}`, raw: json };
    }

    const statusRaw = String(json.status ?? json.state ?? 'pending').toLowerCase();
    let status: MjImagineJob['status'] = 'pending';
    if (['done', 'completed', 'success', 'finished'].includes(statusRaw)) status = 'completed';
    else if (['failed', 'error', 'cancelled'].includes(statusRaw)) status = 'failed';
    else if (['progress', 'running', 'in_progress', 'started'].includes(statusRaw))
      status = 'progress';

    const attachments = (json.attachments ?? json.images ?? json.imageUrls ?? []) as unknown[];
    const imageUrls: string[] = [];
    for (const a of attachments) {
      if (typeof a === 'string') imageUrls.push(a);
      else if (a && typeof a === 'object' && 'url' in (a as object)) {
        imageUrls.push(String((a as { url: string }).url));
      }
    }
    if (typeof json.uri === 'string') imageUrls.push(json.uri);
    if (typeof json.imageUrl === 'string') imageUrls.push(json.imageUrl);

    return {
      jobId,
      status,
      progress: typeof json.progress === 'number' ? json.progress : undefined,
      imageUrls: imageUrls.length ? imageUrls : undefined,
      error: status === 'failed' ? String(json.error ?? json.message ?? 'failed') : undefined,
      raw: json,
    };
  }

  async waitForJob(
    jobId: string,
    options?: { timeoutMs?: number; pollMs?: number }
  ): Promise<MjImagineJob> {
    const timeoutMs = options?.timeoutMs ?? Number(process.env.MJ_JOB_TIMEOUT_MS ?? 900_000);
    const pollMs = options?.pollMs ?? Number(process.env.MJ_JOB_POLL_MS ?? 15_000);
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const job = await this.getJob(jobId);
      if (job.status === 'completed' || job.status === 'failed') return job;
      await sleep(pollMs);
    }
    return { jobId, status: 'failed', error: 'timeout waiting for Midjourney job' };
  }

  async downloadToFile(url: string, destPath: string): Promise<void> {
    mkdirSync(dirname(destPath), { recursive: true });
    const res = await fetch(url);
    if (!res.ok || !res.body) throw new Error(`download failed ${res.status}: ${url}`);
    const arrayBuffer = await res.arrayBuffer();
    writeFileSync(destPath, Buffer.from(arrayBuffer));
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function watchFolderPath(): string {
  const fromEnv = process.env.MJ_IMPORT_WATCH_FOLDER?.trim();
  if (fromEnv) return fromEnv;
  const home = process.env.USERPROFILE || process.env.HOME || '';
  return join(home, 'Downloads', 'PickMeTalk_MJ');
}

export const mjProxyClient = new MjProxyClient();
