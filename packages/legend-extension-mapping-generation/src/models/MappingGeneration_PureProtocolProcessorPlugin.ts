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
  type MappingGeneration_PureProtocolProcessorPlugin_Extension,
  type V1_ModelGeneratorFromConfiguration,
  type V1_PureModelContextData,
  type V1_Engine,
  type ModelGenerationConfiguration,
  PureProtocolProcessorPlugin,
  V1_deserializePureModelContextData,
} from '@finos/legend-graph';
import { V1_MappingGenerateModelInput } from './protocols/pure/v1/engine/V1_MappingGenerateModelInput';
import { V1_MappingGenConfiguration } from './protocols/pure/v1/model/V1_MappingGenConfiguration';

const GENERATE_MAPPING_ENGINE_TRACER_SPAN = 'generate relational mapping';

export class MappingGeneration_PureProtocolProcessorPlugin
  extends PureProtocolProcessorPlugin
  implements MappingGeneration_PureProtocolProcessorPlugin_Extension
{
  constructor() {
    super(
      packageJson.extensions.pureProtocolProcessorPlugin,
      packageJson.version,
    );
  }

  V1_getExtraModelGeneratorsFromConfiguration(): V1_ModelGeneratorFromConfiguration[] {
    return [
      async (
        config: ModelGenerationConfiguration,
        model: V1_PureModelContextData,
        engine: V1_Engine,
      ): Promise<V1_PureModelContextData | undefined> => {
        if (config instanceof V1_MappingGenConfiguration) {
          const configInput = new V1_MappingGenerateModelInput(config, model);
          const engineServerClient = engine.getEngineServerClient();
          const pmcd = V1_deserializePureModelContextData(
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
          return pmcd;
        }
        return undefined;
      },
    ];
  }
}
