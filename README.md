# @lp-labs/disposable-scope

Explicit synchronous and asynchronous LIFO resource ownership.

## Install

```sh
npm install @lp-labs/disposable-scope
```

Zero runtime, peer, or sibling dependencies. Node 18+; strict TypeScript declarations and independent ESM/CommonJS builds. Version 0.1.0, MIT.

## Quickstart

```js
import { DisposableScope, AsyncDisposableScope } from '@lp-labs/disposable-scope';
const order = [];
new DisposableScope().run((scope) => {
  scope.defer(() => {
    order.push('closed');
  });
});
const result = await new AsyncDisposableScope().run(async (scope) => {
  scope.defer(async () => {
    order.push('async closed');
  });
  return 42;
});
console.log(result, order);
```

## API and contracts

defer registers cleanup; use returns the original resource and captures a typed disposer. dispose closes registration before LIFO cleanup; every resource is attempted despite failures. run owns the scope, returns the body result, and disposes even on body failure. Errors are not silently suppressed: one failure is rethrown verbatim (including undefined); multiple become AggregateError with body first then LIFO cleanup. Sync repeated dispose is a no-op; async repeated dispose shares the same promise and outcome. Async cleanup is awaited sequentially. Sync cleanup returning a thenable raises TypeError (rejection sink prevents accidental unhandled work). Do not use async bodies with sync run, recursively await the scope from its own cleanup, or overlap run calls. No global lifetime hooks or implicit symbol protocols. O(resources) memory and disposal time.

Synchronous bodies returning thenables also raise TypeError after cleanup. User-thrown AggregateError objects are preserved as original errors, including empty aggregates, rather than incorrectly flattened or treated as success.

## Full declarations

The complete public declarations below are generated from the package's strict source. All runtime exports, interfaces, options, return types and readonly state are listed here.

<!-- declarations -->

```ts
export type Cleanup = () => void;
export type AsyncCleanup = () => void | Promise<void>;
export declare class DisposableScope {
  private stack;
  private closed;
  get disposed(): boolean;
  defer(cleanup: Cleanup): Cleanup;
  use<T>(resource: T, dispose: (resource: T) => void): T;
  dispose(): void;
  private finish;
  run<T>(operation: (scope: DisposableScope) => T): T;
}
export declare class AsyncDisposableScope {
  private stack;
  private closed;
  private disposal;
  private readonly cleanupErrors;
  get disposed(): boolean;
  defer(cleanup: AsyncCleanup): AsyncCleanup;
  use<T>(resource: T, dispose: (resource: T) => void | Promise<void>): T;
  dispose(): Promise<void>;
  run<T>(operation: (scope: AsyncDisposableScope) => T | Promise<T>): Promise<T>;
}
```

<!-- end declarations -->

## Development

```sh
npm ci --offline
npm run build
npm run typecheck
npm test
npm run format:check
```

All tests use deterministic clocks, immediate injected sleeps, or explicit promise gates rather than timing guesses. Package exports select ESM for import and CommonJS for require, with separate declaration trees. No runtime configuration files or global hooks.

## Support

If this library is useful to you, consider supporting its maintenance with a [donation via PayPal](https://www.paypal.me/LibinPrasanth).

## Author

Created by [Libin Prasanth](https://www.linkedin.com/in/libinprasanth/). Connect on LinkedIn for updates and discussion.
