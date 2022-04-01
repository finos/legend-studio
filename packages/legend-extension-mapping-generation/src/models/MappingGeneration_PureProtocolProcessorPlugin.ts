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

import packageJson from '../../package.json';
import {
  type ModelGenerationConfiguration,
  PureProtocolProcessorPlugin,
  type V1_Engine,
  V1_jsonToPureModelContextData,
  type V1_ModelGeneratorFromConfiguration,
  type V1_PureModelContextData,
} from '@finos/legend-graph';
import { V1_MappingGenerateModelInput } from './protocols/pure/v1/engine/V1_MappingGenerateModelInput';
import { MappingGenerationConfiguration } from './MappingGenerationConfiguration';
import { V1_MappingGenerationConfiguration } from './protocols/pure/v1/model/V1_MappingGenerationConfiguration';

const GENERATE_MAPPING_ENGINE_TRACER_SPAN = 'generate relational mapping';

export class MappingGeneration_PureProtocolProcessorPlugin extends PureProtocolProcessorPlugin {
  constructor() {
    super(
      packageJson.extensions.pureProtocolProcessorPlugin,
      packageJson.version,
    );
  }

  override V1_getExtraModelGeneratorsFromConfiguration(): V1_ModelGeneratorFromConfiguration[] {
    return [
      async (
        config: ModelGenerationConfiguration,
        model: V1_PureModelContextData,
        engine: V1_Engine,
      ): Promise<V1_PureModelContextData | undefined> => {
        if (config instanceof MappingGenerationConfiguration) {
          const configInput = new V1_MappingGenerateModelInput(
            new V1_MappingGenerationConfiguration(
              config.sourceMapping?.path,
              config.mappingToRegenerate?.path,
              config.mappingNewName,
              config.storeNewName,
              config.m2mAdditionalMappings.map((m2m) => m2m.path),
            ),
            model,
          );
          const engineServerClient = engine.getEngineServerClient();
          return V1_jsonToPureModelContextData(
            await engineServerClient.postWithTracing(
              engineServerClient.getTraceData(
                GENERATE_MAPPING_ENGINE_TRACER_SPAN,
              ),
              `${engineServerClient._pure()}/modelGeneration/mappingGeneration`,
              V1_MappingGenerateModelInput.serialization.toJson(configInput),
              {},
              undefined,
              undefined,
              { enableCompression: true },
            ),
          );
        }
        return undefined;
      },
    ];
  }
}
