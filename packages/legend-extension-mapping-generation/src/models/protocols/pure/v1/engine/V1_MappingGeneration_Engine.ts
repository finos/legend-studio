import {
  type V1_Engine,
  type V1_PureModelContextData,
  V1_deserializePureModelContextData,
} from '@finos/legend-graph';
import type { V1_MappingGenConfiguration } from '../model/V1_MappingGenConfiguration';
import { V1_MappingGenerateModelInput } from './V1_MappingGenerateModelInput';

const GENERATE_MAPPING_ENGINE_TRACER_SPAN = 'generate relational mapping';

export const V1_generateRelationalMapping = async (
  engine: V1_Engine,
  config: V1_MappingGenConfiguration,
  model: V1_PureModelContextData,
): Promise<V1_PureModelContextData> => {
  const configInput = new V1_MappingGenerateModelInput(config, model);
  const engineServerClient = engine.getEngineServerClient();
  const pmcd = V1_deserializePureModelContextData(
    await engineServerClient.postWithTracing(
      engineServerClient.getTraceData(GENERATE_MAPPING_ENGINE_TRACER_SPAN),
      `${engineServerClient._pure()}/modelGeneration/mergeMappings`,
      V1_MappingGenerateModelInput.serialization.toJson(configInput),
      {},
      undefined,
      undefined,
      { enableCompression: true },
    ),
  );
  return pmcd;
};
