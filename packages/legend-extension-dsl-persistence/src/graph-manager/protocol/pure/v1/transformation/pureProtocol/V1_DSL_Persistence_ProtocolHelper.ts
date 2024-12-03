/**
 * Copyright (c) 2020-present, Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { V1_Persistence } from '../../model/packageableElements/persistence/V1_DSL_Persistence_Persistence.js';
import {
  V1_CronTrigger,
  V1_ManualTrigger,
  type V1_Trigger,
} from '../../model/packageableElements/persistence/V1_DSL_Persistence_Trigger.js';
import {
  V1_EmailNotifyee,
  V1_Notifier,
  type V1_Notifyee,
  V1_PagerDutyNotifyee,
} from '../../model/packageableElements/persistence/V1_DSL_Persistence_Notifier.js';
import {
  V1_ObjectStorageSink,
  V1_RelationalSink,
  type V1_Sink,
} from '../../model/packageableElements/persistence/V1_DSL_Persistence_Sink.js';
import {
  V1_AnyVersionDeduplicationStrategy,
  type V1_DeduplicationStrategy,
  V1_DuplicateCountDeduplicationStrategy,
  V1_MaxVersionDeduplicationStrategy,
  V1_NoDeduplicationStrategy,
} from '../../model/packageableElements/persistence/V1_DSL_Persistence_DeduplicationStrategy.js';
import {
  type V1_Auditing,
  V1_DateTimeAuditing,
  V1_NoAuditing,
} from '../../model/packageableElements/persistence/V1_DSL_Persistence_Auditing.js';
import {
  V1_FlatTarget,
  V1_MultiFlatTarget,
  V1_MultiFlatTargetPart,
  type V1_TargetShape,
} from '../../model/packageableElements/persistence/V1_DSL_Persistence_TargetShape.js';
import {
  V1_DeleteIndicatorMergeStrategy,
  type V1_MergeStrategy,
  V1_NoDeletesMergeStrategy,
} from '../../model/packageableElements/persistence/V1_DSL_Persistence_MergeStrategy.js';
import {
  V1_BatchIdAndDateTimeTransactionMilestoning,
  V1_BatchIdTransactionMilestoning,
  V1_DateTimeTransactionMilestoning,
  V1_DateTimeValidityMilestoning,
  V1_SourceSpecifiesFromAndThruDateTime,
  V1_SourceSpecifiesFromDateTime,
  V1_SourceSpecifiesInAndOutDateTime,
  V1_SourceSpecifiesInDateTime,
  type V1_TransactionDerivation,
  type V1_TransactionMilestoning,
  type V1_ValidityDerivation,
  type V1_ValidityMilestoning,
} from '../../model/packageableElements/persistence/V1_DSL_Persistence_Milestoning.js';
import {
  V1_AppendOnly,
  V1_BitemporalDelta,
  V1_BitemporalSnapshot,
  type V1_IngestMode,
  V1_NontemporalDelta,
  V1_NontemporalSnapshot,
  V1_UnitemporalDelta,
  V1_UnitemporalSnapshot,
} from '../../model/packageableElements/persistence/V1_DSL_Persistence_IngestMode.js';
import {
  V1_BatchPersister,
  type V1_Persister,
  V1_StreamingPersister,
} from '../../model/packageableElements/persistence/V1_DSL_Persistence_Persister.js';
import type { DSL_Persistence_PureProtocolProcessorPlugin_Extension } from '../../../DSL_Persistence_PureProtocolProcessorPlugin_Extension.js';
import {
  type PureProtocolProcessorPlugin,
  type V1_AtomicTest,
  V1_serializeTestAssertion,
  V1_deserializeTestAssertion,
  V1_externalFormatDataModelSchema,
  V1_serializeAtomicTest,
  V1_deserializeAtomicTest,
  V1_packageableElementPointerModelSchema,
  V1_serializePackageableElementPointer,
  PackageableElementPointerType,
} from '@finos/legend-graph';
import {
  type PlainObject,
  UnsupportedOperationError,
  usingConstantValueSchema,
  usingModelSchema,
  optionalCustom,
  optionalCustomList,
  customList,
  customListWithSchema,
} from '@finos/legend-shared';
import {
  createModelSchema,
  custom,
  deserialize,
  list,
  type ModelSchema,
  optional,
  primitive,
  serialize,
  SKIP,
  raw,
} from 'serializr';
import { V1_PersistenceTest } from '../../model/packageableElements/persistence/V1_DSL_Persistence_PersistenceTest.js';
import { V1_PersistenceTestBatch } from '../../model/packageableElements/persistence/V1_DSL_Persistence_PersistenceTestBatch.js';
import { V1_ConnectionTestData } from '../../model/packageableElements/persistence/V1_DSL_Persistence_ConnectionTestData.js';
import { V1_PersistenceTestData } from '../../model/packageableElements/persistence/V1_DSL_Persistence_PersistenceTestData.js';
import { V1_ServiceOutputTarget } from '../../model/packageableElements/persistence/V1_DSL_Persistence_ServiceOutputTarget.js';
import {
  V1_GraphFetchServiceOutput,
  type V1_ServiceOutput,
  V1_TdsServiceOutput,
} from '../../model/packageableElements/persistence/V1_DSL_Persistence_ServiceOutput.js';
import {
  type V1_PersistenceTarget,
  V1_RelationalPersistenceTarget,
} from '../../model/packageableElements/persistence/V1_DSL_Persistence_PersistentTarget.js';
import {
  V1_AnyVersion,
  type V1_Deduplication,
  V1_MaxVersion,
  V1_MaxVersionForGraphFetch,
  V1_MaxVersionForTds,
  V1_NoDeduplication,
} from '../../model/packageableElements/persistence/V1_DSL_Persistence_Deduplication.js';
import {
  type V1_DatasetType,
  V1_Delta,
  V1_Snapshot,
} from '../../model/packageableElements/persistence/V1_DSL_Persistence_DatasetType.js';
import {
  V1_FieldBased,
  V1_FieldBasedForGraphFetch,
  V1_FieldBasedForTds,
  V1_NoPartitioning,
  type V1_Partitioning,
} from '../../model/packageableElements/persistence/V1_DSL_Persistence_Partitioning.js';
import {
  V1_DeleteTargetDataset,
  type V1_EmptyDatasetHandling,
  V1_NoOp,
} from '../../model/packageableElements/persistence/V1_DSL_Persistence_EmptyDatasetHandling.js';
import {
  type V1_ActionIndicatorFields,
  V1_DeleteIndicator,
  V1_DeleteIndicatorForGraphFetch,
  V1_DeleteIndicatorForTds,
  V1_NoActionIndicator,
} from '../../model/packageableElements/persistence/V1_DSL_Persistence_ActionIndicatorFields.js';
import {
  V1_BiTemporal,
  V1_NonTemporal,
  type V1_Temporality,
  V1_UniTemporal,
} from '../../model/packageableElements/persistence/V1_DSL_Persistence_Temporality.js';
import {
  V1_AuditingDateTimeV2,
  type V1_AuditingV2,
  V1_NoAuditingV2,
} from '../../model/packageableElements/persistence/V1_DSL_Persistence_AuditingV2.js';
import {
  V1_AppendOnlyUpdatesHandling,
  V1_OverwriteUpdatesHandling,
  type V1_UpdatesHandling,
} from '../../model/packageableElements/persistence/V1_DSL_Persistence_UpdatesHandling.js';
import {
  V1_AllowDuplicates,
  type V1_AppendStrategy,
  V1_FailOnDuplicates,
  V1_FilterDuplicates,
} from '../../model/packageableElements/persistence/V1_DSL_Persistence_AppendStrategy.js';
import {
  V1_BatchId,
  V1_BatchIdAndDateTime,
  V1_ProcessingDateTime,
  type V1_ProcessingDimension,
} from '../../model/packageableElements/persistence/V1_DSL_Persistence_ProcessingDimension.js';
import {
  type V1_SourceDerivedDimension,
  V1_SourceDerivedTime,
} from '../../model/packageableElements/persistence/V1_DSL_Persistence_SourceDerivedDimension.js';
import {
  type V1_SourceTimeFields,
  V1_SourceTimeStart,
  V1_SourceTimeStartAndEnd,
} from '../../model/packageableElements/persistence/V1_DSL_Persistence_SourceTimeFields.js';

/**********
 * notifier
 **********/

enum V1_NotifyeeType {
  EMAIL_NOTIFYEE = 'emailNotifyee',
  PAGER_DUTY_NOTIFYEE = 'pagerDutyNotifyee',
}

const V1_emailNotifyeeModelSchema = createModelSchema(V1_EmailNotifyee, {
  _type: usingConstantValueSchema(V1_NotifyeeType.EMAIL_NOTIFYEE),
  address: primitive(),
});

const V1_pagerDutyNotifyeeModelSchema = createModelSchema(
  V1_PagerDutyNotifyee,
  {
    _type: usingConstantValueSchema(V1_NotifyeeType.PAGER_DUTY_NOTIFYEE),
    url: primitive(),
  },
);

export const V1_serializeNotifyee = (
  protocol: V1_Notifyee,
): PlainObject<V1_Notifyee> => {
  if (protocol instanceof V1_EmailNotifyee) {
    return serialize(V1_emailNotifyeeModelSchema, protocol);
  } else if (protocol instanceof V1_PagerDutyNotifyee) {
    return serialize(V1_pagerDutyNotifyeeModelSchema, protocol);
  }
  throw new UnsupportedOperationError(`Can't serialize notifyee`, protocol);
};

