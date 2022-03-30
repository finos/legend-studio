import type { ModelGenerationConfiguration } from "../../ModelGenerationConfiguration";
import type { V1_PureModelContextData } from "./v1/model/context/V1_PureModelContextData";
import type { V1_Engine } from "./v1/engine/V1_Engine";
import type { PureProtocolProcessorPlugin } from "./PureProtocolProcessorPlugin";

export type V1_ModelGeneratorFromConfiguration = (
  config: ModelGenerationConfiguration,
  model: V1_PureModelContextData,
  engine: V1_Engine,
) => Promise<V1_PureModelContextData | undefined>;

export interface MappingGeneration_PureProtocolProcessorPlugin_Extension
  extends PureProtocolProcessorPlugin {
  /**
   * Get generators for model generation from configuration.
   */
  V1_getExtraModelGeneratorsFromConfiguration?(): V1_ModelGeneratorFromConfiguration[];
}
