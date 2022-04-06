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
  V1_DuplicateCountDeduplicationStrategy,
  V1_EmailNotifyee,
  V1_FlatTarget,
  V1_IngestMode,
  V1_ManualTrigger,
  V1_MaxVersionDeduplicationStrategy,
  V1_MergeStrategy,
  V1_MultiFlatTarget,
  V1_MultiFlatTargetPart,
  V1_NoAuditing,
  V1_NoDeduplicationStrategy,
  V1_NoDeletesMergeStrategy,
  V1_NontemporalDelta,
  V1_NontemporalSnapshot,
  V1_Notifier,
  V1_Notifyee,
  V1_ObjectStorageSink,
  V1_PagerDutyNotifyee,
  type V1_Persistence,
  V1_Persister,
  V1_RelationalSink,
  V1_Sink,
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
  CronTrigger,
  DateTimeAuditing,
  DateTimeTransactionMilestoning,
  DateTimeValidityMilestoning,
  DeduplicationStrategy,
  DeleteIndicatorMergeStrategy,
  DuplicateCountDeduplicationStrategy,
  EmailNotifyee,
  FlatTarget,
  IngestMode,
  ManualTrigger,
  MaxVersionDeduplicationStrategy,
  MergeStrategy,
  MultiFlatTarget,
  MultiFlatTargetPart,
  NoAuditing,
  NoDeduplicationStrategy,
  NoDeletesMergeStrategy,
  NontemporalDelta,
  NontemporalSnapshot,
  Notifier,
  Notifyee,
  ObjectStorageSink,
  PagerDutyNotifyee,
  Persister,
  RelationalSink,
  Sink,
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
  Binding,
  Connection,
  GraphBuilderError,
  PackageableElementImplicitReference,
  V1_Connection,
  type V1_GraphBuilderContext,
} from '@finos/legend-graph';
import { V1_ProtocolToMetaModelConnectionBuilder } from '@finos/legend-graph/lib/models/protocols/pure/v1/transformation/pureGraph/to/V1_ProtocolToMetaModelConnectionBuilder';
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
  persistence.service = context.resolveService(protocol.service);
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
  if (protocol instanceof V1_CronTrigger) {
    const trigger = new CronTrigger();
    trigger.minutes = protocol.minutes;
    trigger.hours = protocol.hours;
    trigger.dayOfMonth = protocol.dayOfMonth;
    trigger.month = protocol.month;
    trigger.dayOfWeek = protocol.dayOfWeek;
    return new CronTrigger();
  } else if (protocol instanceof V1_ManualTrigger) {
    return new ManualTrigger();
  }
  throw new GraphBuilderError(`Unrecognized trigger '${protocol}'`);
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
    persister.sink = V1_buildSink(protocol.sink, context);
    return persister;
  } else if (protocol instanceof V1_BatchPersister) {
    const persister = new BatchPersister();
    persister.sink = V1_buildSink(protocol.sink, context);
    persister.ingestMode = V1_buildIngestMode(protocol.ingestMode, context);
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
 * sink
 **********/

export const V1_buildSink = (
  protocol: V1_Sink,
  context: V1_GraphBuilderContext,
): Sink => {
  if (protocol instanceof V1_RelationalSink) {
    return V1_buildRelationalSink(protocol, context);
  } else if (protocol instanceof V1_ObjectStorageSink) {
    return V1_buildObjectStorageSink(protocol, context);
  }
  throw new GraphBuilderError(`Unrecognized sink '${protocol}'`);
};

export const V1_buildRelationalSink = (
  protocol: V1_RelationalSink,
  context: V1_GraphBuilderContext,
): RelationalSink => {
  const sink = new RelationalSink();
  if (protocol.connection) {
    sink.connection = V1_buildConnection(protocol.connection, context);
  }
  return sink;
};

export const V1_buildObjectStorageSink = (
  protocol: V1_ObjectStorageSink,
  context: V1_GraphBuilderContext,
): ObjectStorageSink => {
  const sink = new ObjectStorageSink();
  sink.connection = V1_buildConnection(protocol.connection, context);
  sink.binding = context.resolveElement(
    protocol.binding,
    false,
  ) as PackageableElementImplicitReference<Binding>;
  return sink;
};

/**********
 * connection
 **********/

export const V1_buildConnection = (
  protocol: V1_Connection,
  context: V1_GraphBuilderContext,
): Connection => {
  return protocol.accept_ConnectionVisitor(
    new V1_ProtocolToMetaModelConnectionBuilder(context),
  );
};

/**********
 * target shape
 **********/

export const V1_buildTargetShape = (
  protocol: V1_TargetShape,
  context: V1_GraphBuilderContext,
): TargetShape => {
  if (protocol instanceof V1_FlatTarget) {
    return V1_buildFlatTarget(protocol, protocol.modelClass, context);
  } else if (protocol instanceof V1_MultiFlatTarget) {
    return V1_buildMultiFlatTarget(protocol, context);
  }
  throw new GraphBuilderError(`Unrecognized target shape '${protocol}'`);
};

export const V1_buildFlatTarget = (
  protocol: V1_FlatTarget,
  modelClass: string | undefined,
  context: V1_GraphBuilderContext,
): FlatTarget => {
  const targetShape = new FlatTarget();
  if (modelClass) {
    targetShape.modelClass = context.resolveClass(modelClass);
  }
  targetShape.targetName = guaranteeNonEmptyString(protocol.targetName);
  targetShape.partitionFields = protocol.partitionFields;
  targetShape.deduplicationStrategy = V1_buildDeduplicationStrategy(
    protocol.deduplicationStrategy,
    context,
  );

  return targetShape;
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
    strategy.versionField = protocol.versionField;
    return strategy;
  } else if (protocol instanceof V1_DuplicateCountDeduplicationStrategy) {
    const strategy = new DuplicateCountDeduplicationStrategy();
    strategy.duplicateCountName = protocol.duplicateCountName;
    return strategy;
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
    strategy.deleteField = protocol.deleteField;
    strategy.deleteValues = protocol.deleteValues;
    return strategy;
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
    auditing.dateTimeField = protocol.dateTimeField;
    return auditing;
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
    milestoning.batchIdInName = protocol.batchIdInName;
    milestoning.batchIdOutName = protocol.batchIdOutName;
    return milestoning;
  } else if (protocol instanceof V1_DateTimeTransactionMilestoning) {
    const milestoning = new DateTimeTransactionMilestoning();
    milestoning.dateTimeInName = protocol.dateTimeInName;
    milestoning.dateTimeOutName = protocol.dateTimeOutName;
    return milestoning;
  } else if (protocol instanceof V1_BatchIdAndDateTimeTransactionMilestoning) {
    const milestoning = new BatchIdAndDateTimeTransactionMilestoning();
    milestoning.batchIdInName = protocol.batchIdInName;
    milestoning.batchIdOutName = protocol.batchIdOutName;
    milestoning.dateTimeInName = protocol.dateTimeInName;
    milestoning.dateTimeOutName = protocol.dateTimeOutName;
    return milestoning;
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
    milestoning.dateTimeFromName = protocol.dateTimeFromName;
    milestoning.dateTimeThruName = protocol.dateTimeThruName;
    milestoning.derivation = V1_buildValidityDerivation(
      protocol.derivation,
      context,
    );
    return milestoning;
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
    derivation.sourceDateTimeFromField = protocol.sourceDateTimeFromField;
    return derivation;
  } else if (protocol instanceof V1_SourceSpecifiesFromAndThruDateTime) {
    const derivation = new SourceSpecifiesFromAndThruDateTime();
    derivation.sourceDateTimeFromField = protocol.sourceDateTimeFromField;
    derivation.sourceDateTimeThruField = protocol.sourceDateTimeThruField;
    return derivation;
  }
  throw new GraphBuilderError(
    `Unrecognized validity derivation mode '${protocol}'`,
  );
};
