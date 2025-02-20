import { type PlainObject } from '@finos/legend-shared';
import { V1_Lambda } from '../../model/valueSpecification/raw/V1_Lambda.js';
import {
  createModelSchema,
  custom,
  serialize,
  type ModelSchema,
} from 'serializr';
import {
  V1_deserializePureModelContext,
  V1_serializePureModelContext,
} from '../../transformation/pureProtocol/V1_PureProtocolSerialization.js';
import { V1_serializeValueSpecification } from '../../transformation/pureProtocol/serializationHelpers/V1_ValueSpecificationSerializer.js';
import type { V1_PureModelContextPointer } from '../../model/context/V1_PureModelContextPointer.js';
import type { PureProtocolProcessorPlugin } from '../../../PureProtocolProcessorPlugin.js';

export class V1_LambdaTdsToRelationInput {
  model!: V1_PureModelContextPointer;
  lambda!: V1_Lambda;
}

const createLambdaTdsToRelationInputModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_LambdaTdsToRelationInput> =>
  createModelSchema(V1_LambdaTdsToRelationInput, {
    model: custom(
      (val) => V1_serializePureModelContext(val),
      (val) => V1_deserializePureModelContext(val),
    ),
    lambda: custom(
      (val) => V1_serializeValueSpecification(val, plugins),
      (val) => V1_serializeValueSpecification(val, plugins),
    ),
  });

export const V1_serializeLambdaTdsToRelationInput = (
  value: V1_LambdaTdsToRelationInput,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_LambdaTdsToRelationInput> =>
  serialize(createLambdaTdsToRelationInputModelSchema(plugins), value);
