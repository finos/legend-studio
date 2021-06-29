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

export enum QUERY_BUILDER_TEST_ID {
  QUERY_BUILDER = 'query__builder',
  QUERY_BUILDER_SETUP = 'query__builder__setup',
  QUERY_BUILDER_PROJECTION = 'query__builder__projection',
  QUERY_BUILDER_GRAPH_FETCH = 'query__builder__graph__fetch',
  QUERY_BUILDER_FILTER = 'query__builder__filter',
}

export enum SUPPORTED_FUNCTIONS {
  TDS_ASC = 'asc', // meta::pure::tds::asc
  TDS_DESC = 'desc', // meta::pure::tds::desc
  TDS_AGG = 'agg', // meta::pure::tds::agg
  TDS_COL = 'col', // meta::pure::tds::col
  TDS_DISTINCT = 'distinct', // meta::pure::tds::distinct
  TDS_PROJECT = 'project', // meta::pure::tds::project
  TDS_GROUP_BY = 'groupBy', // meta::pure::tds::groupBy
  TDS_SORT = 'sort', // meta::pure::tds::sort
  TDS_TAKE = 'take', // meta::pure::tds::take
  EXISTS = 'exists', // meta::pure::functions::collection::exists
  FILTER = 'filter', // meta::pure::functions::collection::filter
  GET_ALL = 'getAll', // meta::pure::functions::collection::getAll
  GRAPH_FETCH = 'graphFetch', // meta::pure::graphFetch::execution::graphFetch
  GRAPH_FETCH_CHECKED = 'graphFetchChecked', // meta::pure::graphFetch::execution::graphFetchChecked
  SERIALIZE = 'serialize', // meta::pure::graphFetch::execution::serialize
  NOT = 'not', // meta::pure::functions::boolean::not
  TAKE = 'take', // meta::pure::functions::collection::take
}

export const DEFAULT_LAMBDA_VARIABLE_NAME = 'x';
