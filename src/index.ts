export type Cleanup = () => void;
export type AsyncCleanup = () => void | Promise<void>;
function assertSynchronous(result: unknown): void {
  if (
    result !== null &&
    (typeof result === 'object' || typeof result === 'function') &&
    typeof (result as { then?: unknown }).then === 'function'
  ) {
    void Promise.resolve(result).catch(() => {});
    throw new TypeError('Synchronous operation returned a thenable; use AsyncDisposableScope');
  }
}
function throwFailures(errors: unknown[]): void {
  if (errors.length === 1) throw errors[0];
  if (errors.length > 1) throw new AggregateError(errors, 'Scope and cleanup failed');
}
export class DisposableScope {
  private stack: Cleanup[] = [];
  private closed = false;
  get disposed(): boolean {
    return this.closed;
  }
  defer(cleanup: Cleanup): Cleanup {
    if (this.closed) throw new Error('Scope already disposed');
    this.stack.push(cleanup);
    return cleanup;
  }
  use<T>(resource: T, dispose: (resource: T) => void): T {
    this.defer(() => dispose(resource));
    return resource;
  }
  dispose(): void {
    this.finish([]);
  }
  private finish(errors: unknown[]): void {
    if (!this.closed) {
      this.closed = true;
      while (this.stack.length) {
        try {
          assertSynchronous(this.stack.pop()!());
        } catch (error) {
          errors.push(error);
        }
      }
    }
    throwFailures(errors);
  }
  run<T>(operation: (scope: DisposableScope) => T): T {
    if (this.closed) throw new Error('Scope already disposed');
    const errors: unknown[] = [];
    let value!: T;
    try {
      value = operation(this);
      assertSynchronous(value);
    } catch (error) {
      errors.push(error);
    }
    this.finish(errors);
    return value;
  }
}
export class AsyncDisposableScope {
  private stack: AsyncCleanup[] = [];
  private closed = false;
  private disposal: Promise<void> | undefined;
  private readonly cleanupErrors: unknown[] = [];
  get disposed(): boolean {
    return this.closed;
  }
  defer(cleanup: AsyncCleanup): AsyncCleanup {
    if (this.closed) throw new Error('Scope already disposed');
    this.stack.push(cleanup);
    return cleanup;
  }
  use<T>(resource: T, dispose: (resource: T) => void | Promise<void>): T {
    this.defer(() => dispose(resource));
    return resource;
  }
  dispose(): Promise<void> {
    if (this.disposal) return this.disposal;
    this.closed = true;
    this.disposal = Promise.resolve().then(async () => {
      while (this.stack.length) {
        try {
          await this.stack.pop()!();
        } catch (error) {
          this.cleanupErrors.push(error);
        }
      }
      throwFailures(this.cleanupErrors);
    });
    return this.disposal;
  }
  async run<T>(operation: (scope: AsyncDisposableScope) => T | Promise<T>): Promise<T> {
    if (this.closed) throw new Error('Scope already disposed');
    const errors: unknown[] = [];
    let value!: T;
    try {
      value = await operation(this);
    } catch (error) {
      errors.push(error);
    }
    try {
      await this.dispose();
    } catch {
      errors.push(...this.cleanupErrors);
    }
    throwFailures(errors);
    return value;
  }
}
