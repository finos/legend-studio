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

import { addUniqueEntry } from '@finos/legend-shared';
import {
  type ValidationIssue,
  createValidationError,
} from './ValidationHelper';

export const validateServicePattern = (pattern: string): ValidationIssue => {
  const errors: string[] = [];
  if (!pattern) {
    addUniqueEntry(errors, 'Pattern must not be empty');
  } else if (!pattern.startsWith('/')) {
    addUniqueEntry(errors, `Pattern must start with a '/'`);
  }
  // TODO: potentially do more validation
  return createValidationError(errors);
};
