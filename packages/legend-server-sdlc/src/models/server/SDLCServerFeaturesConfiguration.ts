import { SerializationFactory } from '@finos/legend-shared';
import { createModelSchema, primitive } from 'serializr';

export class SDLCServerFeaturesConfiguration {
  canCreateProject!: boolean;
  canCreateVersion!: boolean;

  static readonly serialization = new SerializationFactory(
    createModelSchema(SDLCServerFeaturesConfiguration, {
      canCreateProject: primitive(),
      canCreateVersion: primitive(),
    }),
  );
}
