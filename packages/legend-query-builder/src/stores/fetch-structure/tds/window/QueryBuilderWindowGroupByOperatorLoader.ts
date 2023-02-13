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

import type { QueryBuilderTDS_WindowOperator } from './operators/QueryBuilderTDS_WindowOperator.js';
import { QueryBuilderTDS_WindowRankOperator_AverageRank } from './operators/QueryBuilderTDS_WindowRankOperator_AverageRank.js';
import { QueryBuilderTDS_WindowRankOperator_DenseRank } from './operators/QueryBuilderTDS_WindowRankOperator_DenseRank.js';
import { QueryBuilderTDS_WindowRankOperator_Rank } from './operators/QueryBuilderTDS_WindowRankOperator_Rank.js';
import { QueryBuilderTDS_WindowRankOperator_RowNumber } from './operators/QueryBuilderTDS_WindowRankOperator_RowNumber.js';
import { QueryBuilderTDS_WindowOperator_Sum } from './operators/QueryBuilderTDS_WindowOperator_Sum.js';
import { QueryBuilderTDS_WindowOperator_Count } from './operators/QueryBuilderTDS_WindowOperator_Count.js';
import { QueryBuilderTDS_WindowOperator_Max } from './operators/QueryBuilderTDS_WindowOperator_Max.js';
import { QueryBuilderTDS_WindowOperator_Min } from './operators/QueryBuilderTDS_WindowOperator_Min.js';
import { QueryBuilderTDS_WindowOperator_Average } from './operators/QueryBuilderTDS_WindowOperator_Average.js';

export const getQueryBuilderCoreWindowOperators =
  (): QueryBuilderTDS_WindowOperator[] => [
    new QueryBuilderTDS_WindowOperator_Sum(),
    new QueryBuilderTDS_WindowOperator_Count(),
    new QueryBuilderTDS_WindowOperator_Max(),
    new QueryBuilderTDS_WindowOperator_Min(),
    new QueryBuilderTDS_WindowOperator_Average(),
    new QueryBuilderTDS_WindowRankOperator_AverageRank(),
    new QueryBuilderTDS_WindowRankOperator_DenseRank(),
    new QueryBuilderTDS_WindowRankOperator_Rank(),
    new QueryBuilderTDS_WindowRankOperator_RowNumber(),
  ];
