import {
  list,
  primitive,
  createModelSchema,
  optional,
  object,
} from 'serializr';
import { SerializationFactory, usingModelSchema } from '@finos/legend-shared';
import {
  V1_PureModelContextData,
  PureClientVersion,
} from '@finos/legend-graph';
import {V1_MappingGenConfiguration} from "../model/V1_MappingGenConfiguration";

export const V1_mappingGenConfigModelSchema = createModelSchema(
  V1_MappingGenConfiguration,
  {
    sourceMapping: primitive(),
    mappingToRegenerate: primitive(),
    m2mAdditionalMappings: list(primitive()),
    mappingNewName: optional(primitive()),
    storeNewName: optional(primitive()),
  },
);

export class V1_MappingGenerateModelInput {
  clientVersion?: string | undefined;
  model: V1_PureModelContextData;
  config: V1_MappingGenConfiguration;

  constructor(
    config: V1_MappingGenConfiguration,
    model: V1_PureModelContextData,
  ) {
    this.clientVersion = PureClientVersion.VX_X_X;
    this.config = config;
    this.model = model;
  }

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_MappingGenerateModelInput, {
      clientVersion: optional(primitive()),
      model: object(V1_PureModelContextData),
      config: usingModelSchema(V1_mappingGenConfigModelSchema),
    }),
  );
}
