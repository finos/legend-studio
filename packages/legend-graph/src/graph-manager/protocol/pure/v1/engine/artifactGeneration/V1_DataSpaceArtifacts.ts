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
  SerializationFactory,
  usingModelSchema,
  type PlainObject,
} from '@finos/legend-shared';
import { createModelSchema, deserialize, primitive } from 'serializr';
import { V1_MappingModelCoverageAnalysisResult } from '../analytics/V1_MappingModelCoverageAnalysis.js';
import type { V1_PureModelContextData } from '../../model/context/V1_PureModelContextData.js';
import { V1_pureModelContextDataPropSchema } from '../../transformation/pureProtocol/V1_PureProtocolSerialization.js';
import type { DepotGeneration } from '@finos/legend-storage';

export enum V1_DataspaceCoveragePartitionType {
  MAPPING_ANALYSIS = 'MappingAnalysisCoveragePartition',
  MAPPING_MODEL = 'MappingModelCoveragePartition',
}

class V1_DataspaceCoveragePartition {
  mapping!: string;
}

export class V1_MappingAnalysisCoveragePartition extends V1_DataspaceCoveragePartition {
  analysisResult!: V1_MappingModelCoverageAnalysisResult;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_MappingAnalysisCoveragePartition, {
      mapping: primitive(),
      analysisResult: usingModelSchema(
        V1_MappingModelCoverageAnalysisResult.serialization.schema,
      ),
    }),
  );
}

export class V1_MappingModelCoveragePartition extends V1_DataspaceCoveragePartition {
  model!: V1_PureModelContextData;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_MappingModelCoveragePartition, {
      mapping: primitive(),
      model: V1_pureModelContextDataPropSchema,
    }),
  );
}

export const V1_deserializeDataspaceCoveragePartition = (
  json: PlainObject<DepotGeneration>,
): V1_DataspaceCoveragePartition | undefined => {
  if (json.content && typeof json.content === 'string') {
    const contentObj = JSON.parse(json.content) as PlainObject<object>;
    switch (contentObj._type) {
      case V1_DataspaceCoveragePartitionType.MAPPING_ANALYSIS:
        return deserialize(
          V1_MappingAnalysisCoveragePartition.serialization.schema,
          contentObj,
        );
      case V1_DataspaceCoveragePartitionType.MAPPING_MODEL:
        return deserialize(
          V1_MappingModelCoveragePartition.serialization.schema,
          contentObj,
        );
      default: {
        return undefined;
      }
    }
  }
  return undefined;
};
