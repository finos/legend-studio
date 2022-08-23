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

import { QueryBuilderAggregateOperator_Count } from './fetch-structure/projection/aggregation/operators/QueryBuilderAggregateOperator_Count.js';
import { QueryBuilderAggregateOperator_Distinct } from './fetch-structure/projection/aggregation/operators/QueryBuilderAggregateOperator_Distinct.js';
import { QueryBuilderAggregateOperator_Sum } from './fetch-structure/projection/aggregation/operators/QueryBuilderAggregateOperator_Sum.js';
import { QueryBuilderAggregateOperator_Average } from './fetch-structure/projection/aggregation/operators/QueryBuilderAggregateOperator_Average.js';
import { QueryBuilderAggregateOperator_StdDev_Population } from './fetch-structure/projection/aggregation/operators/QueryBuilderAggregateOperator_StdDev_Population.js';
import { QueryBuilderAggregateOperator_StdDev_Sample } from './fetch-structure/projection/aggregation/operators/QueryBuilderAggregateOperator_StdDev_Sample.js';
import { QueryBuilderAggregateOperator_DistinctCount } from './fetch-structure/projection/aggregation/operators/QueryBuilderAggregateOperator_DistinctCount.js';
import { QueryBuilderAggregateOperator_Min } from './fetch-structure/projection/aggregation/operators/QueryBuilderAggregateOperator_Min.js';
import { QueryBuilderAggregateOperator_Max } from './fetch-structure/projection/aggregation/operators/QueryBuilderAggregateOperator_Max.js';
import { QueryBuilderAggregateOperator_JoinString } from './fetch-structure/projection/aggregation/operators/QueryBuilderAggregateOperator_JoinString.js';
import {
  QueryBuilderFilterOperator_Equal,
  QueryBuilderFilterOperator_NotEqual,
} from './filter/operators/QueryBuilderFilterOperator_Equal.js';
import { QueryBuilderFilterOperator_GreaterThan } from './filter/operators/QueryBuilderFilterOperator_GreaterThan.js';
import {
  QueryBuilderFilterOperator_NotStartWith,
  QueryBuilderFilterOperator_StartWith,
} from './filter/operators/QueryBuilderFilterOperator_StartWith.js';
import { QueryBuilderFilterOperator_GreaterThanEqual } from './filter/operators/QueryBuilderFilterOperator_GreaterThanEqual.js';
import { QueryBuilderFilterOperator_LessThanEqual } from './filter/operators/QueryBuilderFilterOperator_LessThanEqual.js';
import { QueryBuilderFilterOperator_LessThan } from './filter/operators/QueryBuilderFilterOperator_LessThan.js';
import {
  QueryBuilderFilterOperator_EndWith,
  QueryBuilderFilterOperator_NotEndWith,
} from './filter/operators/QueryBuilderFilterOperator_EndWith.js';
import {
  QueryBuilderFilterOperator_Contain,
  QueryBuilderFilterOperator_NotContain,
} from './filter/operators/QueryBuilderFilterOperator_Contain.js';
import {
  QueryBuilderFilterOperator_IsEmpty,
  QueryBuilderFilterOperator_IsNotEmpty,
} from './filter/operators/QueryBuilderFilterOperator_IsEmpty.js';
import {
  QueryBuilderFilterOperator_In,
  QueryBuilderFilterOperator_NotIn,
} from './filter/operators/QueryBuilderFilterOperator_In.js';
import {
  QueryBuilderPostFilterOperator_In,
  QueryBuilderPostFilterOperator_NotIn,
} from './fetch-structure/projection/post-filter/operators/QueryBuilderPostFilterOperator_In.js';
import {
  QueryBuilderPostFilterOperator_IsEmpty,
  QueryBuilderPostFilterOperator_IsNotEmpty,
} from './fetch-structure/projection/post-filter/operators/QueryBuilderPostFilterOperator_IsEmpty.js';
import {
  QueryBuilderPostFilterOperator_Equal,
  QueryBuilderPostFilterOperator_NotEqual,
} from './fetch-structure/projection/post-filter/operators/QueryBuilderPostFilterOperator_Equal.js';
import { QueryBuilderPostFilterOperator_LessThan } from './fetch-structure/projection/post-filter/operators/QueryBuilderPostFilterOperator_LessThan.js';
import { QueryBuilderPostFilterOperator_LessThanEqual } from './fetch-structure/projection/post-filter/operators/QueryBuilderPostFilterOperator_LessThanEqual.js';
import { QueryBuilderPostFilterOperator_GreaterThan } from './fetch-structure/projection/post-filter/operators/QueryBuilderPostFilterOperator_GreaterThan.js';
import { QueryBuilderPostFilterOperator_GreaterThanEqual } from './fetch-structure/projection/post-filter/operators/QueryBuilderPostFilterOperator_GreaterThanEqual.js';
import {
  QueryBuilderPostFilterOperator_NotStartWith,
  QueryBuilderPostFilterOperator_StartWith,
} from './fetch-structure/projection/post-filter/operators/QueryBuilderPostFilterOperator_StartWith.js';
import {
  QueryBuilderPostFilterOperator_Contain,
  QueryBuilderPostFilterOperator_NotContain,
} from './fetch-structure/projection/post-filter/operators/QueryBuilderPostFilterOperator_Contain.js';
import {
  QueryBuilderPostFilterOperator_EndWith,
  QueryBuilderPostFilterOperator_NotEndWith,
} from './fetch-structure/projection/post-filter/operators/QueryBuilderPostFilterOperator_EndWith.js';
import type { QueryBuilderFilterOperator } from './filter/QueryBuilderFilterState.js';
import type { QueryBuilderAggregateOperator } from './fetch-structure/projection/aggregation/QueryBuilderAggregateOperator.js';
import type { QueryBuilderPostFilterOperator } from './fetch-structure/projection/post-filter/QueryBuilderPostFilterOperator.js';

export const getQueryBuilderCoreAggregrationOperators =
  (): QueryBuilderAggregateOperator[] => [
    new QueryBuilderAggregateOperator_Count(),
    new QueryBuilderAggregateOperator_DistinctCount(),
    new QueryBuilderAggregateOperator_Distinct(),
    new QueryBuilderAggregateOperator_Sum(),
    new QueryBuilderAggregateOperator_Average(),
    new QueryBuilderAggregateOperator_Min(),
    new QueryBuilderAggregateOperator_Max(),
    new QueryBuilderAggregateOperator_StdDev_Population(),
    new QueryBuilderAggregateOperator_StdDev_Sample(),
    new QueryBuilderAggregateOperator_JoinString(),
  ];

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
