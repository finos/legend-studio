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
import type {
  KeyedExecutionParameter,
  PureExecution,
  PureSingleExecution,
} from '../../../models/metamodels/pure/packageableElements/service/ServiceExecution.js';
import { isStubbed_PackageableElement } from '../creation/DomainModelCreatorHelper.js';
import { isStubbed_RawLambda } from '../creation/RawValueSpecificationCreatorHelper.js';
import {
  type ValidationIssue,
  createValidationError,
} from './ValidationHelper.js';

export const validate_ServicePattern = (
  pattern: string,
): ValidationIssue | undefined => {
  const errors: string[] = [];
  if (!pattern) {
    addUniqueEntry(errors, 'Pattern must not be empty');
  } else if (!pattern.startsWith('/')) {
    addUniqueEntry(errors, `Pattern must start with a '/'`);
  }
  // TODO: potentially do more validation
  return errors.length ? createValidationError(errors) : undefined;
};

export const validate_PureExecutionQuery = (
  metamodel: PureExecution,
): ValidationIssue | undefined => {
  if (isStubbed_RawLambda(metamodel.func)) {
    return createValidationError([
      'Service execution function cannot be empty',
    ]);
  }
  // TODO: put this logic back when we properly process lambda - we can't pass the graph manager here to check this
  // else if (isGetAllLambda(this.func)) {
  //   return createValidationError(['Non-empty graph fetch tree is required']);
  // }
  return undefined;
};

export const validate_PureExecutionMapping = (
  metamodel: PureSingleExecution | KeyedExecutionParameter,
): ValidationIssue | undefined =>
  isStubbed_PackageableElement(metamodel.mapping.value)
    ? createValidationError(['Service execution mapping cannot be empty'])
    : undefined;
