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
  type PureModel,
  type AbstractPureGraphManager,
  V1_PureGraphManager,
  PureClientVersion,
  V1_deserializePureModelContextData,
} from '@finos/legend-graph';
import type { Entity } from '@finos/legend-storage';
import { guaranteeType } from '@finos/legend-shared';
import { MappingGeneration_PureGraphManagerExtension } from '../MappingGeneration_PureGraphManagerExtension.js';
import type { MappingGenerationConfiguration } from '../../../action/generation/MappingGenerationConfiguration.js';
import { V1_MappingGenerationInput } from './engine/V1_MappingGenerationInput.js';
import { V1_MappingGenerationConfiguration } from './engine/V1_MappingGenerationConfiguration.js';

const GENERATE_MAPPING_ENGINE_ACTIVITY_TRACE = 'generate mapping';

export class V1_MappingGeneration_PureGraphManagerExtension extends MappingGeneration_PureGraphManagerExtension {
  declare graphManager: V1_PureGraphManager;

  constructor(graphManager: AbstractPureGraphManager) {
    super(graphManager);
    this.graphManager = guaranteeType(graphManager, V1_PureGraphManager);
  }

  getSupportedProtocolVersion(): string {
    return PureClientVersion.V1_0_0;
  }

  async generate(
    config: MappingGenerationConfiguration,
    graph: PureModel,
  ): Promise<Entity[]> {
    const input = new V1_MappingGenerationInput();
    input.clientVersion = V1_PureGraphManager.TARGET_PROTOCOL_VERSION;
    input.model = this.graphManager.getFullGraphModelData(graph);
    input.config = new V1_MappingGenerationConfiguration();
    input.config.sourceMapping = config.sourceMapping.path;
    input.config.mappingToRegenerate = config.mappingToRegenerate.path;
    input.config.m2mIntermediateMappings = config.m2mIntermediateMappings.map(
      (val) => val.path,
    );
    input.config.resultMappingName = config.resultMappingName;
    input.config.resultIncludedMappingName = config.resultIncludedMappingName;
    input.config.resultStoreName = config.resultStoreName;
    input.config.originalMappingName = config.originalMappingName;
    const engineServerClient = this.graphManager.engine.getEngineServerClient();
    return this.graphManager.pureModelContextDataToEntities(
      V1_deserializePureModelContextData(
        await engineServerClient.postWithTracing(
          engineServerClient.getTraceData(
            GENERATE_MAPPING_ENGINE_ACTIVITY_TRACE,
          ),
          `${engineServerClient._pure()}/modelGeneration/mappingGeneration`,
          V1_MappingGenerationInput.serialization.toJson(input),
          {},
          undefined,
          undefined,
          { enableCompression: true },
        ),
      ),
    );
  }
}
