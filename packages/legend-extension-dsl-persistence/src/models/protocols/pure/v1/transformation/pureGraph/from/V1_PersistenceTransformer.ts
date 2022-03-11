import {
  AnyVersionDeduplicationStrategy,
  AppendOnly,
  Auditing,
  BatchIdAndDateTimeTransactionMilestoning,
  BatchIdTransactionMilestoning,
  BatchPersister,
  BitemporalDelta,
  BitemporalSnapshot,
  DateTimeAuditing,
  DateTimeTransactionMilestoning,
  DateTimeValidityMilestoning,
  DeduplicationStrategy,
  DeleteIndicatorMergeStrategy,
  FlatTarget,
  IngestMode,
  ManualTrigger,
  MaxVersionDeduplicationStrategy,
  MergeStrategy,
  MultiFlatTarget,
  NoAuditing,
  NoDeduplicationStrategy,
  NoDeletesMergeStrategy,
  NontemporalDelta,
  NontemporalSnapshot,
  OpaqueAuditing,
  OpaqueDeduplicationStrategy,
  OpaqueMergeStrategy,
  OpaqueTarget,
  OpaqueTransactionMilestoning,
  OpaqueTrigger,
  OpaqueValidityMilestoning,
  Persistence,
  Persister,
  PropertyAndFlatTarget,
  Reader,
  ServiceReader,
  SourceSpecifiesFromAndThruDateTime,
  SourceSpecifiesFromDateTime,
  StreamingPersister,
  TargetShape,
  TransactionMilestoning,
  TransactionScope,
  Trigger,
  UnitemporalDelta,
  UnitemporalSnapshot,
  ValidityDerivation,
  ValidityMilestoning,
} from '../../../../../../metamodels/pure/model/packageableElements/persistence/Persistence';
import {
  V1_AnyVersionDeduplicationStrategy,
  V1_AppendOnly,
  V1_Auditing,
  V1_DateTimeAuditing,
  V1_BatchIdAndDateTimeTransactionMilestoning,
  V1_BatchIdTransactionMilestoning,
  V1_IngestMode,
  V1_BatchPersister,
  V1_BitemporalDelta,
  V1_BitemporalSnapshot,
  V1_DateTimeTransactionMilestoning,
  V1_DateTimeValidityMilestoning,
  V1_DeduplicationStrategy,
  V1_DeleteIndicatorMergeStrategy,
  V1_FlatTarget,
  V1_ManualTrigger,
  V1_MaxVersionDeduplicationStrategy,
  V1_MergeStrategy,
  V1_MultiFlatTarget,
  V1_NoAuditing,
  V1_NoDeduplicationStrategy,
  V1_NoDeletesMergeStrategy,
  V1_NontemporalDelta,
  V1_NontemporalSnapshot,
  V1_OpaqueAuditing,
  V1_OpaqueDeduplicationStrategy,
  V1_OpaqueMergeStrategy,
  V1_OpaqueTarget,
  V1_OpaqueTransactionMilestoning,
  V1_OpaqueTrigger,
  V1_OpaqueValidityMilestoning,
  V1_Persistence,
  V1_Persister,
  V1_PropertyAndFlatTarget,
  V1_Reader,
  V1_ServiceReader,
  V1_SourceSpecifiesFromAndThruDateTime,
  V1_SourceSpecifiesFromDateTime,
  V1_StreamingPersister,
  V1_TargetShape,
  V1_TransactionMilestoning,
  V1_TransactionScope,
  V1_Trigger,
  V1_UnitemporalDelta,
  V1_UnitemporalSnapshot,
  V1_ValidityDerivation,
  V1_ValidityMilestoning,
} from '../../../model/packageableElements/persistence/V1_Persistence';
import type { V1_GraphTransformerContext } from '@finos/legend-graph';
import {
  V1_initPackageableElement,
  V1_transformElementReference,
} from '@finos/legend-graph';
import { UnsupportedOperationError } from '@finos/legend-shared';

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
  protocol.trigger = V1_transformTrigger(element.trigger, context);
  protocol.reader = V1_transformReader(element.reader, context);
  protocol.persister = V1_transformPersister(element.persister, context);
  return protocol;
};

/**********
 * trigger
 **********/

