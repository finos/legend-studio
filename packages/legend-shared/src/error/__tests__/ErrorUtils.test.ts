/**
 * Copyright (c) 2020-present, Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { test, expect, jest } from '@jest/globals';
import { unitTest } from '../../__test-utils__/TestUtils.js';
import {
  ApplicationError,
  EnrichedError,
  IllegalStateError,
  UnsupportedOperationError,
  assertErrorThrown,
  returnUndefOnError,
  decorateErrorMessageIfExists,
} from '../ErrorUtils.js';

// Create a concrete implementation of ApplicationError for testing
class TestApplicationError extends ApplicationError {
  constructor(message: string | undefined) {
    super(message);
  }
}

test(unitTest('ApplicationError handles message correctly'), () => {
  // Test with defined message
  const error1 = new TestApplicationError('Test error message');
  expect(error1.message).toBe('Test error message');
  expect(error1.detail).toBe('Test error message');
  expect(error1.uuid).toBeDefined();

  // Test with undefined message
  const error2 = new TestApplicationError(undefined);
  expect(error2.message).toBe('(no error message)');
  expect(error2.detail).toBe('(no error message)');

  // Test with empty message
  const error3 = new TestApplicationError('');
  expect(error3.message).toBe('(no error message)');
  expect(error3.detail).toBe('(no error message)');
});

test(unitTest('EnrichedError handles string error correctly'), () => {
  const error = new EnrichedError('Test Error', 'Error message');
  expect(error.name).toBe('Test Error');
  expect(error.message).toBe('Error message');
  expect(error.stack).toBeDefined();
});

test(unitTest('EnrichedError handles Error object correctly'), () => {
  const originalError = new Error('Original error');
  const error = new EnrichedError('Test Error', originalError);
  expect(error.name).toBe('Test Error');
  expect(error.message).toBe('Original error');
  expect(error.stack).toContain('Caused by:');
  expect(error.stack).toContain(originalError.stack);
});

test(unitTest('EnrichedError handles override message correctly'), () => {
  const originalError = new Error('Original error');
  const error = new EnrichedError(
    'Test Error',
    originalError,
    'Override message',
  );
  expect(error.name).toBe('Test Error');
  expect(error.message).toBe('Override message');
  expect(error.stack).toContain('Caused by:');
});

test(unitTest('IllegalStateError constructs correctly'), () => {
  // Test with string
  const error1 = new IllegalStateError('Test error');
  expect(error1.name).toBe('Illegal State Error [PLEASE NOTIFY DEVELOPER]');
  expect(error1.message).toBe('Test error');

  // Test with Error object
  const originalError = new Error('Original error');
  const error2 = new IllegalStateError(originalError);
  expect(error2.name).toBe('Illegal State Error [PLEASE NOTIFY DEVELOPER]');
  expect(error2.message).toBe('Original error');
  expect(error2.stack).toContain('Caused by:');
});

test(unitTest('UnsupportedOperationError constructs correctly'), () => {
  // Test with message only
  const error1 = new UnsupportedOperationError('Test error');
  expect(error1.name).toBe('Unsupported Operation Error');
  expect(error1.message).toBe('Test error');

  // Test with message and object
  const unsupportedObject = { key: 'value' };
  const error2 = new UnsupportedOperationError('Test error', unsupportedObject);
  expect(error2.name).toBe('Unsupported Operation Error');
  expect(error2.message).toContain('Test error');
  expect(error2.message).toContain('key');
  expect(error2.message).toContain('value');

  // Test with object only
  const error3 = new UnsupportedOperationError(undefined, unsupportedObject);
  expect(error3.name).toBe('Unsupported Operation Error');
  expect(error3.message).toContain('key');
  expect(error3.message).toContain('value');

  // Test with no arguments
  const error4 = new UnsupportedOperationError();
  expect(error4.name).toBe('Unsupported Operation Error');
});

test(unitTest('assertErrorThrown validates error objects'), () => {
  // In test environment, assertErrorThrown should not throw
  expect(() => assertErrorThrown('not an error')).not.toThrow();
  expect(() => assertErrorThrown(new Error('real error'))).not.toThrow();

  // Mock non-test environment
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';

  // Should throw for non-Error objects
  expect(() => assertErrorThrown('not an error')).toThrow(IllegalStateError);

  // Should not throw for Error objects
  expect(() => assertErrorThrown(new Error('real error'))).not.toThrow();

  // Restore environment
  process.env.NODE_ENV = originalEnv;
});

test(unitTest('returnUndefOnError returns undefined on error'), () => {
  // Function that succeeds
  const successFn = () => 'success';
  expect(returnUndefOnError(successFn)).toBe('success');

  // Function that throws
  const errorFn = () => {
    throw new Error('Test error');
  };
  expect(returnUndefOnError(errorFn)).toBeUndefined();
});

test(unitTest('decorateErrorMessageIfExists decorates error message'), () => {
  // Function that succeeds
  const successFn = () => 'success';
  const decorator = (msg: string) => `Decorated: ${msg}`;
  expect(decorateErrorMessageIfExists(successFn, decorator)).toBe('success');

  // Function that throws
  const errorFn = () => {
    throw new Error('Test error');
  };

  // Test that the function throws and the error message is decorated
  expect(() => {
    decorateErrorMessageIfExists(errorFn, decorator);
  }).toThrow();

  // Verify the error message content
  try {
    decorateErrorMessageIfExists(errorFn, decorator);
  } catch (error) {
    expect((error as Error).message).toBe('Decorated: Test error');
  }
});
