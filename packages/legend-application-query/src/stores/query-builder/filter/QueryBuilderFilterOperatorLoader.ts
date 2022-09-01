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

import {
  QueryBuilderFilterOperator_Equal,
  QueryBuilderFilterOperator_NotEqual,
} from './operators/QueryBuilderFilterOperator_Equal.js';
import { QueryBuilderFilterOperator_GreaterThan } from './operators/QueryBuilderFilterOperator_GreaterThan.js';
import {
  QueryBuilderFilterOperator_NotStartWith,
  QueryBuilderFilterOperator_StartWith,
} from './operators/QueryBuilderFilterOperator_StartWith.js';
import { QueryBuilderFilterOperator_GreaterThanEqual } from './operators/QueryBuilderFilterOperator_GreaterThanEqual.js';
import { QueryBuilderFilterOperator_LessThanEqual } from './operators/QueryBuilderFilterOperator_LessThanEqual.js';
import { QueryBuilderFilterOperator_LessThan } from './operators/QueryBuilderFilterOperator_LessThan.js';
import {
  QueryBuilderFilterOperator_EndWith,
  QueryBuilderFilterOperator_NotEndWith,
} from './operators/QueryBuilderFilterOperator_EndWith.js';
import {
  QueryBuilderFilterOperator_Contain,
  QueryBuilderFilterOperator_NotContain,
} from './operators/QueryBuilderFilterOperator_Contain.js';
import {
  QueryBuilderFilterOperator_IsEmpty,
  QueryBuilderFilterOperator_IsNotEmpty,
} from './operators/QueryBuilderFilterOperator_IsEmpty.js';
import {
  QueryBuilderFilterOperator_In,
  QueryBuilderFilterOperator_NotIn,
} from './operators/QueryBuilderFilterOperator_In.js';
import type { QueryBuilderFilterOperator } from './QueryBuilderFilterOperator.js';

export const getQueryBuilderCoreFilterOperators =
  (): QueryBuilderFilterOperator[] => [
    new QueryBuilderFilterOperator_Equal(),
    new QueryBuilderFilterOperator_NotEqual(),
    new QueryBuilderFilterOperator_LessThan(),
    new QueryBuilderFilterOperator_LessThanEqual(),
    new QueryBuilderFilterOperator_GreaterThan(),
    new QueryBuilderFilterOperator_GreaterThanEqual(),
    new QueryBuilderFilterOperator_StartWith(),
    new QueryBuilderFilterOperator_NotStartWith(),
    new QueryBuilderFilterOperator_Contain(),
    new QueryBuilderFilterOperator_NotContain(),
    new QueryBuilderFilterOperator_EndWith(),
    new QueryBuilderFilterOperator_NotEndWith(),
    new QueryBuilderFilterOperator_In(),
    new QueryBuilderFilterOperator_NotIn(),
    new QueryBuilderFilterOperator_IsEmpty(),
    new QueryBuilderFilterOperator_IsNotEmpty(),
  ];
