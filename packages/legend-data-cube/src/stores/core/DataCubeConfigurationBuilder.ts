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

import { PRIMITIVE_TYPE } from '@finos/legend-graph';
import {
  DataCubeColumnConfiguration,
  DataCubeConfiguration,
} from './models/DataCubeConfiguration.js';
import {
  DataCubeQueryAggregateOperator,
  DataCubeColumnKind,
  DataCubeFontTextAlignment,
} from './DataCubeQueryEngine.js';
import type { DataCubeColumn } from './models/DataCubeColumn.js';

export function buildDefaultColumnConfiguration(
  column: DataCubeColumn,
): DataCubeColumnConfiguration {
  const { name, type } = column;
  const config = new DataCubeColumnConfiguration(name, type);
  switch (type) {
    case PRIMITIVE_TYPE.NUMBER:
    case PRIMITIVE_TYPE.INTEGER:
    case PRIMITIVE_TYPE.DECIMAL:
    case PRIMITIVE_TYPE.FLOAT: {
      config.kind = DataCubeColumnKind.MEASURE;
      config.decimals = type === PRIMITIVE_TYPE.INTEGER ? 0 : 2;
      config.displayCommas = true;
      config.negativeNumberInParens = true;
      config.textAlign = DataCubeFontTextAlignment.RIGHT; // always align number to the right
      config.excludedFromPivot = false;
      config.aggregateOperator = DataCubeQueryAggregateOperator.SUM;
      config.pivotStatisticColumnFunction = DataCubeQueryAggregateOperator.SUM;
      break;
    }
    default: {
      config.kind = DataCubeColumnKind.DIMENSION;
      config.excludedFromPivot = true;
      config.aggregateOperator = DataCubeQueryAggregateOperator.UNIQUE;
      break;
    }
  }
  return config;
}

export function buildDefaultConfiguration(
  columns: DataCubeColumn[],
): DataCubeConfiguration {
  const configuration = new DataCubeConfiguration();
  configuration.columns = columns.map((column) =>
    buildDefaultColumnConfiguration(column),
  );
  return configuration;
}
