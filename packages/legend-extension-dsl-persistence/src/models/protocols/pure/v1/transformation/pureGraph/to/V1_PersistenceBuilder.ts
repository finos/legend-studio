import {
  V1_AnyVersionDeduplicationStrategy,
  V1_AppendOnly,
  V1_Auditing,
  V1_BatchIdAndDateTimeTransactionMilestoning,
  V1_BatchIdTransactionMilestoning,
  V1_BatchPersister,
  V1_BitemporalDelta,
  V1_BitemporalSnapshot,
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
  V1_OpaqueAuditing,
  V1_OpaqueDeduplicationStrategy,
  V1_OpaqueMergeStrategy,
  V1_OpaqueTarget,
  V1_OpaqueTransactionMilestoning,
  V1_OpaqueTrigger,
  V1_OpaqueValidityMilestoning,
  V1_PagerDutyNotifyee,
  type V1_Persistence,
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
  OpaqueAuditing,
  OpaqueDeduplicationStrategy,
  OpaqueMergeStrategy,
  OpaqueTarget,
  OpaqueTransactionMilestoning,
  OpaqueTrigger,
  OpaqueValidityMilestoning,
  PagerDutyNotifyee,
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
import { getPersistence } from '../../../../../../../graphManager/DSLPersistence_GraphManagerHelper';
import {
  GraphBuilderError,
  type V1_GraphBuilderContext,
} from '@finos/legend-graph';
import { guaranteeNonEmptyString } from '@finos/legend-shared';

/**********
 * persistence
 **********/

export const V1_buildPersistence = (
  protocol: V1_Persistence,
  context: V1_GraphBuilderContext,
): void => {
  const path = context.graph.buildPath(protocol.package, protocol.name);
  const persistence = getPersistence(path, context.graph);
  persistence.documentation = guaranteeNonEmptyString(
    protocol.documentation,
    `Persistence 'documentation' field is missing or empty`,
  );
  persistence.trigger = V1_buildTrigger(protocol.trigger, context);
  persistence.reader = V1_buildReader(protocol.reader, context);
  persistence.persister = V1_buildPersister(protocol.persister, context);
  persistence.notifier = V1_buildNotifier(protocol.notifier, context);
};

/**********
 * trigger
 **********/

export const V1_buildTrigger = (
  protocol: V1_Trigger,
  context: V1_GraphBuilderContext,
): Trigger => {
  if (protocol instanceof V1_OpaqueTrigger) {
    return new OpaqueTrigger();
  } else if (protocol instanceof V1_ManualTrigger) {
    return new ManualTrigger();
  }
  throw new GraphBuilderError(`Unrecognized trigger '${protocol}'`);
};

/**********
 * reader
 **********/

export const V1_buildReader = (
  protocol: V1_Reader,
  context: V1_GraphBuilderContext,
): Reader => {
  if (protocol instanceof V1_ServiceReader) {
    const reader = new ServiceReader();
    reader.service = context.resolveService(protocol.service);
    return reader;
  }
  throw new GraphBuilderError(`Unrecognized reader '${protocol}'`);
};

/**********
 * persister
 **********/

export const V1_buildPersister = (
  protocol: V1_Persister,
  context: V1_GraphBuilderContext,
): Persister => {
  if (protocol instanceof V1_StreamingPersister) {
    const persister = new StreamingPersister();
    persister.targetShape = V1_buildTargetShape(protocol.targetShape, context);
    return persister;
  } else if (protocol instanceof V1_BatchPersister) {
    const persister = new BatchPersister();
    persister.targetShape = V1_buildTargetShape(protocol.targetShape, context);
    return persister;
  }
  throw new GraphBuilderError(`Unrecognized persister '${protocol}'`);
};

/**********
 * notifier
 **********/

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
  throw new GraphBuilderError(`Unrecognized notifier '${protocol}'`);
};

/**********
 * target shape
 **********/

export const V1_buildTargetShape = (
  protocol: V1_TargetShape,
  context: V1_GraphBuilderContext,
): TargetShape => {
  if (protocol instanceof V1_MultiFlatTarget) {
    return V1_buildMultiFlatTarget(protocol, context);
  } else if (protocol instanceof V1_FlatTarget) {
    return V1_buildFlatTarget(protocol, protocol.modelClass, context);
  } else if (protocol instanceof V1_OpaqueTarget) {
    return V1_buildOpaqueTarget(protocol, context);
  }
  throw new GraphBuilderError(`Unrecognized target shape '${protocol}'`);
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
    V1_buildPropertyAndFlatTarget(p, protocol.modelClass, context),
  );
  return targetShape;
};

export const V1_buildFlatTarget = (
  protocol: V1_FlatTarget,
  modelClass: string,
  context: V1_GraphBuilderContext,
): FlatTarget => {
  const targetShape = new FlatTarget();

  // Flat: modelClass will match protocol.modelClass
  // MultiFlat: protocol.modelClass will not be populated;
  //            instead infer it from rootModelClass.property target type

  targetShape.modelClass = context.resolveClass(modelClass);
  targetShape.targetName = guaranteeNonEmptyString(protocol.targetName);
  targetShape.partitionProperties = protocol.partitionProperties;
  targetShape.deduplicationStrategy = V1_buildDeduplicationStrategy(
    protocol.deduplicationStrategy,
    context,
  );
  targetShape.ingestMode = V1_buildIngestMode(protocol.ingestMode, context);
  return targetShape;
};

