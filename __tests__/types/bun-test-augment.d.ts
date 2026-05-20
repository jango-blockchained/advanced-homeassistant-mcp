/**
 * bun-types declares the matchers chained off `expect(promise).resolves` /
 * `.rejects` as synchronous (returning `void`), but at runtime the chain
 * returns a `Promise<void>`. The mismatch makes `await expect(p).rejects.
 * toThrow("...")` — a perfectly valid bun:test pattern — trip
 * `@typescript-eslint/await-thenable`.
 *
 * Augment the `bun:test` module so each chained matcher off `resolves` /
 * `rejects` is typed `(...): Promise<void>` instead of `(...): void`.
 * This matches Jest's documented behavior that bun:test mirrors.
 */

declare module "bun:test" {
  type PromiseChainedMatchers<T> = {
    [K in keyof MatchersBuiltin<T>]: MatchersBuiltin<T>[K] extends (
      ...args: infer A
    ) => unknown
      ? (...args: A) => Promise<void>
      : MatchersBuiltin<T>[K];
  };

  interface MatchersBuiltin<T> {
    resolves: PromiseChainedMatchers<Awaited<T>>;
    rejects: PromiseChainedMatchers<unknown>;
  }
}
