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

import { addUniqueEntry, URL_SEPARATOR } from '@finos/legend-shared';
import type { Mapping } from '../../../graph/metamodel/pure/packageableElements/mapping/Mapping.js';
import type { PureExecution } from '../../../graph/metamodel/pure/packageableElements/service/ServiceExecution.js';
import { isStubbed_PackageableElement } from '../../../graph/helpers/creator/DomainModelCreatorHelper.js';
import { isStubbed_RawLambda } from '../../../graph/helpers/creator/RawValueSpecificationCreatorHelper.js';
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
  } else if (pattern === URL_SEPARATOR) {
    addUniqueEntry(errors, `Pattern must not be '/'`);
  } else if (!pattern.startsWith(URL_SEPARATOR)) {
    addUniqueEntry(errors, `Pattern must start with a '/'`);
  } else if (pattern.includes(' ')) {
    addUniqueEntry(errors, `Pattern must not include whitespace`);
  }
  // TODO: potentially do more validation
  return errors.length ? createValidationError(errors) : undefined;
};

export const validate_ServiceMcpServer = (
  mcpServer: string | undefined,
): ValidationIssue | undefined => {
  const errors: string[] = [];
  if (!mcpServer) {
    return undefined;
  } else {
    // MCP server must be an identifier matching: ^[a-zA-Z_][a-zA-Z0-9_]*$
    const MCP_SERVER_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    if (!MCP_SERVER_REGEX.test(mcpServer)) {
      addUniqueEntry(
        errors,
        `MCP server must match pattern '^[a-zA-Z_][a-zA-Z0-9_]*$'\n(start with a letter or underscore, followed by letters, digits, or underscores)`,
      );
    }
  }
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
  mapping: Mapping,
): ValidationIssue | undefined =>
  isStubbed_PackageableElement(mapping)
    ? createValidationError(['Service execution mapping cannot be empty'])
    : undefined;
