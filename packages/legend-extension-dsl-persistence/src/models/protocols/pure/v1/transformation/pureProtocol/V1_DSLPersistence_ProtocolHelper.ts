import { createModelSchema } from 'serializr';
import { V1_PersistencePipe } from '../../model/packageableElements/persistence/V1_Persistence';
import { usingConstantValueSchema } from '@finos/legend-shared';

export const V1_PERSISTENCE_PIPE_ELEMENT_PROTOCOL_TYPE = 'persistencePipe';

export const V1_persistencePipeModelSchema = createModelSchema(
  V1_PersistencePipe,
  {
    _type: usingConstantValueSchema(V1_PERSISTENCE_PIPE_ELEMENT_PROTOCOL_TYPE),
    //TODO: ledav -- construct schema
  },
);
