export class CircuitBreaker {
  private failures: number[] = [];
  private openUntil: number = 0;
  private readonly threshold: number;
  private readonly windowMs: number;
  private readonly cooldownMs: number;

  constructor(
    threshold = 3,
    windowMs = 60_000,
    cooldownMs = 30_000,
  ) {
    this.threshold = threshold;
    this.windowMs = windowMs;
    this.cooldownMs = cooldownMs;
  }

  isOpen(): boolean {
    if (Date.now() < this.openUntil) {
      return true;
    }
    if (this.openUntil > 0 && Date.now() >= this.openUntil) {
      this.reset();
    }
    return false;
  }

  recordFailure(): void {
    const now = Date.now();
    this.failures.push(now);
    this.failures = this.failures.filter(t => now - t < this.windowMs);

    if (this.failures.length >= this.threshold) {
      this.openUntil = now + this.cooldownMs;
      this.failures = [];
    }
  }

  recordSuccess(): void {
    this.failures = [];
    this.openUntil = 0;
  }

  reset(): void {
    this.failures = [];
    this.openUntil = 0;
  }
}
