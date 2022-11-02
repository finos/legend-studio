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

import type { QueryBuilderTDS_OLAPOperator } from './operators/QueryBuilderTDS_OLAPOperator.js';
import { QueryBuilderTDS_OLAPRankOperator_AverageRank } from './operators/QueryBuilderTDS_OLAPRankOperator_AverageRank.js';
import { QueryBuilderTDS_OLAPRankOperator_DenseRank } from './operators/QueryBuilderTDS_OLAPRankOperator_DenseRank.js';
import { QueryBuilderTDS_OLAPRankOperator_Rank } from './operators/QueryBuilderTDS_OLAPRankOperator_Rank.js';
import { QueryBuilderTDS_OLAPRankOperator_RowNumber } from './operators/QueryBuilderTDS_OLAPRankOperator_RowNumber.js';
import { QueryBuilderTDS_OLAPOperator_Sum } from './operators/QueryBuilderTDS_OLAPOperator_Sum.js';
import { QueryBuilderTDS_OLAPOperator_Count } from './operators/QueryBuilderTDS_OLAPOperator_Count.js';
import { QueryBuilderTDS_OLAPOperator_Max } from './operators/QueryBuilderTDS_OLAPOperator_Max.js';
import { QueryBuilderTDS_OLAPOperator_Min } from './operators/QueryBuilderTDS_OLAPOperator_Min.js';
import { QueryBuilderTDS_OLAPOperator_Average } from './operators/QueryBuilderTDS_OLAPOperator_Average.js';

export const getQueryBuilderCoreOLAPGroupByOperators =
  (): QueryBuilderTDS_OLAPOperator[] => [
    new QueryBuilderTDS_OLAPOperator_Sum(),
    new QueryBuilderTDS_OLAPOperator_Count(),
    new QueryBuilderTDS_OLAPOperator_Max(),
    new QueryBuilderTDS_OLAPOperator_Min(),
    new QueryBuilderTDS_OLAPOperator_Average(),
    new QueryBuilderTDS_OLAPRankOperator_AverageRank(),
    new QueryBuilderTDS_OLAPRankOperator_DenseRank(),
    new QueryBuilderTDS_OLAPRankOperator_Rank(),
    new QueryBuilderTDS_OLAPRankOperator_RowNumber(),
  ];
