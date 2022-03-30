import packageJson from '../../package.json';
import {
  PureProtocolProcessorPlugin,
  MappingGeneration_PureProtocolProcessorPlugin_Extension,
  V1_deserializePureModelContextData,
  V1_ModelGeneratorFromConfiguration,
  V1_PureModelContextData,
  V1_Engine
} from "@finos/legend-graph";
import {V1_MappingGenerateModelInput} from "./protocols/pure/v1/engine/V1_MappingGenerateModelInput";
import type {ModelGenerationConfiguration} from "@finos/legend-graph/src/models/ModelGenerationConfiguration";
import {V1_MappingGenConfiguration} from "./protocols/pure/v1/model/V1_MappingGenConfiguration";

const GENERATE_MAPPING_ENGINE_TRACER_SPAN = 'generate relational mapping';

export class MappingGeneration_PureProtocolProcessorPlugin
  extends PureProtocolProcessorPlugin
  implements MappingGeneration_PureProtocolProcessorPlugin_Extension {
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
              engineServerClient.getTraceData(GENERATE_MAPPING_ENGINE_TRACER_SPAN),
              `${engineServerClient._pure()}/modelGeneration/mappingGeneration`,
              V1_MappingGenerateModelInput.serialization.toJson(configInput),
              {},
              undefined,
              undefined,
              {enableCompression: true},
            ),
          );
          return pmcd;
        }
        return undefined;
      },
    ];
  }
}