export const V1_transformTrigger = (
  element: Trigger,
  context: V1_GraphTransformerContext,
): V1_Trigger => {
  if (element instanceof OpaqueTrigger) {
    return new V1_OpaqueTrigger();
  } else if (element instanceof ManualTrigger) {
    return new V1_ManualTrigger();
  }
  throw new UnsupportedOperationError(
    `Unable to transform trigger '${element}'`,
  );
};

/**********
 * reader
 **********/

export const V1_transformReader = (
  element: Reader,
  context: V1_GraphTransformerContext,
): V1_Reader => {
  if (element instanceof ServiceReader) {
    const protocol = new V1_ServiceReader();
    protocol.service = V1_transformElementReference(element.service);
    return protocol;
  }
  throw new UnsupportedOperationError(
    `Unable to transform reader '${element}'`,
  );
};

/**********
 * persister
 **********/

export const V1_transformPersister = (
  element: Persister,
  context: V1_GraphTransformerContext,
): V1_Persister => {
  if (element instanceof StreamingPersister) {
    let protocol = new V1_StreamingPersister();
    protocol.targetShape = V1_transformTargetShape(
      element.targetShape,
      context,
    );
    return protocol;
  } else if (element instanceof BatchPersister) {
    const protocol = new V1_BatchPersister();
    protocol.targetShape = V1_transformTargetShape(
      element.targetShape,
      context,
    );
    return protocol;
  }
  throw new UnsupportedOperationError(
    `Unable to transform persister '${element}'`,
  );
};

/**********
 * target shape
 **********/

export const V1_transformTargetShape = (
  element: TargetShape,
  context: V1_GraphTransformerContext,
): V1_TargetShape => {
  if (element instanceof MultiFlatTarget) {
    return V1_transformMultiFlatTarget(element, context);
  } else if (element instanceof FlatTarget) {
    return V1_transformFlatTarget(element, context);
  } else if (element instanceof OpaqueTarget) {
    return V1_transformOpaqueTarget(element, context);
  }
  throw new UnsupportedOperationError(
    `Unable to transform target shape '${element}'`,
  );
};

export const V1_transformMultiFlatTarget = (
  element: MultiFlatTarget,
  context: V1_GraphTransformerContext,
): V1_MultiFlatTarget => {
  const protocol = new V1_MultiFlatTarget();
  protocol.modelClass = V1_transformElementReference(element.modelClass);
  protocol.transactionScope = V1_transformTransactionScope(
    element.transactionScope,
    context,
  );
  protocol.parts = element.parts.map((p) =>
    V1_transformPropertyAndFlatTarget(p, context),
  );
  return protocol;
};

export const V1_transformPropertyAndFlatTarget = (
  element: PropertyAndFlatTarget,
  context: V1_GraphTransformerContext,
): V1_PropertyAndFlatTarget => {
  const protocol = new V1_PropertyAndFlatTarget();
  protocol.property = element.property;
  protocol.flatTarget = V1_transformFlatTarget(element.flatTarget, context);
  return protocol;
};

export const V1_transformFlatTarget = (
  element: FlatTarget,
  context: V1_GraphTransformerContext,
): V1_FlatTarget => {
  const protocol = new V1_FlatTarget();
  protocol.modelClass = V1_transformElementReference(element.modelClass);
  protocol.targetName = element.targetName;
  protocol.partitionProperties = element.partitionProperties;
  protocol.deduplicationStrategy = V1_transformDeduplicationStrategy(
    element.deduplicationStrategy,
    context,
  );
  protocol.ingestMode = V1_transformIngestMode(element.ingestMode, context);
  return protocol;
};

export const V1_transformOpaqueTarget = (
  element: OpaqueTarget,
  context: V1_GraphTransformerContext,
): V1_OpaqueTarget => {
  const protocol = new V1_OpaqueTarget();
  protocol.targetName = element.targetName;
  return protocol;
};

