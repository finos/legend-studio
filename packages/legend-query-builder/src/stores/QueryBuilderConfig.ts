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

export enum QUERY_BUILDER_SOURCE_ID_LABEL {
  QUERY_BUILDER = 'query-builder',
  PROJECTION = 'projection',
}

export const DEFAULT_LAMBDA_VARIABLE_NAME = 'x';
export const DEFAULT_VARIABLE_NAME = 'var';
export const DEFAULT_CONSTANT_VARIABLE_NAME = 'c_var';
export const DEFAULT_POST_FILTER_LAMBDA_VARIABLE_NAME = 'row';

export const QUERY_BUILDER_PROPERTY_SEARCH_MAX_DEPTH = 5;
export const QUERY_BUILDER_PROPERTY_SEARCH_MAX_NODES = 10000;
export const QUERY_BUILDER_PROPERTY_SEARCH_RESULTS_LIMIT = 100;

export enum QUERY_BUILDER_PROPERTY_SEARCH_TYPE {
  CLASS = 'CLASS',
  STRING = 'STRING',
  BOOLEAN = 'BOOLEAN',
  NUMBER = 'NUMBER',
  DATE = 'DATE',
}
