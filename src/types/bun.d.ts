declare module "bun:test" {
  export interface Mock<T extends (...args: any[]) => any> {
    (...args: Parameters<T>): ReturnType<T>;
    mock: {
      calls: Array<{ args: Parameters<T>; returned: ReturnType<T> }>;
      results: Array<{ type: "return" | "throw"; value: any }>;
      instances: any[];
      lastCall: { args: Parameters<T>; returned: ReturnType<T> } | undefined;
    };
    mockImplementation(fn: T): this;
    mockReturnValue(value: ReturnType<T>): this;
    mockResolvedValue<U>(value: U): Mock<() => Promise<U>>;
    mockRejectedValue(value: any): Mock<() => Promise<never>>;
    mockReset(): void;
  }

  export function mock<T extends (...args: any[]) => any>(implementation?: T): Mock<T>;

  export function describe(name: string, fn: () => void): void;
  export function it(name: string, fn: () => void | Promise<void>): void;
  export function test(name: string, fn: () => void | Promise<void>): void;
  export function expect(actual: any): {
    toBe(expected: any): void;
    toEqual(expected: any): void;
    toBeDefined(): void;
    toBeUndefined(): void;
    toBeNull(): void;
    toBeTruthy(): void;
    toBeFalsy(): void;
    toBeGreaterThan(expected: number): void;
    toBeLessThan(expected: number): void;
    toContain(expected: any): void;
    toHaveLength(expected: number): void;
    toHaveBeenCalled(): void;
    toHaveBeenCalledTimes(expected: number): void;
    toHaveBeenCalledWith(...args: any[]): void;
    toThrow(expected?: string | RegExp): void;
    resolves: any;
    rejects: any;
  };
  export function beforeAll(fn: () => void | Promise<void>): void;
  export function afterAll(fn: () => void | Promise<void>): void;
  export function beforeEach(fn: () => void | Promise<void>): void;
  export function afterEach(fn: () => void | Promise<void>): void;
  export const mock: {
    resetAll(): void;
  };
}
