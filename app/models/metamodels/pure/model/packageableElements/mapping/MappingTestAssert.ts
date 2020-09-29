/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Hashable } from 'MetaModelUtility';
import { ValidationIssue } from 'MM/validator/ValidationResult';

export abstract class MappingTestAssert implements Hashable {
  _type: 'MappingTestAssert' = 'MappingTestAssert'; // avoid empty class as it will throw off Typescript type-checking

  abstract get validationResult(): ValidationIssue | undefined;
  abstract get hashCode(): string
}