export const V1_transformTransactionScope = (
  element: TransactionScope,
  context: V1_GraphTransformerContext,
): V1_TransactionScope => {
  if (element == TransactionScope.SINGLE_TARGET) {
    return V1_TransactionScope.SINGLE_TARGET;
  } else if (element == TransactionScope.ALL_TARGETS) {
    return V1_TransactionScope.ALL_TARGETS;
  }
  throw new UnsupportedOperationError(
    `Unable to transform transaction scope '${element}'`,
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
    protocol.versionProperty = element.versionProperty;
    return protocol;
  } else if (element instanceof OpaqueDeduplicationStrategy) {
    return new V1_OpaqueDeduplicationStrategy();
  }
  throw new UnsupportedOperationError(
    `Unable to transform deduplicationStrategy '${element}'`,
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
    `Unable to transform ingest mode '${element}'`,
  );
};

// merge strategy

export const V1_transformMergeStrategy = (
  element: MergeStrategy,
  context: V1_GraphTransformerContext,
): V1_MergeStrategy => {
  if (element instanceof NoDeletesMergeStrategy) {
    return new V1_NoDeletesMergeStrategy();
  } else if (element instanceof DeleteIndicatorMergeStrategy) {
    const protocol = new V1_DeleteIndicatorMergeStrategy();
    protocol.deleteProperty = element.deleteProperty;
    protocol.deleteValues = element.deleteValues;
    return protocol;
  } else if (element instanceof OpaqueMergeStrategy) {
    return new V1_OpaqueMergeStrategy();
  }
  throw new UnsupportedOperationError(
    `Unable to transform merge strategy '${element}'`,
  );
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
    protocol.dateTimeProperty = element.dateTimeProperty;
    return protocol;
  } else if (element instanceof OpaqueAuditing) {
    return new V1_OpaqueAuditing();
  }
  throw new UnsupportedOperationError(
    `Unable to transform auditing '${element}'`,
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
    protocol.batchIdInFieldName = element.batchIdInFieldName;
    protocol.batchIdOutFieldName = element.batchIdOutFieldName;
    return protocol;
  } else if (element instanceof DateTimeTransactionMilestoning) {
    const protocol = new V1_DateTimeTransactionMilestoning();
    protocol.dateTimeInFieldName = element.dateTimeInFieldName;
    protocol.dateTimeOutFieldName = element.dateTimeOutFieldName;
    return protocol;
  } else if (element instanceof BatchIdAndDateTimeTransactionMilestoning) {
    const protocol = new V1_BatchIdAndDateTimeTransactionMilestoning();
    protocol.batchIdInFieldName = element.batchIdInFieldName;
    protocol.batchIdOutFieldName = element.batchIdOutFieldName;
    protocol.dateTimeInFieldName = element.dateTimeInFieldName;
    protocol.dateTimeOutFieldName = element.dateTimeOutFieldName;
    return protocol;
  } else if (element instanceof OpaqueTransactionMilestoning) {
    return new V1_OpaqueTransactionMilestoning();
  }
  throw new UnsupportedOperationError(
    `Unable to transform transaction milestoning '${element}'`,
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
    protocol.dateTimeFromFieldName = element.dateTimeFromFieldName;
    protocol.dateTimeThruFieldName = element.dateTimeThruFieldName;
    protocol.derivation = V1_transformValidityDerivation(
      element.derivation,
      context,
    );
    return protocol;
  } else if (element instanceof OpaqueValidityMilestoning) {
    return new V1_OpaqueValidityMilestoning();
  }
  throw new UnsupportedOperationError(
    `Unable to transform validity milestoning '${element}'`,
  );
};

export const V1_transformValidityDerivation = (
  element: ValidityDerivation,
  context: V1_GraphTransformerContext,
): V1_ValidityDerivation => {
  if (element instanceof SourceSpecifiesFromDateTime) {
    const protocol = new V1_SourceSpecifiesFromDateTime();
    protocol.sourceDateTimeFromProperty = element.sourceDateTimeFromProperty;
    return protocol;
  } else if (element instanceof SourceSpecifiesFromAndThruDateTime) {
    const protocol = new V1_SourceSpecifiesFromAndThruDateTime();
    protocol.sourceDateTimeFromProperty = element.sourceDateTimeFromProperty;
    protocol.sourceDateTimeThruProperty = element.sourceDateTimeThruProperty;
    return protocol;
  }
  throw new UnsupportedOperationError(
    `Unable to transform validity derivation '${element}'`,
  );
};
