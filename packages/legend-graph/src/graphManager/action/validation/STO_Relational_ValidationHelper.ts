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

import type { RelationalInputData } from '../../../STO_Relational_Exports.js';
import { isStubbed_PackageableElement } from '../../../graph/helpers/creator/DomainModelCreatorHelper.js';
import {
  type ValidationIssue,
  createValidationError,
} from './ValidationHelper.js';

/**
 * @deprecated
 */
export const DEPRECATED__validation_RelationalInputData = (
  metamodel: RelationalInputData,
): ValidationIssue | undefined => {
  if (isStubbed_PackageableElement(metamodel.database.value)) {
    return createValidationError([
      'Relational input data source database store is missing',
    ]);
  }
  return undefined;
};
