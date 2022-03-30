import {
  AnyVersionDeduplicationStrategy,
  AppendOnly,
  Auditing,
  BatchIdAndDateTimeTransactionMilestoning,
  BatchIdTransactionMilestoning,
  BatchPersister,
  BitemporalDelta,
  BitemporalSnapshot,
  CronTrigger,
  DateTimeAuditing,
  DateTimeTransactionMilestoning,
  DateTimeValidityMilestoning,
  DeduplicationStrategy,
  DeleteIndicatorMergeStrategy,
  EmailNotifyee,
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
  Notifier,
  Notifyee,
  PagerDutyNotifyee,
  Persistence,
  Persister,
  MultiFlatTargetPart,
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
  V1_BatchIdAndDateTimeTransactionMilestoning,
  V1_BatchIdTransactionMilestoning,
  V1_BatchPersister,
  V1_BitemporalDelta,
  V1_BitemporalSnapshot,
  V1_CronTrigger,
  V1_DateTimeAuditing,
  V1_DateTimeTransactionMilestoning,
  V1_DateTimeValidityMilestoning,
  V1_DeduplicationStrategy,
  V1_DeleteIndicatorMergeStrategy,
  V1_EmailNotifyee,
  V1_FlatTarget,
  V1_IngestMode,
  V1_ManualTrigger,
  V1_MaxVersionDeduplicationStrategy,
  V1_MergeStrategy,
  V1_MultiFlatTarget,
  V1_NoAuditing,
  V1_NoDeduplicationStrategy,
  V1_NoDeletesMergeStrategy,
  V1_NontemporalDelta,
  V1_NontemporalSnapshot,
  V1_Notifier,
  V1_Notifyee,
  V1_PagerDutyNotifyee,
  V1_Persistence,
  V1_Persister,
  V1_MultiFlatTargetPart,
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
import {
  type V1_GraphTransformerContext,
  V1_initPackageableElement,
  V1_transformElementReference,
} from '@finos/legend-graph';
import { V1_transformConnection } from '@finos/legend-graph/lib/models/protocols/pure/v1/transformation/pureGraph/from/V1_ConnectionTransformer';
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
  protocol.service = V1_transformElementReference(element.service);
  protocol.persister = V1_transformPersister(element.persister, context);
  protocol.notifier = V1_transformNotifier(element.notifier, context);
  return protocol;
};

/**********
 * trigger
 **********/

export const V1_transformTrigger = (
  element: Trigger,
  context: V1_GraphTransformerContext,
): V1_Trigger => {
  if (element instanceof CronTrigger) {
    const protocol = new V1_CronTrigger();
    protocol.minutes = element.minutes;
    protocol.hours = element.hours;
    protocol.dayOfMonth = element.dayOfMonth;
    protocol.month = element.month;
    protocol.dayOfWeek = element.dayOfWeek;
    return protocol;
  } else if (element instanceof ManualTrigger) {
    return new V1_ManualTrigger();
  }
  throw new UnsupportedOperationError(
    `Unable to transform trigger '${element}'`,
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
    const protocol = new V1_StreamingPersister();
    if (element.binding) {
      protocol.binding = element.binding.value.path;
    }
    if (element.connection) {
      protocol.connection = V1_transformConnection(
        element.connection,
        true,
        context,
      );
    }
    return protocol;
  } else if (element instanceof BatchPersister) {
    const protocol = new V1_BatchPersister();
    if (element.binding) {
      protocol.binding = element.binding.value.path;
    }
    if (element.connection) {
      protocol.connection = V1_transformConnection(
        element.connection,
        true,
        context,
      );
    }
    protocol.ingestMode = V1_transformIngestMode(element.ingestMode, context);
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
 * notifier
 **********/

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
  throw new UnsupportedOperationError(
    `Unable to transform notifyee '${element}'`,
  );
};

/**********
 * target shape
 **********/

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
    `Unable to transform target shape '${element}'`,
  );
};

export const V1_transformFlatTarget = (
  element: FlatTarget,
  context: V1_GraphTransformerContext,
): V1_FlatTarget => {
  const protocol = new V1_FlatTarget();
  if (element.modelClass) {
    protocol.modelClass = V1_transformElementReference(element.modelClass);
  }
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
  protocol.modelClass = V1_transformElementReference(element.modelClass);
  protocol.transactionScope = V1_transformTransactionScope(
    element.transactionScope,
    context,
  );
  protocol.parts = element.parts.map((p) =>
    V1_transformMultiFlatTargetPart(p, context),
  );
  return protocol;
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
    protocol.versionField = element.versionField;
    return protocol;
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
    protocol.deleteField = element.deleteField;
    protocol.deleteValues = element.deleteValues;
    return protocol;
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
    protocol.dateTimeField = element.dateTimeField;
    return protocol;
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
    protocol.derivation = V1_transformValidityDerivation(
      element.derivation,
      context,
    );
    return protocol;
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
    protocol.sourceDateTimeFromField = element.sourceDateTimeFromField;
    return protocol;
  } else if (element instanceof SourceSpecifiesFromAndThruDateTime) {
    const protocol = new V1_SourceSpecifiesFromAndThruDateTime();
    protocol.sourceDateTimeFromField = element.sourceDateTimeFromField;
    protocol.sourceDateTimeThruField = element.sourceDateTimeThruField;
    return protocol;
  }
  throw new UnsupportedOperationError(
    `Unable to transform validity derivation '${element}'`,
  );
};
