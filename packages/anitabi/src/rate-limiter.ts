/**
 * Token-bucket style limiter with concurrency cap and random jitter.
 * Aligns with valid-id-list.md: &lt; 100 req/min + random gaps.
 */
export class RateLimiter {
  private readonly minIntervalMs: number;
  private readonly jitterMin: number;
  private readonly jitterMax: number;
  private readonly concurrency: number;
  private active = 0;
  private queue: Array<() => void> = [];
  private nextAllowedAt = 0;

  constructor(options: {
    maxRequestsPerMinute: number;
    jitterMs: { min: number; max: number };
    concurrency: number;
  }) {
    this.minIntervalMs = Math.ceil(60_000 / Math.max(1, options.maxRequestsPerMinute));
    this.jitterMin = options.jitterMs.min;
    this.jitterMax = options.jitterMs.max;
    this.concurrency = Math.max(1, options.concurrency);
  }

  async schedule<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      await this.waitForSlot();
      return await fn();
    } finally {
      this.release();
    }
  }

  private acquire(): Promise<void> {
    if (this.active < this.concurrency) {
      this.active += 1;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.queue.push(() => {
        this.active += 1;
        resolve();
      });
    });
  }

  private release(): void {
    this.active -= 1;
    const next = this.queue.shift();
    if (next) next();
  }

  private async waitForSlot(): Promise<void> {
    const now = Date.now();
    const jitter =
      this.jitterMin + Math.random() * Math.max(0, this.jitterMax - this.jitterMin);
    const waitUntil = Math.max(now, this.nextAllowedAt) + jitter;
    this.nextAllowedAt = waitUntil + this.minIntervalMs;
    const delay = waitUntil - now;
    if (delay > 0) {
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}
