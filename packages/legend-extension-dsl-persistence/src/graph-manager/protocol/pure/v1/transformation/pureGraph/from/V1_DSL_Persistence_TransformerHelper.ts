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
  type Notifier,
  type Notifyee,
  PagerDutyNotifyee,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_Notifier.js';
import type { Persistence } from '../../../../../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_Persistence.js';
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
  type MultiFlatTargetPart,
  type TargetShape,
  TransactionScope,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_TargetShape.js';
import type { Trigger } from '../../../../../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_Trigger.js';
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
  V1_Notifier,
  type V1_Notifyee,
  V1_PagerDutyNotifyee,
} from '../../../model/packageableElements/persistence/V1_DSL_Persistence_Notifier.js';
import { V1_Persistence } from '../../../model/packageableElements/persistence/V1_DSL_Persistence_Persistence.js';
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
  V1_MultiFlatTargetPart,
  type V1_TargetShape,
  V1_TransactionScope,
} from '../../../model/packageableElements/persistence/V1_DSL_Persistence_TargetShape.js';
import type { V1_Trigger } from '../../../model/packageableElements/persistence/V1_DSL_Persistence_Trigger.js';
import type { DSL_Persistence_PureProtocolProcessorPlugin_Extension } from '../../../../DSL_Persistence_PureProtocolProcessorPlugin_Extension.js';
import {
  type TestAssertion,
  type V1_GraphTransformerContext,
  V1_initPackageableElement,
  V1_transformEmbeddedData,
  V1_transformTestAssertion,
  V1_transformAtomicTest,
  PackageableElementPointerType,
  V1_PackageableElementPointer,
} from '@finos/legend-graph';
import { guaranteeType, UnsupportedOperationError } from '@finos/legend-shared';
import type { PersistenceTestBatch } from '../../../../../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_PersistenceTestBatch.js';
import { V1_PersistenceTestBatch } from '../../../model/packageableElements/persistence/V1_DSL_Persistence_PersistenceTestBatch.js';
import type { PersistenceTestData } from '../../../../../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_PersistenceTestData.js';
import { V1_PersistenceTestData } from '../../../model/packageableElements/persistence/V1_DSL_Persistence_PersistenceTestData.js';
import type { ConnectionTestData } from '../../../../../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_ConnectionTestData.js';
import { V1_ConnectionTestData } from '../../../model/packageableElements/persistence/V1_DSL_Persistence_ConnectionTestData.js';
import { V1_PersistenceTest } from '../../../model/packageableElements/persistence/V1_DSL_Persistence_PersistenceTest.js';
import { V1_ServiceOutputTarget } from '../../../model/packageableElements/persistence/V1_DSL_Persistence_ServiceOutputTarget.js';
import type { ServiceOutputTarget } from '../../../../../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_ServiceOutputTarget.js';
import {
  GraphFetchServiceOutput,
  type ServiceOutput,
  TdsServiceOutput,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_ServiceOutput.js';
import {
  V1_GraphFetchServiceOutput,
  type V1_ServiceOutput,
  V1_TdsServiceOutput,
} from '../../../model/packageableElements/persistence/V1_DSL_Persistence_ServiceOutput.js';
import {
  type DatasetType,
  Delta,
  Snapshot,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_DatasetType.js';
import {
  type V1_DatasetType,
  V1_Delta,
  V1_Snapshot,
} from '../../../model/packageableElements/persistence/V1_DSL_Persistence_DatasetType.js';
import {
  FieldBased,
  FieldBasedForGraphFetch,
  FieldBasedForTds,
  NoPartitioning,
  type Partitioning,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_Partitioning.js';
import {
  type V1_FieldBased,
  V1_FieldBasedForGraphFetch,
  V1_FieldBasedForTds,
  V1_NoPartitioning,
  type V1_Partitioning,
} from '../../../model/packageableElements/persistence/V1_DSL_Persistence_Partitioning.js';
import {
  DeleteTargetDataset,
  type EmptyDatasetHandling,
  NoOp,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_EmptyDatasetHandling.js';
import {
  V1_DeleteTargetDataset,
  type V1_EmptyDatasetHandling,
  V1_NoOp,
} from '../../../model/packageableElements/persistence/V1_DSL_Persistence_EmptyDatasetHandling.js';
import {
  type ActionIndicatorFields,
  DeleteIndicator,
  DeleteIndicatorForGraphFetch,
  DeleteIndicatorForTds,
  NoActionIndicator,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_ActionIndicatorFields.js';
import {
  type V1_ActionIndicatorFields,
  type V1_DeleteIndicator,
  V1_DeleteIndicatorForGraphFetch,
  V1_DeleteIndicatorForTds,
  V1_NoActionIndicator,
} from '../../../model/packageableElements/persistence/V1_DSL_Persistence_ActionIndicatorFields.js';
import {
  AnyVersion,
  type Deduplication,
  MaxVersion,
  MaxVersionForGraphFetch,
  MaxVersionForTds,
  NoDeduplication,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_Deduplication.js';
import {
  V1_AnyVersion,
  type V1_Deduplication,
  type V1_MaxVersion,
  V1_MaxVersionForGraphFetch,
  V1_MaxVersionForTds,
  V1_NoDeduplication,
} from '../../../model/packageableElements/persistence/V1_DSL_Persistence_Deduplication.js';
import {
  type PersistenceTarget,
  RelationalPersistenceTarget,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_PersistentTarget.js';
import {
  BiTemporal,
  NonTemporal,
  type Temporality,
  UniTemporal,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_Temporality.js';
import {
  V1_BiTemporal,
  V1_NonTemporal,
  type V1_Temporality,
  V1_UniTemporal,
} from '../../../model/packageableElements/persistence/V1_DSL_Persistence_Temporality.js';
import {
  AuditingDateTimeV2,
  type AuditingV2,
  NoAuditingV2,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_AuditingV2.js';
import {
  V1_AuditingDateTimeV2,
  type V1_AuditingV2,
  V1_NoAuditingV2,
} from '../../../model/packageableElements/persistence/V1_DSL_Persistence_AuditingV2.js';
import {
  AppendOnlyUpdatesHandling,
  OverwriteUpdatesHandling,
  type UpdatesHandling,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_UpdatesHandling.js';
import {
  V1_AppendOnlyUpdatesHandling,
  V1_OverwriteUpdatesHandling,
  type V1_UpdatesHandling,
} from '../../../model/packageableElements/persistence/V1_DSL_Persistence_UpdatesHandling.js';
import {
  AllowDuplicates,
  type AppendStrategy,
  FailOnDuplicates,
  FilterDuplicates,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_AppendStrategy.js';
import {
  V1_AllowDuplicates,
  type V1_AppendStrategy,
  V1_FailOnDuplicates,
  V1_FilterDuplicates,
} from '../../../model/packageableElements/persistence/V1_DSL_Persistence_AppendStrategy.js';
import {
  BatchId,
  BatchIdAndDateTime,
  ProcessingDateTime,
  type ProcessingDimension,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_ProcessingDimension.js';
import {
  V1_BatchId,
  V1_BatchIdAndDateTime,
  V1_ProcessingDateTime,
  type V1_ProcessingDimension,
} from '../../../model/packageableElements/persistence/V1_DSL_Persistence_ProcessingDimension.js';
import {
  type SourceDerivedDimension,
  SourceDerivedTime,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_SourceDerivedDimension.js';
import {
  type V1_SourceDerivedDimension,
  V1_SourceDerivedTime,
} from '../../../model/packageableElements/persistence/V1_DSL_Persistence_SourceDerivedDimension.js';
import {
  type SourceTimeFields,
  SourceTimeStart,
  SourceTimeStartAndEnd,
} from '../../../../../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_SourceTimeFields.js';
import {
  type V1_SourceTimeFields,
  V1_SourceTimeStart,
  V1_SourceTimeStartAndEnd,
} from '../../../model/packageableElements/persistence/V1_DSL_Persistence_SourceTimeFields.js';
import {
  type V1_PersistenceTarget,
  V1_RelationalPersistenceTarget,
} from '../../../model/packageableElements/persistence/V1_DSL_Persistence_PersistentTarget.js';

/**********
 * trigger
 **********/

export const V1_transformTrigger = (
  element: Trigger,
  context: V1_GraphTransformerContext,
): V1_Trigger => {
  const extraTriggerTransformers = context.plugins.flatMap(
    (plugin) =>
      (
        plugin as DSL_Persistence_PureProtocolProcessorPlugin_Extension
      ).V1_getExtraTriggerTransformers?.() ?? [],
  );
  for (const transformer of extraTriggerTransformers) {
    const protocol = transformer(element, context);
    if (protocol) {
      return protocol;
    }
  }
  throw new UnsupportedOperationError(
    `Can't transform trigger: no compatible transformer available from plugins`,
    element,
  );
};

/**********
 * sink
 **********/

export const V1_transformRelationalSink = (
  element: RelationalSink,
  context: V1_GraphTransformerContext,
): V1_RelationalSink => {
  const protocol = new V1_RelationalSink();
  protocol.database = new V1_PackageableElementPointer(
    PackageableElementPointerType.STORE,
    element.database.value.path,
  );
  return protocol;
};

export const V1_transformObjectStorageSink = (
  element: ObjectStorageSink,
  context: V1_GraphTransformerContext,
): V1_ObjectStorageSink => {
  const protocol = new V1_ObjectStorageSink();
  protocol.binding = new V1_PackageableElementPointer(
    PackageableElementPointerType.BINDING,
    element.binding.value.path,
  );
  return protocol;
};

export const V1_transformSink = (
  element: Sink,
  context: V1_GraphTransformerContext,
): V1_Sink => {
  if (element instanceof RelationalSink) {
    return V1_transformRelationalSink(element, context);
  } else if (element instanceof ObjectStorageSink) {
    return V1_transformObjectStorageSink(element, context);
  }
  throw new UnsupportedOperationError(`Can't transform sink '${element}'`);
};

/**********
 * auditing
 **********/

export const V1_transformAuditing = (
  element: Auditing,
  context: V1_GraphTransformerContext,
): V1_Auditing => {
  if (element instanceof NoAuditing) {
    return new V1_NoAuditing();
  } else if (element instanceof DateTimeAuditing) {
    const protocol = new V1_DateTimeAuditing();
    protocol.dateTimeField = element.dateTimeField;
    return protocol;
  }
  throw new UnsupportedOperationError(`Can't transform auditing '${element}'`);
};

/**********
 * merge strategy
 **********/

export const V1_transformMergeStrategy = (
  element: MergeStrategy,
  context: V1_GraphTransformerContext,
): V1_MergeStrategy => {
  if (element instanceof NoDeletesMergeStrategy) {
    return new V1_NoDeletesMergeStrategy();
  } else if (element instanceof DeleteIndicatorMergeStrategy) {
    const protocol = new V1_DeleteIndicatorMergeStrategy();
    protocol.deleteField = element.deleteField;
    protocol.deleteValues = element.deleteValues;
    return protocol;
  }
  throw new UnsupportedOperationError(
    `Can't transform merge strategy '${element}'`,
  );
};

/**********
 * transaction derivation
 **********/

export const V1_transformTransactionDerivation = (
  element: TransactionDerivation,
  context: V1_GraphTransformerContext,
): V1_TransactionDerivation => {
  if (element instanceof SourceSpecifiesInDateTime) {
    const protocol = new V1_SourceSpecifiesInDateTime();
    protocol.sourceDateTimeInField = element.sourceDateTimeInField;
    return protocol;
  } else if (element instanceof SourceSpecifiesInAndOutDateTime) {
    const protocol = new V1_SourceSpecifiesInAndOutDateTime();
    protocol.sourceDateTimeInField = element.sourceDateTimeInField;
    protocol.sourceDateTimeOutField = element.sourceDateTimeOutField;
    return protocol;
  }
  throw new UnsupportedOperationError(
    `Can't transform transaction derivation '${element}'`,
  );
};

/**********
 * transaction milestoning
 **********/

export const V1_transformTransactionMilestoning = (
  element: TransactionMilestoning,
  context: V1_GraphTransformerContext,
): V1_TransactionMilestoning => {
  if (element instanceof BatchIdTransactionMilestoning) {
    const protocol = new V1_BatchIdTransactionMilestoning();
    protocol.batchIdInName = element.batchIdInName;
    protocol.batchIdOutName = element.batchIdOutName;
    return protocol;
  } else if (element instanceof DateTimeTransactionMilestoning) {
    const protocol = new V1_DateTimeTransactionMilestoning();
    protocol.dateTimeInName = element.dateTimeInName;
    protocol.dateTimeOutName = element.dateTimeOutName;
    if (element.derivation) {
      protocol.derivation = V1_transformTransactionDerivation(
        element.derivation,
        context,
      );
    }
    return protocol;
  } else if (element instanceof BatchIdAndDateTimeTransactionMilestoning) {
    const protocol = new V1_BatchIdAndDateTimeTransactionMilestoning();
    protocol.batchIdInName = element.batchIdInName;
    protocol.batchIdOutName = element.batchIdOutName;
    protocol.dateTimeInName = element.dateTimeInName;
    protocol.dateTimeOutName = element.dateTimeOutName;
    if (element.derivation) {
      protocol.derivation = V1_transformTransactionDerivation(
        element.derivation,
        context,
      );
    }
    return protocol;
  }
  throw new UnsupportedOperationError(
    `Can't transform transaction milestoning '${element}'`,
  );
};

/**********
 * validity derivation
 **********/

export const V1_transformValidityDerivation = (
  element: ValidityDerivation,
  context: V1_GraphTransformerContext,
): V1_ValidityDerivation => {
  if (element instanceof SourceSpecifiesFromDateTime) {
    const protocol = new V1_SourceSpecifiesFromDateTime();
    protocol.sourceDateTimeFromField = element.sourceDateTimeFromField;
    return protocol;
  } else if (element instanceof SourceSpecifiesFromAndThruDateTime) {
    const protocol = new V1_SourceSpecifiesFromAndThruDateTime();
    protocol.sourceDateTimeFromField = element.sourceDateTimeFromField;
    protocol.sourceDateTimeThruField = element.sourceDateTimeThruField;
    return protocol;
  }
  throw new UnsupportedOperationError(
    `Can't transform validity derivation '${element}'`,
  );
};

/**********
 * validity milestoning
 **********/

export const V1_transformValidityMilestoning = (
  element: ValidityMilestoning,
  context: V1_GraphTransformerContext,
): V1_ValidityMilestoning => {
  if (element instanceof DateTimeValidityMilestoning) {
    const protocol = new V1_DateTimeValidityMilestoning();
    protocol.dateTimeFromName = element.dateTimeFromName;
    protocol.dateTimeThruName = element.dateTimeThruName;
    protocol.derivation = V1_transformValidityDerivation(
      element.derivation,
      context,
    );
    return protocol;
  }
  throw new UnsupportedOperationError(
    `Can't transform validity milestoning '${element}'`,
  );
};

/**********
 * ingest mode
 **********/

export const V1_transformIngestMode = (
  element: IngestMode,
  context: V1_GraphTransformerContext,
): V1_IngestMode => {
  if (element instanceof NontemporalSnapshot) {
    const protocol = new V1_NontemporalSnapshot();
    protocol.auditing = V1_transformAuditing(element.auditing, context);
    return protocol;
  } else if (element instanceof UnitemporalSnapshot) {
    const protocol = new V1_UnitemporalSnapshot();
    protocol.transactionMilestoning = V1_transformTransactionMilestoning(
      element.transactionMilestoning,
      context,
    );
    return protocol;
  } else if (element instanceof BitemporalSnapshot) {
    const protocol = new V1_BitemporalSnapshot();
    protocol.transactionMilestoning = V1_transformTransactionMilestoning(
      element.transactionMilestoning,
      context,
    );
    protocol.validityMilestoning = V1_transformValidityMilestoning(
      element.validityMilestoning,
      context,
    );
    return protocol;
  } else if (element instanceof NontemporalDelta) {
    const protocol = new V1_NontemporalDelta();
    protocol.mergeStrategy = V1_transformMergeStrategy(
      element.mergeStrategy,
      context,
    );
    protocol.auditing = V1_transformAuditing(element.auditing, context);
    return protocol;
  } else if (element instanceof UnitemporalDelta) {
    const protocol = new V1_UnitemporalDelta();
    protocol.mergeStrategy = V1_transformMergeStrategy(
      element.mergeStrategy,
      context,
    );
    protocol.transactionMilestoning = V1_transformTransactionMilestoning(
      element.transactionMilestoning,
      context,
    );
    return protocol;
  } else if (element instanceof BitemporalDelta) {
    const protocol = new V1_BitemporalDelta();
    protocol.mergeStrategy = V1_transformMergeStrategy(
      element.mergeStrategy,
      context,
    );
    protocol.transactionMilestoning = V1_transformTransactionMilestoning(
      element.transactionMilestoning,
      context,
    );
    protocol.validityMilestoning = V1_transformValidityMilestoning(
      element.validityMilestoning,
      context,
    );
    return protocol;
  } else if (element instanceof AppendOnly) {
    const protocol = new V1_AppendOnly();
    protocol.auditing = V1_transformAuditing(element.auditing, context);
    protocol.filterDuplicates = element.filterDuplicates;
    return protocol;
  }
  throw new UnsupportedOperationError(
    `Can't transform ingest mode '${element}'`,
  );
};

/**********
 * deduplication strategy
 **********/

export const V1_transformDeduplicationStrategy = (
  element: DeduplicationStrategy,
  context: V1_GraphTransformerContext,
): V1_DeduplicationStrategy => {
  if (element instanceof NoDeduplicationStrategy) {
    return new V1_NoDeduplicationStrategy();
  } else if (element instanceof AnyVersionDeduplicationStrategy) {
    return new V1_AnyVersionDeduplicationStrategy();
  } else if (element instanceof MaxVersionDeduplicationStrategy) {
    const protocol = new V1_MaxVersionDeduplicationStrategy();
    protocol.versionField = element.versionField;
    return protocol;
  } else if (element instanceof DuplicateCountDeduplicationStrategy) {
    const protocol = new V1_DuplicateCountDeduplicationStrategy();
    protocol.duplicateCountName = element.duplicateCountName;
    return protocol;
  }
  throw new UnsupportedOperationError(
    `Can't transform deduplicationStrategy '${element}'`,
  );
};

/**********
 * target shape
 **********/

export const V1_transformFlatTarget = (
  element: FlatTarget,
  context: V1_GraphTransformerContext,
): V1_FlatTarget => {
  const protocol = new V1_FlatTarget();
  protocol.modelClass = element.modelClass?.valueForSerialization;
  protocol.targetName = element.targetName;
  protocol.partitionFields = element.partitionFields;
  protocol.deduplicationStrategy = V1_transformDeduplicationStrategy(
    element.deduplicationStrategy,
    context,
  );
  return protocol;
};

export const V1_transformTransactionScope = (
  element: TransactionScope,
  context: V1_GraphTransformerContext,
): V1_TransactionScope => {
  if (element === TransactionScope.SINGLE_TARGET) {
    return V1_TransactionScope.SINGLE_TARGET;
  } else {
    return V1_TransactionScope.ALL_TARGETS;
  }

  //note: ledav -- would prefer to write the below to be defensive when a new
  //      enum member is added, but lint complains

  /*
  } else if (element === TransactionScope.ALL_TARGETS) {
    return V1_TransactionScope.ALL_TARGETS;
  }
  throw new UnsupportedOperationError(
    `Can't transform transaction scope '${element}'`,
  );
 */
};

export const V1_transformMultiFlatTargetPart = (
  element: MultiFlatTargetPart,
  context: V1_GraphTransformerContext,
): V1_MultiFlatTargetPart => {
  const protocol = new V1_MultiFlatTargetPart();
  protocol.modelProperty = element.modelProperty;
  protocol.targetName = element.targetName;
  protocol.partitionFields = element.partitionFields;
  protocol.deduplicationStrategy = V1_transformDeduplicationStrategy(
    element.deduplicationStrategy,
    context,
  );
  return protocol;
};

export const V1_transformMultiFlatTarget = (
  element: MultiFlatTarget,
  context: V1_GraphTransformerContext,
): V1_MultiFlatTarget => {
  const protocol = new V1_MultiFlatTarget();
  protocol.modelClass = element.modelClass.valueForSerialization ?? '';
  protocol.transactionScope = V1_transformTransactionScope(
    element.transactionScope,
    context,
  );
  protocol.parts = element.parts.map((p) =>
    V1_transformMultiFlatTargetPart(p, context),
  );
  return protocol;
};

export const V1_transformTargetShape = (
  element: TargetShape,
  context: V1_GraphTransformerContext,
): V1_TargetShape => {
  if (element instanceof FlatTarget) {
    return V1_transformFlatTarget(element, context);
  } else if (element instanceof MultiFlatTarget) {
    return V1_transformMultiFlatTarget(element, context);
  }
  throw new UnsupportedOperationError(
    `Can't transform target shape '${element}'`,
  );
};

/**********
 * persister
 **********/

export const V1_transformPersister = (
  element: Persister | undefined,
  context: V1_GraphTransformerContext,
): V1_Persister | undefined => {
  if (element === undefined) {
    return element;
  }
  if (element instanceof StreamingPersister) {
    const protocol = new V1_StreamingPersister();
    protocol.sink = V1_transformSink(element.sink, context);
    return protocol;
  } else if (element instanceof BatchPersister) {
    const protocol = new V1_BatchPersister();
    protocol.sink = V1_transformSink(element.sink, context);
    protocol.ingestMode = V1_transformIngestMode(element.ingestMode, context);
    protocol.targetShape = V1_transformTargetShape(
      element.targetShape,
      context,
    );
    return protocol;
  }
  throw new UnsupportedOperationError(`Can't transform persister '${element}'`);
};

/***************
 * deduplication
 ***************/

export const V1_transformMaxVersion = (
  element: MaxVersion,
  context: V1_GraphTransformerContext,
): V1_MaxVersion => {
  if (element instanceof MaxVersionForGraphFetch) {
    const protocol = new V1_MaxVersionForGraphFetch();
    protocol.versionFieldPath = element.versionFieldPath;
    return protocol;
  } else if (element instanceof MaxVersionForTds) {
    const protocol = new V1_MaxVersionForTds();
    protocol.versionField = element.versionField;
    return protocol;
  }
  throw new UnsupportedOperationError(`Can't transform MaxVersion`, element);
};

export const V1_transformDeduplication = (
  element: Deduplication,
  context: V1_GraphTransformerContext,
): V1_Deduplication => {
  if (element instanceof NoDeduplication) {
    return new V1_NoDeduplication();
  } else if (element instanceof AnyVersion) {
    return new V1_AnyVersion();
  } else if (element instanceof MaxVersion) {
    return V1_transformMaxVersion(element, context);
  }
  throw new UnsupportedOperationError(`Can't transform deduplication`, element);
};

/**********
 * auditing
 **********/

const V1_transformAuditingV2 = (
  element: AuditingV2,
  context: V1_GraphTransformerContext,
): V1_AuditingV2 => {
  if (element instanceof NoAuditingV2) {
    return new V1_NoAuditingV2();
  } else if (element instanceof AuditingDateTimeV2) {
    const protocol = new V1_AuditingDateTimeV2();
    protocol.auditingDateTimeName = element.auditingDateTimeName;
    return protocol;
  }
  throw new UnsupportedOperationError(`Can't transform AuditingV2`, element);
};

/******************
 * updates handling
 ******************/

const V1_transformAppendOnlyUpdatesHandling = (
  element: AppendStrategy,
  context: V1_GraphTransformerContext,
): V1_AppendStrategy => {
  if (element instanceof AllowDuplicates) {
    return new V1_AllowDuplicates();
  } else if (element instanceof FailOnDuplicates) {
    return new V1_FailOnDuplicates();
  } else if (element instanceof FilterDuplicates) {
    return new V1_FilterDuplicates();
  }
  throw new UnsupportedOperationError(
    `Can't transform AppendOnlyUpdatesHandling`,
    element,
  );
};

const V1_transformUpdatesHandling = (
  element: UpdatesHandling,
  context: V1_GraphTransformerContext,
): V1_UpdatesHandling => {
  if (element instanceof AppendOnlyUpdatesHandling) {
    const protocol = new V1_AppendOnlyUpdatesHandling();
    protocol.appendStrategy = V1_transformAppendOnlyUpdatesHandling(
      element.appendStrategy,
      context,
    );
    return protocol;
  }
  if (element instanceof OverwriteUpdatesHandling) {
    return new V1_OverwriteUpdatesHandling();
  }
  throw new UnsupportedOperationError(
    `Can't transform UpdatesHandling`,
    element,
  );
};

/*********************
 * processing dimesion
 *********************/

const V1_transformProcessingDimension = (
  element: ProcessingDimension,
  context: V1_GraphTransformerContext,
): V1_ProcessingDimension => {
  if (element instanceof BatchId) {
    const protocol = new V1_BatchId();
    protocol.batchIdIn = element.batchIdIn;
    protocol.batchIdOut = element.batchIdOut;
    return protocol;
  } else if (element instanceof ProcessingDateTime) {
    const protocol = new V1_ProcessingDateTime();
    protocol.timeIn = element.timeIn;
    protocol.timeOut = element.timeOut;
    return protocol;
  } else if (element instanceof BatchIdAndDateTime) {
    const protocol = new V1_BatchIdAndDateTime();
    protocol.batchIdIn = element.batchIdIn;
    protocol.batchIdOut = element.batchIdOut;
    protocol.timeIn = element.timeIn;
    protocol.timeOut = element.timeOut;
    return protocol;
  }
  throw new UnsupportedOperationError(
    `Can't transform ProcessingDimension`,
    element,
  );
};

const V1_transformSourceTimeFields = (
  element: SourceTimeFields,
  context: V1_GraphTransformerContext,
): V1_SourceTimeFields => {
  if (element instanceof SourceTimeStart) {
    const protocol = new V1_SourceTimeStart();
    protocol.startField = element.startField;
    return protocol;
  } else if (element instanceof SourceTimeStartAndEnd) {
    const protocol = new V1_SourceTimeStartAndEnd();
    protocol.endField = element.endField;
    protocol.startField = element.startField;
    return protocol;
  }
  throw new UnsupportedOperationError(
    `Can't transform SourceTimeFields`,
    element,
  );
};

const V1_transformSourceDerivedDimension = (
  element: SourceDerivedDimension,
  context: V1_GraphTransformerContext,
): V1_SourceDerivedDimension => {
  if (element instanceof SourceDerivedTime) {
    const sourceDerivedTime = new V1_SourceDerivedTime();
    sourceDerivedTime.sourceTimeFields = V1_transformSourceTimeFields(
      element.sourceTimeFields,
      context,
    );
    sourceDerivedTime.timeEnd = element.timeEnd;
    sourceDerivedTime.timeStart = element.timeStart;
    return sourceDerivedTime;
  }
  throw new UnsupportedOperationError(
    `Can't transform SourceDerivedDimension`,
    element,
  );
};

/*************
 * temporality
 *************/

export const V1_transformTemporality = (
  element: Temporality,
  context: V1_GraphTransformerContext,
): V1_Temporality => {
  if (element instanceof NonTemporal) {
    const protocol = new V1_NonTemporal();
    protocol.auditing = V1_transformAuditingV2(element.auditing, context);
    protocol.updatesHandling = V1_transformUpdatesHandling(
      element.updatesHandling,
      context,
    );
    return protocol;
  } else if (element instanceof UniTemporal) {
    const protocol = new V1_UniTemporal();
    protocol.processingDimension = V1_transformProcessingDimension(
      element.processingDimension,
      context,
    );
    return protocol;
  } else if (element instanceof BiTemporal) {
    const protocol = new V1_BiTemporal();
    protocol.processingDimension = V1_transformProcessingDimension(
      element.processingDimension,
      context,
    );
    protocol.sourceDerivedDimension = V1_transformSourceDerivedDimension(
      element.sourceDerivedDimension,
      context,
    );
    return protocol;
  }
  throw new UnsupportedOperationError(`Can't transform Temporality`, element);
};

/********************
 * persistence target
 ********************/

export const V1_transformPersistenceTarget = (
  element: PersistenceTarget,
  context: V1_GraphTransformerContext,
): V1_PersistenceTarget => {
  if (element instanceof RelationalPersistenceTarget) {
    const protocol = new V1_RelationalPersistenceTarget();
    protocol.database = new V1_PackageableElementPointer(
      PackageableElementPointerType.STORE,
      element.database,
    );

    protocol.table = element.table;
    protocol.temporality = V1_transformTemporality(
      element.temporality,
      context,
    );
    return protocol;
  }
  throw new UnsupportedOperationError(
    `Can't transform PersistenceTarget`,
    element,
  );
};

/**********
 * notifier
 **********/

export const V1_transformNotifyee = (
  element: Notifyee,
  context: V1_GraphTransformerContext,
): V1_Notifyee => {
  if (element instanceof EmailNotifyee) {
    const protocol = new V1_EmailNotifyee();
    protocol.address = element.address;
    return protocol;
  } else if (element instanceof PagerDutyNotifyee) {
    const protocol = new V1_PagerDutyNotifyee();
    protocol.url = element.url;
    return protocol;
  }
  throw new UnsupportedOperationError(`Can't transform notifyee '${element}'`);
};

export const V1_transformNotifier = (
  element: Notifier,
  context: V1_GraphTransformerContext,
): V1_Notifier => {
  const notifier = new V1_Notifier();
  notifier.notifyees = element.notifyees.map((n) =>
    V1_transformNotifyee(n, context),
  );
  return notifier;
};

/**********
 * test
 **********/

const V1_transformConnectionTestData = (
  element: ConnectionTestData,
  context: V1_GraphTransformerContext,
): V1_ConnectionTestData => {
  const connectionTestData = new V1_ConnectionTestData();
  connectionTestData.data = V1_transformEmbeddedData(element.data, context);
  return connectionTestData;
};

const V1_transformTestData = (
  element: PersistenceTestData,
  context: V1_GraphTransformerContext,
): V1_PersistenceTestData => {
  const testData = new V1_PersistenceTestData();
  testData.connection = V1_transformConnectionTestData(
    element.connection,
    context,
  );
  return testData;
};

export const V1_transformPersistenceTestBatch = (
  element: PersistenceTestBatch,
  context: V1_GraphTransformerContext,
): V1_PersistenceTestBatch => {
  const persistenceTestBatch = new V1_PersistenceTestBatch();
  persistenceTestBatch.batchId = element.batchId;
  persistenceTestBatch.id = element.id;
  persistenceTestBatch.testData = V1_transformTestData(
    element.testData,
    context,
  );
  persistenceTestBatch.assertions = element.assertions.map(
    (assertion: TestAssertion) => V1_transformTestAssertion(assertion),
  );
  return persistenceTestBatch;
};

/******************
 * action indicator
 ******************/

export const V1_transformDeleteIndicator = (
  element: DeleteIndicator,
  context: V1_GraphTransformerContext,
): V1_DeleteIndicator => {
  if (element instanceof DeleteIndicatorForGraphFetch) {
    const protocol = new V1_DeleteIndicatorForGraphFetch();
    protocol.deleteFieldPath = element.deleteFieldPath;
    protocol.deleteValues = element.deleteValues;
    return protocol;
  } else if (element instanceof DeleteIndicatorForTds) {
    const protocol = new V1_DeleteIndicatorForTds();
    protocol.deleteField = element.deleteField;
    protocol.deleteValues = element.deleteValues;
    return protocol;
  }
  throw new UnsupportedOperationError(
    `Can't transform DeleteIndicator`,
    element,
  );
};

export const V1_transformActionIndicator = (
  element: ActionIndicatorFields,
  context: V1_GraphTransformerContext,
): V1_ActionIndicatorFields => {
  if (element instanceof NoActionIndicator) {
    return new V1_NoActionIndicator();
  } else if (element instanceof DeleteIndicator) {
    return V1_transformDeleteIndicator(element, context);
  }
  throw new UnsupportedOperationError(
    `Can't transform ActionIndicator`,
    element,
  );
};

/************************
 * empty dataset handling
 ***********************/

export const V1_transformEmptyDatasetHandling = (
  element: EmptyDatasetHandling,
  context: V1_GraphTransformerContext,
): V1_EmptyDatasetHandling => {
  if (element instanceof NoOp) {
    return new V1_NoOp();
  } else if (element instanceof DeleteTargetDataset) {
    return new V1_DeleteTargetDataset();
  }
  throw new UnsupportedOperationError(
    `Can't transform EmptyDatasetHandling`,
    element,
  );
};

/**************
 * partitioning
 **************/

export const V1_transformFieldBasedPartitioning = (
  element: FieldBased,
  context: V1_GraphTransformerContext,
): V1_FieldBased => {
  if (element instanceof FieldBasedForGraphFetch) {
    const fieldBasedForGraphFetch = new V1_FieldBasedForGraphFetch();
    fieldBasedForGraphFetch.partitionFieldPaths = element.partitionFieldPaths;
    return fieldBasedForGraphFetch;
  } else if (element instanceof FieldBasedForTds) {
    const fieldBasedForTds = new V1_FieldBasedForTds();
    fieldBasedForTds.partitionFields = element.partitionFields;
    return fieldBasedForTds;
  }
  throw new UnsupportedOperationError(
    `Can't transform FieldBasedPartitioning`,
    element,
  );
};

export const V1_transformPartitioning = (
  element: Partitioning,
  context: V1_GraphTransformerContext,
): V1_Partitioning => {
  if (element instanceof NoPartitioning) {
    const protocol = new V1_NoPartitioning();
    protocol.emptyDatasetHandling = V1_transformEmptyDatasetHandling(
      element.emptyDatasetHandling,
      context,
    );
    return protocol;
  } else if (element instanceof FieldBased) {
    return V1_transformFieldBasedPartitioning(element, context);
  }
  throw new UnsupportedOperationError(`Can't transform Partitioning`, element);
};

/****************
 * dataset type
 ****************/

export const V1_transformDatasetType = (
  element: DatasetType,
  context: V1_GraphTransformerContext,
): V1_DatasetType => {
  if (element instanceof Snapshot) {
    const protocol = new V1_Snapshot();
    protocol.partitioning = V1_transformPartitioning(
      element.partitioning,
      context,
    );
    return protocol;
  } else if (element instanceof Delta) {
    const protocol = new V1_Delta();
    protocol.actionIndicator = V1_transformActionIndicator(
      element.actionIndicator,
      context,
    );
    return protocol;
  }
  throw new UnsupportedOperationError(`Can't transform DatasetType`, element);
};

/****************
 * service output
 ****************/

export const V1_transformServiceOutput = (
  element: ServiceOutput,
  context: V1_GraphTransformerContext,
): V1_ServiceOutput => {
  if (element instanceof GraphFetchServiceOutput) {
    const protocol = new V1_GraphFetchServiceOutput();
    protocol.datasetType = V1_transformDatasetType(
      element.datasetType,
      context,
    );
    protocol.deduplication = V1_transformDeduplication(
      element.deduplication,
      context,
    );
    protocol.keys = element.keys;
    protocol.path = element.path;
    return protocol;
  } else if (element instanceof TdsServiceOutput) {
    const protocol = new V1_TdsServiceOutput();
    protocol.datasetType = V1_transformDatasetType(
      element.datasetType,
      context,
    );
    protocol.deduplication = V1_transformDeduplication(
      element.deduplication,
      context,
    );
    protocol.keys = element.keys;
    return protocol;
  }
  throw new UnsupportedOperationError(`Can't transform ServiceOutput`, element);
};

/************************
 * service output targets
 ***********************/

export const V1_transformServiceOutputTargets = (
  element: ServiceOutputTarget[] | undefined,
  context: V1_GraphTransformerContext,
): V1_ServiceOutputTarget[] | undefined => {
  if (element === undefined) {
    return element;
  }
  const protocol: V1_ServiceOutputTarget[] = [];
  for (const v1ServiceOutputTarget of element) {
    const serviceOutputTarget = new V1_ServiceOutputTarget();
    serviceOutputTarget.persistenceTarget = V1_transformPersistenceTarget(
      v1ServiceOutputTarget.persistenceTarget,
      context,
    );
    serviceOutputTarget.serviceOutput = V1_transformServiceOutput(
      v1ServiceOutputTarget.serviceOutput,
      context,
    );
    protocol.push(serviceOutputTarget);
  }
  return protocol;
};

/**********
 * persistence
 **********/

export const V1_transformPersistence = (
  element: Persistence,
  context: V1_GraphTransformerContext,
): V1_Persistence => {
  const protocol = new V1_Persistence();
  V1_initPackageableElement(protocol, element);
  protocol.documentation = element.documentation;
  protocol.notifier = V1_transformNotifier(element.notifier, context);
  protocol.persister = V1_transformPersister(element.persister, context);
  protocol.service = new V1_PackageableElementPointer(
    PackageableElementPointerType.SERVICE,
    element.service.valueForSerialization ?? '',
  );
  protocol.serviceOutputTargets = V1_transformServiceOutputTargets(
    element.serviceOutputTargets,
    context,
  );
  protocol.tests = element.tests.map((test) =>
    guaranteeType(V1_transformAtomicTest(test, context), V1_PersistenceTest),
  );
  protocol.trigger = V1_transformTrigger(element.trigger, context);
  return protocol;
};
