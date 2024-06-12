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

export enum DATA_CUBE_FUNCTIONS {
  // relation
  EXTEND = 'meta::pure::functions::relation::extend',
  FILTER = 'meta::pure::functions::relation::filter',
  GROUP_BY = 'meta::pure::functions::relation::groupBy',
  LIMIT = 'meta::pure::functions::relation::limit',
  PIVOT = 'meta::pure::functions::relation::pivot',
  RENAME = 'meta::pure::functions::relation::rename',
  SELECT = 'meta::pure::functions::relation::select',
  SLICE = 'meta::pure::functions::relation::slice',
  SORT = 'meta::pure::functions::relation::sort',

  // core
  CAST = 'meta::pure::functions::lang::cast',
  FROM = 'meta::pure::mapping::from',

  // sort
  ASC = 'meta::pure::functions::relation::ascending',
  DESC = 'meta::pure::functions::relation::descending',

  // filter
  AND = 'meta::pure::functions::boolean::and',
  NOT = 'meta::pure::functions::boolean::not',
  OR = 'meta::pure::functions::boolean::or',

  // aggregate
}

export const DEFAULT_LAMBDA_VARIABLE_NAME = 'x';
export const PIVOT_COLUMN_NAME_VALUE_SEPARATOR = '__|__';

export enum DATA_CUBE_AGGREGATE_FUNCTION {
  SUM = 'sum',
  MIN = 'min',
  MAX = 'max',
  COUNT = 'count',
  AVG = 'avg',
  FIRST = 'first',
  LAST = 'last',
}

export enum DATA_CUBE_FILTER_OPERATION {
  EQUALS = 'equal',
  NOT_EQUAL = 'notEqual',
  GREATER_THAN = 'greaterThan',
  GREATER_THAN_OR_EQUAL = 'greaterThanOrEqual',
  LESS_THAN = 'lessThan',
  LESS_THAN_OR_EQUAL = 'lessThanOrEqual',
  BLANK = 'isEmpty',
  NOT_BLANK = 'isNotEmpty',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'notContains',
  STARTS_WITH = 'startsWith',
  ENDS_WITH = 'endsWith',
}

export enum DATA_CUBE_COLUMN_SORT_DIRECTION {
  ASCENDING = 'ascending',
  DESCENDING = 'descending',
}