export const V1_deserializeNotifyee = (
  json: PlainObject<V1_Notifyee>,
): V1_Notifyee => {
  switch (json._type) {
    case V1_NotifyeeType.EMAIL_NOTIFYEE:
      return deserialize(V1_emailNotifyeeModelSchema, json);
    case V1_NotifyeeType.PAGER_DUTY_NOTIFYEE:
      return deserialize(V1_pagerDutyNotifyeeModelSchema, json);
    default:
      throw new UnsupportedOperationError(
        `Can't deserialize notifyee '${json._type}'`,
      );
  }
};

const V1_notifierModelSchema = createModelSchema(V1_Notifier, {
  notifyees: customList(V1_serializeNotifyee, V1_deserializeNotifyee),
});

/**********
 * auditing
 **********/

enum V1_AuditingType {
  NO_AUDITING = 'noAuditing',
  DATE_TIME_AUDITING = 'batchDateTimeAuditing',
}

const V1_noAuditingModelSchema = createModelSchema(V1_NoAuditing, {
  _type: usingConstantValueSchema(V1_AuditingType.NO_AUDITING),
});

const V1_dateTimeAuditingModelSchema = createModelSchema(V1_DateTimeAuditing, {
  _type: usingConstantValueSchema(V1_AuditingType.DATE_TIME_AUDITING),
  dateTimeName: primitive(),
});

export const V1_serializeAuditing = (
  protocol: V1_Auditing,
): PlainObject<V1_Auditing> => {
  if (protocol instanceof V1_NoAuditing) {
    return serialize(V1_noAuditingModelSchema, protocol);
  } else if (protocol instanceof V1_DateTimeAuditing) {
    return serialize(V1_dateTimeAuditingModelSchema, protocol);
  }
  throw new UnsupportedOperationError(`Can't serialize auditing`, protocol);
};

export const V1_deserializeAuditing = (
  json: PlainObject<V1_Auditing>,
): V1_Auditing => {
  switch (json._type) {
    case V1_AuditingType.NO_AUDITING:
      return deserialize(V1_noAuditingModelSchema, json);
    case V1_AuditingType.DATE_TIME_AUDITING:
      return deserialize(V1_dateTimeAuditingModelSchema, json);
    default:
      throw new UnsupportedOperationError(
        `Can't deserialize auditing '${json._type}'`,
      );
  }
};

/**********
 * merge strategy
 **********/

enum V1_MergeStrategyType {
  NO_DELETES_MERGE_STRATEGY = 'noDeletesMergeStrategy',
  DELETE_INDICATOR_MERGE_STRATEGY = 'deleteIndicatorMergeStrategy',
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
    deleteField: primitive(),
    deleteValues: list(primitive()),
  },
);

export const V1_serializeMergeStrategy = (
  protocol: V1_MergeStrategy,
): PlainObject<V1_MergeStrategy> => {
  if (protocol instanceof V1_NoDeletesMergeStrategy) {
    return serialize(V1_noDeletesMergeStrategyModelSchema, protocol);
  } else if (protocol instanceof V1_DeleteIndicatorMergeStrategy) {
    return serialize(V1_deleteIndicatorMergeStrategyModelSchema, protocol);
  }
  throw new UnsupportedOperationError(
    `Can't serialize merge strategy`,
    protocol,
  );
};

export const V1_deserializeMergeStrategy = (
  json: PlainObject<V1_MergeStrategy>,
): V1_MergeStrategy => {
  switch (json._type) {
    case V1_MergeStrategyType.NO_DELETES_MERGE_STRATEGY:
      return deserialize(V1_noDeletesMergeStrategyModelSchema, json);
    case V1_MergeStrategyType.DELETE_INDICATOR_MERGE_STRATEGY:
      return deserialize(V1_deleteIndicatorMergeStrategyModelSchema, json);
    default:
      throw new UnsupportedOperationError(
        `Can't deserialize merge strategy '${json._type}'`,
      );
  }
};

/**********
 * transaction derivation
 **********/

enum V1_TransactionDerivationType {
  SOURCE_SPECIFIES_IN_DATE_TIME = 'sourceSpecifiesInDateTime',
  SOURCE_SPECIFIES_IN_AND_OUT_DATE_TIME = 'sourceSpecifiesInAndOutDateTime',
}

const V1_sourceSpecifiesInDateTimeModelSchema = createModelSchema(
  V1_SourceSpecifiesInDateTime,
  {
    _type: usingConstantValueSchema(
      V1_TransactionDerivationType.SOURCE_SPECIFIES_IN_DATE_TIME,
    ),
    sourceDateTimeInField: primitive(),
  },
);

const V1_sourceSpecifiesInAndOutDateTimeModelSchema = createModelSchema(
  V1_SourceSpecifiesInAndOutDateTime,
  {
    _type: usingConstantValueSchema(
      V1_TransactionDerivationType.SOURCE_SPECIFIES_IN_AND_OUT_DATE_TIME,
    ),
    sourceDateTimeInField: primitive(),
    sourceDateTimeOutField: primitive(),
  },
);

export const V1_serializeTransactionDerivation = (
  protocol: V1_TransactionDerivation,
): PlainObject<V1_TransactionDerivation> => {
  if (protocol instanceof V1_SourceSpecifiesInDateTime) {
    return serialize(V1_sourceSpecifiesInDateTimeModelSchema, protocol);
  } else if (protocol instanceof V1_SourceSpecifiesInAndOutDateTime) {
    return serialize(V1_sourceSpecifiesInAndOutDateTimeModelSchema, protocol);
  }
  throw new UnsupportedOperationError(
    `Can't serialize transaction derivation`,
    protocol,
  );
};

export const V1_deserializeTransactionDerivation = (
  json: PlainObject<V1_TransactionDerivation>,
): V1_TransactionDerivation => {
  switch (json._type) {
    case V1_TransactionDerivationType.SOURCE_SPECIFIES_IN_DATE_TIME:
      return deserialize(V1_sourceSpecifiesInDateTimeModelSchema, json);
    case V1_TransactionDerivationType.SOURCE_SPECIFIES_IN_AND_OUT_DATE_TIME:
      return deserialize(V1_sourceSpecifiesInAndOutDateTimeModelSchema, json);
    default:
      throw new UnsupportedOperationError(
        `Can't deserialize transaction derivation '${json._type}'`,
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
    derivation: custom(
      (val) => (val ? V1_serializeTransactionDerivation(val) : SKIP),
      (val) => V1_deserializeTransactionDerivation(val),
    ),
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
    derivation: optional(
      custom(
        (val) => (val ? V1_serializeTransactionDerivation(val) : SKIP),
        (val) => V1_deserializeTransactionDerivation(val),
      ),
    ),
  });

export const V1_serializeTransactionMilestoning = (
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
  }
  throw new UnsupportedOperationError(
    `Can't serialize transaction milestoning`,
    protocol,
  );
};

export const V1_deserializeTransactionMilestoning = (
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
    default:
      throw new UnsupportedOperationError(
        `Can't deserialize transaction milestoning '${json._type}'`,
      );
  }
};

/**********
 * validity derivation
 **********/

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
    sourceDateTimeFromField: primitive(),
  },
);

const V1_sourceSpecifiesFromAndThruDateTimeModelSchema = createModelSchema(
  V1_SourceSpecifiesFromAndThruDateTime,
  {
    _type: usingConstantValueSchema(
      V1_ValidityDerivationType.SOURCE_SPECIFIES_FROM_AND_THRU_DATE_TIME,
    ),
    sourceDateTimeFromField: primitive(),
    sourceDateTimeThruField: primitive(),
  },
);

export const V1_serializeValidityDerivation = (
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
    `Can't serialize validity derivation`,
    protocol,
  );
};

export const V1_deserializeValidityDerivation = (
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
        `Can't deserialize validity derivation '${json._type}'`,
      );
  }
};

/**********
 * validity milestoning
 **********/

enum V1_ValidityMilestoningType {
  DATE_TIME_VALIDITY_MILESTONING = 'dateTimeValidityMilestoning',
}

const V1_dateTimeValidityMilestoningModelSchema = createModelSchema(
  V1_DateTimeValidityMilestoning,
  {
    _type: usingConstantValueSchema(
      V1_ValidityMilestoningType.DATE_TIME_VALIDITY_MILESTONING,
    ),
    dateTimeFromName: primitive(),
    dateTimeThruName: primitive(),
    derivation: custom(
      (val) => V1_serializeValidityDerivation(val),
      (val) => V1_deserializeValidityDerivation(val),
    ),
  },
);

export const V1_serializeValidityMilestoning = (
  protocol: V1_ValidityMilestoning,
): PlainObject<V1_ValidityMilestoning> => {
  if (protocol instanceof V1_DateTimeValidityMilestoning) {
    return serialize(V1_dateTimeValidityMilestoningModelSchema, protocol);
  }
  throw new UnsupportedOperationError(
    `Can't serialize validity milestoning`,
    protocol,
  );
};

export const V1_deserializeValidityMilestoning = (
  json: PlainObject<V1_ValidityMilestoning>,
): V1_ValidityMilestoning => {
  switch (json._type) {
    case V1_ValidityMilestoningType.DATE_TIME_VALIDITY_MILESTONING:
      return deserialize(V1_dateTimeValidityMilestoningModelSchema, json);
    default:
      throw new UnsupportedOperationError(
        `Can't deserialize validity milestoning '${json._type}'`,
      );
  }
};

