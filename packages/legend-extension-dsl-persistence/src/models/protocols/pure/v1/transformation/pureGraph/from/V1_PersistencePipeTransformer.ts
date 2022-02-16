import {
  AppendOnly,
  Auditing,
  BatchDateTimeAuditing,
  BatchIdAndDateTimeTransactionMilestoning,
  BatchIdTransactionMilestoning,
  BatchMilestoningMode,
  BatchPersister,
  BitemporalDelta,
  BitemporalSnapshot,
  DateTimeTransactionMilestoning,
  DateTimeValidityMilestoning,
  DeduplicationStrategy,
  DeleteIndicatorMergeStrategy,
  FlatTargetSpecification,
  GroupedFlatTargetSpecification,
  MergeStrategy,
  NestedTargetSpecification,
  NoAuditing,
  NoDeletesMergeStrategy,
  NonMilestonedDelta,
  NonMilestonedSnapshot,
  OpaqueAuditing,
  OpaqueMergeStrategy,
  OpaqueTransactionMilestoning,
  OpaqueTrigger,
  OpaqueValidityMilestoning,
  PersistencePipe,
  Persister,
  Reader,
  ServiceReader,
  SourceSpecifiesFromAndThruDateTime,
  SourceSpecifiesFromDateTime,
  StreamingPersister,
  TargetSpecification,
  TransactionMilestoning,
  Trigger,
  UnitemporalDelta,
  UnitemporalSnapshot,
  ValidityDerivation,
  ValidityMilestoning,
} from '../../../../../../metamodels/pure/model/packageableElements/persistence/Persistence';
import {
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
  V1_MergeStrategy,
  V1_NestedTargetSpecification,
  V1_NoAuditing,
  V1_NoDeletesMergeStrategy,
  V1_NonMilestonedDelta,
  V1_NonMilestonedSnapshot,
  V1_OpaqueAuditing,
  V1_OpaqueMergeStrategy,
  V1_OpaqueTransactionMilestoning,
  V1_OpaqueTrigger,
  V1_OpaqueValidityMilestoning,
  V1_PersistencePipe,
  V1_Persister,
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
} from '../../../model/packageableElements/persistence/V1_Persistence';
import type { V1_GraphTransformerContext } from '@finos/legend-graph';
import { UnsupportedOperationError } from '@finos/legend-shared';

/**********
 * persistence
 **********/

export const V1_transformPersistencePipe = (
  element: PersistencePipe,
  context: V1_GraphTransformerContext,
): V1_PersistencePipe => {
  const protocol = new V1_PersistencePipe();
  protocol.documentation = element.documentation;
  protocol.owners = element.owners;
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
    protocol.service = `${element.service.value.package}::${element.service.value.name}`;
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
    return new V1_StreamingPersister();
  } else if (element instanceof BatchPersister) {
    const protocol = new V1_BatchPersister();
    protocol.targetSpecification = V1_transformTargetSpecification(
      element.targetSpecification,
      context,
    );
    return protocol;
  }
  throw new UnsupportedOperationError(
    `Unable to transform persister '${element}'`,
  );
};

/**********
 * target specification
 **********/

export const V1_transformTargetSpecification = (
  element: TargetSpecification,
  context: V1_GraphTransformerContext,
): V1_TargetSpecification => {
  if (element instanceof GroupedFlatTargetSpecification) {
    return V1_transformGroupedFlatTargetSpecification(element, context);
  } else if (element instanceof FlatTargetSpecification) {
    return V1_transformFlatTargetSpecification(element, context);
  } else if (element instanceof NestedTargetSpecification) {
    return V1_transformNestedTargetSpecification(element, context);
  }
  throw new UnsupportedOperationError(
    `Unable to transform target specification '${element}'`,
  );
};

export const V1_transformGroupedFlatTargetSpecification = (
  element: GroupedFlatTargetSpecification,
  context: V1_GraphTransformerContext,
): V1_GroupedFlatTargetSpecification => {
  const protocol = new V1_GroupedFlatTargetSpecification();
  return protocol;
};

export const V1_transformFlatTargetSpecification = (
  element: FlatTargetSpecification,
  context: V1_GraphTransformerContext,
): V1_FlatTargetSpecification => {
  const protocol = new V1_FlatTargetSpecification();
  protocol.modelClass = `${element.modelClass.value.package}::${element.modelClass.value.name}`;
  protocol.targetName = element.targetName;
  protocol.partitionProperties = element.partitionProperties;
  protocol.deduplicationStrategy = V1_transformDeduplicationStrategy(
    element.deduplicationStrategy,
    context,
  );
  protocol.batchMode = V1_transformBatchMilestoningMode(
    element.batchMilestoningMode,
    context,
  );
  return protocol;
};

export const V1_transformNestedTargetSpecification = (
  element: NestedTargetSpecification,
  context: V1_GraphTransformerContext,
): V1_NestedTargetSpecification => {
  const protocol = new V1_NestedTargetSpecification();
  protocol.modelClass = `${element.modelClass.value.package}::${element.modelClass.value.name}`;
  protocol.targetName = element.targetName;
  return protocol;
};

/**********
 * deduplication strategy
 **********/

export const V1_transformDeduplicationStrategy = (
  element: DeduplicationStrategy,
  context: V1_GraphTransformerContext,
): V1_DeduplicationStrategy => {
  throw new UnsupportedOperationError(
    `Unable to transform deduplicationStrategy '${element}'`,
  );
};

/**********
 * batch mode
 **********/

export const V1_transformBatchMilestoningMode = (
  element: BatchMilestoningMode,
  context: V1_GraphTransformerContext,
): V1_BatchMilestoningMode => {
  if (element instanceof NonMilestonedSnapshot) {
    const protocol = new V1_NonMilestonedSnapshot();
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
    protocol.validityDerivation = V1_transformValidityDerivation(
      element.validityDerivation,
      context,
    );
    return protocol;
  } else if (element instanceof NonMilestonedDelta) {
    const protocol = new V1_NonMilestonedDelta();
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
    protocol.validityDerivation = V1_transformValidityDerivation(
      element.validityDerivation,
      context,
    );
    return protocol;
  } else if (element instanceof AppendOnly) {
    return new V1_AppendOnly();
  }
  throw new UnsupportedOperationError(
    `Unable to transform batch milestoning mode '${element}'`,
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
  } else if (element instanceof BatchDateTimeAuditing) {
    const protocol = new V1_BatchDateTimeAuditing();
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
    protocol.batchIdInName = element.batchIdInName;
    protocol.batchIdOutName = element.batchIdOutName;
    return protocol;
  } else if (element instanceof DateTimeTransactionMilestoning) {
    const protocol = new V1_DateTimeTransactionMilestoning();
    protocol.dateTimeInName = element.dateTimeInName;
    protocol.dateTimeOutName = element.dateTimeOutName;
    return protocol;
  } else if (element instanceof BatchIdAndDateTimeTransactionMilestoning) {
    const protocol = new V1_BatchIdAndDateTimeTransactionMilestoning();
    protocol.batchIdInName = element.batchIdInName;
    protocol.batchIdOutName = element.batchIdOutName;
    protocol.dateTimeInName = element.dateTimeInName;
    protocol.dateTimeOutName = element.dateTimeOutName;
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
    protocol.dateTimeFromName = element.dateTimeFromName;
    protocol.dateTimeThruName = element.dateTimeThruName;
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
