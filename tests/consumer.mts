import { DisposableScope, AsyncDisposableScope } from '@lp-labs/disposable-scope';
const s = new DisposableScope();
const number: number = s.use(3, (n) => {
  void n;
});
const result: Promise<string> = new AsyncDisposableScope().run(async () => 'ok');
void number;
void result;
// @ts-expect-error cleanup must be callable
s.defer(3);
// @ts-expect-error resource retains number type
s.use(3, (value: string) => {
  void value;
});