/**********
 * ingest mode
 **********/

enum V1_IngestModeType {
  NONTEMPORAL_SNAPSHOT = 'nontemporalSnapshot',
  UNITEMPORAL_SNAPSHOT = 'unitemporalSnapshot',
  BITEMPORAL_SNAPSHOT = 'bitemporalSnapshot',
  NONTEMPORAL_DELTA = 'nontemporalDelta',
  UNITEMPORAL_DELTA = 'unitemporalDelta',
  BITEMPORAL_DELTA = 'bitemporalDelta',
  APPEND_ONLY = 'appendOnly',
}

const V1_nontemporalSnapshotModelSchema = createModelSchema(
  V1_NontemporalSnapshot,
  {
    _type: usingConstantValueSchema(V1_IngestModeType.NONTEMPORAL_SNAPSHOT),
    auditing: custom(
      (val) => V1_serializeAuditing(val),
      (val) => V1_deserializeAuditing(val),
    ),
  },
);

const V1_unitemporalSnapshotModelSchema = createModelSchema(
  V1_UnitemporalSnapshot,
  {
    _type: usingConstantValueSchema(V1_IngestModeType.UNITEMPORAL_SNAPSHOT),
    transactionMilestoning: custom(
      (val) => V1_serializeTransactionMilestoning(val),
      (val) => V1_deserializeTransactionMilestoning(val),
    ),
  },
);

const V1_bitemporalSnapshotModelSchema = createModelSchema(
  V1_BitemporalSnapshot,
  {
    _type: usingConstantValueSchema(V1_IngestModeType.BITEMPORAL_SNAPSHOT),
    transactionMilestoning: custom(
      (val) => V1_serializeTransactionMilestoning(val),
      (val) => V1_deserializeTransactionMilestoning(val),
    ),
    validityMilestoning: custom(
      (val) => V1_serializeValidityMilestoning(val),
      (val) => V1_deserializeValidityMilestoning(val),
    ),
  },
);

const V1_nontemporalDeltaModelSchema = createModelSchema(V1_NontemporalDelta, {
  _type: usingConstantValueSchema(V1_IngestModeType.NONTEMPORAL_DELTA),
  auditing: custom(
    (val) => V1_serializeAuditing(val),
    (val) => V1_deserializeAuditing(val),
  ),
  mergeStrategy: custom(
    (val) => V1_serializeMergeStrategy(val),
    (val) => V1_deserializeMergeStrategy(val),
  ),
});

const V1_unitemporalDeltaModelSchema = createModelSchema(V1_UnitemporalDelta, {
  _type: usingConstantValueSchema(V1_IngestModeType.UNITEMPORAL_DELTA),
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
  _type: usingConstantValueSchema(V1_IngestModeType.BITEMPORAL_DELTA),
  mergeStrategy: custom(
    (val) => V1_serializeMergeStrategy(val),
    (val) => V1_deserializeMergeStrategy(val),
  ),
  transactionMilestoning: custom(
    (val) => V1_serializeTransactionMilestoning(val),
    (val) => V1_deserializeTransactionMilestoning(val),
  ),
  validityMilestoning: custom(
    (val) => V1_serializeValidityMilestoning(val),
    (val) => V1_deserializeValidityMilestoning(val),
  ),
});

const V1_appendOnlyModelSchema = createModelSchema(V1_AppendOnly, {
  _type: usingConstantValueSchema(V1_IngestModeType.APPEND_ONLY),
  auditing: custom(
    (val) => V1_serializeAuditing(val),
    (val) => V1_deserializeAuditing(val),
  ),
  filterDuplicates: primitive(),
});

export const V1_serializeIngestMode = (
  protocol: V1_IngestMode,
): PlainObject<V1_IngestMode> => {
  if (protocol instanceof V1_NontemporalSnapshot) {
    return serialize(V1_nontemporalSnapshotModelSchema, protocol);
  } else if (protocol instanceof V1_UnitemporalSnapshot) {
    return serialize(V1_unitemporalSnapshotModelSchema, protocol);
  } else if (protocol instanceof V1_BitemporalSnapshot) {
    return serialize(V1_bitemporalSnapshotModelSchema, protocol);
  } else if (protocol instanceof V1_NontemporalDelta) {
    return serialize(V1_nontemporalDeltaModelSchema, protocol);
  } else if (protocol instanceof V1_UnitemporalDelta) {
    return serialize(V1_unitemporalDeltaModelSchema, protocol);
  } else if (protocol instanceof V1_BitemporalDelta) {
    return serialize(V1_bitemporalDeltaModelSchema, protocol);
  } else if (protocol instanceof V1_AppendOnly) {
    return serialize(V1_appendOnlyModelSchema, protocol);
  }
  throw new UnsupportedOperationError(`Can't serialize ingest mode`, protocol);
};

export const V1_deserializeIngestMode = (
  json: PlainObject<V1_IngestMode>,
): V1_IngestMode => {
  switch (json._type) {
    case V1_IngestModeType.NONTEMPORAL_SNAPSHOT:
      return deserialize(V1_nontemporalSnapshotModelSchema, json);
    case V1_IngestModeType.UNITEMPORAL_SNAPSHOT:
      return deserialize(V1_unitemporalSnapshotModelSchema, json);
    case V1_IngestModeType.BITEMPORAL_SNAPSHOT:
      return deserialize(V1_bitemporalSnapshotModelSchema, json);
    case V1_IngestModeType.NONTEMPORAL_DELTA:
      return deserialize(V1_nontemporalDeltaModelSchema, json);
    case V1_IngestModeType.UNITEMPORAL_DELTA:
      return deserialize(V1_unitemporalDeltaModelSchema, json);
    case V1_IngestModeType.BITEMPORAL_DELTA:
      return deserialize(V1_bitemporalDeltaModelSchema, json);
    case V1_IngestModeType.APPEND_ONLY:
      return deserialize(V1_appendOnlyModelSchema, json);
    default:
      throw new UnsupportedOperationError(
        `Can't deserialize ingest mode '${json._type}'`,
      );
  }
};

/**********
 * sink
 **********/

enum V1_SinkType {
  RELATIONAL_SINK = 'relationalSink',
  OBJECT_STORAGE_SINK = 'objectStorageSink',
}

const V1_relationalSinkModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_RelationalSink> =>
  createModelSchema(V1_RelationalSink, {
    _type: usingConstantValueSchema(V1_SinkType.RELATIONAL_SINK),
    database: custom(
      (val) => serialize(V1_packageableElementPointerModelSchema, val),
      (val) =>
        V1_serializePackageableElementPointer(
          val,
          PackageableElementPointerType.STORE,
        ),
    ),
  });

const V1_objectStorageSinkModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_ObjectStorageSink> =>
  createModelSchema(V1_ObjectStorageSink, {
    _type: usingConstantValueSchema(V1_SinkType.OBJECT_STORAGE_SINK),
    binding: custom(
      (val) => serialize(V1_packageableElementPointerModelSchema, val),
      (val) =>
        V1_serializePackageableElementPointer(
          val,
          PackageableElementPointerType.BINDING,
        ),
    ),
  });

export const V1_serializeSink = (
  protocol: V1_Sink,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_Sink> => {
  if (protocol instanceof V1_RelationalSink) {
    return serialize(V1_relationalSinkModelSchema(plugins), protocol);
  } else if (protocol instanceof V1_ObjectStorageSink) {
    return serialize(V1_objectStorageSinkModelSchema(plugins), protocol);
  }
  throw new UnsupportedOperationError(`Can't serialize sink`, protocol);
};

export const V1_deserializeSink = (
  json: PlainObject<V1_Sink>,
  plugins: PureProtocolProcessorPlugin[],
): V1_Sink => {
  switch (json._type) {
    case V1_SinkType.RELATIONAL_SINK:
      return deserialize(V1_relationalSinkModelSchema(plugins), json);
    case V1_SinkType.OBJECT_STORAGE_SINK:
      return deserialize(V1_objectStorageSinkModelSchema(plugins), json);
    default:
      throw new UnsupportedOperationError(
        `Can't deserialize sink '${json._type}'`,
      );
  }
};

/**********
 * deduplication strategy
 **********/

enum V1_DeduplicationStrategyType {
  NO_DEDUPLICATION_STRATEGY = 'noDeduplicationStrategy',
  ANY_VERSION_DEDUPLICATION_STRATEGY = 'anyVersionDeduplicationStrategy',
  MAX_VERSION_DEDUPLICATION_STRATEGY = 'maxVersionDeduplicationStrategy',
  DUPLICATE_COUNT_DEDUPLICATION_STRATEGY = 'duplicateCountDeduplicationStrategy',
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
    versionField: primitive(),
  },
);

const V1_duplicateCountDeduplicationStrategyModelSchema = createModelSchema(
  V1_DuplicateCountDeduplicationStrategy,
  {
    _type: usingConstantValueSchema(
      V1_DeduplicationStrategyType.DUPLICATE_COUNT_DEDUPLICATION_STRATEGY,
    ),
    duplicateCountName: primitive(),
  },
);

