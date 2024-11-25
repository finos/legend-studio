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

import { QueryBuilderAggregateOperator_Count } from './operators/QueryBuilderAggregateOperator_Count.js';
import { QueryBuilderAggregateOperator_Distinct } from './operators/QueryBuilderAggregateOperator_Distinct.js';
import { QueryBuilderAggregateOperator_Sum } from './operators/QueryBuilderAggregateOperator_Sum.js';
import { QueryBuilderAggregateOperator_Average } from './operators/QueryBuilderAggregateOperator_Average.js';
import { QueryBuilderAggregateOperator_StdDev_Population } from './operators/QueryBuilderAggregateOperator_StdDev_Population.js';
import { QueryBuilderAggregateOperator_StdDev_Sample } from './operators/QueryBuilderAggregateOperator_StdDev_Sample.js';
import { QueryBuilderAggregateOperator_DistinctCount } from './operators/QueryBuilderAggregateOperator_DistinctCount.js';
import { QueryBuilderAggregateOperator_Min } from './operators/QueryBuilderAggregateOperator_Min.js';
import { QueryBuilderAggregateOperator_Max } from './operators/QueryBuilderAggregateOperator_Max.js';
import { QueryBuilderAggregateOperator_JoinString } from './operators/QueryBuilderAggregateOperator_JoinString.js';
import type { QueryBuilderAggregateOperator } from './QueryBuilderAggregateOperator.js';
import { QueryBuilderAggregateOperator_Percentile } from './operators/QueryBuilderAggregateOperator_Percentile.js';
import { QueryBuilderAggregateOperator_Wavg } from './operators/QueryBuilderAggregateOperator_Wavg.js';

export const getQueryBuilderCoreAggregrationOperators =
  (): QueryBuilderAggregateOperator[] => [
    new QueryBuilderAggregateOperator_Count(),
    new QueryBuilderAggregateOperator_DistinctCount(),
    new QueryBuilderAggregateOperator_Distinct(),
    new QueryBuilderAggregateOperator_Sum(),
    new QueryBuilderAggregateOperator_Average(),
    new QueryBuilderAggregateOperator_Min(),
    new QueryBuilderAggregateOperator_Max(),
    new QueryBuilderAggregateOperator_Percentile(),
    new QueryBuilderAggregateOperator_StdDev_Population(),
    new QueryBuilderAggregateOperator_StdDev_Sample(),
    new QueryBuilderAggregateOperator_JoinString(),
    new QueryBuilderAggregateOperator_Wavg(),
  ];
