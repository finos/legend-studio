import {
  V1_AnyVersionDeduplicationStrategy,
  V1_AppendOnly,
  V1_Auditing,
  V1_BatchDateTimeAuditing,
  V1_BatchMilestoningMode,
  V1_BatchPersister,
  V1_BitemporalDelta,
  V1_BitemporalSnapshot,
  V1_DeduplicationStrategy,
  V1_FlatTargetSpecification,
  V1_GroupedFlatTargetSpecification,
  V1_MaxVersionDeduplicationStrategy,
  V1_NestedTargetSpecification,
  V1_NoAuditing,
  V1_NoDeduplicationStrategy,
  V1_NonMilestonedDelta,
  V1_NonMilestonedSnapshot,
  V1_OpaqueAuditing,
  V1_OpaqueDeduplicationStrategy,
  V1_OpaqueTrigger,
  V1_PersistencePipe,
  V1_Persister,
  V1_PropertyAndFlatTargetSpecification,
  V1_Reader,
  V1_ServiceReader,
  V1_StreamingPersister,
  V1_TargetSpecification,
  V1_Trigger,
  V1_UnitemporalDelta,
  V1_UnitemporalSnapshot,
} from '../../model/packageableElements/persistence/V1_Persistence';
import {
  deserializeArray,
  PlainObject,
  serializeArray,
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

/**********
 * pipe
 **********/

export const V1_PERSISTENCE_PIPE_ELEMENT_PROTOCOL_TYPE = 'persistencePipe';

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

enum V1_TriggerType {
  OPAQUE_TRIGGER = 'opaqueTrigger',
}

const V1_opaqueTriggerModelSchema = createModelSchema(V1_OpaqueTrigger, {
  _type: usingConstantValueSchema(V1_TriggerType.OPAQUE_TRIGGER),
});

const V1_serializeTrigger = (protocol: V1_Trigger): PlainObject<V1_Trigger> => {
  if (protocol instanceof V1_OpaqueTrigger) {
    return serialize(V1_opaqueTriggerModelSchema, protocol);
  }
  throw new UnsupportedOperationError(
    `Unable to serialize trigger '${protocol}'`,
  );
};

const V1_deserializeTrigger = (json: PlainObject<V1_Trigger>): V1_Trigger => {
  switch (json._type) {
    case V1_TriggerType.OPAQUE_TRIGGER:
      return deserialize(V1_opaqueTriggerModelSchema, json);
    default:
      throw new UnsupportedOperationError(
        `Unable to deserialize trigger '${json}'`,
      );
  }
};

/**********
 * reader
 **********/

enum V1_ReaderType {
  SERVICE_READER = 'serviceReader',
}

const V1_serviceReaderModelSchema = createModelSchema(V1_ServiceReader, {
  _type: usingConstantValueSchema(V1_ReaderType.SERVICE_READER),
  service: primitive(),
});

const V1_serializeReader = (protocol: V1_Reader): PlainObject<V1_Trigger> => {
  if (protocol instanceof V1_ServiceReader) {
    return serialize(V1_serviceReaderModelSchema, protocol);
  }
  throw new UnsupportedOperationError(
    `Unable to serialize reader '${protocol}'`,
  );
};

const V1_deserializeReader = (json: PlainObject<V1_Reader>): V1_Reader => {
  switch (json._type) {
    case V1_ReaderType.SERVICE_READER:
      return deserialize(V1_serviceReaderModelSchema, json);
    default:
      throw new UnsupportedOperationError(
        `Unable to deserialize reader '${json}'`,
      );
  }
};

/**********
 * persister
 **********/

enum V1_PersisterType {
  STREAMING_PERSISTER = 'streamingPersister',
  BATCH_PERSISTER = 'batchPersister',
}

const V1_streamingPersisterModelSchema = createModelSchema(
  V1_StreamingPersister,
  {
    _type: usingConstantValueSchema(V1_PersisterType.STREAMING_PERSISTER),
  },
);

const V1_batchPersisterModelSchema = createModelSchema(V1_BatchPersister, {
  _type: usingConstantValueSchema(V1_PersisterType.BATCH_PERSISTER),
  targetSpecification: custom(
    (val) => V1_serializeTargetSpecification(val),
    (val) => V1_deserializeTargetSpecification(val),
  ),
});

const V1_serializePersister = (
  protocol: V1_Persister,
): PlainObject<V1_Persister> => {
  if (protocol instanceof V1_StreamingPersister) {
    return serialize(V1_streamingPersisterModelSchema, protocol);
  } else if (protocol instanceof V1_BatchPersister) {
    return serialize(V1_batchPersisterModelSchema, protocol);
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
      return deserialize(V1_streamingPersisterModelSchema, json);
    case V1_PersisterType.BATCH_PERSISTER:
      return deserialize(V1_batchPersisterModelSchema, json);
    default:
      throw new UnsupportedOperationError(
        `Unable to deserialize persister '${json}'`,
      );
  }
};

/**********
 * target specification
 **********/

enum V1_TargetSpecificationType {
  GROUPED_FLAT_TARGET_SPECIFICATION = 'groupedFlatTargetSpecification',
  FLAT_TARGET_SPECIFICATION = 'flatTargetSpecification',
  NESTED_TARGET_SPECIFICATION = 'nestedTargetSpecification',
}

const V1_groupedFlatTargetSpecificationModelSchema = createModelSchema(
  V1_GroupedFlatTargetSpecification,
  {
    _type: usingConstantValueSchema(
      V1_TargetSpecificationType.GROUPED_FLAT_TARGET_SPECIFICATION,
    ),
    modelClass: primitive(),
    transactionScope: primitive(),
    components: custom(
      (val) =>
        serializeArray(
          val,
          (v) => serialize(V1_propertyAndFlatTargetSpecificationSchema, v),
          true,
        ),
      (val) =>
        deserializeArray(
          val,
          (v) => deserialize(V1_propertyAndFlatTargetSpecificationSchema, v),
          false,
        ),
    ),
  },
);

const V1_flatTargetSpecificationModelSchema = createModelSchema(
  V1_FlatTargetSpecification,
  {
    _type: usingConstantValueSchema(
      V1_TargetSpecificationType.FLAT_TARGET_SPECIFICATION,
    ),
    modelClass: primitive(),
    targetName: primitive(),
    partitionProperties: list(primitive()),
    deduplicationStrategy: custom(
      (val) => V1_serializeDeduplicationStrategy(val),
      (val) => V1_deserializeDeduplicationStrategy(val),
    ),
    batchMode: custom(
      (val) => V1_serializeBatchMilestoningMode(val),
      (val) => V1_deserializeBatchMilestoningMode(val),
    ),
  },
);

const V1_nestedTargetSpecificationModelSchema = createModelSchema(
  V1_NestedTargetSpecification,
  {
    _type: usingConstantValueSchema(
      V1_TargetSpecificationType.NESTED_TARGET_SPECIFICATION,
    ),
    modelClass: primitive(),
    targetName: primitive(),
  },
);

const V1_serializeTargetSpecification = (
  protocol: V1_TargetSpecification,
): PlainObject<V1_TargetSpecification> => {
  if (protocol instanceof V1_GroupedFlatTargetSpecification) {
    return serialize(V1_groupedFlatTargetSpecificationModelSchema, protocol);
  } else if (protocol instanceof V1_FlatTargetSpecification) {
    return serialize(V1_flatTargetSpecificationModelSchema, protocol);
  } else if (protocol instanceof V1_NestedTargetSpecification) {
    return serialize(V1_nestedTargetSpecificationModelSchema, protocol);
  }
  throw new UnsupportedOperationError(
    `Unable to serialize target specification '${protocol}'`,
  );
};

const V1_deserializeTargetSpecification = (
  json: PlainObject<V1_TargetSpecification>,
): V1_TargetSpecification => {
  switch (json._type) {
    case V1_TargetSpecificationType.GROUPED_FLAT_TARGET_SPECIFICATION:
      return deserialize(V1_groupedFlatTargetSpecificationModelSchema, json);
    case V1_TargetSpecificationType.FLAT_TARGET_SPECIFICATION:
      return deserialize(V1_flatTargetSpecificationModelSchema, json);
    case V1_TargetSpecificationType.NESTED_TARGET_SPECIFICATION:
      return deserialize(V1_nestedTargetSpecificationModelSchema, json);
    default:
      throw new UnsupportedOperationError(
        `Unable to deserialize target specification '${json}'`,
      );
  }
};

const V1_PROPERTY_AND_FLAT_TARGET_SPECIFICATION_TYPE =
  'propertyAndFlatTargetSpecification';

const V1_propertyAndFlatTargetSpecificationSchema = createModelSchema(
  V1_PropertyAndFlatTargetSpecification,
  {
    _type: usingConstantValueSchema(
      V1_PROPERTY_AND_FLAT_TARGET_SPECIFICATION_TYPE,
    ),
    property: primitive(),
    targetSpecification: custom(
      (val) => serialize(V1_flatTargetSpecificationModelSchema, val),
      (val) => deserialize(V1_flatTargetSpecificationModelSchema, val),
    ),
  },
);

/**********
 * deduplication strategy
 **********/

enum V1_DeduplicationStrategyType {
  NO_DEDUPLICATION_STRATEGY = 'noDeduplicationStrategy',
  ANY_VERSION_DEDUPLICATION_STRATEGY = 'anyVersionDeduplicationStrategy',
  MAX_VERSION_DEDUPLICATION_STRATEGY = 'maxVersionDeduplicationStrategy',
  OPAQUE_DEDUPLICATION_STRATEGY = 'opaqueDeduplicationStrategy',
}

const V1_noDeduplicationStrategyModelSchema = createModelSchema(
  V1_NoDeduplicationStrategy,
  {
    _type: usingConstantValueSchema(
      V1_DeduplicationStrategyType.NO_DEDUPLICATION_STRATEGY,
    ),
  },
);

const V1_anyVersionDeduplicationStrategyModelSchema = createModelSchema(
  V1_AnyVersionDeduplicationStrategy,
  {
    _type: usingConstantValueSchema(
      V1_DeduplicationStrategyType.ANY_VERSION_DEDUPLICATION_STRATEGY,
    ),
  },
);

const V1_maxVersionDeduplicationStrategyModelSchema = createModelSchema(
  V1_MaxVersionDeduplicationStrategy,
  {
    _type: usingConstantValueSchema(
      V1_DeduplicationStrategyType.MAX_VERSION_DEDUPLICATION_STRATEGY,
    ),
    versionProperty: primitive(),
  },
);

const V1_opaqueDeduplicationStrategyModelSchema = createModelSchema(
  V1_OpaqueDeduplicationStrategy,
  {
    _type: usingConstantValueSchema(
      V1_DeduplicationStrategyType.OPAQUE_DEDUPLICATION_STRATEGY,
    ),
  },
);

const V1_serializeDeduplicationStrategy = (
  protocol: V1_DeduplicationStrategy,
): PlainObject<V1_DeduplicationStrategy> => {
  if (protocol instanceof V1_NoDeduplicationStrategy) {
    return serialize(V1_noDeduplicationStrategyModelSchema, protocol);
  } else if (protocol instanceof V1_AnyVersionDeduplicationStrategy) {
    return serialize(V1_anyVersionDeduplicationStrategyModelSchema, protocol);
  } else if (protocol instanceof V1_MaxVersionDeduplicationStrategy) {
    return serialize(V1_maxVersionDeduplicationStrategyModelSchema, protocol);
  } else if (protocol instanceof V1_OpaqueDeduplicationStrategy) {
    return serialize(V1_opaqueDeduplicationStrategyModelSchema, protocol);
  }
  throw new UnsupportedOperationError(
    `Unable to serialize deduplication strategy '${protocol}'`,
  );
};

const V1_deserializeDeduplicationStrategy = (
  json: PlainObject<V1_DeduplicationStrategy>,
): V1_DeduplicationStrategy => {
  switch (json._type) {
    case V1_DeduplicationStrategyType.NO_DEDUPLICATION_STRATEGY:
      return deserialize(V1_noDeduplicationStrategyModelSchema, json);
    case V1_DeduplicationStrategyType.ANY_VERSION_DEDUPLICATION_STRATEGY:
      return deserialize(V1_anyVersionDeduplicationStrategyModelSchema, json);
    case V1_DeduplicationStrategyType.MAX_VERSION_DEDUPLICATION_STRATEGY:
      return deserialize(V1_maxVersionDeduplicationStrategyModelSchema, json);
    case V1_DeduplicationStrategyType.OPAQUE_DEDUPLICATION_STRATEGY:
      return deserialize(V1_opaqueDeduplicationStrategyModelSchema, json);
    default:
      throw new UnsupportedOperationError(
        `Unable to deserialize deduplicationStrategy '${json}'`,
      );
  }
};

/**********
 * batch mode
 **********/

enum V1_BatchModeType {
  NON_MILESTONED_SNAPSHOT = 'nonMilestonedSnapshot',
  UNITEMPORAL_SNAPSHOT = 'unitemporalSnapshot',
  BITEMPORAL_SNAPSHOT = 'bitemporalSnapshot',
  NON_MILESTONED_DELTA = 'nonMilestonedDelta',
  UNITEMPORAL_DELTA = 'unitemporalDelta',
  BITEMPORAL_DELTA = 'bitemporalDelta',
  APPEND_ONLY = 'appendOnly',
}

const V1_nonMilestonedSnapshotModelSchema = createModelSchema(
  V1_NonMilestonedSnapshot,
  {
    _type: usingConstantValueSchema(V1_BatchModeType.NON_MILESTONED_SNAPSHOT),
    auditing: custom(
      (val) => V1_serializeAuditing(val),
      (val) => V1_deserializeAuditing(val),
    ),
  },
);

const V1_unitemporalSnapshotModelSchema = createModelSchema(
  V1_UnitemporalSnapshot,
  {
    _type: usingConstantValueSchema(V1_BatchModeType.UNITEMPORAL_SNAPSHOT),
  },
);

const V1_bitemporalSnapshotModelSchema = createModelSchema(
  V1_BitemporalSnapshot,
  {
    _type: usingConstantValueSchema(V1_BatchModeType.BITEMPORAL_SNAPSHOT),
  },
);

const V1_nonMilestonedDeltaModelSchema = createModelSchema(
  V1_NonMilestonedDelta,
  {
    _type: usingConstantValueSchema(V1_BatchModeType.NON_MILESTONED_DELTA),
  },
);

const V1_unitemporalDeltaModelSchema = createModelSchema(V1_UnitemporalDelta, {
  _type: usingConstantValueSchema(V1_BatchModeType.UNITEMPORAL_DELTA),
});

const V1_bitemporalDeltaModelSchema = createModelSchema(V1_BitemporalDelta, {
  _type: usingConstantValueSchema(V1_BatchModeType.BITEMPORAL_DELTA),
});

const V1_appendOnlyModelSchema = createModelSchema(V1_AppendOnly, {
  _type: usingConstantValueSchema(V1_BatchModeType.APPEND_ONLY),
});

const V1_serializeBatchMilestoningMode = (
  protocol: V1_BatchMilestoningMode,
): PlainObject<V1_BatchMilestoningMode> => {
  if (protocol instanceof V1_NonMilestonedSnapshot) {
    return serialize(V1_nonMilestonedSnapshotModelSchema, protocol);
  } else if (protocol instanceof V1_UnitemporalSnapshot) {
    return serialize(V1_unitemporalSnapshotModelSchema, protocol);
  } else if (protocol instanceof V1_BitemporalSnapshot) {
    return serialize(V1_bitemporalSnapshotModelSchema, protocol);
  } else if (protocol instanceof V1_NonMilestonedDelta) {
    return serialize(V1_nonMilestonedDeltaModelSchema, protocol);
  } else if (protocol instanceof V1_UnitemporalDelta) {
    return serialize(V1_unitemporalDeltaModelSchema, protocol);
  } else if (protocol instanceof V1_BitemporalDelta) {
    return serialize(V1_bitemporalDeltaModelSchema, protocol);
  } else if (protocol instanceof V1_AppendOnly) {
    return serialize(V1_appendOnlyModelSchema, protocol);
  }
  throw new UnsupportedOperationError(
    `Unable to serialize batch mode '${protocol}'`,
  );
};

const V1_deserializeBatchMilestoningMode = (
  json: PlainObject<V1_DeduplicationStrategy>,
): V1_DeduplicationStrategy => {
  switch (json._type) {
    case V1_DeduplicationStrategyType.NO_DEDUPLICATION_STRATEGY:
      return deserialize(V1_noDeduplicationStrategyModelSchema, json);
    case V1_DeduplicationStrategyType.ANY_VERSION_DEDUPLICATION_STRATEGY:
      return deserialize(V1_anyVersionDeduplicationStrategyModelSchema, json);
    case V1_DeduplicationStrategyType.MAX_VERSION_DEDUPLICATION_STRATEGY:
      return deserialize(V1_maxVersionDeduplicationStrategyModelSchema, json);
    case V1_DeduplicationStrategyType.OPAQUE_DEDUPLICATION_STRATEGY:
      return deserialize(V1_opaqueDeduplicationStrategyModelSchema, json);
    default:
      throw new UnsupportedOperationError(
        `Unable to deserialize deduplicationStrategy '${json}'`,
      );
  }
};

/**********
 * auditing
 **********/

enum V1_AuditingType {
  NO_AUDITING = 'noAuditing',
  BATCH_DATE_TIME_AUDITING = 'batchDateTimeAuditing',
  OPAQUE_AUDITING = 'opaqueAuditing',
}

const V1_noAuditingModelSchema = createModelSchema(V1_NoAuditing, {
  _type: usingConstantValueSchema(V1_NoAuditing),
});

const V1_batchDateTimeAuditingModelSchema = createModelSchema(
  V1_BatchDateTimeAuditing,
  {
    _type: usingConstantValueSchema(V1_BatchDateTimeAuditing),
  },
);

const V1_opaqueAuditingModelSchema = createModelSchema(V1_OpaqueAuditing, {
  _type: usingConstantValueSchema(V1_OpaqueAuditing),
});

const V1_serializeAuditing = (
  protocol: V1_Auditing,
): PlainObject<V1_Auditing> => {
  if (protocol instanceof V1_NoAuditing) {
    return serialize(V1_noAuditingModelSchema, protocol);
  } else if (protocol instanceof V1_BatchDateTimeAuditing) {
    return serialize(V1_batchDateTimeAuditingModelSchema, protocol);
  } else if (protocol instanceof V1_OpaqueAuditing) {
    return serialize(V1_opaqueAuditingModelSchema, protocol);
  }
  throw new UnsupportedOperationError(
    `Unable to serialize auditing '${protocol}'`,
  );
};

const V1_deserializeAuditing = (
  json: PlainObject<V1_Auditing>,
): V1_Auditing => {
  switch (json._type) {
    case V1_AuditingType.NO_AUDITING:
      return deserialize(V1_noAuditingModelSchema, json);
    case V1_AuditingType.BATCH_DATE_TIME_AUDITING:
      return deserialize(V1_batchDateTimeAuditingModelSchema, json);
    case V1_AuditingType.OPAQUE_AUDITING:
      return deserialize(V1_opaqueAuditingModelSchema, json);
    default:
      throw new UnsupportedOperationError(
        `Unable to deserialize auditing '${json}'`,
      );
  }
};