export const V1_serializeDeduplicationStrategy = (
  protocol: V1_DeduplicationStrategy,
): PlainObject<V1_DeduplicationStrategy> => {
  if (protocol instanceof V1_NoDeduplicationStrategy) {
    return serialize(V1_noDeduplicationStrategyModelSchema, protocol);
  } else if (protocol instanceof V1_AnyVersionDeduplicationStrategy) {
    return serialize(V1_anyVersionDeduplicationStrategyModelSchema, protocol);
  } else if (protocol instanceof V1_MaxVersionDeduplicationStrategy) {
    return serialize(V1_maxVersionDeduplicationStrategyModelSchema, protocol);
  } else if (protocol instanceof V1_DuplicateCountDeduplicationStrategy) {
    return serialize(
      V1_duplicateCountDeduplicationStrategyModelSchema,
      protocol,
    );
  }
  throw new UnsupportedOperationError(
    `Can't serialize deduplication strategy`,
    protocol,
  );
};

export const V1_deserializeDeduplicationStrategy = (
  json: PlainObject<V1_DeduplicationStrategy>,
): V1_DeduplicationStrategy => {
  switch (json._type) {
    case V1_DeduplicationStrategyType.NO_DEDUPLICATION_STRATEGY:
      return deserialize(V1_noDeduplicationStrategyModelSchema, json);
    case V1_DeduplicationStrategyType.ANY_VERSION_DEDUPLICATION_STRATEGY:
      return deserialize(V1_anyVersionDeduplicationStrategyModelSchema, json);
    case V1_DeduplicationStrategyType.MAX_VERSION_DEDUPLICATION_STRATEGY:
      return deserialize(V1_maxVersionDeduplicationStrategyModelSchema, json);
    case V1_DeduplicationStrategyType.DUPLICATE_COUNT_DEDUPLICATION_STRATEGY:
      return deserialize(
        V1_duplicateCountDeduplicationStrategyModelSchema,
        json,
      );
    default:
      throw new UnsupportedOperationError(
        `Can't deserialize deduplicationStrategy '${json._type}'`,
      );
  }
};

/**********
 * target shape
 **********/

enum V1_TargetShapeType {
  FLAT_TARGET = 'flatTarget',
  MULTI_FLAT_TARGET = 'multiFlatTarget',
}

const V1_flatTargetModelSchema = createModelSchema(V1_FlatTarget, {
  _type: usingConstantValueSchema(V1_TargetShapeType.FLAT_TARGET),
  deduplicationStrategy: custom(
    (val) => V1_serializeDeduplicationStrategy(val),
    (val) => V1_deserializeDeduplicationStrategy(val),
  ),
  modelClass: primitive(),
  partitionFields: list(primitive()),
  targetName: primitive(),
});

const V1_multiFlatTargetPartSchema = createModelSchema(V1_MultiFlatTargetPart, {
  deduplicationStrategy: custom(
    (val) => V1_serializeDeduplicationStrategy(val),
    (val) => V1_deserializeDeduplicationStrategy(val),
  ),
  modelProperty: primitive(),
  partitionFields: list(primitive()),
  targetName: primitive(),
});

const V1_multiFlatTargetModelSchema = createModelSchema(V1_MultiFlatTarget, {
  _type: usingConstantValueSchema(V1_TargetShapeType.MULTI_FLAT_TARGET),
  modelClass: primitive(),
  parts: customListWithSchema(V1_multiFlatTargetPartSchema),
  transactionScope: primitive(),
});

export const V1_serializeTargetShape = (
  protocol: V1_TargetShape,
): PlainObject<V1_TargetShape> => {
  if (protocol instanceof V1_MultiFlatTarget) {
    return serialize(V1_multiFlatTargetModelSchema, protocol);
  } else if (protocol instanceof V1_FlatTarget) {
    return serialize(V1_flatTargetModelSchema, protocol);
  }
  throw new UnsupportedOperationError(`Can't serialize target shape`, protocol);
};

