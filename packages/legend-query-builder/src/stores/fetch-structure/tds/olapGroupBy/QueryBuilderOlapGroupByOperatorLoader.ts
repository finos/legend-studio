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

import type { QueryBuilderTDSOlapOperator } from './operators/QueryBuilderTdsOlapOperator.js';
import { QueryBuilderTDSOlapRankOperator_AverageRank } from './operators/QueryBuilderTdsOlapRankOperator_AverageRank.js';
import { QueryBuilderTDSOlapRankOperator_DenseRank } from './operators/QueryBuilderTdsOlapRankOperator_DenseRank.js';
import { QueryBuilderTDSOlapRankOperator_Rank } from './operators/QueryBuilderTdsOlapRankOperator_Rank.js';
import { QueryBuilderTDSOlapRankOperator_RowNumber } from './operators/QueryBuilderTdsOlapRankOperator_RowNumber.js';
import { QueryBuilderTDSOlapOperator_Sum } from './operators/QueryBuilderTDSOlapOperator_Sum.js';
import { QueryBuilderTDSOlapOperator_Count } from './operators/QueryBuilderTDSOlapOperator_Count.js';
import { QueryBuilderTDSOlapOperator_Max } from './operators/QueryBuilderTDSOlapOperator_Max.js';
import { QueryBuilderTDSOlapOperator_Min } from './operators/QueryBuilderTDSOlapOperator_Min.js';
import { QueryBuilderTDSOlapOperator_Average } from './operators/QueryBuilderTDSOlapOperator_Average.js';

export const getQueryBuilderCoreOlapGroupByOperators =
  (): QueryBuilderTDSOlapOperator[] => [
    new QueryBuilderTDSOlapOperator_Sum(),
    new QueryBuilderTDSOlapOperator_Count(),
    new QueryBuilderTDSOlapOperator_Max(),
    new QueryBuilderTDSOlapOperator_Min(),
    new QueryBuilderTDSOlapOperator_Average(),
    new QueryBuilderTDSOlapRankOperator_AverageRank(),
    new QueryBuilderTDSOlapRankOperator_DenseRank(),
    new QueryBuilderTDSOlapRankOperator_Rank(),
    new QueryBuilderTDSOlapRankOperator_RowNumber(),
  ];
