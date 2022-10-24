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

import { hashArray } from '@finos/legend-shared';
import { type Type, PRIMITIVE_TYPE } from '@finos/legend-graph';
import { QueryBuilderTDSOlapOperator } from './QueryBuilderTDSOlapOperator.js';
import { QUERY_BUILDER_HASH_STRUCTURE } from '../../../../../graphManager/QueryBuilderHashUtils.js';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../../../../graphManager/QueryBuilderSupportedFunctions.js';

export class QueryBuilderTDSOlapOperator_Min extends QueryBuilderTDSOlapOperator {
  override isColumnAggregator(): boolean {
    return true;
  }

  getLabel(): string {
    return 'min';
  }
  get pureFunc(): string {
    return QUERY_BUILDER_SUPPORTED_FUNCTIONS.MIN;
  }

  get hashCode(): string {
    return hashArray([QUERY_BUILDER_HASH_STRUCTURE.OLAP_OPERATOR_MIN]);
  }

  isCompatibleWithType(type: Type | undefined): boolean {
    if (type) {
      return (
        [
          PRIMITIVE_TYPE.BOOLEAN,
          PRIMITIVE_TYPE.NUMBER,
          PRIMITIVE_TYPE.INTEGER,
          PRIMITIVE_TYPE.DECIMAL,
          PRIMITIVE_TYPE.FLOAT,
          PRIMITIVE_TYPE.DATE,
          PRIMITIVE_TYPE.STRICTDATE,
          PRIMITIVE_TYPE.DATETIME,
        ] as string[]
      ).includes(type.path);
    }
    return true;
  }
}