export const V1_deserializeTargetShape = (
  json: PlainObject<V1_TargetShape>,
): V1_TargetShape => {
  switch (json._type) {
    case V1_TargetShapeType.MULTI_FLAT_TARGET:
      return deserialize(V1_multiFlatTargetModelSchema, json);
    case V1_TargetShapeType.FLAT_TARGET:
      return deserialize(V1_flatTargetModelSchema, json);
    default:
      throw new UnsupportedOperationError(
        `Can't deserialize target shape '${json._type}'`,
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

const V1_streamingPersisterModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_StreamingPersister> =>
  createModelSchema(V1_StreamingPersister, {
    _type: usingConstantValueSchema(V1_PersisterType.STREAMING_PERSISTER),
    sink: custom(
      (val) => V1_serializeSink(val, plugins),
      (val) => V1_deserializeSink(val, plugins),
    ),
  });

const V1_batchPersisterModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_BatchPersister> =>
  createModelSchema(V1_BatchPersister, {
    _type: usingConstantValueSchema(V1_PersisterType.BATCH_PERSISTER),
    ingestMode: custom(
      (val) => V1_serializeIngestMode(val),
      (val) => V1_deserializeIngestMode(val),
    ),
    sink: custom(
      (val) => V1_serializeSink(val, plugins),
      (val) => V1_deserializeSink(val, plugins),
    ),
    targetShape: custom(
      (val) => V1_serializeTargetShape(val),
      (val) => V1_deserializeTargetShape(val),
    ),
  });

export const V1_serializePersister = (
  protocol: V1_Persister,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_Persister> => {
  if (protocol instanceof V1_StreamingPersister) {
    return serialize(V1_streamingPersisterModelSchema(plugins), protocol);
  } else if (protocol instanceof V1_BatchPersister) {
    return serialize(V1_batchPersisterModelSchema(plugins), protocol);
  }
  throw new UnsupportedOperationError(`Can't serialize persister`, protocol);
};

export const V1_deserializePersister = (
  json: PlainObject<V1_Persister>,
  plugins: PureProtocolProcessorPlugin[],
): V1_Persister => {
  switch (json._type) {
    case V1_PersisterType.STREAMING_PERSISTER:
      return deserialize(V1_streamingPersisterModelSchema(plugins), json);
    case V1_PersisterType.BATCH_PERSISTER:
      return deserialize(V1_batchPersisterModelSchema(plugins), json);
    default:
      throw new UnsupportedOperationError(
        `Can't deserialize persister '${json._type}'`,
      );
  }
};

/**********
 * trigger
 **********/

export enum V1_TriggerType {
  MANUAL_TRIGGER = 'manualTrigger',
  CRON_TRIGGER = 'cronTrigger',
}

export const V1_manualTriggerModelSchema = createModelSchema(V1_ManualTrigger, {
  _type: usingConstantValueSchema(V1_TriggerType.MANUAL_TRIGGER),
});

export const V1_cronTriggerModelSchema = createModelSchema(V1_CronTrigger, {
  _type: usingConstantValueSchema(V1_TriggerType.CRON_TRIGGER),
  minutes: primitive(),
  hours: primitive(),
  dayOfMonth: primitive(),
  month: primitive(),
  dayOfWeek: primitive(),
});

export const V1_serializeTrigger = (
  protocol: V1_Trigger,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_Trigger> => {
  const extraTriggerProtocolSerializers = plugins.flatMap(
    (plugin) =>
      (
        plugin as DSL_Persistence_PureProtocolProcessorPlugin_Extension
      ).V1_getExtraTriggerProtocolSerializers?.() ?? [],
  );
  for (const serializer of extraTriggerProtocolSerializers) {
    const triggerProtocolJson = serializer(protocol);
    if (triggerProtocolJson) {
      return triggerProtocolJson;
    }
  }
  throw new UnsupportedOperationError(
    `Can't serialize trigger: no compatible serializer available from plugins`,
    protocol,
  );
};

export const V1_deserializeTrigger = (
  json: PlainObject<V1_Trigger>,
  plugins: PureProtocolProcessorPlugin[],
): V1_Trigger => {
  const extraTriggerProtocolDeserializers = plugins.flatMap(
    (plugin) =>
      (
        plugin as DSL_Persistence_PureProtocolProcessorPlugin_Extension
      ).V1_getExtraTriggerProtocolDeserializers?.() ?? [],
  );
  for (const deserializer of extraTriggerProtocolDeserializers) {
    const triggerProtocol = deserializer(json);
    if (triggerProtocol) {
      return triggerProtocol;
    }
  }
  throw new UnsupportedOperationError(
    `Can't deserialize trigger of type '${json._type}': no compatible deserializer available from plugins`,
  );
};

/**********
 * test
 **********/

export enum V1_AtomicTestType {
  PERSISTENCE_TEST = 'test',
}

export const V1_persistenceConnectionTestDataModelSchema = createModelSchema(
  V1_ConnectionTestData,
  {
    data: usingModelSchema(V1_externalFormatDataModelSchema),
  },
);

export const V1_persistenceTestDataModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_PersistenceTestData> =>
  createModelSchema(V1_PersistenceTestData, {
    connection: usingModelSchema(V1_persistenceConnectionTestDataModelSchema),
  });

export const V1_persistenceTestBatchModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_PersistenceTestBatch> =>
  createModelSchema(V1_PersistenceTestBatch, {
    assertions: customList(
      V1_serializeTestAssertion,
      V1_deserializeTestAssertion,
    ),
    batchId: primitive(),
    id: primitive(),
    testData: usingModelSchema(V1_persistenceTestDataModelSchema(plugins)),
  });

export const V1_persistenceTestModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_PersistenceTest> =>
  createModelSchema(V1_PersistenceTest, {
    _type: usingConstantValueSchema(V1_AtomicTestType.PERSISTENCE_TEST),
    graphFetchPath: raw(),
    id: primitive(),
    isTestDataFromServiceOutput: primitive(),
    testBatches: customListWithSchema(
      V1_persistenceTestBatchModelSchema(plugins),
    ),
  });

/*************
 * AuditingV2
 *************/

export enum V1_AuditingTypeV2 {
  DATE_TIME_AUDITING_V2 = 'auditingDateTime',
  NO_AUDITING_V2 = 'noAuditing',
}

export const V1_auditingDateTimeV2ModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_AuditingDateTimeV2> =>
  createModelSchema(V1_AuditingDateTimeV2, {
    _type: usingConstantValueSchema(V1_AuditingTypeV2.DATE_TIME_AUDITING_V2),
    auditingDateTimeName: primitive(),
  });

export const V1_noAuditingV2ModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_NoAuditingV2> =>
  createModelSchema(V1_NoAuditingV2, {
    _type: usingConstantValueSchema(V1_AuditingTypeV2.NO_AUDITING_V2),
  });

export const V1_serializeAuditingV2 = (
  protocol: V1_AuditingV2,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_AuditingV2> => {
  if (protocol instanceof V1_AuditingDateTimeV2) {
    return serialize(V1_auditingDateTimeV2ModelSchema(plugins), protocol);
  } else if (protocol instanceof V1_NoAuditingV2) {
    return serialize(V1_noAuditingV2ModelSchema(plugins), protocol);
  }
  throw new UnsupportedOperationError(`Can't serialize AuditingV2`, protocol);
};

export const V1_deserializeAuditingV2 = (
  json: PlainObject<V1_AuditingV2>,
  plugins: PureProtocolProcessorPlugin[],
): V1_AuditingV2 => {
  if (json._type === V1_AuditingTypeV2.DATE_TIME_AUDITING_V2) {
    return deserialize(V1_auditingDateTimeV2ModelSchema(plugins), json);
  } else if (json._type === V1_AuditingTypeV2.NO_AUDITING_V2) {
    return deserialize(V1_noAuditingV2ModelSchema(plugins), json);
  }
  throw new UnsupportedOperationError(`Can't deserialize AuditingV2`, json);
};

/******************
 * Append Strategy
 ******************/

export enum V1_AppendStrategyType {
  ALLOW_DUPLICATES = 'allowDuplicates',
  FAIL_ON_DUPLICATES = 'failOnDuplicates',
  FILTER_DUPLICATES = 'filterDuplicates',
}

export const V1_failOnDuplicatesModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_FailOnDuplicates> =>
  createModelSchema(V1_FailOnDuplicates, {
    _type: usingConstantValueSchema(V1_AppendStrategyType.FAIL_ON_DUPLICATES),
  });

export const V1_allowDuplicatesModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_AllowDuplicates> =>
  createModelSchema(V1_AllowDuplicates, {
    _type: usingConstantValueSchema(V1_AppendStrategyType.ALLOW_DUPLICATES),
  });

export const V1_filterDuplicatesModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_FilterDuplicates> =>
  createModelSchema(V1_FilterDuplicates, {
    _type: usingConstantValueSchema(V1_AppendStrategyType.FILTER_DUPLICATES),
  });

export const V1_serializeAppendStrategy = (
  protocol: V1_AppendStrategy,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_AppendStrategy> => {
  if (protocol instanceof V1_AllowDuplicates) {
    return serialize(V1_allowDuplicatesModelSchema(plugins), protocol);
  } else if (protocol instanceof V1_FailOnDuplicates) {
    return serialize(V1_failOnDuplicatesModelSchema(plugins), protocol);
  } else if (protocol instanceof V1_FilterDuplicates) {
    return serialize(V1_filterDuplicatesModelSchema(plugins), protocol);
  }
  throw new UnsupportedOperationError(
    `Can't serialize AppendStrategy`,
    protocol,
  );
};

export const V1_deserializeAppendStrategy = (
  json: PlainObject<V1_AppendStrategy>,
  plugins: PureProtocolProcessorPlugin[],
): V1_AppendStrategy => {
  if (json._type === V1_AppendStrategyType.ALLOW_DUPLICATES) {
    return deserialize(V1_allowDuplicatesModelSchema(plugins), json);
  } else if (json._type === V1_AppendStrategyType.FAIL_ON_DUPLICATES) {
    return deserialize(V1_failOnDuplicatesModelSchema(plugins), json);
  } else if (json._type === V1_AppendStrategyType.FILTER_DUPLICATES) {
    return deserialize(V1_filterDuplicatesModelSchema(plugins), json);
  }
  throw new UnsupportedOperationError(`Can't deserialize AppendStrategy`, json);
};

/******************
 * Updates handling
 ******************/

export enum V1_UpdatesHandlingType {
  APPEND_ONLY = 'appendOnly',
  OVERWRITE = 'overwrite',
}

export const V1_overwriteUpdatesHandlingModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_OverwriteUpdatesHandling> =>
  createModelSchema(V1_OverwriteUpdatesHandling, {
    _type: usingConstantValueSchema(V1_UpdatesHandlingType.OVERWRITE),
  });

export const V1_appendOnlyUpdatesHandlingModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_AppendOnlyUpdatesHandling> =>
  createModelSchema(V1_AppendOnlyUpdatesHandling, {
    _type: usingConstantValueSchema(V1_UpdatesHandlingType.APPEND_ONLY),
    appendStrategy: custom(
      (val) => V1_serializeAppendStrategy(val, plugins),
      (val) => V1_deserializeAppendStrategy(val, plugins),
    ),
  });

export const V1_serializeUpdatesHandling = (
  protocol: V1_UpdatesHandling,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_UpdatesHandling> => {
  if (protocol instanceof V1_AppendOnlyUpdatesHandling) {
    return serialize(
      V1_appendOnlyUpdatesHandlingModelSchema(plugins),
      protocol,
    );
  } else if (protocol instanceof V1_OverwriteUpdatesHandling) {
    return serialize(V1_overwriteUpdatesHandlingModelSchema(plugins), protocol);
  }
  throw new UnsupportedOperationError(
    `Can't serialize UpdatesHandling`,
    protocol,
  );
};

export const V1_deserializeUpdatesHandling = (
  json: PlainObject<V1_UpdatesHandling>,
  plugins: PureProtocolProcessorPlugin[],
): V1_UpdatesHandling => {
  if (json._type === V1_UpdatesHandlingType.APPEND_ONLY) {
    return deserialize(V1_appendOnlyUpdatesHandlingModelSchema(plugins), json);
  } else if (json._type === V1_UpdatesHandlingType.OVERWRITE) {
    return deserialize(V1_overwriteUpdatesHandlingModelSchema(plugins), json);
  }
  throw new UnsupportedOperationError(
    `Can't deserialize UpdatesHandling`,
    json,
  );
};

/**********************
 * Processing dimension
 **********************/

export enum V1_ProcessingDimensionType {
  BATCH_ID = 'batchId',
  PROCESSING_DATE_TIME = 'processingTime',
  BATCH_ID_AND_DATE_TIME = 'batchIdAndProcessingTime',
}

export const V1_batchIdModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_BatchId> =>
  createModelSchema(V1_BatchId, {
    _type: usingConstantValueSchema(V1_ProcessingDimensionType.BATCH_ID),
    batchIdIn: primitive(),
    batchIdOut: primitive(),
  });

export const V1_processingDateTimeModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_ProcessingDateTime> =>
  createModelSchema(V1_ProcessingDateTime, {
    _type: usingConstantValueSchema(
      V1_ProcessingDimensionType.PROCESSING_DATE_TIME,
    ),
    timeIn: primitive(),
    timeOut: primitive(),
  });

export const V1_batchIdAndDateTimeModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_BatchIdAndDateTime> =>
  createModelSchema(V1_BatchIdAndDateTime, {
    _type: usingConstantValueSchema(
      V1_ProcessingDimensionType.BATCH_ID_AND_DATE_TIME,
    ),
    batchIdIn: primitive(),
    batchIdOut: primitive(),
    timeIn: primitive(),
    timeOut: primitive(),
  });

export const V1_serializeProcessingDimension = (
  protocol: V1_ProcessingDimension,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_ProcessingDimension> => {
  if (protocol instanceof V1_BatchId) {
    return serialize(V1_batchIdModelSchema(plugins), protocol);
  } else if (protocol instanceof V1_ProcessingDateTime) {
    return serialize(V1_processingDateTimeModelSchema(plugins), protocol);
  } else if (protocol instanceof V1_BatchIdAndDateTime) {
    return serialize(V1_batchIdAndDateTimeModelSchema(plugins), protocol);
  }
  throw new UnsupportedOperationError(
    `Can't serialize ProcessingDimension`,
    protocol,
  );
};

export const V1_deserializeProcessingDimension = (
  json: PlainObject<V1_ProcessingDimension>,
  plugins: PureProtocolProcessorPlugin[],
): V1_ProcessingDimension => {
  if (json._type === V1_ProcessingDimensionType.BATCH_ID) {
    return deserialize(V1_batchIdModelSchema(plugins), json);
  } else if (json._type === V1_ProcessingDimensionType.BATCH_ID_AND_DATE_TIME) {
    return deserialize(V1_batchIdAndDateTimeModelSchema(plugins), json);
  } else if (json._type === V1_ProcessingDimensionType.PROCESSING_DATE_TIME) {
    return deserialize(V1_processingDateTimeModelSchema(plugins), json);
  }
  throw new UnsupportedOperationError(
    `Can't deserialize ProcessingDimension`,
    json,
  );
};

/********************
 * Source time fields
 ********************/

export enum V1_SourceTimeFieldsType {
  SOURCE_TIME_START = 'sourceTimeStart',
  SOURCE_TIME_START_AND_END = 'sourceTimeStartAndEnd',
}

export const V1_sourceTimeStartModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_SourceTimeStart> =>
  createModelSchema(V1_SourceTimeStart, {
    _type: usingConstantValueSchema(V1_SourceTimeFieldsType.SOURCE_TIME_START),
    startField: primitive(),
  });

export const V1_sourceTimeStartAndEndModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_SourceTimeStartAndEnd> =>
  createModelSchema(V1_SourceTimeStartAndEnd, {
    _type: usingConstantValueSchema(
      V1_SourceTimeFieldsType.SOURCE_TIME_START_AND_END,
    ),
    endField: primitive(),
    startField: primitive(),
  });

export const V1_serializeSourceTimeFields = (
  protocol: V1_SourceTimeFields,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_SourceTimeFields> => {
  if (protocol instanceof V1_SourceTimeStart) {
    return serialize(V1_sourceTimeStartModelSchema(plugins), protocol);
  } else if (protocol instanceof V1_SourceTimeStartAndEnd) {
    return serialize(V1_sourceTimeStartAndEndModelSchema(plugins), protocol);
  }
  throw new UnsupportedOperationError(
    `Can't serialize SourceTimeFields`,
    protocol,
  );
};

export const V1_deserializeSourceTimeFields = (
  json: PlainObject<V1_SourceTimeFields>,
  plugins: PureProtocolProcessorPlugin[],
): V1_SourceTimeFields => {
  if (json._type === V1_SourceTimeFieldsType.SOURCE_TIME_START) {
    return deserialize(V1_sourceTimeStartModelSchema(plugins), json);
  } else if (json._type === V1_SourceTimeFieldsType.SOURCE_TIME_START_AND_END) {
    return deserialize(V1_sourceTimeStartAndEndModelSchema(plugins), json);
  }
  throw new UnsupportedOperationError(
    `Can't deserialize SourceTimeFields`,
    json,
  );
};

/**************************
 * Source derived dimension
 **************************/

export enum V1_SourceDerivedDimensionType {
  SOURCE_DERIVED_TIME = 'sourceDerivedTime',
}

export const V1_sourceDerivedTimeModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_SourceDerivedTime> =>
  createModelSchema(V1_SourceDerivedTime, {
    _type: usingConstantValueSchema(
      V1_SourceDerivedDimensionType.SOURCE_DERIVED_TIME,
    ),
    sourceTimeFields: custom(
      (val) => V1_serializeSourceTimeFields(val, plugins),
      (val) => V1_deserializeSourceTimeFields(val, plugins),
    ),
    timeEnd: primitive(),
    timeStart: primitive(),
  });

export const V1_serializeSourceDerivedDimension = (
  protocol: V1_SourceDerivedDimension,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_SourceDerivedDimension> => {
  if (protocol instanceof V1_SourceDerivedTime) {
    return serialize(V1_sourceDerivedTimeModelSchema(plugins), protocol);
  }
  throw new UnsupportedOperationError(
    `Can't serialize SourceDerivedDimension`,
    protocol,
  );
};

export const V1_deserializeSourceDerivedDimension = (
  json: PlainObject<V1_SourceDerivedDimension>,
  plugins: PureProtocolProcessorPlugin[],
): V1_SourceDerivedDimension => {
  if (json._type === V1_SourceDerivedDimensionType.SOURCE_DERIVED_TIME) {
    return deserialize(V1_sourceDerivedTimeModelSchema(plugins), json);
  }
  throw new UnsupportedOperationError(
    `Can't deserialize SourceDerivedDimension`,
    json,
  );
};

/*************
 * Temporality
 *************/

export enum V1_TemporalityType {
  NON_TEMPORAL = 'none',
  UNI_TEMPORAL = 'unitemporalTemporality',
  BI_TEMPORAL = 'bitemporalTemporality',
}

export const V1_nonTemporalModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_NonTemporal> =>
  createModelSchema(V1_NonTemporal, {
    _type: usingConstantValueSchema(V1_TemporalityType.NON_TEMPORAL),
    auditing: custom(
      (val) => V1_serializeAuditingV2(val, plugins),
      (val) => V1_deserializeAuditingV2(val, plugins),
    ),
    updatesHandling: custom(
      (val) => V1_serializeUpdatesHandling(val, plugins),
      (val) => V1_deserializeUpdatesHandling(val, plugins),
    ),
  });

export const V1_biTemporalModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_BiTemporal> =>
  createModelSchema(V1_BiTemporal, {
    _type: usingConstantValueSchema(V1_TemporalityType.BI_TEMPORAL),
    processingDimension: custom(
      (val) => V1_serializeProcessingDimension(val, plugins),
      (val) => V1_deserializeProcessingDimension(val, plugins),
    ),
    sourceDerivedDimension: custom(
      (val) => V1_serializeSourceDerivedDimension(val, plugins),
      (val) => V1_deserializeSourceDerivedDimension(val, plugins),
    ),
  });

export const V1_uniTemporalModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_UniTemporal> =>
  createModelSchema(V1_UniTemporal, {
    _type: usingConstantValueSchema(V1_TemporalityType.UNI_TEMPORAL),
    processingDimension: custom(
      (val) => V1_serializeProcessingDimension(val, plugins),
      (val) => V1_deserializeProcessingDimension(val, plugins),
    ),
  });

export const V1_serializeTemporality = (
  protocol: V1_Temporality,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_Temporality> => {
  if (protocol instanceof V1_NonTemporal) {
    return serialize(V1_nonTemporalModelSchema(plugins), protocol);
  } else if (protocol instanceof V1_UniTemporal) {
    return serialize(V1_uniTemporalModelSchema(plugins), protocol);
  } else if (protocol instanceof V1_BiTemporal) {
    return serialize(V1_biTemporalModelSchema(plugins), protocol);
  }
  throw new UnsupportedOperationError(`Can't serialize Temporality`, protocol);
};

export const V1_deserializeTemporality = (
  json: PlainObject<V1_Temporality>,
  plugins: PureProtocolProcessorPlugin[],
): V1_Temporality => {
  if (json._type === V1_TemporalityType.NON_TEMPORAL) {
    return deserialize(V1_nonTemporalModelSchema(plugins), json);
  } else if (json._type === V1_TemporalityType.UNI_TEMPORAL) {
    return deserialize(V1_uniTemporalModelSchema(plugins), json);
  } else if (json._type === V1_TemporalityType.BI_TEMPORAL) {
    return deserialize(V1_biTemporalModelSchema(plugins), json);
  }
  throw new UnsupportedOperationError(`Can't deserialize Temporality`, json);
};

/************************
 * persistent target type
 ************************/

export enum V1_PersistentTargetType {
  RELATIONAL_PERSISTENCE_TARGET = 'relationalPersistenceTarget',
}

export const V1_relationalPersistenceTargetModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_RelationalPersistenceTarget> =>
  createModelSchema(V1_RelationalPersistenceTarget, {
    _type: usingConstantValueSchema(
      V1_PersistentTargetType.RELATIONAL_PERSISTENCE_TARGET,
    ),
    database: custom(
      (val) => serialize(V1_packageableElementPointerModelSchema, val),
      (val) =>
        V1_serializePackageableElementPointer(
          val,
          PackageableElementPointerType.STORE,
        ),
    ),
    table: primitive(),
    temporality: custom(
      (val) => V1_serializeTemporality(val, plugins),
      (val) => V1_deserializeTemporality(val, plugins),
    ),
  });

export const V1_serializePersistentTarget = (
  protocol: V1_PersistenceTarget,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_PersistenceTarget> => {
  if (protocol instanceof V1_RelationalPersistenceTarget) {
    return serialize(
      V1_relationalPersistenceTargetModelSchema(plugins),
      protocol,
    );
  }
  throw new UnsupportedOperationError(
    `Can't serialize PersistentTarget`,
    protocol,
  );
};

export const V1_deserializePersistentTarget = (
  json: PlainObject<V1_PersistenceTarget>,
  plugins: PureProtocolProcessorPlugin[],
): V1_PersistenceTarget => {
  if (json._type === V1_PersistentTargetType.RELATIONAL_PERSISTENCE_TARGET) {
    return deserialize(
      V1_relationalPersistenceTargetModelSchema(plugins),
      json,
    );
  }
  throw new UnsupportedOperationError(
    `Can't deserialize PersistentTarget`,
    json,
  );
};

/************************
 * empty dataset handling
 ***********************/

export enum V1_EmptyDatasetHandlingType {
  NO_OP = 'noOp',
  DELETE_TARGET_DATASET = 'deleteTargetDataset',
}

export const V1_noOpEmptyDatasetHandlingModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_NoOp> =>
  createModelSchema(V1_NoOp, {
    _type: usingConstantValueSchema(V1_EmptyDatasetHandlingType.NO_OP),
  });

export const V1_deleteTargetDatasetModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_DeleteTargetDataset> =>
  createModelSchema(V1_DeleteTargetDataset, {
    _type: usingConstantValueSchema(
      V1_EmptyDatasetHandlingType.DELETE_TARGET_DATASET,
    ),
  });

export const V1_serializeEmptyDatasetHandling = (
  protocol: V1_EmptyDatasetHandling,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_EmptyDatasetHandling> => {
  if (protocol instanceof V1_NoOp) {
    return serialize(V1_noOpEmptyDatasetHandlingModelSchema(plugins), protocol);
  } else if (protocol instanceof V1_DeleteTargetDataset) {
    return serialize(V1_deleteTargetDatasetModelSchema(plugins), protocol);
  }
  throw new UnsupportedOperationError(
    `Can't serialize EmptyDataSetHandling`,
    protocol,
  );
};

export const V1_deserializeEmptyDatasetHandling = (
  json: PlainObject<V1_EmptyDatasetHandling>,
  plugins: PureProtocolProcessorPlugin[],
): V1_EmptyDatasetHandling => {
  if (json._type === V1_EmptyDatasetHandlingType.NO_OP) {
    return deserialize(V1_noOpEmptyDatasetHandlingModelSchema(plugins), json);
  } else if (json._type === V1_EmptyDatasetHandlingType.DELETE_TARGET_DATASET) {
    return deserialize(V1_deleteTargetDatasetModelSchema(plugins), json);
  }
  throw new UnsupportedOperationError(
    `Can't deserialize EmptyDatasetHandling`,
    json,
  );
};

/**************
 * partitioning
 **************/

export enum V1_PartitioningType {
  NO_PARTITIONING = 'noPartitioning',
  FIELD_BASED_FOR_GRAPH_FETCH = 'fieldBasedForGraphFetch',
  FIELD_BASED_FOR_TDS = 'fieldBasedForTds',
}

export const V1_fieldBasedForGraphFetchModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_FieldBasedForGraphFetch> =>
  createModelSchema(V1_FieldBasedForGraphFetch, {
    _type: usingConstantValueSchema(
      V1_PartitioningType.FIELD_BASED_FOR_GRAPH_FETCH,
    ),
    partitionFieldPaths: raw(),
  });

export const V1_fieldBasedForTdsModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_FieldBasedForTds> =>
  createModelSchema(V1_FieldBasedForTds, {
    _type: usingConstantValueSchema(V1_PartitioningType.FIELD_BASED_FOR_TDS),
    partitionFields: list(primitive()),
  });

export const V1_noPartitioningModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_NoPartitioning> =>
  createModelSchema(V1_NoPartitioning, {
    _type: usingConstantValueSchema(V1_PartitioningType.NO_PARTITIONING),
    emptyDatasetHandling: custom(
      (val) => V1_serializeEmptyDatasetHandling(val, plugins),
      (val) => V1_deserializeEmptyDatasetHandling(val, plugins),
    ),
  });

export const V1_serializeFieldBased = (
  protocol: V1_FieldBased,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_FieldBased> => {
  if (protocol instanceof V1_FieldBasedForGraphFetch) {
    return serialize(V1_fieldBasedForGraphFetchModelSchema(plugins), protocol);
  } else if (protocol instanceof V1_FieldBasedForTds) {
    return serialize(V1_fieldBasedForTdsModelSchema(plugins), protocol);
  }
  throw new UnsupportedOperationError(`Can't serialize FiedlBased`, protocol);
};

export const V1_serializePartitioning = (
  protocol: V1_Partitioning,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_Partitioning> => {
  if (protocol instanceof V1_NoPartitioning) {
    return serialize(V1_noPartitioningModelSchema(plugins), protocol);
  } else if (protocol instanceof V1_FieldBased) {
    return V1_serializeFieldBased(protocol, plugins);
  }
  throw new UnsupportedOperationError(`Can't serialize Partitioning`, protocol);
};

export const V1_deserializePartitioning = (
  json: PlainObject<V1_Partitioning>,
  plugins: PureProtocolProcessorPlugin[],
): V1_Partitioning => {
  if (json._type === V1_PartitioningType.NO_PARTITIONING) {
    return deserialize(V1_noPartitioningModelSchema(plugins), json);
  } else if (json._type === V1_PartitioningType.FIELD_BASED_FOR_GRAPH_FETCH) {
    return deserialize(V1_fieldBasedForGraphFetchModelSchema(plugins), json);
  } else if (json._type === V1_PartitioningType.FIELD_BASED_FOR_TDS) {
    return deserialize(V1_fieldBasedForTdsModelSchema(plugins), json);
  }
  throw new UnsupportedOperationError(`Can't deserialize Partitioning`, json);
};

/*******************
 * action indicator
 ******************/

export enum V1_ActionIndicatorType {
  NO_ACTION_INDICATOR = 'noActionIndicator',
  DELETE_INDICATOR_FOR_GRAPH_FETCH = 'deleteIndicatorForGraphFetch',
  DELETE_INDICATOR_FOR_TDS = 'deleteIndicatorForTds',
}

export const V1_deleteIndicatorForGraphFetchModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_DeleteIndicatorForGraphFetch> =>
  createModelSchema(V1_DeleteIndicatorForGraphFetch, {
    _type: usingConstantValueSchema(
      V1_ActionIndicatorType.DELETE_INDICATOR_FOR_GRAPH_FETCH,
    ),
    deleteFieldPath: raw(),
    deleteValues: list(primitive()),
  });

export const V1_deleteIndicatorForTdsModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_DeleteIndicatorForTds> =>
  createModelSchema(V1_DeleteIndicatorForTds, {
    _type: usingConstantValueSchema(
      V1_ActionIndicatorType.DELETE_INDICATOR_FOR_TDS,
    ),
    deleteField: primitive(),
    deleteValues: list(primitive()),
  });

export const V1_noActionIndicatorModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_NoActionIndicator> =>
  createModelSchema(V1_NoActionIndicator, {
    _type: usingConstantValueSchema(V1_ActionIndicatorType.NO_ACTION_INDICATOR),
  });

export const V1_serializeDeleteIndicator = (
  protocol: V1_DeleteIndicator,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_DeleteIndicator> => {
  if (protocol instanceof V1_DeleteIndicatorForGraphFetch) {
    return serialize(
      V1_deleteIndicatorForGraphFetchModelSchema(plugins),
      protocol,
    );
  } else if (protocol instanceof V1_DeleteIndicatorForTds) {
    return serialize(V1_deleteIndicatorForTdsModelSchema(plugins), protocol);
  }
  throw new UnsupportedOperationError(
    `Can't serialize DeleteIndicator`,
    protocol,
  );
};

export const V1_deserializeActionIndicator = (
  json: PlainObject<V1_ActionIndicatorFields>,
  plugins: PureProtocolProcessorPlugin[],
): V1_ActionIndicatorFields => {
  if (json._type === V1_ActionIndicatorType.NO_ACTION_INDICATOR) {
    return deserialize(V1_noActionIndicatorModelSchema(plugins), json);
  } else if (
    json._type === V1_ActionIndicatorType.DELETE_INDICATOR_FOR_GRAPH_FETCH
  ) {
    return deserialize(
      V1_deleteIndicatorForGraphFetchModelSchema(plugins),
      json,
    );
  } else if (json._type === V1_ActionIndicatorType.DELETE_INDICATOR_FOR_TDS) {
    return deserialize(V1_deleteIndicatorForTdsModelSchema(plugins), json);
  }
  throw new UnsupportedOperationError(
    `Can't deserialize ActionIndicator`,
    json,
  );
};

export const V1_serializeActionIndicator = (
  protocol: V1_ActionIndicatorFields,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_ActionIndicatorFields> => {
  if (protocol instanceof V1_NoActionIndicator) {
    return serialize(V1_noActionIndicatorModelSchema(plugins), protocol);
  } else if (protocol instanceof V1_DeleteIndicator) {
    return V1_serializeDeleteIndicator(protocol, plugins);
  }
  throw new UnsupportedOperationError(
    `Can't serialize ActionIndicator`,
    protocol,
  );
};

/****************
 * dataset type
 ***************/

export enum V1_DatasetTypeType {
  SNAPSHOT = 'snapshot',
  DELTA = 'delta',
}

export const V1_snapshotModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_Snapshot> =>
  createModelSchema(V1_Snapshot, {
    _type: usingConstantValueSchema(V1_DatasetTypeType.SNAPSHOT),
    partitioning: custom(
      (val) => V1_serializePartitioning(val, plugins),
      (val) => V1_deserializePartitioning(val, plugins),
    ),
  });

export const V1_deltaModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_Delta> =>
  createModelSchema(V1_Delta, {
    _type: usingConstantValueSchema(V1_DatasetTypeType.DELTA),
    actionIndicator: custom(
      (val) => V1_serializeActionIndicator(val, plugins),
      (val) => V1_deserializeActionIndicator(val, plugins),
    ),
  });

export const V1_serializeDatasetType = (
  protocol: V1_DatasetType,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_DatasetType> => {
  if (protocol instanceof V1_Snapshot) {
    return serialize(V1_snapshotModelSchema(plugins), protocol);
  } else if (protocol instanceof V1_Delta) {
    return serialize(V1_deltaModelSchema(plugins), protocol);
  }
  throw new UnsupportedOperationError(`Can't serialize DatasetType`, protocol);
};

export const V1_deserializeDatasetType = (
  json: PlainObject<V1_DatasetType>,
  plugins: PureProtocolProcessorPlugin[],
): V1_DatasetType => {
  if (json._type === V1_DatasetTypeType.SNAPSHOT) {
    return deserialize(V1_snapshotModelSchema(plugins), json);
  } else if (json._type === V1_DatasetTypeType.DELTA) {
    return deserialize(V1_deltaModelSchema(plugins), json);
  }
  throw new UnsupportedOperationError(`Can't deserialize DatasetType`, json);
};

/****************
 * De-duplication
 ****************/

export enum V1_DeduplicationType {
  NO_DEDUPLICATION = 'noDeduplication',
  ANY_VERSION = 'anyVersion',
  MAX_VERSION_FOR_GRAPH_FETCH = 'maxVersionForGraphFetch',
  MAX_VERSION_FOR_TDS = 'maxVersionForTds',
}

export const V1_NoDeduplicationModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_NoDeduplication> =>
  createModelSchema(V1_NoDeduplication, {
    _type: usingConstantValueSchema(V1_DeduplicationType.NO_DEDUPLICATION),
  });

export const V1_anyVersionModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_AnyVersion> =>
  createModelSchema(V1_AnyVersion, {
    _type: usingConstantValueSchema(V1_DeduplicationType.ANY_VERSION),
  });

export const V1_maxVersionForGraphFetchModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_MaxVersionForGraphFetch> =>
  createModelSchema(V1_MaxVersionForGraphFetch, {
    _type: usingConstantValueSchema(
      V1_DeduplicationType.MAX_VERSION_FOR_GRAPH_FETCH,
    ),
    versionFieldPath: raw(),
  });

export const V1_maxVersionForTdsModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_MaxVersionForTds> =>
  createModelSchema(V1_MaxVersionForTds, {
    _type: usingConstantValueSchema(V1_DeduplicationType.MAX_VERSION_FOR_TDS),
    versionField: primitive(),
  });

export const V1_serializeMaxVersionDeduplication = (
  protocol: V1_MaxVersion,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_MaxVersion> => {
  if (protocol instanceof V1_MaxVersionForGraphFetch) {
    return serialize(V1_maxVersionForGraphFetchModelSchema(plugins), protocol);
  } else if (protocol instanceof V1_MaxVersionForTds) {
    return serialize(V1_maxVersionForTdsModelSchema(plugins), protocol);
  }
  throw new UnsupportedOperationError(
    `Can't serialize MaxVersionDeduplication`,
    protocol,
  );
};

export const V1_serializeDeduplication = (
  protocol: V1_Deduplication,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_Deduplication> => {
  if (protocol instanceof V1_NoDeduplication) {
    return serialize(V1_NoDeduplicationModelSchema(plugins), protocol);
  } else if (protocol instanceof V1_AnyVersion) {
    return serialize(V1_anyVersionModelSchema(plugins), protocol);
  } else if (protocol instanceof V1_MaxVersion) {
    return V1_serializeMaxVersionDeduplication(protocol, plugins);
  }
  throw new UnsupportedOperationError(
    `Can't serialize Deduplication`,
    protocol,
  );
};

export const V1_deserializeDeduplication = (
  json: PlainObject<V1_Deduplication>,
  plugins: PureProtocolProcessorPlugin[],
): V1_Deduplication => {
  if (json._type === V1_DeduplicationType.NO_DEDUPLICATION) {
    return deserialize(V1_NoDeduplicationModelSchema(plugins), json);
  } else if (json._type === V1_DeduplicationType.ANY_VERSION) {
    return deserialize(V1_anyVersionModelSchema(plugins), json);
  } else if (json._type === V1_DeduplicationType.MAX_VERSION_FOR_GRAPH_FETCH) {
    return deserialize(V1_maxVersionForGraphFetchModelSchema(plugins), json);
  } else if (json._type === V1_DeduplicationType.MAX_VERSION_FOR_TDS) {
    return deserialize(V1_maxVersionForTdsModelSchema(plugins), json);
  }
  throw new UnsupportedOperationError(`Can't deserialize Deduplication`, json);
};

/****************
 * service output
 ***************/

export enum V1_ServiceOutputType {
  GRAPH_FETCH_SERVICE_OUTPUT = 'graphFetchServiceOutput',
  TDS_SERVICE_OUTPUT = 'tdsServiceOutput',
}

export const V1_graphFetchServiceOutputModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_GraphFetchServiceOutput> =>
  createModelSchema(V1_GraphFetchServiceOutput, {
    _type: usingConstantValueSchema(
      V1_ServiceOutputType.GRAPH_FETCH_SERVICE_OUTPUT,
    ),
    datasetType: custom(
      (val) => V1_serializeDatasetType(val, plugins),
      (val) => V1_deserializeDatasetType(val, plugins),
    ),
    deduplication: custom(
      (val) => V1_serializeDeduplication(val, plugins),
      (val) => V1_deserializeDeduplication(val, plugins),
    ),
    keys: list(raw()),
    path: raw(),
  });

export const V1_tdsServiceOutputModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_TdsServiceOutput> =>
  createModelSchema(V1_TdsServiceOutput, {
    _type: usingConstantValueSchema(V1_ServiceOutputType.TDS_SERVICE_OUTPUT),
    datasetType: custom(
      (val) => V1_serializeDatasetType(val, plugins),
      (val) => V1_deserializeDatasetType(val, plugins),
    ),
    deduplication: custom(
      (val) => V1_serializeDeduplication(val, plugins),
      (val) => V1_deserializeDeduplication(val, plugins),
    ),
    keys: list(primitive()),
  });

export const V1_serializeServiceOutput = (
  protocol: V1_ServiceOutput,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_ServiceOutput> => {
  if (protocol instanceof V1_GraphFetchServiceOutput) {
    return serialize(V1_graphFetchServiceOutputModelSchema(plugins), protocol);
  } else if (protocol instanceof V1_TdsServiceOutput) {
    return serialize(V1_tdsServiceOutputModelSchema(plugins), protocol);
  }
  throw new UnsupportedOperationError(
    `Can't serialize ServiceOutput`,
    protocol,
  );
};

export const V1_deserializeServiceOutput = (
  json: PlainObject<V1_ServiceOutput>,
  plugins: PureProtocolProcessorPlugin[],
): V1_ServiceOutput => {
  if (json._type === V1_ServiceOutputType.GRAPH_FETCH_SERVICE_OUTPUT) {
    return deserialize(V1_graphFetchServiceOutputModelSchema(plugins), json);
  } else if (json._type === V1_ServiceOutputType.TDS_SERVICE_OUTPUT) {
    return deserialize(V1_tdsServiceOutputModelSchema(plugins), json);
  }
  throw new UnsupportedOperationError(`Can't deserialize ServiceOutput`, json);
};

/************************
 * service output target
 ***********************/

const V1_serviceOutputTargetModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_ServiceOutputTarget> =>
  createModelSchema(V1_ServiceOutputTarget, {
    persistenceTarget: custom(
      (val) => V1_serializePersistentTarget(val, plugins),
      (val) => V1_deserializePersistentTarget(val, plugins),
    ),
    serviceOutput: custom(
      (val) => V1_serializeServiceOutput(val, plugins),
      (val) => V1_deserializeServiceOutput(val, plugins),
    ),
  });

export const V1_serializeServiceOutputTarget = (
  protocol: V1_ServiceOutputTarget,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_ServiceOutputTarget> =>
  serialize(V1_serviceOutputTargetModelSchema(plugins), protocol);

export const V1_deserializeServiceOutputTarget = (
  json: PlainObject<V1_ServiceOutputTarget>,
  plugins: PureProtocolProcessorPlugin[],
): V1_ServiceOutputTarget =>
  deserialize(V1_serviceOutputTargetModelSchema(plugins), json);

/**********
 * persistence
 **********/

export const V1_PERSISTENCE_ELEMENT_PROTOCOL_TYPE = 'persistence';

export const V1_persistenceModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_Persistence> =>
  createModelSchema(V1_Persistence, {
    _type: usingConstantValueSchema(V1_PERSISTENCE_ELEMENT_PROTOCOL_TYPE),
    documentation: primitive(),
    name: primitive(),
    notifier: custom(
      (val) => serialize(V1_notifierModelSchema, val),
      (val) => deserialize(V1_notifierModelSchema, val),
    ),
    package: primitive(),
    persister: optionalCustom(
      (val) => V1_serializePersister(val, plugins),
      (val) => V1_deserializePersister(val, plugins),
    ),
    service: custom(
      (val) => serialize(V1_packageableElementPointerModelSchema, val),
      (val) =>
        V1_serializePackageableElementPointer(
          val,
          PackageableElementPointerType.SERVICE,
        ),
    ),
    serviceOutputTargets: optionalCustomList(
      (val: V1_ServiceOutputTarget) =>
        V1_serializeServiceOutputTarget(val, plugins),
      (val) => V1_deserializeServiceOutputTarget(val, plugins),
    ),
    tests: optionalCustomList(
      (value: V1_AtomicTest) => V1_serializeAtomicTest(value, plugins),
      (value) => V1_deserializeAtomicTest(value, plugins),
      {
        INTERNAL__forceReturnEmptyInTest: true,
      },
    ),
    trigger: custom(
      (val) => V1_serializeTrigger(val, plugins),
      (val) => V1_deserializeTrigger(val, plugins),
    ),
  });
