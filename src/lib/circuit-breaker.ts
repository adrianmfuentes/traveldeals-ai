type State = "CLOSED" | "OPEN" | "HALF_OPEN";

interface CircuitBreakerOptions {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
}

export class CircuitBreaker {
  private state: State = "CLOSED";
  private failures = 0;
  private successes = 0;
  private nextAttempt = 0;

  constructor(
    private readonly name: string,
    private readonly options: CircuitBreakerOptions = {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 30_000,
    }
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      if (Date.now() < this.nextAttempt) {
        throw new Error(`Circuit breaker OPEN for ${this.name}`);
      }
      this.state = "HALF_OPEN";
      this.successes = 0;
    }
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess() {
    this.failures = 0;
    if (this.state === "HALF_OPEN") {
      this.successes++;
      if (this.successes >= this.options.successThreshold) {
        this.state = "CLOSED";
        console.log(`[CircuitBreaker] ${this.name} CLOSED after recovery`);
      }
    }
  }

  private onFailure() {
    this.failures++;
    if (this.state === "HALF_OPEN" || this.failures >= this.options.failureThreshold) {
      this.state = "OPEN";
      this.nextAttempt = Date.now() + this.options.timeout;
      console.warn(`[CircuitBreaker] ${this.name} OPEN — ${this.failures} failures`);
    }
  }

  getState(): State {
    return this.state;
  }

  isAvailable(): boolean {
    return this.state !== "OPEN" || Date.now() >= this.nextAttempt;
  }
}
