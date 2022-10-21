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

export enum QUERY_BUILDER_SUPPORTED_FUNCTIONS {
  AND = 'meta::pure::functions::boolean::and',
  EXISTS = 'meta::pure::functions::collection::exists',
  FILTER = 'meta::pure::functions::collection::filter',
  GET_ALL = 'meta::pure::functions::collection::getAll',
  NOT = 'meta::pure::functions::boolean::not',
  OR = 'meta::pure::functions::boolean::or',
  TAKE = 'meta::pure::functions::collection::take',
  SUBTYPE = 'meta::pure::functions::lang::subType',

  // graph-fetch
  GRAPH_FETCH = 'meta::pure::graphFetch::execution::graphFetch',
  GRAPH_FETCH_CHECKED = 'meta::pure::graphFetch::execution::graphFetchChecked',
  SERIALIZE = 'meta::pure::graphFetch::execution::serialize',

  // TDS
  TDS_FILTER = 'meta::pure::tds::filter',
  TDS_ASC = 'meta::pure::tds::asc',
  TDS_DESC = 'meta::pure::tds::desc',
  TDS_AGG = 'meta::pure::tds::agg',
  TDS_DISTINCT = 'meta::pure::tds::distinct',
  TDS_PROJECT = 'meta::pure::tds::project',
  TDS_GROUP_BY = 'meta::pure::tds::groupBy',
  TDS_SORT = 'meta::pure::tds::sort',
  TDS_TAKE = 'meta::pure::tds::take',
  TDS_FUNC = 'meta::pure::tds::func',

  // filter
  CONTAINS = 'meta::pure::functions::string::contains',
  ENDS_WITH = 'meta::pure::functions::string::endsWith',
  EQUAL = 'meta::pure::functions::boolean::equal',
  GREATER_THAN = 'meta::pure::functions::lang::tests::greaterThan',
  GREATER_THAN_EQUAL = 'meta::pure::functions::lang::tests::greaterThanEqual',
  IN = 'meta::pure::functions::collection::in',
  IS_EMPTY = 'meta::pure::functions::collection::isEmpty',
  LESS_THAN = 'meta::pure::functions::lang::tests::lessThan',
  LESS_THAN_EQUAL = 'meta::pure::functions::lang::tests::lessThanEqual',
  STARTS_WITH = 'meta::pure::functions::string::startsWith',
  // aggregation
  AVERAGE = 'meta::pure::functions::math::average',
  COUNT = 'meta::pure::functions::collection::count',
  JOIN_STRINGS = 'meta::pure::functions::string::joinStrings',
  DISTINCT = 'meta::pure::functions::collection::distinct',
  DATE_MAX = 'meta::pure::functions::date::max',
  DATE_MIN = 'meta::pure::functions::date::min',
  MAX = 'meta::pure::functions::math::max',
  MIN = 'meta::pure::functions::math::min',
  STD_DEV_POPULATION = 'meta::pure::functions::math::stdDevPopulation',
  STD_DEV_SAMPLE = 'meta::pure::functions::math::stdDevSample',
  SUM = 'meta::pure::functions::math::sum',
  UNIQUE_VALUE_ONLY = 'meta::pure::functions::collection::uniqueValueOnly',
  // OLAP
  OLAP_GROUPBY = 'meta::pure::tds::olapGroupBy',
  OLAP_RANK = 'meta::pure::functions::math::olap::rank',
  OLAP_AVERAGE_RANK = 'meta::pure::functions::math::olap::averageRank',
  OLAP_DENSE_RANK = 'meta::pure::functions::math::olap::denseRank',
  OLAP_ROW_NUMBER = 'meta::pure::functions::math::olap::rowNumber',
}
