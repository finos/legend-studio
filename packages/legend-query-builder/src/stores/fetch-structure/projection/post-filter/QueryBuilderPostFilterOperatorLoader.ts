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
  QueryBuilderPostFilterOperator_In,
  QueryBuilderPostFilterOperator_NotIn,
} from './operators/QueryBuilderPostFilterOperator_In.js';
import {
  QueryBuilderPostFilterOperator_IsEmpty,
  QueryBuilderPostFilterOperator_IsNotEmpty,
} from './operators/QueryBuilderPostFilterOperator_IsEmpty.js';
import {
  QueryBuilderPostFilterOperator_Equal,
  QueryBuilderPostFilterOperator_NotEqual,
} from './operators/QueryBuilderPostFilterOperator_Equal.js';
import { QueryBuilderPostFilterOperator_LessThan } from './operators/QueryBuilderPostFilterOperator_LessThan.js';
import { QueryBuilderPostFilterOperator_LessThanEqual } from './operators/QueryBuilderPostFilterOperator_LessThanEqual.js';
import { QueryBuilderPostFilterOperator_GreaterThan } from './operators/QueryBuilderPostFilterOperator_GreaterThan.js';
import { QueryBuilderPostFilterOperator_GreaterThanEqual } from './operators/QueryBuilderPostFilterOperator_GreaterThanEqual.js';
import {
  QueryBuilderPostFilterOperator_NotStartWith,
  QueryBuilderPostFilterOperator_StartWith,
} from './operators/QueryBuilderPostFilterOperator_StartWith.js';
import {
  QueryBuilderPostFilterOperator_Contain,
  QueryBuilderPostFilterOperator_NotContain,
} from './operators/QueryBuilderPostFilterOperator_Contain.js';
import {
  QueryBuilderPostFilterOperator_EndWith,
  QueryBuilderPostFilterOperator_NotEndWith,
} from './operators/QueryBuilderPostFilterOperator_EndWith.js';
import type { QueryBuilderPostFilterOperator } from './QueryBuilderPostFilterOperator.js';

export const getQueryBuilderCorePostFilterOperators =
  (): QueryBuilderPostFilterOperator[] => [
    new QueryBuilderPostFilterOperator_Equal(),
    new QueryBuilderPostFilterOperator_NotEqual(),
    new QueryBuilderPostFilterOperator_LessThan(),
    new QueryBuilderPostFilterOperator_LessThanEqual(),
    new QueryBuilderPostFilterOperator_GreaterThan(),
    new QueryBuilderPostFilterOperator_GreaterThanEqual(),
    new QueryBuilderPostFilterOperator_StartWith(),
    new QueryBuilderPostFilterOperator_NotStartWith(),
    new QueryBuilderPostFilterOperator_Contain(),
    new QueryBuilderPostFilterOperator_NotContain(),
    new QueryBuilderPostFilterOperator_EndWith(),
    new QueryBuilderPostFilterOperator_NotEndWith(),
    new QueryBuilderPostFilterOperator_In(),
    new QueryBuilderPostFilterOperator_NotIn(),
    new QueryBuilderPostFilterOperator_IsEmpty(),
    new QueryBuilderPostFilterOperator_IsNotEmpty(),
  ];
