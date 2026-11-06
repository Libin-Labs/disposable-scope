import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as library from '../dist/esm/index.js';
const { DisposableScope, AsyncDisposableScope } = library;

test('sync resources are disposed LIFO exactly once', () => {
  const order = [];
  const s = new DisposableScope();
  assert.equal(
    s.use('a', (x) => order.push(x)),
    'a',
  );
  s.defer(() => {
    order.push('b');
  });
  s.dispose();
  s.dispose();
  assert.deepEqual(order, ['b', 'a']);
  assert.equal(s.disposed, true);
});
test('sync failures do not skip resources and preserve undefined', () => {
  const s = new DisposableScope();
  let done = false;
  s.defer(() => {
    done = true;
  });
  s.defer(() => {
    throw undefined;
  });
  let caught = false;
  try {
    s.dispose();
  } catch (e) {
    caught = true;
    assert.equal(e, undefined);
  }
  assert.equal(caught, true);
  assert.equal(done, true);
});
test('body and cleanup failure aggregate with body first', () => {
  const s = new DisposableScope();
  s.defer(() => {
    throw 'cleanup';
  });
  assert.throws(
    () =>
      s.run(() => {
        throw undefined;
      }),
    (e) => e instanceof AggregateError && e.errors[0] === undefined && e.errors[1] === 'cleanup',
  );
  assert.throws(() => s.defer(() => {}), /disposed/);
});
test('async LIFO awaits each cleanup and shares disposal', async () => {
  const s = new AsyncDisposableScope();
  const order = [];
  s.defer(async () => {
    order.push(1);
  });
  s.defer(async () => {
    order.push(2);
  });
  const a = s.dispose();
  assert.equal(a, s.dispose());
  await a;
  assert.deepEqual(order, [2, 1]);
});
test('async operation and all cleanup failures aggregate', async () => {
  const s = new AsyncDisposableScope();
  s.defer(async () => {
    throw 'last';
  });
  s.defer(() => {
    throw 'first';
  });
  await assert.rejects(
    s.run(async () => {
      throw undefined;
    }),
    (e) =>
      e instanceof AggregateError &&
      e.errors.length === 3 &&
      e.errors[0] === undefined &&
      e.errors[1] === 'first' &&
      e.errors[2] === 'last',
  );
});
test('successful scoped results and async cleanup misuse', async () => {
  assert.equal(
    new DisposableScope().run(() => 5),
    5,
  );
  assert.equal(
    await new AsyncDisposableScope().run(async (s) => {
      s.use(1, async () => {});
      return 6;
    }),
    6,
  );
  const s = new DisposableScope();
  s.defer(async () => {});
  assert.throws(() => s.dispose(), TypeError);
});
