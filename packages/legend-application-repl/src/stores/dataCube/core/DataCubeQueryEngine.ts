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

import type { V1_AppliedFunction } from '@finos/legend-graph';

export enum DataCubeFunction {
  // relation
  EXTEND = 'meta::pure::functions::relation::extend',
  FILTER = 'meta::pure::functions::relation::filter',
  GROUP_BY = 'meta::pure::functions::relation::groupBy',
  LIMIT = 'meta::pure::functions::relation::limit',
  PIVOT = 'meta::pure::functions::relation::pivot',
  // RENAME = 'meta::pure::functions::relation::rename',
  SELECT = 'meta::pure::functions::relation::select',
  SLICE = 'meta::pure::functions::relation::slice',
  SORT = 'meta::pure::functions::relation::sort',

  // generic
  CAST = 'meta::pure::functions::lang::cast',
  FROM = 'meta::pure::mapping::from',

  // sort
  ASC = 'meta::pure::functions::relation::ascending',
  DESC = 'meta::pure::functions::relation::descending',

  // filter
  AND = 'meta::pure::functions::boolean::and',
  NOT = 'meta::pure::functions::boolean::not',
  OR = 'meta::pure::functions::boolean::or',

  CONTAINS = 'meta::pure::functions::string::contains',
  ENDS_WITH = 'meta::pure::functions::string::endsWith',
  EQUAL = 'meta::pure::functions::boolean::equal',
  GREATER_THAN = 'meta::pure::functions::boolean::greaterThan',
  GREATER_THAN_EQUAL = 'meta::pure::functions::boolean::greaterThanEqual',
  IN = 'meta::pure::functions::collection::in',
  IS_EMPTY = 'meta::pure::functions::collection::isEmpty',
  LESS_THAN = 'meta::pure::functions::boolean::lessThan',
  LESS_THAN_EQUAL = 'meta::pure::functions::boolean::lessThanEqual',
  STARTS_WITH = 'meta::pure::functions::string::startsWith',

  // aggregate
  AVERAGE = 'meta::pure::functions::math::average',
  COUNT = 'meta::pure::functions::collection::count',
  DISTINCT = 'meta::pure::functions::collection::distinct',
  FIRST = 'meta::pure::functions::collection::first',
  JOIN_STRINGS = 'meta::pure::functions::string::joinStrings',
  LAST = 'meta::pure::functions::collection::last',
  MAX = 'meta::pure::functions::collection::max',
  MIN = 'meta::pure::functions::collection::min',
  SUM = 'meta::pure::functions::math::sum',
  STD_DEV_POPULATION = 'meta::pure::functions::math::stdDevPopulation',
  STD_DEV_SAMPLE = 'meta::pure::functions::math::stdDevSample',
  UNIQUE_VALUE_ONLY = 'meta::pure::functions::collection::uniqueValueOnly',
}

export const DEFAULT_LAMBDA_VARIABLE_NAME = 'x';
export const PIVOT_COLUMN_NAME_VALUE_SEPARATOR = '__|__';

export type DataCubeQueryFunctionMap = {
  leafExtend?: V1_AppliedFunction | undefined;
  filter?: V1_AppliedFunction | undefined;
  groupBy?: V1_AppliedFunction | undefined;
  groupByExtend?: V1_AppliedFunction | undefined; // used to populate empty columns erased by groupBy()
  pivotExtend?: V1_AppliedFunction | undefined; // used to populate columns erased by pivot()
  pivot?: V1_AppliedFunction | undefined;
  pivotCast?: V1_AppliedFunction | undefined; // used to set the relation type post pivot() to make compilation works properly
  groupExtend?: V1_AppliedFunction | undefined;
  select?: V1_AppliedFunction | undefined;
  sort?: V1_AppliedFunction | undefined;
  limit?: V1_AppliedFunction | undefined;
};
