// Extend global Array interface to include toSorted and toReversed methods
declare global {
    interface Array<T> {
        toSorted(compareFn?: (a: T, b: T) => number): T[];
        toReversed(): T[];
    }
}

// Polyfill for toSorted method
if (typeof Array.prototype.toSorted !== 'function') {
    Array.prototype.toSorted = function <T>(compareFn?: (a: T, b: T) => number): T[] {
        return [...this].sort(compareFn);
    };
}

// Polyfill for toReversed method
if (typeof Array.prototype.toReversed !== 'function') {
    Array.prototype.toReversed = function <T>(): T[] {
        return [...this].reverse();
    };
}

// Export an empty object to make this a module
export { }; 