export const V1_buildOpaqueTarget = (
  protocol: V1_OpaqueTarget,
  context: V1_GraphBuilderContext,
): OpaqueTarget => {
  const targetShape = new OpaqueTarget();
  targetShape.targetName = guaranteeNonEmptyString(protocol.targetName);
  return targetShape;
};

export const V1_buildPropertyAndFlatTarget = (
  protocol: V1_PropertyAndFlatTarget,
  groupModelClass: string,
  context: V1_GraphBuilderContext,
): PropertyAndFlatTarget => {
  const element = new PropertyAndFlatTarget();
  element.property = protocol.property;

  // resolve target type of property to populate model class in flat target
  const property = context.graph
    .getClass(groupModelClass)
    .getProperty(protocol.property);
  const targetModelClass = property.genericType.value.rawType.path;

  element.flatTarget = V1_buildFlatTarget(
    protocol.flatTarget,
    targetModelClass,
    context,
  );

  return element;
};

export const V1_buildTransactionScope = (
  protocol: V1_TransactionScope,
  context: V1_GraphBuilderContext,
): TransactionScope => {
  if (protocol === V1_TransactionScope.SINGLE_TARGET) {
    return TransactionScope.SINGLE_TARGET;
  } else if (protocol === V1_TransactionScope.ALL_TARGETS) {
    return TransactionScope.ALL_TARGETS;
  }
  throw new GraphBuilderError(`Unrecognized transaction scope '${protocol}'`);
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
    strategy.versionProperty = protocol.versionProperty;
    return strategy;
  } else if (protocol instanceof V1_OpaqueDeduplicationStrategy) {
    return new OpaqueDeduplicationStrategy();
  }
  throw new GraphBuilderError(
    `Unrecognized deduplication strategy '${protocol}'`,
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
  throw new GraphBuilderError(`Unrecognized ingest mode '${protocol}'`);
};

// merge strategy

export const V1_buildMergeStrategy = (
  protocol: V1_MergeStrategy,
  context: V1_GraphBuilderContext,
): MergeStrategy => {
  if (protocol instanceof V1_NoDeletesMergeStrategy) {
    return new NoDeletesMergeStrategy();
  } else if (protocol instanceof V1_DeleteIndicatorMergeStrategy) {
    const strategy = new DeleteIndicatorMergeStrategy();
    strategy.deleteProperty = protocol.deleteProperty;
    strategy.deleteValues = protocol.deleteValues;
    return strategy;
  } else if (protocol instanceof V1_OpaqueMergeStrategy) {
    return new OpaqueMergeStrategy();
  }
  throw new GraphBuilderError(`Unrecognized merge strategy '${protocol}'`);
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
    auditing.dateTimeProperty = protocol.dateTimeProperty;
    return auditing;
  } else if (protocol instanceof V1_OpaqueAuditing) {
    return new OpaqueAuditing();
  }
  throw new GraphBuilderError(`Unrecognized auditing mode '${protocol}'`);
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
    milestoning.batchIdInFieldName = protocol.batchIdInFieldName;
    milestoning.batchIdOutFieldName = protocol.batchIdOutFieldName;
    return milestoning;
  } else if (protocol instanceof V1_DateTimeTransactionMilestoning) {
    const milestoning = new DateTimeTransactionMilestoning();
    milestoning.dateTimeInFieldName = protocol.dateTimeInFieldName;
    milestoning.dateTimeOutFieldName = protocol.dateTimeOutFieldName;
    return milestoning;
  } else if (protocol instanceof V1_BatchIdAndDateTimeTransactionMilestoning) {
    const milestoning = new BatchIdAndDateTimeTransactionMilestoning();
    milestoning.batchIdInFieldName = protocol.batchIdInFieldName;
    milestoning.batchIdOutFieldName = protocol.batchIdOutFieldName;
    milestoning.dateTimeInFieldName = protocol.dateTimeInFieldName;
    milestoning.dateTimeOutFieldName = protocol.dateTimeOutFieldName;
    return milestoning;
  } else if (protocol instanceof V1_OpaqueTransactionMilestoning) {
    return new OpaqueTransactionMilestoning();
  }
  throw new GraphBuilderError(
    `Unrecognized transaction milestoning mode '${protocol}'`,
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
    milestoning.dateTimeFromFieldName = protocol.dateTimeFromFieldName;
    milestoning.dateTimeThruFieldName = protocol.dateTimeThruFieldName;
    milestoning.derivation = V1_buildValidityDerivation(
      protocol.derivation,
      context,
    );
    return milestoning;
  } else if (protocol instanceof V1_OpaqueValidityMilestoning) {
    return new OpaqueValidityMilestoning();
  }
  throw new GraphBuilderError(
    `Unrecognized validity milestoning mode '${protocol}'`,
  );
};

export const V1_buildValidityDerivation = (
  protocol: V1_ValidityDerivation,
  context: V1_GraphBuilderContext,
): ValidityDerivation => {
  if (protocol instanceof V1_SourceSpecifiesFromDateTime) {
    const derivation = new SourceSpecifiesFromDateTime();
    derivation.sourceDateTimeFromProperty = protocol.sourceDateTimeFromProperty;
    return derivation;
  } else if (protocol instanceof V1_SourceSpecifiesFromAndThruDateTime) {
    const derivation = new SourceSpecifiesFromAndThruDateTime();
    derivation.sourceDateTimeFromProperty = protocol.sourceDateTimeFromProperty;
    derivation.sourceDateTimeThruProperty = protocol.sourceDateTimeThruProperty;
    return derivation;
  }
  throw new GraphBuilderError(
    `Unrecognized validity derivation mode '${protocol}'`,
  );
};
