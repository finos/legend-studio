import { SerializationFactory } from '@finos/legend-shared';
import { V1_PureModelContext } from '../../model/context/V1_PureModelContext';
import { V1_Lambda } from '../../model/valueSpecification/raw/V1_Lambda';
import { createModelSchema, primitive } from 'serializr';

export class V1_LambdaTdsToRelationInput {
  pureModelContext!: V1_PureModelContext;
  lambda: V1_Lambda;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_LambdaTdsToRelationInput, {
      pureModelContext: primitive(),
      lambda: primitive(),
    }),
  );
}
