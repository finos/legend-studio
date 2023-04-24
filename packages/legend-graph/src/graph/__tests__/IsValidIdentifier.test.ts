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

import { unitTest } from '@finos/legend-shared/test';
import { test, expect } from '@jest/globals';
import { isValidIdentifier } from '../MetaModelUtils.js';

test(unitTest('Validate Valid String Identifier'), () => {
  expect(isValidIdentifier('lowercaseString')).toBe(true);
  expect(isValidIdentifier('lowercase1')).toBe(true);
  expect(isValidIdentifier('contains space')).toBe(false);
  expect(isValidIdentifier('UppercaseString')).toBe(false);
  expect(isValidIdentifier('1startsWithNumber')).toBe(false);
  expect(isValidIdentifier('containsSpecialCharacter$')).toBe(false);
  expect(isValidIdentifier('containsSpecialCharacter$', true)).toBe(true);
});
