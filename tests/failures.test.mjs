import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DisposableScope, AsyncDisposableScope } from '../dist/esm/index.js';

test('user-thrown empty AggregateError remains a failure rather than success', async () => {
  const reason = new AggregateError([], 'user failure');
  const scope = new AsyncDisposableScope();
  scope.defer(() => {
    throw reason;
  });
  await assert.rejects(
    scope.run(() => 42),
    (error) => error === reason,
  );
});

test('body and user AggregateError preserve the latter as an original cause', async () => {
  const reason = new AggregateError(['nested'], 'user failure');
  const scope = new AsyncDisposableScope();
  scope.defer(() => {
    throw reason;
  });
  await assert.rejects(
    scope.run(() => {
      throw undefined;
    }),
    (error) =>
      error instanceof AggregateError &&
      error.errors.length === 2 &&
      error.errors[0] === undefined &&
      error.errors[1] === reason,
  );
});

test('sync body promise misuse is explicit and no internal rejection escapes', async () => {
  const unhandled = [];
  const observer = (error) => unhandled.push(error);
  process.on('unhandledRejection', observer);
  try {
    const scope = new DisposableScope();
    let cleaned = false;
    scope.defer(() => {
      cleaned = true;
    });
    assert.throws(
      () =>
        scope.run(async () => {
          throw 'async';
        }),
      TypeError,
    );
    assert.equal(cleaned, true);
    await new Promise(setImmediate);
    assert.deepEqual(unhandled, []);
  } finally {
    process.off('unhandledRejection', observer);
  }
});

test('async registration closes immediately and unsuccessful disposal remains shared', async () => {
  const scope = new AsyncDisposableScope();
  scope.defer(() => {
    throw undefined;
  });
  const disposal = scope.dispose();
  assert.throws(() => scope.defer(() => {}), /disposed/);
  assert.equal(scope.dispose(), disposal);
  let failed = false;
  try {
    await disposal;
  } catch (error) {
    failed = true;
    assert.equal(error, undefined);
  }
  assert.equal(failed, true);
});
