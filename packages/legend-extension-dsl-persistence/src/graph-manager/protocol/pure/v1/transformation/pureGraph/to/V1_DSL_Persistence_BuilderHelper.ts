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

import {
  type V1_Auditing,
  V1_DateTimeAuditing,
  V1_NoAuditing,
} from '../../../model/packageableElements/persistence/V1_DSL_Persistence_Auditing.js';
import {
  V1_AnyVersionDeduplicationStrategy,
  type V1_DeduplicationStrategy,
  V1_DuplicateCountDeduplicationStrategy,
  V1_MaxVersionDeduplicationStrategy,
  V1_NoDeduplicationStrategy,
} from '../../../model/packageableElements/persistence/V1_DSL_Persistence_DeduplicationStrategy.js';
import {
  V1_AppendOnly,
  V1_BitemporalDelta,
  V1_BitemporalSnapshot,
  type V1_IngestMode,
  V1_NontemporalDelta,
  V1_NontemporalSnapshot,
  V1_UnitemporalDelta,
  V1_UnitemporalSnapshot,
} from '../../../model/packageableElements/persistence/V1_DSL_Persistence_IngestMode.js';
import {
  V1_DeleteIndicatorMergeStrategy,
  type V1_MergeStrategy,
  V1_NoDeletesMergeStrategy,
} from '../../../model/packageableElements/persistence/V1_DSL_Persistence_MergeStrategy.js';
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
} from '../../../model/packageableElements/persistence/V1_DSL_Persistence_Milestoning.js';
import {
  V1_EmailNotifyee,
  type V1_Notifier,
  type V1_Notifyee,
  V1_PagerDutyNotifyee,
} from '../../../model/packageableElements/persistence/V1_DSL_Persistence_Notifier.js';
import type { V1_Persistence } from '../../../model/packageableElements/persistence/V1_DSL_Persistence_Persistence.js';
import {
  V1_BatchPersister,
  type V1_Persister,
  V1_StreamingPersister,
} from '../../../model/packageableElements/persistence/V1_DSL_Persistence_Persister.js';
import {
  V1_ObjectStorageSink,
  V1_RelationalSink,
  type V1_Sink,
} from '../../../model/packageableElements/persistence/V1_DSL_Persistence_Sink.js';
import {
  V1_FlatTarget,
  V1_MultiFlatTarget,
  type V1_MultiFlatTargetPart,
  type V1_TargetShape,
  V1_TransactionScope,
} from '../../../model/packageableElements/persistence/V1_DSL_Persistence_TargetShape.js';
import type { V1_Trigger } from '../../../model/packageableElements/persistence/V1_DSL_Persistence_Trigger.js';
import {
  type Auditing,
  DateTimeAuditing,
  NoAuditing,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_Auditing.js';
import {
  AnyVersionDeduplicationStrategy,
  type DeduplicationStrategy,
  DuplicateCountDeduplicationStrategy,
  MaxVersionDeduplicationStrategy,
  NoDeduplicationStrategy,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_DeduplicationStrategy.js';
import {
  AppendOnly,
  BitemporalDelta,
  BitemporalSnapshot,
  type IngestMode,
  NontemporalDelta,
  NontemporalSnapshot,
  UnitemporalDelta,
  UnitemporalSnapshot,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_IngestMode.js';
import {
  DeleteIndicatorMergeStrategy,
  type MergeStrategy,
  NoDeletesMergeStrategy,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_MergeStrategy.js';
import {
  BatchIdAndDateTimeTransactionMilestoning,
  BatchIdTransactionMilestoning,
  DateTimeTransactionMilestoning,
  DateTimeValidityMilestoning,
  SourceSpecifiesFromAndThruDateTime,
  SourceSpecifiesFromDateTime,
  SourceSpecifiesInAndOutDateTime,
  SourceSpecifiesInDateTime,
  type TransactionDerivation,
  type TransactionMilestoning,
  type ValidityDerivation,
  type ValidityMilestoning,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_Milestoning.js';
import {
  EmailNotifyee,
  Notifier,
  type Notifyee,
  PagerDutyNotifyee,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_Notifier.js';
import {
  BatchPersister,
  type Persister,
  StreamingPersister,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_Persister.js';
import {
  ObjectStorageSink,
  RelationalSink,
  type Sink,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_Sink.js';
import {
  FlatTarget,
  MultiFlatTarget,
  MultiFlatTargetPart,
  type TargetShape,
  TransactionScope,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_TargetShape.js';
import type { Trigger } from '../../../../../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_Trigger.js';
import { getOwnPersistence } from '../../../../../../DSL_Persistence_GraphManagerHelper.js';
import type { DSL_Persistence_PureProtocolProcessorPlugin_Extension } from '../../../../DSL_Persistence_PureProtocolProcessorPlugin_Extension.js';
import {
  type AtomicTest,
  type Binding,
  type Database,
  type PackageableElementImplicitReference,
  type TestAssertion,
  V1_buildAtomicTest,
  V1_buildEmbeddedData,
  V1_buildEqualToJson,
  V1_buildFullPath,
  V1_EqualToJson,
  type V1_GraphBuilderContext,
  type V1_TestAssertion,
} from '@finos/legend-graph';
import {
  guaranteeNonEmptyString,
  guaranteeType,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { PersistenceTest } from '../../../../../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_PersistenceTest.js';
import type { V1_PersistenceTestBatch } from '../../../model/packageableElements/persistence/V1_DSL_Persistence_PersistenceTestBatch.js';
import { PersistenceTestBatch } from '../../../../../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_PersistenceTestBatch.js';
import type { V1_PersistenceTestData } from '../../../model/packageableElements/persistence/V1_DSL_Persistence_PersistenceTestData.js';
import { PersistenceTestData } from '../../../../../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_PersistenceTestData.js';
import type { V1_ConnectionTestData } from '../../../model/packageableElements/persistence/V1_DSL_Persistence_ConnectionTestData.js';
import { ConnectionTestData } from '../../../../../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_ConnectionTestData.js';
import type { V1_ServiceOutputTarget } from '../../../model/packageableElements/persistence/V1_DSL_Persistence_ServiceOutputTarget.js';
import {
  GraphFetchServiceOutput,
  type ServiceOutput,
  TdsServiceOutput,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_ServiceOutput.js';
import { ServiceOutputTarget } from '../../../../../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_ServiceOutputTarget.js';
import {
  V1_GraphFetchServiceOutput,
  type V1_ServiceOutput,
  V1_TdsServiceOutput,
} from '../../../model/packageableElements/persistence/V1_DSL_Persistence_ServiceOutput.js';
import {
  type V1_DatasetType,
  V1_Delta,
  V1_Snapshot,
} from '../../../model/packageableElements/persistence/V1_DSL_Persistence_DatasetType.js';
import {
  type DatasetType,
  Delta,
  Snapshot,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_DatasetType.js';
import {
  type FieldBased,
  FieldBasedForGraphFetch,
  FieldBasedForTds,
  NoPartitioning,
  type Partitioning,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_Partitioning.js';
import {
  V1_FieldBased,
  V1_FieldBasedForGraphFetch,
  V1_FieldBasedForTds,
  V1_NoPartitioning,
  type V1_Partitioning,
} from '../../../model/packageableElements/persistence/V1_DSL_Persistence_Partitioning.js';
import {
  V1_DeleteTargetDataset,
  type V1_EmptyDatasetHandling,
  V1_NoOp,
} from '../../../model/packageableElements/persistence/V1_DSL_Persistence_EmptyDatasetHandling.js';
import {
  DeleteTargetDataset,
  type EmptyDatasetHandling,
  NoOp,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_EmptyDatasetHandling.js';
import {
  type V1_ActionIndicatorFields,
  V1_DeleteIndicator,
  V1_DeleteIndicatorForGraphFetch,
  V1_DeleteIndicatorForTds,
  V1_NoActionIndicator,
} from '../../../model/packageableElements/persistence/V1_DSL_Persistence_ActionIndicatorFields.js';
import {
  type ActionIndicatorFields,
  type DeleteIndicator,
  DeleteIndicatorForGraphFetch,
  DeleteIndicatorForTds,
  NoActionIndicator,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_ActionIndicatorFields.js';
import {
  V1_AnyVersion,
  type V1_Deduplication,
  V1_MaxVersion,
  V1_MaxVersionForGraphFetch,
  V1_MaxVersionForTds,
  V1_NoDeduplication,
} from '../../../model/packageableElements/persistence/V1_DSL_Persistence_Deduplication.js';
import {
  AnyVersion,
  type Deduplication,
  type MaxVersion,
  MaxVersionForGraphFetch,
  MaxVersionForTds,
  NoDeduplication,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_Deduplication.js';
import {
  type V1_PersistenceTarget,
  V1_RelationalPersistenceTarget,
} from '../../../model/packageableElements/persistence/V1_DSL_Persistence_PersistentTarget.js';
import {
  type PersistenceTarget,
  RelationalPersistenceTarget,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_PersistentTarget.js';
import {
  V1_BiTemporal,
  V1_NonTemporal,
  type V1_Temporality,
  V1_UniTemporal,
} from '../../../model/packageableElements/persistence/V1_DSL_Persistence_Temporality.js';
import {
  BiTemporal,
  NonTemporal,
  type Temporality,
  UniTemporal,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_Temporality.js';
import {
  V1_AuditingDateTimeV2,
  type V1_AuditingV2,
  V1_NoAuditingV2,
} from '../../../model/packageableElements/persistence/V1_DSL_Persistence_AuditingV2.js';
import {
  AuditingDateTimeV2,
  type AuditingV2,
  NoAuditingV2,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_AuditingV2.js';
import {
  V1_AppendOnlyUpdatesHandling,
  V1_OverwriteUpdatesHandling,
  type V1_UpdatesHandling,
} from '../../../model/packageableElements/persistence/V1_DSL_Persistence_UpdatesHandling.js';
import {
  AppendOnlyUpdatesHandling,
  OverwriteUpdatesHandling,
  type UpdatesHandling,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_UpdatesHandling.js';
import {
  V1_AllowDuplicates,
  type V1_AppendStrategy,
  V1_FailOnDuplicates,
  V1_FilterDuplicates,
} from '../../../model/packageableElements/persistence/V1_DSL_Persistence_AppendStrategy.js';
import {
  AllowDuplicates,
  type AppendStrategy,
  FailOnDuplicates,
  FilterDuplicates,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_AppendStrategy.js';
import {
  V1_BatchId,
  V1_BatchIdAndDateTime,
  V1_ProcessingDateTime,
  type V1_ProcessingDimension,
} from '../../../model/packageableElements/persistence/V1_DSL_Persistence_ProcessingDimension.js';
import {
  BatchId,
  BatchIdAndDateTime,
  ProcessingDateTime,
  type ProcessingDimension,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_ProcessingDimension.js';
import {
  type V1_SourceDerivedDimension,
  V1_SourceDerivedTime,
} from '../../../model/packageableElements/persistence/V1_DSL_Persistence_SourceDerivedDimension.js';
import {
  type SourceDerivedDimension,
  SourceDerivedTime,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_SourceDerivedDimension.js';
import {
  type V1_SourceTimeFields,
  V1_SourceTimeStart,
  V1_SourceTimeStartAndEnd,
} from '../../../model/packageableElements/persistence/V1_DSL_Persistence_SourceTimeFields.js';
import {
  type SourceTimeFields,
  SourceTimeStart,
  SourceTimeStartAndEnd,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_SourceTimeFields.js';

/**********
 * trigger
 **********/

export const V1_buildTrigger = (
  protocol: V1_Trigger,
  context: V1_GraphBuilderContext,
): Trigger => {
  const extraTriggerBuilders = context.extensions.plugins.flatMap(
    (plugin) =>
      (
        plugin as DSL_Persistence_PureProtocolProcessorPlugin_Extension
      ).V1_getExtraTriggerBuilders?.() ?? [],
  );
  for (const builder of extraTriggerBuilders) {
    const metamodel = builder(protocol, context);
    if (metamodel) {
      return metamodel;
    }
  }
  throw new UnsupportedOperationError(
    `Can't build trigger: no compatible builder available from plugins`,
    protocol,
  );
};

/**********
 * sink
 **********/

export const V1_buildRelationalSink = (
  protocol: V1_RelationalSink,
  context: V1_GraphBuilderContext,
): RelationalSink => {
  const sink = new RelationalSink();
  sink.database = context.resolveElement(
    protocol.database.path,
    false,
  ) as PackageableElementImplicitReference<Database>;
  return sink;
};

export const V1_buildObjectStorageSink = (
  protocol: V1_ObjectStorageSink,
  context: V1_GraphBuilderContext,
): ObjectStorageSink => {
  const sink = new ObjectStorageSink();
  sink.binding = context.resolveElement(
    protocol.binding.path,
    false,
  ) as PackageableElementImplicitReference<Binding>;
  return sink;
};

export const V1_buildSink = (
  protocol: V1_Sink,
  context: V1_GraphBuilderContext,
): Sink => {
  if (protocol instanceof V1_RelationalSink) {
    return V1_buildRelationalSink(protocol, context);
  } else if (protocol instanceof V1_ObjectStorageSink) {
    return V1_buildObjectStorageSink(protocol, context);
  }
  throw new UnsupportedOperationError(`Can't build sink`, protocol);
};

/**********
 * auditing
 **********/

export const V1_buildAuditing = (
  protocol: V1_Auditing,
  context: V1_GraphBuilderContext,
): Auditing => {
  if (protocol instanceof V1_NoAuditing) {
    return new NoAuditing();
  } else if (protocol instanceof V1_DateTimeAuditing) {
    const auditing = new DateTimeAuditing();
    auditing.dateTimeField = protocol.dateTimeField;
    return auditing;
  }
  throw new UnsupportedOperationError(`Can't build auditing mode`, protocol);
};

/**********
 * merge strategy
 **********/

export const V1_buildMergeStrategy = (
  protocol: V1_MergeStrategy,
  context: V1_GraphBuilderContext,
): MergeStrategy => {
  if (protocol instanceof V1_NoDeletesMergeStrategy) {
    return new NoDeletesMergeStrategy();
  } else if (protocol instanceof V1_DeleteIndicatorMergeStrategy) {
    const strategy = new DeleteIndicatorMergeStrategy();
    strategy.deleteField = protocol.deleteField;
    strategy.deleteValues = protocol.deleteValues;
    return strategy;
  }
  throw new UnsupportedOperationError(`Can't build merge strategy`, protocol);
};

/**********
 * transaction derivation
 **********/

export const V1_buildTransactionDerivation = (
  protocol: V1_TransactionDerivation,
  context: V1_GraphBuilderContext,
): TransactionDerivation => {
  if (protocol instanceof V1_SourceSpecifiesInDateTime) {
    const derivation = new SourceSpecifiesInDateTime();
    derivation.sourceDateTimeInField = protocol.sourceDateTimeInField;
    return derivation;
  } else if (protocol instanceof V1_SourceSpecifiesInAndOutDateTime) {
    const derivation = new SourceSpecifiesInAndOutDateTime();
    derivation.sourceDateTimeInField = protocol.sourceDateTimeInField;
    derivation.sourceDateTimeOutField = protocol.sourceDateTimeOutField;
    return derivation;
  }
  throw new UnsupportedOperationError(
    `Can't build transaction derivation mode`,
    protocol,
  );
};

/**********
 * transaction milestoning
 **********/

export const V1_buildTransactionMilestoning = (
  protocol: V1_TransactionMilestoning,
  context: V1_GraphBuilderContext,
): TransactionMilestoning => {
  if (protocol instanceof V1_BatchIdTransactionMilestoning) {
    const milestoning = new BatchIdTransactionMilestoning();
    milestoning.batchIdInName = protocol.batchIdInName;
    milestoning.batchIdOutName = protocol.batchIdOutName;
    return milestoning;
  } else if (protocol instanceof V1_DateTimeTransactionMilestoning) {
    const milestoning = new DateTimeTransactionMilestoning();
    milestoning.dateTimeInName = protocol.dateTimeInName;
    milestoning.dateTimeOutName = protocol.dateTimeOutName;
    if (protocol.derivation) {
      milestoning.derivation = V1_buildTransactionDerivation(
        protocol.derivation,
        context,
      );
    }
    return milestoning;
  } else if (protocol instanceof V1_BatchIdAndDateTimeTransactionMilestoning) {
    const milestoning = new BatchIdAndDateTimeTransactionMilestoning();
    milestoning.batchIdInName = protocol.batchIdInName;
    milestoning.batchIdOutName = protocol.batchIdOutName;
    milestoning.dateTimeInName = protocol.dateTimeInName;
    milestoning.dateTimeOutName = protocol.dateTimeOutName;
    if (protocol.derivation) {
      milestoning.derivation = V1_buildTransactionDerivation(
        protocol.derivation,
        context,
      );
    }
    return milestoning;
  }
  throw new UnsupportedOperationError(
    `Can't build transaction milestoning mode`,
    protocol,
  );
};

/**********
 * validity derivation
 **********/

export const V1_buildValidityDerivation = (
  protocol: V1_ValidityDerivation,
  context: V1_GraphBuilderContext,
): ValidityDerivation => {
  if (protocol instanceof V1_SourceSpecifiesFromDateTime) {
    const derivation = new SourceSpecifiesFromDateTime();
    derivation.sourceDateTimeFromField = protocol.sourceDateTimeFromField;
    return derivation;
  } else if (protocol instanceof V1_SourceSpecifiesFromAndThruDateTime) {
    const derivation = new SourceSpecifiesFromAndThruDateTime();
    derivation.sourceDateTimeFromField = protocol.sourceDateTimeFromField;
    derivation.sourceDateTimeThruField = protocol.sourceDateTimeThruField;
    return derivation;
  }
  throw new UnsupportedOperationError(
    `Can't build validity derivation mode`,
    protocol,
  );
};

/**********
 * validity milestoning
 **********/

export const V1_buildValidityMilestoning = (
  protocol: V1_ValidityMilestoning,
  context: V1_GraphBuilderContext,
): ValidityMilestoning => {
  if (protocol instanceof V1_DateTimeValidityMilestoning) {
    const milestoning = new DateTimeValidityMilestoning();
    milestoning.dateTimeFromName = protocol.dateTimeFromName;
    milestoning.dateTimeThruName = protocol.dateTimeThruName;
    milestoning.derivation = V1_buildValidityDerivation(
      protocol.derivation,
      context,
    );
    return milestoning;
  }
  throw new UnsupportedOperationError(
    `Can't build validity milestoning mode`,
    protocol,
  );
};

/**********
 * ingest mode
 **********/

export const V1_buildIngestMode = (
  protocol: V1_IngestMode,
  context: V1_GraphBuilderContext,
): IngestMode => {
  if (protocol instanceof V1_NontemporalSnapshot) {
    const ingestMode = new NontemporalSnapshot();
    ingestMode.auditing = V1_buildAuditing(protocol.auditing, context);
    return ingestMode;
  } else if (protocol instanceof V1_UnitemporalSnapshot) {
    const ingestMode = new UnitemporalSnapshot();
    ingestMode.transactionMilestoning = V1_buildTransactionMilestoning(
      protocol.transactionMilestoning,
      context,
    );
    return ingestMode;
  } else if (protocol instanceof V1_BitemporalSnapshot) {
    const ingestMode = new BitemporalSnapshot();
    ingestMode.transactionMilestoning = V1_buildTransactionMilestoning(
      protocol.transactionMilestoning,
      context,
    );
    ingestMode.validityMilestoning = V1_buildValidityMilestoning(
      protocol.validityMilestoning,
      context,
    );
    return ingestMode;
  } else if (protocol instanceof V1_NontemporalDelta) {
    const ingestMode = new NontemporalDelta();
    ingestMode.mergeStrategy = V1_buildMergeStrategy(
      protocol.mergeStrategy,
      context,
    );
    ingestMode.auditing = V1_buildAuditing(protocol.auditing, context);
    return ingestMode;
  } else if (protocol instanceof V1_UnitemporalDelta) {
    const ingestMode = new UnitemporalDelta();
    ingestMode.mergeStrategy = V1_buildMergeStrategy(
      protocol.mergeStrategy,
      context,
    );
    ingestMode.transactionMilestoning = V1_buildTransactionMilestoning(
      protocol.transactionMilestoning,
      context,
    );
    return ingestMode;
  } else if (protocol instanceof V1_BitemporalDelta) {
    const ingestMode = new BitemporalDelta();
    ingestMode.mergeStrategy = V1_buildMergeStrategy(
      protocol.mergeStrategy,
      context,
    );
    ingestMode.transactionMilestoning = V1_buildTransactionMilestoning(
      protocol.transactionMilestoning,
      context,
    );
    ingestMode.validityMilestoning = V1_buildValidityMilestoning(
      protocol.validityMilestoning,
      context,
    );
    return ingestMode;
  } else if (protocol instanceof V1_AppendOnly) {
    const ingestMode = new AppendOnly();
    ingestMode.auditing = V1_buildAuditing(protocol.auditing, context);
    ingestMode.filterDuplicates = protocol.filterDuplicates;
    return ingestMode;
  }
  throw new UnsupportedOperationError(`Can't build ingest mode`, protocol);
};

/**********
 * deduplication strategy
 **********/

export const V1_buildDeduplicationStrategy = (
  protocol: V1_DeduplicationStrategy,
  context: V1_GraphBuilderContext,
): DeduplicationStrategy => {
  if (protocol instanceof V1_NoDeduplicationStrategy) {
    return new NoDeduplicationStrategy();
  } else if (protocol instanceof V1_AnyVersionDeduplicationStrategy) {
    return new AnyVersionDeduplicationStrategy();
  } else if (protocol instanceof V1_MaxVersionDeduplicationStrategy) {
    const strategy = new MaxVersionDeduplicationStrategy();
    strategy.versionField = protocol.versionField;
    return strategy;
  } else if (protocol instanceof V1_DuplicateCountDeduplicationStrategy) {
    const strategy = new DuplicateCountDeduplicationStrategy();
    strategy.duplicateCountName = protocol.duplicateCountName;
    return strategy;
  }
  throw new UnsupportedOperationError(
    `Can't build deduplication strategy`,
    protocol,
  );
};

/**********
 * target shape
 **********/

export const V1_buildFlatTarget = (
  protocol: V1_FlatTarget,
  modelClass: string | undefined,
  context: V1_GraphBuilderContext,
): FlatTarget => {
  const targetShape = new FlatTarget();
  targetShape.modelClass = modelClass
    ? context.resolveClass(modelClass)
    : undefined;
  targetShape.targetName = guaranteeNonEmptyString(protocol.targetName);
  targetShape.partitionFields = protocol.partitionFields;
  targetShape.deduplicationStrategy = V1_buildDeduplicationStrategy(
    protocol.deduplicationStrategy,
    context,
  );

  return targetShape;
};

export const V1_buildTransactionScope = (
  protocol: V1_TransactionScope,
  context: V1_GraphBuilderContext,
): TransactionScope => {
  if (protocol === V1_TransactionScope.SINGLE_TARGET) {
    return TransactionScope.SINGLE_TARGET;
  } else {
    return TransactionScope.ALL_TARGETS;
  }

  // NOTE: ledav -- would prefer to write the below to be defensive when a new
  //      enum member is added, but lint complains

  /*
  } else if (protocol === V1_TransactionScope.ALL_TARGETS) {
    return TransactionScope.ALL_TARGETS;
  }
  throw new UnsupportedOperationError(
    `Can't build transaction scope`,
    protocol,
  );
  */
};

export const V1_buildMultiFlatTargetPart = (
  protocol: V1_MultiFlatTargetPart,
  context: V1_GraphBuilderContext,
): MultiFlatTargetPart => {
  const part = new MultiFlatTargetPart();
  part.modelProperty = protocol.modelProperty;
  part.targetName = protocol.targetName;
  part.partitionFields = protocol.partitionFields;
  part.deduplicationStrategy = V1_buildDeduplicationStrategy(
    protocol.deduplicationStrategy,
    context,
  );
  return part;
};

export const V1_buildMultiFlatTarget = (
  protocol: V1_MultiFlatTarget,
  context: V1_GraphBuilderContext,
): MultiFlatTarget => {
  const targetShape = new MultiFlatTarget();
  targetShape.modelClass = context.resolveClass(protocol.modelClass);
  targetShape.transactionScope = V1_buildTransactionScope(
    protocol.transactionScope,
    context,
  );
  targetShape.parts = protocol.parts.map((p) =>
    V1_buildMultiFlatTargetPart(p, context),
  );
  return targetShape;
};

export const V1_buildTargetShape = (
  protocol: V1_TargetShape,
  context: V1_GraphBuilderContext,
): TargetShape => {
  if (protocol instanceof V1_FlatTarget) {
    return V1_buildFlatTarget(protocol, protocol.modelClass, context);
  } else if (protocol instanceof V1_MultiFlatTarget) {
    return V1_buildMultiFlatTarget(protocol, context);
  }
  throw new UnsupportedOperationError(`Can't build target shape`, protocol);
};

/**********
 * persister
 **********/

export const V1_buildPersister = (
  protocol: V1_Persister | undefined,
  context: V1_GraphBuilderContext,
): Persister | undefined => {
  if (protocol === undefined) {
    return protocol;
  }
  if (protocol instanceof V1_StreamingPersister) {
    const persister = new StreamingPersister();
    persister.sink = V1_buildSink(protocol.sink, context);
    return persister;
  } else if (protocol instanceof V1_BatchPersister) {
    const persister = new BatchPersister();
    persister.sink = V1_buildSink(protocol.sink, context);
    persister.ingestMode = V1_buildIngestMode(protocol.ingestMode, context);
    persister.targetShape = V1_buildTargetShape(protocol.targetShape, context);
    return persister;
  }
  throw new UnsupportedOperationError(`Can't build persister`, protocol);
};

/**********
 * notifier
 **********/

export const V1_buildNotifyee = (
  protocol: V1_Notifyee,
  context: V1_GraphBuilderContext,
): Notifyee => {
  if (protocol instanceof V1_EmailNotifyee) {
    const notifyee = new EmailNotifyee();
    notifyee.address = protocol.address;
    return notifyee;
  } else if (protocol instanceof V1_PagerDutyNotifyee) {
    const notifyee = new PagerDutyNotifyee();
    notifyee.url = protocol.url;
    return notifyee;
  }
  throw new UnsupportedOperationError(`Can't build notifier`, protocol);
};

export const V1_buildNotifier = (
  protocol: V1_Notifier,
  context: V1_GraphBuilderContext,
): Notifier => {
  const notifier = new Notifier();
  notifier.notifyees = protocol.notifyees.map((n) =>
    V1_buildNotifyee(n, context),
  );
  return notifier;
};

/************************
 * empty dataset handling
 ************************/

export const V1_buildEmptyDatasetHandling = (
  protocol: V1_EmptyDatasetHandling,
  context: V1_GraphBuilderContext,
): EmptyDatasetHandling => {
  if (protocol instanceof V1_NoOp) {
    return new NoOp();
  } else if (protocol instanceof V1_DeleteTargetDataset) {
    return new DeleteTargetDataset();
  }
  throw new UnsupportedOperationError(
    `Can't build EmptyDatasetHandling`,
    protocol,
  );
};

/**************
 * partitioning
 **************/

export const V1_buildFieldBasedPartitioning = (
  protocol: V1_FieldBased,
  context: V1_GraphBuilderContext,
): FieldBased => {
  if (protocol instanceof V1_FieldBasedForGraphFetch) {
    const fieldBasedForGraphFetch = new FieldBasedForGraphFetch();
    fieldBasedForGraphFetch.partitionFieldPaths = protocol.partitionFieldPaths;
    return fieldBasedForGraphFetch;
  } else if (protocol instanceof V1_FieldBasedForTds) {
    const fieldBasedForTds = new FieldBasedForTds();
    fieldBasedForTds.partitionFields = protocol.partitionFields;
    return fieldBasedForTds;
  }
  throw new UnsupportedOperationError(
    `Can't build FieldBasedPartitioning`,
    protocol,
  );
};

export const V1_buildPartitioning = (
  protocol: V1_Partitioning,
  context: V1_GraphBuilderContext,
): Partitioning => {
  if (protocol instanceof V1_NoPartitioning) {
    const noPartitioning = new NoPartitioning();
    noPartitioning.emptyDatasetHandling = V1_buildEmptyDatasetHandling(
      protocol.emptyDatasetHandling,
      context,
    );
    return noPartitioning;
  } else if (protocol instanceof V1_FieldBased) {
    return V1_buildFieldBasedPartitioning(protocol, context);
  }
  throw new UnsupportedOperationError(`Can't build Partitioning`, protocol);
};

/******************
 * action indicator
 ******************/

export const V1_buildDeleteIndicator = (
  protocol: V1_DeleteIndicator,
  context: V1_GraphBuilderContext,
): DeleteIndicator => {
  if (protocol instanceof V1_DeleteIndicatorForGraphFetch) {
    const deleteIndicatorForGraphFetch = new DeleteIndicatorForGraphFetch();
    deleteIndicatorForGraphFetch.deleteFieldPath = protocol.deleteFieldPath;
    deleteIndicatorForGraphFetch.deleteValues = protocol.deleteValues;
    return deleteIndicatorForGraphFetch;
  } else if (protocol instanceof V1_DeleteIndicatorForTds) {
    const deleteIndicatorForTds = new DeleteIndicatorForTds();
    deleteIndicatorForTds.deleteField = protocol.deleteField;
    deleteIndicatorForTds.deleteValues = protocol.deleteValues;
    return deleteIndicatorForTds;
  }
  throw new UnsupportedOperationError(`Can't build DeleteIndicator`, protocol);
};

export const V1_buildActionIndicator = (
  protocol: V1_ActionIndicatorFields,
  context: V1_GraphBuilderContext,
): ActionIndicatorFields => {
  if (protocol instanceof V1_NoActionIndicator) {
    return new NoActionIndicator();
  } else if (protocol instanceof V1_DeleteIndicator) {
    return V1_buildDeleteIndicator(protocol, context);
  }
  throw new UnsupportedOperationError(`Can't build ActionIndicator`, protocol);
};

/**************
 * dataset type
 **************/

export const V1_buildDatasetType = (
  protocol: V1_DatasetType,
  context: V1_GraphBuilderContext,
): DatasetType => {
  if (protocol instanceof V1_Snapshot) {
    const snapshot = new Snapshot();
    snapshot.partitioning = V1_buildPartitioning(
      protocol.partitioning,
      context,
    );
    return snapshot;
  } else if (protocol instanceof V1_Delta) {
    const delta = new Delta();
    delta.actionIndicator = V1_buildActionIndicator(
      protocol.actionIndicator,
      context,
    );
    return delta;
  }
  throw new UnsupportedOperationError(`Can't build DatasetType`, protocol);
};

/******************
 * de-duplication
 ******************/

export const V1_buildMaxVersion = (
  protocol: V1_MaxVersion,
  context: V1_GraphBuilderContext,
): MaxVersion => {
  if (protocol instanceof V1_MaxVersionForGraphFetch) {
    const maxVersionForGraphFetch = new MaxVersionForGraphFetch();
    maxVersionForGraphFetch.versionFieldPath = protocol.versionFieldPath;
    return maxVersionForGraphFetch;
  } else if (protocol instanceof V1_MaxVersionForTds) {
    const maxVeresionForTds = new MaxVersionForTds();
    maxVeresionForTds.versionField = protocol.versionField;
    return maxVeresionForTds;
  }
  throw new UnsupportedOperationError(
    `Can't build MaxVersion
  `,
    protocol,
  );
};

export const V1_buildDeduplication = (
  protocol: V1_Deduplication,
  context: V1_GraphBuilderContext,
): Deduplication => {
  if (protocol instanceof V1_NoDeduplication) {
    return new NoDeduplication();
  } else if (protocol instanceof V1_AnyVersion) {
    return new AnyVersion();
  } else if (protocol instanceof V1_MaxVersion) {
    return V1_buildMaxVersion(protocol, context);
  }
  throw new UnsupportedOperationError(`Can't build Deduplication`, protocol);
};

/****************
 * service output
 ****************/

export const V1_buildServiceOutput = (
  protocol: V1_ServiceOutput,
  context: V1_GraphBuilderContext,
): ServiceOutput => {
  if (protocol instanceof V1_GraphFetchServiceOutput) {
    const serviceOutput = new GraphFetchServiceOutput();
    serviceOutput.datasetType = V1_buildDatasetType(
      protocol.datasetType,
      context,
    );
    serviceOutput.deduplication = V1_buildDeduplication(
      protocol.deduplication,
      context,
    );
    serviceOutput.keys = protocol.keys;
    serviceOutput.path = protocol.path;
    return serviceOutput;
  } else if (protocol instanceof V1_TdsServiceOutput) {
    const serviceOutput = new TdsServiceOutput();
    serviceOutput.datasetType = V1_buildDatasetType(
      protocol.datasetType,
      context,
    );
    serviceOutput.deduplication = V1_buildDeduplication(
      protocol.deduplication,
      context,
    );
    serviceOutput.keys = protocol.keys;
    return serviceOutput;
  }
  throw new UnsupportedOperationError(`Can't build ServiceOutput`, protocol);
};

/*************
 * auditing V2
 *************/

const V1_buildAuditingV2 = (
  protocol: V1_AuditingV2,
  context: V1_GraphBuilderContext,
): AuditingV2 => {
  if (protocol instanceof V1_NoAuditingV2) {
    return new NoAuditingV2();
  } else if (protocol instanceof V1_AuditingDateTimeV2) {
    const auditingDateTimeV2 = new AuditingDateTimeV2();
    auditingDateTimeV2.auditingDateTimeName = protocol.auditingDateTimeName;
    return auditingDateTimeV2;
  }
  throw new UnsupportedOperationError(`Can't build AuditingV2`, protocol);
};

/******************
 * updates handling
 ******************/

const V1_buildAppendOnlyUpdatesHandling = (
  protocol: V1_AppendStrategy,
  context: V1_GraphBuilderContext,
): AppendStrategy => {
  if (protocol instanceof V1_AllowDuplicates) {
    return new AllowDuplicates();
  } else if (protocol instanceof V1_FailOnDuplicates) {
    return new FailOnDuplicates();
  } else if (protocol instanceof V1_FilterDuplicates) {
    return new FilterDuplicates();
  }
  throw new UnsupportedOperationError(
    `Can't build AppendOnlyUpdatesHandling`,
    protocol,
  );
};

const V1_buildUpdatesHandling = (
  protocol: V1_UpdatesHandling,
  context: V1_GraphBuilderContext,
): UpdatesHandling => {
  if (protocol instanceof V1_AppendOnlyUpdatesHandling) {
    const appendOnlyUpdatesHandling = new AppendOnlyUpdatesHandling();
    appendOnlyUpdatesHandling.appendStrategy =
      V1_buildAppendOnlyUpdatesHandling(protocol.appendStrategy, context);
    return appendOnlyUpdatesHandling;
  }
  if (protocol instanceof V1_OverwriteUpdatesHandling) {
    return new OverwriteUpdatesHandling();
  }
  throw new UnsupportedOperationError(`Can't build UpdatesHandling`, protocol);
};

/**********************
 * processing dimension
 **********************/

const V1_buildProcessingDimension = (
  protocol: V1_ProcessingDimension,
  context: V1_GraphBuilderContext,
): ProcessingDimension => {
  if (protocol instanceof V1_BatchId) {
    const batchId = new BatchId();
    batchId.batchIdIn = protocol.batchIdIn;
    batchId.batchIdOut = protocol.batchIdOut;
    return batchId;
  } else if (protocol instanceof V1_ProcessingDateTime) {
    const processingDateTime = new ProcessingDateTime();
    processingDateTime.timeIn = protocol.timeIn;
    processingDateTime.timeOut = protocol.timeOut;
    return processingDateTime;
  } else if (protocol instanceof V1_BatchIdAndDateTime) {
    const batchIdAndDateTime = new BatchIdAndDateTime();
    batchIdAndDateTime.batchIdIn = protocol.batchIdIn;
    batchIdAndDateTime.batchIdOut = protocol.batchIdOut;
    batchIdAndDateTime.timeIn = protocol.timeIn;
    batchIdAndDateTime.timeOut = protocol.timeOut;
    return batchIdAndDateTime;
  }
  throw new UnsupportedOperationError(
    `Can't build ProcessingDimension`,
    protocol,
  );
};

const V1_buildSourceTimeFields = (
  protocol: V1_SourceTimeFields,
  context: V1_GraphBuilderContext,
): SourceTimeFields => {
  if (protocol instanceof V1_SourceTimeStart) {
    const sourceTimeStart = new SourceTimeStart();
    sourceTimeStart.startField = protocol.startField;
    return sourceTimeStart;
  } else if (protocol instanceof V1_SourceTimeStartAndEnd) {
    const sourceTimeStartAndEnd = new SourceTimeStartAndEnd();
    sourceTimeStartAndEnd.endField = protocol.endField;
    sourceTimeStartAndEnd.startField = protocol.startField;
    return sourceTimeStartAndEnd;
  }
  throw new UnsupportedOperationError(`Can't build SourceTimeFields`, protocol);
};

const V1_buildSourceDerivedDimension = (
  protocol: V1_SourceDerivedDimension,
  context: V1_GraphBuilderContext,
): SourceDerivedDimension => {
  if (protocol instanceof V1_SourceDerivedTime) {
    const sourceDerivedTime = new SourceDerivedTime();
    sourceDerivedTime.sourceTimeFields = V1_buildSourceTimeFields(
      protocol.sourceTimeFields,
      context,
    );
    sourceDerivedTime.timeEnd = protocol.timeEnd;
    sourceDerivedTime.timeStart = protocol.timeStart;

    return sourceDerivedTime;
  }
  throw new UnsupportedOperationError(
    `Can't build SourceDerivedDimension`,
    protocol,
  );
};

/*************
 * temporality
 *************/

export const V1_buildTemporality = (
  protocol: V1_Temporality,
  context: V1_GraphBuilderContext,
): Temporality => {
  if (protocol instanceof V1_NonTemporal) {
    const nonTemporal = new NonTemporal();
    nonTemporal.auditing = V1_buildAuditingV2(protocol.auditing, context);
    nonTemporal.updatesHandling = V1_buildUpdatesHandling(
      protocol.updatesHandling,
      context,
    );
    return nonTemporal;
  } else if (protocol instanceof V1_UniTemporal) {
    const uniTemporal = new UniTemporal();
    uniTemporal.processingDimension = V1_buildProcessingDimension(
      protocol.processingDimension,
      context,
    );
    return uniTemporal;
  } else if (protocol instanceof V1_BiTemporal) {
    const biTemporal = new BiTemporal();
    biTemporal.processingDimension = V1_buildProcessingDimension(
      protocol.processingDimension,
      context,
    );
    biTemporal.sourceDerivedDimension = V1_buildSourceDerivedDimension(
      protocol.sourceDerivedDimension,
      context,
    );
    return biTemporal;
  }
  throw new UnsupportedOperationError(`Can't build Temporality`, protocol);
};

/********************
 * persistence target
 ********************/

export const V1_buildPersistenceTarget = (
  protocol: V1_PersistenceTarget,
  context: V1_GraphBuilderContext,
): PersistenceTarget => {
  if (protocol instanceof V1_RelationalPersistenceTarget) {
    const persistentTarget = new RelationalPersistenceTarget();
    persistentTarget.database = protocol.database.path;
    persistentTarget.table = protocol.table;
    persistentTarget.temporality = V1_buildTemporality(
      protocol.temporality,
      context,
    );
    return persistentTarget;
  }
  throw new UnsupportedOperationError(
    `Can't build PersistenceTarget`,
    protocol,
  );
};

/************************
 * service output targets
 ***********************/

export const V1_buildServiceOutputTargets = (
  protocol: V1_ServiceOutputTarget[] | undefined,
  context: V1_GraphBuilderContext,
): ServiceOutputTarget[] | undefined => {
  if (protocol === undefined) {
    return protocol;
  }
  const serviceOutputTargets: ServiceOutputTarget[] = [];
  for (const v1ServiceOutputTarget of protocol) {
    const serviceOutputTarget = new ServiceOutputTarget();
    serviceOutputTarget.persistenceTarget = V1_buildPersistenceTarget(
      v1ServiceOutputTarget.persistenceTarget,
      context,
    );
    serviceOutputTarget.serviceOutput = V1_buildServiceOutput(
      v1ServiceOutputTarget.serviceOutput,
      context,
    );

    serviceOutputTargets.push(serviceOutputTarget);
  }
  return serviceOutputTargets;
};

/*************
 * persistence
 *************/

export const V1_buildPersistence = (
  protocol: V1_Persistence,
  context: V1_GraphBuilderContext,
): void => {
  const path = V1_buildFullPath(protocol.package, protocol.name);
  const persistence = getOwnPersistence(path, context.currentSubGraph);
  persistence.documentation = guaranteeNonEmptyString(
    protocol.documentation,
    `Persistence 'documentation' field is missing or empty`,
  );
  persistence.notifier = V1_buildNotifier(protocol.notifier, context);
  persistence.persister = V1_buildPersister(protocol.persister, context);
  persistence.service = context.resolveService(protocol.service.path);
  persistence.serviceOutputTargets = V1_buildServiceOutputTargets(
    protocol.serviceOutputTargets,
    context,
  );
  persistence.tests = protocol.tests
    .map((test) => V1_buildAtomicTest(test, context))
    .map((e) => guaranteeType(e, PersistenceTest));
  persistence.trigger = V1_buildTrigger(protocol.trigger, context);
};

/**********
 * test
 **********/

export const V1_buildPersistenceTestAssertions = (
  value: V1_TestAssertion[],
  parentTest: AtomicTest | undefined,
  context: V1_GraphBuilderContext,
): TestAssertion[] =>
  value.map((assertion) => {
    if (assertion instanceof V1_EqualToJson) {
      return V1_buildEqualToJson(assertion, parentTest, context);
    } else {
      throw new UnsupportedOperationError(`Can't build test assertion`, value);
    }
  });

const V1_buildConnectionTestData = (
  element: V1_ConnectionTestData,
  context: V1_GraphBuilderContext,
): ConnectionTestData => {
  const connectionTestData = new ConnectionTestData();
  connectionTestData.data = V1_buildEmbeddedData(element.data, context);
  return connectionTestData;
};

const V1_buildTestData = (
  element: V1_PersistenceTestData,
  context: V1_GraphBuilderContext,
): PersistenceTestData => {
  const testData = new PersistenceTestData();
  testData.connection = V1_buildConnectionTestData(element.connection, context);
  return testData;
};

export const V1_buildTestBatch = (
  protocol: V1_PersistenceTestBatch[],
  parentTest: PersistenceTest | undefined,
  context: V1_GraphBuilderContext,
): PersistenceTestBatch[] =>
  protocol.map((persistenceTestBatch) => {
    const testBatch = new PersistenceTestBatch();
    testBatch.id = persistenceTestBatch.id;
    testBatch.batchId = persistenceTestBatch.batchId;
    testBatch.assertions = V1_buildPersistenceTestAssertions(
      persistenceTestBatch.assertions,
      parentTest,
      context,
    );
    testBatch.testData = V1_buildTestData(
      persistenceTestBatch.testData,
      context,
    );
    return testBatch;
  });
