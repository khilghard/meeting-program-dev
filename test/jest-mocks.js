// jest-mocks.js
// This file provides Jest-style mock functions for Vitest
// Since Vitest doesn't natively support jest.fn(), we'll create a compatibility layer

// Create a mock function that returns a mock instance
function jestFn() {
  const mock = () => {};
  mock.mockResolvedValue = jestFnMockResolvedValue;
  mock.mockImplementation = jestFnMockImplementation;
  mock.mockReset = jestFnMockReset;
  mock.mockClear = jestFnMockClear;
  mock.mockReturnValue = jestFnMockReturnValue;
  return mock;
}

function jestFnMockResolvedValue(value) {
  this.mockImplementation(() => Promise.resolve(value));
  return this;
}

function jestFnMockImplementation(implementation) {
  this.mockImplementation = implementation;
  return this;
}

function jestFnMockReset() {
  this.mockClear();
}

function jestFnMockClear() {
  this.mock.calls = [];
  this.mock.results = [];
}

function jestFnMockReturnValue(value) {
  this.mockImplementation(() => value);
  return this;
}

// Add jest.fn to global scope
if (typeof global.jest === "undefined") {
  global.jest = {
    fn: jestFn,
    spyOn: (obj, prop) => {
      const original = obj[prop];
      const mock = jestFn();
      obj[prop] = mock;
      mock.mockImplementation(() => original.apply(obj, arguments));
      return mock;
    }
  };
}

// Mock console.log
const originalLog = console.log;
console.log = jestFn();
console.log.mockImplementation(() => {});

// Mock fetch
if (typeof global.fetch === "undefined") {
  global.fetch = jestFn();
}
