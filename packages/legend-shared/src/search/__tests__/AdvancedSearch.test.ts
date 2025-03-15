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

import { test, expect } from '@jest/globals';
import { unitTest } from '../../__test-utils__/TestUtils.js';
import { exactSearch } from '../AdvancedSearch.js';

test(unitTest('exactSearch wraps search term in quotes'), () => {
  // Test with simple string
  expect(exactSearch('test')).toBe('"test"');

  // Test with empty string
  expect(exactSearch('')).toBe('""');

  // Test with string containing spaces
  expect(exactSearch('hello world')).toBe('"hello world"');

  // Test with string containing special characters
  expect(exactSearch('test@example.com')).toBe('"test@example.com"');

  // Test with string already containing quotes
  expect(exactSearch('"quoted"')).toBe('""quoted""');
});

test(unitTest('exactSearch handles edge cases'), () => {
  // Test with numbers
  expect(exactSearch('123')).toBe('"123"');

  // Test with mixed content
  expect(exactSearch('test123!@#')).toBe('"test123!@#"');

  // Test with very long string
  const longString = 'a'.repeat(100);
  expect(exactSearch(longString)).toBe(`"${longString}"`);

  // Test with non-ASCII characters
  expect(exactSearch('こんにちは')).toBe('"こんにちは"');
});
