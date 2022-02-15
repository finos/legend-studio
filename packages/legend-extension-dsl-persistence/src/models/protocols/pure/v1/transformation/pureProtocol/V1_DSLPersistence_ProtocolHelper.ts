import {
  V1_BatchPersister,
  V1_OpaqueTrigger,
  V1_PersistencePipe,
  V1_Persister,
  V1_Reader,
  V1_ServiceReader,
  V1_StreamingPersister,
  V1_Trigger,
} from '../../model/packageableElements/persistence/V1_Persistence';
import {
  PlainObject,
  UnsupportedOperationError,
  usingConstantValueSchema,
} from '@finos/legend-shared';
import {
  createModelSchema,
  custom,
  deserialize,
  list,
  primitive,
  serialize,
} from 'serializr';

export const V1_PERSISTENCE_PIPE_ELEMENT_PROTOCOL_TYPE = 'persistencePipe';

enum V1_TriggerType {
  OPAQUE_TRIGGER = 'opaqueTrigger',
}

enum V1_ReaderType {
  SERVICE_READER = 'serviceReader',
}

enum V1_PersisterType {
  STREAMING_PERSISTER = 'streamingPersister',
  BATCH_PERSISTER = 'batchPersister',
}

/**********
 * pipe
 **********/

export const V1_persistencePipeModelSchema = createModelSchema(
  V1_PersistencePipe,
  {
    _type: usingConstantValueSchema(V1_PERSISTENCE_PIPE_ELEMENT_PROTOCOL_TYPE),
    documentation: primitive(),
    owners: list(primitive()),
    trigger: custom(
      (val) => V1_serializeTrigger(val),
      (val) => V1_deserializeTrigger(val),
    ),
    reader: custom(
      (val) => V1_serializeReader(val),
      (val) => V1_deserializeReader(val),
    ),
    persister: custom(
      (val) => V1_serializePersister(val),
      (val) => V1_deserializePersister(val),
    ),
  },
);

/**********
 * trigger
 **********/

const opaqueTriggerModelSchema = createModelSchema(V1_OpaqueTrigger, {
  _type: usingConstantValueSchema(V1_TriggerType.OPAQUE_TRIGGER),
});

const V1_serializeTrigger = (protocol: V1_Trigger): PlainObject<V1_Trigger> => {
  if (protocol instanceof V1_OpaqueTrigger) {
    return serialize(opaqueTriggerModelSchema, protocol);
  }
  throw new UnsupportedOperationError(
    `Unable to serialize trigger '${protocol}'`,
  );
};

const V1_deserializeTrigger = (json: PlainObject<V1_Trigger>): V1_Trigger => {
  switch (json._type) {
    case V1_TriggerType.OPAQUE_TRIGGER:
      return deserialize(opaqueTriggerModelSchema, json);
    default:
      throw new UnsupportedOperationError(
        `Unable to deserialize trigger '${json}'`,
      );
  }
};

/**********
 * reader
 **********/

const serviceReaderModelSchema = createModelSchema(V1_ServiceReader, {
  _type: usingConstantValueSchema(V1_ReaderType.SERVICE_READER),
  service: primitive(),
});

const V1_serializeReader = (protocol: V1_Reader): PlainObject<V1_Trigger> => {
  if (protocol instanceof V1_ServiceReader) {
    return serialize(serviceReaderModelSchema, protocol);
  }
  throw new UnsupportedOperationError(
    `Unable to serialize reader '${protocol}'`,
  );
};

const V1_deserializeReader = (json: PlainObject<V1_Reader>): V1_Reader => {
  switch (json._type) {
    case V1_ReaderType.SERVICE_READER:
      return deserialize(serviceReaderModelSchema, json);
    default:
      throw new UnsupportedOperationError(
        `Unable to deserialize reader '${json}'`,
      );
  }
};

/**********
 * persister
 **********/

const streamingPersisterModelSchema = createModelSchema(V1_StreamingPersister, {
  _type: usingConstantValueSchema(V1_PersisterType.STREAMING_PERSISTER),
});

const batchPersisterModelSchema = createModelSchema(V1_BatchPersister, {
  _type: usingConstantValueSchema(V1_PersisterType.BATCH_PERSISTER),
});

const V1_serializePersister = (
  protocol: V1_Persister,
): PlainObject<V1_Persister> => {
  if (protocol instanceof V1_StreamingPersister) {
    return serialize(streamingPersisterModelSchema, protocol);
  }
  throw new UnsupportedOperationError(
    `Unable to serialize persister '${protocol}'`,
  );
};

const V1_deserializePersister = (
  json: PlainObject<V1_Persister>,
): V1_Persister => {
  switch (json._type) {
    case V1_PersisterType.STREAMING_PERSISTER:
      return deserialize(streamingPersisterModelSchema, json);
    case V1_PersisterType.BATCH_PERSISTER:
      return deserialize(batchPersisterModelSchema, json);
    default:
      throw new UnsupportedOperationError(
        `Unable to deserialize persister '${json}'`,
      );
  }
};
