export type ApiQueueProvider = "ai_ark" | "airscale" | "gemini";

export class RetryableQueueError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "RetryableQueueError";
    this.status = status;
  }
}

function readPositiveInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export const API_QUEUE_CONFIG = {
  aiArkConcurrency: readPositiveInt("API_QUEUE_AI_ARK_CONCURRENCY", 3),
  airscaleConcurrency: readPositiveInt("API_QUEUE_AIRSCALE_CONCURRENCY", 2),
  geminiConcurrency: readPositiveInt("API_QUEUE_GEMINI_CONCURRENCY", 2),
  maxRetries: readPositiveInt("API_QUEUE_MAX_RETRIES", 3),
  retryBaseMs: readPositiveInt("API_QUEUE_RETRY_BASE_MS", 1000),
} as const;

const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);

type QueueTask<T> = () => Promise<T>;

interface PendingJob<T> {
  task: QueueTask<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

class ProviderQueue {
  private active = 0;
  private readonly pending: PendingJob<unknown>[] = [];

  constructor(
    private readonly provider: ApiQueueProvider,
    private readonly concurrency: number,
    private readonly maxRetries: number,
    private readonly retryBaseMs: number,
  ) {}

  enqueue<T>(task: QueueTask<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.pending.push({
        task: task as QueueTask<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      this.pump();
    });
  }

  private pump(): void {
    while (this.active < this.concurrency && this.pending.length > 0) {
      const job = this.pending.shift();
      if (!job) return;

      this.active += 1;
      void this.runJob(job);
    }
  }

  private async runJob(job: PendingJob<unknown>): Promise<void> {
    try {
      const result = await this.runWithRetry(job.task);
      job.resolve(result);
    } catch (error) {
      job.reject(error);
    } finally {
      this.active -= 1;
      this.pump();
    }
  }

  private async runWithRetry<T>(task: QueueTask<T>): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      try {
        return await task();
      } catch (error) {
        lastError = error;
        if (attempt >= this.maxRetries || !isRetryableError(error)) {
          throw error;
        }

        const delayMs = this.retryBaseMs * 2 ** attempt;
        console.warn(
          `[api-queue:${this.provider}] attempt ${attempt + 1} failed, retrying in ${delayMs}ms`,
          error instanceof Error ? error.message : error,
        );
        await sleep(delayMs);
      }
    }

    throw lastError;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function isRetryableHttpStatus(status: number): boolean {
  return RETRYABLE_STATUSES.has(status);
}

export function isRetryableError(error: unknown): boolean {
  if (error instanceof RetryableQueueError) return true;

  const message = error instanceof Error ? error.message : String(error);
  return (
    /429|502|503|504/.test(message) ||
    /rate.?limit/i.test(message) ||
    /quota exceeded/i.test(message) ||
    /RESOURCE_EXHAUSTED/i.test(message) ||
    /too many requests/i.test(message)
  );
}

const queues: Record<ApiQueueProvider, ProviderQueue> = {
  ai_ark: new ProviderQueue(
    "ai_ark",
    API_QUEUE_CONFIG.aiArkConcurrency,
    API_QUEUE_CONFIG.maxRetries,
    API_QUEUE_CONFIG.retryBaseMs,
  ),
  airscale: new ProviderQueue(
    "airscale",
    API_QUEUE_CONFIG.airscaleConcurrency,
    API_QUEUE_CONFIG.maxRetries,
    API_QUEUE_CONFIG.retryBaseMs,
  ),
  gemini: new ProviderQueue(
    "gemini",
    API_QUEUE_CONFIG.geminiConcurrency,
    API_QUEUE_CONFIG.maxRetries,
    API_QUEUE_CONFIG.retryBaseMs,
  ),
};

export function enqueueAiArk<T>(task: QueueTask<T>): Promise<T> {
  return queues.ai_ark.enqueue(task);
}

export function enqueueAirscale<T>(task: QueueTask<T>): Promise<T> {
  return queues.airscale.enqueue(task);
}

export function enqueueGemini<T>(task: QueueTask<T>): Promise<T> {
  return queues.gemini.enqueue(task);
}
