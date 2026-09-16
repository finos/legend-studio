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

/**
 * Fragments of execution error messages which suggest the user is missing grants on
 * the data itself, i.e. the remedy is to request access.
 * These are matched case-insensitively against the error message.
 */
export const EXECUTION_ENTITLEMENT_ERRORS = [
  'permission denied',
  'invalid user id or password',
  'incorrect username or password',
  // Snowflake
  'not authorized',
  'insufficient privileges',
  'access control error',
  'does not have permission',
  'this session does not have a current database',
];

/**
 * Fragments of execution error messages about the compute warehouse rather than the
 * data. Requesting access to the data will not resolve these, so they are deliberately
 * excluded from `isExecutionEntitlementError`.
 * These are matched case-insensitively against the error message.
 */
export const EXECUTION_WAREHOUSE_ERRORS = [
  // Snowflake
  'no active warehouse selected',
  'operate privilege',
];

const matchesAny = (
  error: Error | string | undefined,
  patterns: string[],
): boolean => {
  if (!error) {
    return false;
  }
  const message = (
    error instanceof Error ? error.message : error
  ).toLowerCase();
  return patterns.some((pattern) => message.includes(pattern.toLowerCase()));
};

export const isExecutionWarehouseError = (
  error: Error | string | undefined,
): boolean => matchesAny(error, EXECUTION_WAREHOUSE_ERRORS);

/**
 * NOTE: warehouse errors take precedence - a message which matches both is about
 * compute access, not about grants on the data.
 */
export const isExecutionEntitlementError = (
  error: Error | string | undefined,
): boolean =>
  !isExecutionWarehouseError(error) &&
  matchesAny(error, EXECUTION_ENTITLEMENT_ERRORS);

/**
 * Either kind of access failure. Use this where the remedy is the same for both - e.g.
 * the entitlements report, which covers warehouse access as well as grants on the data.
 */
export const isExecutionAccessError = (
  error: Error | string | undefined,
): boolean =>
  isExecutionEntitlementError(error) || isExecutionWarehouseError(error);
