/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { test, describe, expect } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import {
  isExecutionAccessError,
  isExecutionEntitlementError,
  isExecutionWarehouseError,
} from '../action/execution/ExecutionErrorHelper.js';

describe(unitTest('Detect execution entitlement error'), () => {
  test.each([
    ['permission denied for table PERSON'],
    ['ORA-01017: invalid user id or password; logon denied'],
    // matching is case-insensitive
    ['Incorrect username or password was specified.'],
    ['PERMISSION DENIED'],
    // Snowflake
    [
      "SQL access control error: Insufficient privileges to operate on table 'PERSON'",
    ],
    [
      "SQL compilation error: Object 'DB.SCHEMA.PERSON' does not exist or not authorized.",
    ],
    [
      "SQL compilation error: Role 'ANALYST' specified in the connect string does not exist or not authorized.",
    ],
    [
      'SQL compilation error: This session does not have a current database. Call "USE DATABASE", or use a qualified name.',
    ],
    ['Current role does not have permission to access the requested resource'],
  ])('Detects entitlement error: %s', (message: string) => {
    expect(isExecutionEntitlementError(message)).toBe(true);
    expect(isExecutionEntitlementError(new Error(message))).toBe(true);
    expect(isExecutionWarehouseError(message)).toBe(false);
  });

  test.each([
    ['SQL compilation error: syntax error line 1 at position 0 unexpected'],
    ['Execution failed: connection reset by peer'],
    // deliberately not treated as an entitlement error: this variant omits the
    // `not authorized` clause and is far more often a genuinely missing object
    [
      'SQL compilation error: Object does not exist, or operation cannot be performed.',
    ],
    // session/auth problems, not missing grants
    ['Authentication token has expired. The user must authenticate again.'],
    [''],
  ])('Ignores non-entitlement error: %s', (message: string) => {
    expect(isExecutionEntitlementError(message)).toBe(false);
    expect(isExecutionEntitlementError(new Error(message))).toBe(false);
  });

  test(unitTest('Ignores undefined error'), () => {
    expect(isExecutionEntitlementError(undefined)).toBe(false);
    expect(isExecutionWarehouseError(undefined)).toBe(false);
  });
});

describe(unitTest('Detect execution warehouse error'), () => {
  test.each([
    [
      "No active warehouse selected in the current session. Select an active warehouse with the 'use warehouse' command.",
    ],
    [
      "Cannot perform this operation. The warehouse must be started first, and the role does not have OPERATE privilege to resume it. Warehouse 'WH' is suspended.",
    ],
  ])('Detects warehouse error: %s', (message: string) => {
    expect(isExecutionWarehouseError(message)).toBe(true);
    expect(isExecutionWarehouseError(new Error(message))).toBe(true);
  });

  test(
    unitTest('Warehouse errors are excluded from entitlement errors'),
    () => {
      // matches `insufficient privileges` (entitlement) and `no active warehouse
      // selected` (warehouse) - warehouse wins, since requesting access to the data
      // will not resolve a compute problem
      const message =
        'Insufficient privileges: no active warehouse selected in the current session.';
      expect(isExecutionWarehouseError(message)).toBe(true);
      expect(isExecutionEntitlementError(message)).toBe(false);
    },
  );
});

describe(unitTest('Detect execution access error'), () => {
  test.each([
    // entitlement
    [
      "SQL access control error: Insufficient privileges to operate on table 'X'",
    ],
    // warehouse
    ['No active warehouse selected in the current session.'],
  ])('Covers both kinds of access failure: %s', (message: string) => {
    expect(isExecutionAccessError(message)).toBe(true);
    expect(isExecutionAccessError(new Error(message))).toBe(true);
  });

  test(unitTest('Ignores errors which are neither'), () => {
    expect(isExecutionAccessError('syntax error at or near "form"')).toBe(
      false,
    );
    expect(isExecutionAccessError(undefined)).toBe(false);
  });
});
