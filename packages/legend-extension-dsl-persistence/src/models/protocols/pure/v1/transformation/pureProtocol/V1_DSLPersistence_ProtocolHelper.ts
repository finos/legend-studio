import {
  V1_AnyVersionDeduplicationStrategy,
  V1_AppendOnly,
  V1_Auditing,
  V1_BatchDateTimeAuditing,
  V1_BatchIdAndDateTimeTransactionMilestoning,
  V1_BatchIdTransactionMilestoning,
  V1_BatchMilestoningMode,
  V1_BatchPersister,
  V1_BitemporalDelta,
  V1_BitemporalSnapshot,
  V1_DateTimeTransactionMilestoning,
  V1_DateTimeValidityMilestoning,
  V1_DeduplicationStrategy,
  V1_DeleteIndicatorMergeStrategy,
  V1_FlatTargetSpecification,
  V1_GroupedFlatTargetSpecification,
  V1_MaxVersionDeduplicationStrategy,
  V1_MergeStrategy,
  V1_NestedTargetSpecification,
  V1_NoAuditing,
  V1_NoDeduplicationStrategy,
  V1_NoDeletesMergeStrategy,
  V1_NonMilestonedDelta,
  V1_NonMilestonedSnapshot,
  V1_OpaqueAuditing,
  V1_OpaqueDeduplicationStrategy,
  V1_OpaqueMergeStrategy,
  V1_OpaqueTransactionMilestoning,
  V1_OpaqueTrigger,
  V1_OpaqueValidityMilestoning,
  V1_PersistencePipe,
  V1_Persister,
  V1_PropertyAndFlatTargetSpecification,
  V1_Reader,
  V1_ServiceReader,
  V1_SourceSpecifiesFromAndThruDateTime,
  V1_SourceSpecifiesFromDateTime,
  V1_StreamingPersister,
  V1_TargetSpecification,
  V1_TransactionMilestoning,
  V1_Trigger,
  V1_UnitemporalDelta,
  V1_UnitemporalSnapshot,
  V1_ValidityDerivation,
  V1_ValidityMilestoning,
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
 * persistence
 **********/

export const V1_PERSISTENCE_PIPE_ELEMENT_PROTOCOL_TYPE = 'persistencePipe';

export const V1_persistencePipeModelSchema = createModelSchema(
  V1_PersistencePipe,
  {
    _type: usingConstantValueSchema(V1_PERSISTENCE_PIPE_ELEMENT_PROTOCOL_TYPE),
    documentation: primitive(),
    name: primitive(),
    owners: list(primitive()),
    package: primitive(),
    persister: custom(
      (val) => V1_serializePersister(val),
      (val) => V1_deserializePersister(val),
    ),
    reader: custom(
      (val) => V1_serializeReader(val),
      (val) => V1_deserializeReader(val),
    ),
    trigger: custom(
      (val) => V1_serializeTrigger(val),
      (val) => V1_deserializeTrigger(val),
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
  throw new UnsupportedOperationError(`Unable to serialize trigger`, protocol);
};

const V1_deserializeTrigger = (json: PlainObject<V1_Trigger>): V1_Trigger => {
  switch (json._type) {
    case V1_TriggerType.OPAQUE_TRIGGER:
      return deserialize(V1_opaqueTriggerModelSchema, json);
    default:
      throw new UnsupportedOperationError(
        `Unable to deserialize trigger '${json._type}'`,
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
  throw new UnsupportedOperationError(`Unable to serialize reader`, protocol);
};

const V1_deserializeReader = (json: PlainObject<V1_Reader>): V1_Reader => {
  switch (json._type) {
    case V1_ReaderType.SERVICE_READER:
      return deserialize(V1_serviceReaderModelSchema, json);
    default:
      throw new UnsupportedOperationError(
        `Unable to deserialize reader '${json._type}'`,
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
    `Unable to serialize persister`,
    protocol,
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
        `Unable to deserialize persister '${json._type}'`,
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
    modelClass: primitive(),
    transactionScope: primitive(),
  },
);

const V1_flatTargetSpecificationModelSchema = createModelSchema(
  V1_FlatTargetSpecification,
  {
    _type: usingConstantValueSchema(
      V1_TargetSpecificationType.FLAT_TARGET_SPECIFICATION,
    ),
    batchMode: custom(
      (val) => V1_serializeBatchMilestoningMode(val),
      (val) => V1_deserializeBatchMilestoningMode(val),
    ),
    deduplicationStrategy: custom(
      (val) => V1_serializeDeduplicationStrategy(val),
      (val) => V1_deserializeDeduplicationStrategy(val),
    ),
    modelClass: primitive(),
    partitionProperties: list(primitive()),
    targetName: primitive(),
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
    `Unable to serialize target specification`,
    protocol,
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
        `Unable to deserialize target specification '${json._type}'`,
      );
  }
};

const V1_propertyAndFlatTargetSpecificationSchema = createModelSchema(
  V1_PropertyAndFlatTargetSpecification,
  {
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
    `Unable to serialize deduplication strategy`,
    protocol,
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
        `Unable to deserialize deduplicationStrategy '${json._type}'`,
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
    transactionMilestoning: custom(
      (val) => V1_serializeTransactionMilestoning(val),
      (val) => V1_deserializeTransactionMilestoning(val),
    ),
  },
);

const V1_bitemporalSnapshotModelSchema = createModelSchema(
  V1_BitemporalSnapshot,
  {
    _type: usingConstantValueSchema(V1_BatchModeType.BITEMPORAL_SNAPSHOT),
    transactionMilestoning: custom(
      (val) => V1_serializeTransactionMilestoning(val),
      (val) => V1_deserializeTransactionMilestoning(val),
    ),
    validityDerivation: custom(
      (val) => V1_serializeValidityDerivation(val),
      (val) => V1_deserializeValidityDerivation(val),
    ),
    validityMilestoning: custom(
      (val) => V1_serializeValidityMilestoning(val),
      (val) => V1_deserializeValidityMilestoning(val),
    ),
  },
);

const V1_nonMilestonedDeltaModelSchema = createModelSchema(
  V1_NonMilestonedDelta,
  {
    _type: usingConstantValueSchema(V1_BatchModeType.NON_MILESTONED_DELTA),
    auditing: custom(
      (val) => V1_serializeAuditing(val),
      (val) => V1_deserializeAuditing(val),
    ),
  },
);

const V1_unitemporalDeltaModelSchema = createModelSchema(V1_UnitemporalDelta, {
  _type: usingConstantValueSchema(V1_BatchModeType.UNITEMPORAL_DELTA),
  mergeStrategy: custom(
    (val) => V1_serializeMergeStrategy(val),
    (val) => V1_deserializeMergeStrategy(val),
  ),
  transactionMilestoning: custom(
    (val) => V1_serializeTransactionMilestoning(val),
    (val) => V1_deserializeTransactionMilestoning(val),
  ),
});

const V1_bitemporalDeltaModelSchema = createModelSchema(V1_BitemporalDelta, {
  _type: usingConstantValueSchema(V1_BatchModeType.BITEMPORAL_DELTA),
  mergeStrategy: custom(
    (val) => V1_serializeMergeStrategy(val),
    (val) => V1_deserializeMergeStrategy(val),
  ),
  transactionMilestoning: custom(
    (val) => V1_serializeTransactionMilestoning(val),
    (val) => V1_deserializeTransactionMilestoning(val),
  ),
  validityDerivation: custom(
    (val) => V1_serializeValidityDerivation(val),
    (val) => V1_deserializeValidityDerivation(val),
  ),
  validityMilestoning: custom(
    (val) => V1_serializeValidityMilestoning(val),
    (val) => V1_deserializeValidityMilestoning(val),
  ),
});

const V1_appendOnlyModelSchema = createModelSchema(V1_AppendOnly, {
  _type: usingConstantValueSchema(V1_BatchModeType.APPEND_ONLY),
  auditing: custom(
    (val) => V1_serializeAuditing(val),
    (val) => V1_deserializeAuditing(val),
  ),
  filterDuplicates: primitive(),
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
    `Unable to serialize batch mode`,
    protocol,
  );
};

const V1_deserializeBatchMilestoningMode = (
  json: PlainObject<V1_BatchMilestoningMode>,
): V1_BatchMilestoningMode => {
  switch (json._type) {
    case V1_BatchModeType.NON_MILESTONED_SNAPSHOT:
      return deserialize(V1_nonMilestonedSnapshotModelSchema, json);
    case V1_BatchModeType.UNITEMPORAL_SNAPSHOT:
      return deserialize(V1_unitemporalSnapshotModelSchema, json);
    case V1_BatchModeType.BITEMPORAL_SNAPSHOT:
      return deserialize(V1_bitemporalSnapshotModelSchema, json);
    case V1_BatchModeType.NON_MILESTONED_DELTA:
      return deserialize(V1_nonMilestonedDeltaModelSchema, json);
    case V1_BatchModeType.UNITEMPORAL_DELTA:
      return deserialize(V1_unitemporalDeltaModelSchema, json);
    case V1_BatchModeType.BITEMPORAL_DELTA:
      return deserialize(V1_bitemporalDeltaModelSchema, json);
    case V1_BatchModeType.APPEND_ONLY:
      return deserialize(V1_appendOnlyModelSchema, json);
    default:
      throw new UnsupportedOperationError(
        `Unable to deserialize batch mode '${json._type}'`,
      );
  }
};

// merge strategy

enum V1_MergeStrategyType {
  NO_DELETES_MERGE_STRATEGY = 'noDeletesMergeStrategy',
  DELETE_INDICATOR_MERGE_STRATEGY = 'deleteIndicatorMergeStrategy',
  OPAQUE_MERGE_STRATEGY = 'opaqueMergeStrategy',
}

const V1_noDeletesMergeStrategyModelSchema = createModelSchema(
  V1_NoDeletesMergeStrategy,
  {
    _type: usingConstantValueSchema(
      V1_MergeStrategyType.NO_DELETES_MERGE_STRATEGY,
    ),
  },
);

const V1_deleteIndicatorMergeStrategyModelSchema = createModelSchema(
  V1_DeleteIndicatorMergeStrategy,
  {
    _type: usingConstantValueSchema(
      V1_MergeStrategyType.DELETE_INDICATOR_MERGE_STRATEGY,
    ),
    deleteProperty: primitive(),
    deleteValues: list(primitive()),
  },
);

const V1_opaqueMergeStrategyModelSchema = createModelSchema(
  V1_OpaqueMergeStrategy,
  {
    _type: usingConstantValueSchema(V1_MergeStrategyType.OPAQUE_MERGE_STRATEGY),
  },
);

const V1_serializeMergeStrategy = (
  protocol: V1_MergeStrategy,
): PlainObject<V1_MergeStrategy> => {
  if (protocol instanceof V1_NoDeletesMergeStrategy) {
    return serialize(V1_noDeletesMergeStrategyModelSchema, protocol);
  } else if (protocol instanceof V1_DeleteIndicatorMergeStrategy) {
    return serialize(V1_deleteIndicatorMergeStrategyModelSchema, protocol);
  } else if (protocol instanceof V1_OpaqueMergeStrategy) {
    return serialize(V1_opaqueMergeStrategyModelSchema, protocol);
  }
  throw new UnsupportedOperationError(
    `Unable to serialize merge strategy`,
    protocol,
  );
};

const V1_deserializeMergeStrategy = (
  json: PlainObject<V1_MergeStrategy>,
): V1_MergeStrategy => {
  switch (json._type) {
    case V1_MergeStrategyType.NO_DELETES_MERGE_STRATEGY:
      return deserialize(V1_noDeletesMergeStrategyModelSchema, json);
    case V1_MergeStrategyType.DELETE_INDICATOR_MERGE_STRATEGY:
      return deserialize(V1_deleteIndicatorMergeStrategyModelSchema, json);
    case V1_MergeStrategyType.OPAQUE_MERGE_STRATEGY:
      return deserialize(V1_opaqueMergeStrategyModelSchema, json);
    default:
      throw new UnsupportedOperationError(
        `Unable to deserialize merge strategy '${json._type}'`,
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
  _type: usingConstantValueSchema(V1_AuditingType.NO_AUDITING),
});

const V1_batchDateTimeAuditingModelSchema = createModelSchema(
  V1_BatchDateTimeAuditing,
  {
    _type: usingConstantValueSchema(V1_AuditingType.BATCH_DATE_TIME_AUDITING),
    dateTimeFieldName: primitive(),
  },
);

const V1_opaqueAuditingModelSchema = createModelSchema(V1_OpaqueAuditing, {
  _type: usingConstantValueSchema(V1_AuditingType.OPAQUE_AUDITING),
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
  throw new UnsupportedOperationError(`Unable to serialize auditing`, protocol);
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
        `Unable to deserialize auditing '${json._type}'`,
      );
  }
};

/**********
 * transaction milestoning
 **********/

enum V1_TransactionMilestoningType {
  BATCH_ID_TRANSACTION_MILESTONING = 'batchIdTransactionMilestoning',
  DATE_TIME_TRANSACTION_MILESTONING = 'dateTimeTransactionMilestoning',
  BATCH_ID_AND_DATE_TIME_TRANSACTION_MILESTONING = 'batchIdAndDateTimeTransactionMilestoning',
  OPAQUE_TRANSACTION_MILESTONING = 'opaqueTransactionMilestoning',
}

const V1_batchIdTransactionMilestoningModelSchema = createModelSchema(
  V1_BatchIdTransactionMilestoning,
  {
    _type: usingConstantValueSchema(
      V1_TransactionMilestoningType.BATCH_ID_TRANSACTION_MILESTONING,
    ),
    batchIdInName: primitive(),
    batchIdOutName: primitive(),
  },
);

const V1_dateTimeTransactionMilestoningModelSchema = createModelSchema(
  V1_DateTimeTransactionMilestoning,
  {
    _type: usingConstantValueSchema(
      V1_TransactionMilestoningType.DATE_TIME_TRANSACTION_MILESTONING,
    ),
    dateTimeInName: primitive(),
    dateTimeOutName: primitive(),
  },
);

const V1_batchIdAndDateTimeTransactionMilestoningModelSchema =
  createModelSchema(V1_BatchIdAndDateTimeTransactionMilestoning, {
    _type: usingConstantValueSchema(
      V1_TransactionMilestoningType.BATCH_ID_AND_DATE_TIME_TRANSACTION_MILESTONING,
    ),
    batchIdInName: primitive(),
    batchIdOutName: primitive(),
    dateTimeInName: primitive(),
    dateTimeOutName: primitive(),
  });

const V1_opaqueTransactionMilestoningModelSchema = createModelSchema(
  V1_OpaqueTransactionMilestoning,
  {
    _type: usingConstantValueSchema(
      V1_TransactionMilestoningType.OPAQUE_TRANSACTION_MILESTONING,
    ),
  },
);

const V1_serializeTransactionMilestoning = (
  protocol: V1_TransactionMilestoning,
): PlainObject<V1_TransactionMilestoning> => {
  if (protocol instanceof V1_BatchIdTransactionMilestoning) {
    return serialize(V1_batchIdTransactionMilestoningModelSchema, protocol);
  } else if (protocol instanceof V1_DateTimeTransactionMilestoning) {
    return serialize(V1_dateTimeTransactionMilestoningModelSchema, protocol);
  } else if (protocol instanceof V1_BatchIdAndDateTimeTransactionMilestoning) {
    return serialize(
      V1_batchIdAndDateTimeTransactionMilestoningModelSchema,
      protocol,
    );
  } else if (protocol instanceof V1_OpaqueTransactionMilestoning) {
    return serialize(V1_opaqueTransactionMilestoningModelSchema, protocol);
  }
  throw new UnsupportedOperationError(
    `Unable to serialize transaction milestoning`,
    protocol,
  );
};

const V1_deserializeTransactionMilestoning = (
  json: PlainObject<V1_TransactionMilestoning>,
): V1_TransactionMilestoning => {
  switch (json._type) {
    case V1_TransactionMilestoningType.BATCH_ID_TRANSACTION_MILESTONING:
      return deserialize(V1_batchIdTransactionMilestoningModelSchema, json);
    case V1_TransactionMilestoningType.DATE_TIME_TRANSACTION_MILESTONING:
      return deserialize(V1_dateTimeTransactionMilestoningModelSchema, json);
    case V1_TransactionMilestoningType.BATCH_ID_AND_DATE_TIME_TRANSACTION_MILESTONING:
      return deserialize(
        V1_batchIdAndDateTimeTransactionMilestoningModelSchema,
        json,
      );
    case V1_TransactionMilestoningType.OPAQUE_TRANSACTION_MILESTONING:
      return deserialize(V1_opaqueTransactionMilestoningModelSchema, json);
    default:
      throw new UnsupportedOperationError(
        `Unable to deserialize transaction milestoning '${json._type}'`,
      );
  }
};

/**********
 * validity milestoning
 **********/

enum V1_ValidityMilestoningType {
  DATE_TIME_VALIDITY_MILESTONING = 'dateTimeValidityMilestoning',
  OPAQUE_VALIDITY_MILESTONING = 'opaqueValidityMilestoning',
}

const V1_dateTimeValidityMilestoningModelSchema = createModelSchema(
  V1_DateTimeValidityMilestoning,
  {
    _type: usingConstantValueSchema(
      V1_ValidityMilestoningType.DATE_TIME_VALIDITY_MILESTONING,
    ),
    dateTimeFromName: primitive(),
    dateTimeThruName: primitive(),
  },
);

const V1_opaqueValidityMilestoningModelSchema = createModelSchema(
  V1_OpaqueValidityMilestoning,
  {
    _type: usingConstantValueSchema(
      V1_ValidityMilestoningType.OPAQUE_VALIDITY_MILESTONING,
    ),
  },
);

const V1_serializeValidityMilestoning = (
  protocol: V1_ValidityMilestoning,
): PlainObject<V1_ValidityMilestoning> => {
  if (protocol instanceof V1_DateTimeValidityMilestoning) {
    return serialize(V1_dateTimeValidityMilestoningModelSchema, protocol);
  } else if (protocol instanceof V1_OpaqueValidityMilestoning) {
    return serialize(V1_opaqueValidityMilestoningModelSchema, protocol);
  }
  throw new UnsupportedOperationError(
    `Unable to serialize validity milestoning`,
    protocol,
  );
};

const V1_deserializeValidityMilestoning = (
  json: PlainObject<V1_ValidityMilestoning>,
): V1_ValidityMilestoning => {
  switch (json._type) {
    case V1_ValidityMilestoningType.DATE_TIME_VALIDITY_MILESTONING:
      return deserialize(V1_dateTimeValidityMilestoningModelSchema, json);
    case V1_ValidityMilestoningType.OPAQUE_VALIDITY_MILESTONING:
      return deserialize(V1_opaqueValidityMilestoningModelSchema, json);
    default:
      throw new UnsupportedOperationError(
        `Unable to deserialize validity milestoning '${json._type}'`,
      );
  }
};

// validity derivation

enum V1_ValidityDerivationType {
  SOURCE_SPECIFIES_FROM_DATE_TIME = 'sourceSpecifiesFromDateTime',
  SOURCE_SPECIFIES_FROM_AND_THRU_DATE_TIME = 'sourceSpecifiesFromAndThruDateTime',
}

const V1_sourceSpecifiesFromDateTimeModelSchema = createModelSchema(
  V1_SourceSpecifiesFromDateTime,
  {
    _type: usingConstantValueSchema(
      V1_ValidityDerivationType.SOURCE_SPECIFIES_FROM_DATE_TIME,
    ),
    sourceDateTimeFromProperty: primitive(),
  },
);

const V1_sourceSpecifiesFromAndThruDateTimeModelSchema = createModelSchema(
  V1_SourceSpecifiesFromAndThruDateTime,
  {
    _type: usingConstantValueSchema(
      V1_ValidityDerivationType.SOURCE_SPECIFIES_FROM_AND_THRU_DATE_TIME,
    ),
    sourceDateTimeFromProperty: primitive(),
    sourceDateTimeThruProperty: primitive(),
  },
);

const V1_serializeValidityDerivation = (
  protocol: V1_ValidityDerivation,
): PlainObject<V1_ValidityDerivation> => {
  if (protocol instanceof V1_SourceSpecifiesFromDateTime) {
    return serialize(V1_sourceSpecifiesFromDateTimeModelSchema, protocol);
  } else if (protocol instanceof V1_SourceSpecifiesFromAndThruDateTime) {
    return serialize(
      V1_sourceSpecifiesFromAndThruDateTimeModelSchema,
      protocol,
    );
  }
  throw new UnsupportedOperationError(
    `Unable to serialize validity derivation`,
    protocol,
  );
};

const V1_deserializeValidityDerivation = (
  json: PlainObject<V1_ValidityDerivation>,
): V1_ValidityDerivation => {
  switch (json._type) {
    case V1_ValidityDerivationType.SOURCE_SPECIFIES_FROM_DATE_TIME:
      return deserialize(V1_sourceSpecifiesFromDateTimeModelSchema, json);
    case V1_ValidityDerivationType.SOURCE_SPECIFIES_FROM_AND_THRU_DATE_TIME:
      return deserialize(
        V1_sourceSpecifiesFromAndThruDateTimeModelSchema,
        json,
      );
    default:
      throw new UnsupportedOperationError(
        `Unable to deserialize validity derivation '${json._type}'`,
      );
  }
};
