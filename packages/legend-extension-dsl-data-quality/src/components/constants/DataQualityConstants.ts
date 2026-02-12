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

export enum DATA_QUALITY_VALIDATION_TEST_ID {
  DATA_QUALITY_VALIDATION_EXPLORER = 'data-quality-validation__explorer',
  DATA_QUALITY_VALIDATION_TOOLTIP_ICON = 'data-quality-validation__tooltip__icon',
  DATA_QUALITY_VALIDATION_SETUP = 'data-quality-validation__setup',
  DATA_QUALITY_VALIDATION_TREE = 'data-quality-validation-tree',
  DATA_QUALITY_VALIDATION_RESULT_PANEL = 'data-quality-result-panel',
  DATA_QUALITY_VALIDATION_RESULT_ANALYTICS = 'data-quality-result-analytics',
}

export const USER_ATTESTATION_MESSAGE =
  'I attest that I am aware of the sensitive data leakage risk when exporting queried data. The data I export will only be used by me.';

export enum DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS {
  ROWS_WITH_EMPTY_COLUMN = 'rowsWithEmptyColumn',
  ROWS_WITH_NON_EMPTY_COLUMN = 'rowsWithNonEmptyColumn',
  ROWS_WITH_COLUMN_LONGER_THAN = 'rowsWithColumnLongerThan',
  ROWS_WITH_NEGATIVE_VALUE = 'rowsWithNegativeValue',
  ROWS_WITH_COLUMN_DIFFERS_FROM_PATTERN = 'rowsWithColumnDiffersFromPattern',
  ROWS_WITH_VALUE_OUTSIDE_RANGE = 'rowsWithValueOutsideRange',
}

export enum DATA_QUALITY_TERMINAL_ASSERTION_HELPER_FUNCTIONS {
  ASSERT_RELATION_EMPTY = 'assertRelationEmpty',
}

export enum DATA_QUALITY_VALIDATION_PURE_FUNCTIONS {
  CONTAINS = 'contains',
  STARTS_WITH = 'startsWith',
  ENDS_WITH = 'endsWith',
  MATCHES = 'matches',
  EQUAL = 'equal',
  GREATER_THAN = 'greaterThan',
  GREATER_THAN_EQUAL = 'greaterThanEqual',
  LESS_THAN = 'lessThan',
  LESS_THAN_EQUAL = 'lessThanEqual',
  IN = 'in',
  IS_EMPTY = 'isEmpty',
  IS_NOT_EMPTY = 'isNotEmpty',
  FILTER = 'filter',
}

export enum DATA_QUALITY_VALIDATION_LOGICAL_FUNCTIONS {
  OR = 'or',
  AND = 'and',
}

export enum PARAMETER_COMPONENTS {
  LIST = 'list',
  NUMBER = 'number',
  STRING = 'string',
  BOOLEAN = 'boolean',
  DATE = 'date',
  COLUMN = 'column',
  COLUMN_LIST = 'column-list',
  TYPE_SELECTOR = 'type-selector',
  NONE = 'none',
}

export enum SUPPORTED_TYPES {
  STRING = 'string',
  BOOLEAN = 'boolean',
  INTEGER = 'integer',
  FLOAT = 'float',
  DECIMAL = 'decimal',
  COL_SPEC = 'colSpec',
  COL_SPEC_ARRAY = 'colSpecArray',
  CLASS_INSTANCE = 'classInstance',
  FUNCTION = 'func',
  VAR = 'var',
  LAMBDA = 'lambda',
  COLLECTION = 'collection',
  PROPERTY = 'property',
  NUMBER = 'number',
}
