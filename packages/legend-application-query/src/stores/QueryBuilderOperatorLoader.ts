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

import { QueryBuilderAggregateOperator_Count } from './aggregateOperators/QueryBuilderAggregateOperator_Count.js';
import { QueryBuilderAggregateOperator_Distinct } from './aggregateOperators/QueryBuilderAggregateOperator_Distinct.js';
import { QueryBuilderAggregateOperator_Sum } from './aggregateOperators/QueryBuilderAggregateOperator_Sum.js';
import { QueryBuilderAggregateOperator_Average } from './aggregateOperators/QueryBuilderAggregateOperator_Average.js';
import { QueryBuilderAggregateOperator_StdDev_Population } from './aggregateOperators/QueryBuilderAggregateOperator_StdDev_Population.js';
import { QueryBuilderAggregateOperator_StdDev_Sample } from './aggregateOperators/QueryBuilderAggregateOperator_StdDev_Sample.js';
import { QueryBuilderAggregateOperator_DistinctCount } from './aggregateOperators/QueryBuilderAggregateOperator_DistinctCount.js';
import { QueryBuilderAggregateOperator_Min } from './aggregateOperators/QueryBuilderAggregateOperator_Min.js';
import { QueryBuilderAggregateOperator_Max } from './aggregateOperators/QueryBuilderAggregateOperator_Max.js';
import { QueryBuilderAggregateOperator_JoinString } from './aggregateOperators/QueryBuilderAggregateOperator_JoinString.js';
import {
  QueryBuilderFilterOperator_Equal,
  QueryBuilderFilterOperator_NotEqual,
} from './filterOperators/QueryBuilderFilterOperator_Equal.js';
import { QueryBuilderFilterOperator_GreaterThan } from './filterOperators/QueryBuilderFilterOperator_GreaterThan.js';
import {
  QueryBuilderFilterOperator_NotStartWith,
  QueryBuilderFilterOperator_StartWith,
} from './filterOperators/QueryBuilderFilterOperator_StartWith.js';
import { QueryBuilderFilterOperator_GreaterThanEqual } from './filterOperators/QueryBuilderFilterOperator_GreaterThanEqual.js';
import { QueryBuilderFilterOperator_LessThanEqual } from './filterOperators/QueryBuilderFilterOperator_LessThanEqual.js';
import { QueryBuilderFilterOperator_LessThan } from './filterOperators/QueryBuilderFilterOperator_LessThan.js';
import {
  QueryBuilderFilterOperator_EndWith,
  QueryBuilderFilterOperator_NotEndWith,
} from './filterOperators/QueryBuilderFilterOperator_EndWith.js';
import {
  QueryBuilderFilterOperator_Contain,
  QueryBuilderFilterOperator_NotContain,
} from './filterOperators/QueryBuilderFilterOperator_Contain.js';
import {
  QueryBuilderFilterOperator_IsEmpty,
  QueryBuilderFilterOperator_IsNotEmpty,
} from './filterOperators/QueryBuilderFilterOperator_IsEmpty.js';
import {
  QueryBuilderFilterOperator_In,
  QueryBuilderFilterOperator_NotIn,
} from './filterOperators/QueryBuilderFilterOperator_In.js';
import {
  QueryBuilderPostFilterOperator_In,
  QueryBuilderPostFilterOperator_NotIn,
} from './postFilterOperators/QueryBuilderPostFilterOperator_In.js';
import {
  QueryBuilderPostFilterOperator_IsEmpty,
  QueryBuilderPostFilterOperator_IsNotEmpty,
} from './postFilterOperators/QueryBuilderPostFilterOperator_IsEmpty.js';
import {
  QueryBuilderPostFilterOperator_Equal,
  QueryBuilderPostFilterOperator_NotEqual,
} from './postFilterOperators/QueryBuilderPostFilterOperator_Equal.js';
import { QueryBuilderPostFilterOperator_LessThan } from './postFilterOperators/QueryBuilderPostFilterOperator_LessThan.js';
import { QueryBuilderPostFilterOperator_LessThanEqual } from './postFilterOperators/QueryBuilderPostFilterOperator_LessThanEqual.js';
import { QueryBuilderPostFilterOperator_GreaterThan } from './postFilterOperators/QueryBuilderPostFilterOperator_GreaterThan.js';
import { QueryBuilderPostFilterOperator_GreaterThanEqual } from './postFilterOperators/QueryBuilderPostFilterOperator_GreaterThanEqual.js';
import {
  QueryBuilderPostFilterOperator_NotStartWith,
  QueryBuilderPostFilterOperator_StartWith,
} from './postFilterOperators/QueryBuilderPostFilterOperator_StartWith.js';
import {
  QueryBuilderPostFilterOperator_Contain,
  QueryBuilderPostFilterOperator_NotContain,
} from './postFilterOperators/QueryBuilderPostFilterOperator_Contain.js';
import {
  QueryBuilderPostFilterOperator_EndWith,
  QueryBuilderPostFilterOperator_NotEndWith,
} from './postFilterOperators/QueryBuilderPostFilterOperator_EndWith.js';

export const AGGREGATION_OPERATORS = [
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

export const FILTER_OPERATORS = [
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

export const POST_FILTER_OPERATORS = [
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
