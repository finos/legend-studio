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
  type V1_PersistencePipe,
  V1_Persister,
  V1_PropertyAndFlatTargetSpecification,
  V1_Reader,
  V1_ServiceReader,
  V1_SourceSpecifiesFromAndThruDateTime,
  V1_SourceSpecifiesFromDateTime,
  V1_StreamingPersister,
  V1_TargetSpecification,
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
  MaxVersionDeduplicationStrategy,
  MergeStrategy,
  NestedTargetSpecification,
  NoAuditing,
  NoDeduplicationStrategy,
  NoDeletesMergeStrategy,
  NonMilestonedDelta,
  NonMilestonedSnapshot,
  OpaqueAuditing,
  OpaqueDeduplicationStrategy,
  OpaqueMergeStrategy,
  OpaqueTransactionMilestoning,
  OpaqueTrigger,
  OpaqueValidityMilestoning,
  Persister,
  PropertyAndFlatTargetSpecification,
  Reader,
  ServiceReader,
  SourceSpecifiesFromAndThruDateTime,
  SourceSpecifiesFromDateTime,
  StreamingPersister,
  TargetSpecification,
  TransactionMilestoning,
  TransactionScope,
  Trigger,
  UnitemporalDelta,
  UnitemporalSnapshot,
  ValidityDerivation,
  ValidityMilestoning,
} from '../../../../../../metamodels/pure/model/packageableElements/persistence/Persistence';
import { getPersistencePipe } from '../../../../../../../graphManager/DSLPersistence_GraphManagerHelper';
import {
  GraphBuilderError,
  type V1_GraphBuilderContext,
} from '@finos/legend-graph';
import { guaranteeNonEmptyString } from '@finos/legend-shared';

/**********
 * pipe
 **********/

export const V1_buildPersistencePipe = (
  protocol: V1_PersistencePipe,
  context: V1_GraphBuilderContext,
): void => {
  const path = context.graph.buildPath(protocol.package, protocol.name);
  const pipe = getPersistencePipe(path, context.graph);
  pipe.documentation = guaranteeNonEmptyString(
    protocol.documentation,
    `Persistence pipe 'documentation' field is missing or empty`,
  );
  pipe.owners = protocol.owners;
  pipe.trigger = V1_buildTrigger(protocol.trigger, context);
  pipe.reader = V1_buildReader(protocol.reader, context);
  pipe.persister = V1_buildPersister(protocol.persister, context);
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
  }
  throw new GraphBuilderError(`Unrecognized trigger '${typeof protocol}'`);
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
  throw new GraphBuilderError(`Unrecognized reader '${typeof protocol}'`);
};

/**********
 * persister
 **********/

export const V1_buildPersister = (
  protocol: V1_Persister,
  context: V1_GraphBuilderContext,
): Persister => {
  if (protocol instanceof V1_StreamingPersister) {
    return new StreamingPersister();
  } else if (protocol instanceof V1_BatchPersister) {
    const persister = new BatchPersister();
    persister.targetSpecification = V1_buildTargetSpecification(
      protocol.targetSpecification,
      context,
    );
    return persister;
  }
  throw new GraphBuilderError(`Unrecognized persister '${typeof protocol}'`);
};

/**********
 * target specification
 **********/

export const V1_buildTargetSpecification = (
  protocol: V1_TargetSpecification,
  context: V1_GraphBuilderContext,
): TargetSpecification => {
  if (protocol instanceof V1_GroupedFlatTargetSpecification) {
    return V1_buildGroupedFlatTargetSpecification(protocol, context);
  } else if (protocol instanceof V1_FlatTargetSpecification) {
    return V1_buildFlatTargetSpecification(protocol, context);
  } else if (protocol instanceof V1_NestedTargetSpecification) {
    return V1_buildNestedTargetSpecification(protocol, context);
  }
  throw new GraphBuilderError(
    `Unrecognized target specification '${typeof protocol}'`,
  );
};

export const V1_buildGroupedFlatTargetSpecification = (
  protocol: V1_GroupedFlatTargetSpecification,
  context: V1_GraphBuilderContext,
): GroupedFlatTargetSpecification => {
  const targetSpecification = new GroupedFlatTargetSpecification();
  targetSpecification.modelClass = context.resolveClass(protocol.modelClass);
  targetSpecification.transactionScope = V1_buildTransactionScope(
    protocol.transactionScope,
    context,
  );
  targetSpecification.components = protocol.components.map((c) =>
    V1_buildPropertyAndFlatTargetSpecification(c, context),
  );
  return targetSpecification;
};

export const V1_buildFlatTargetSpecification = (
  protocol: V1_FlatTargetSpecification,
  context: V1_GraphBuilderContext,
): FlatTargetSpecification => {
  const targetSpecification = new FlatTargetSpecification();
  targetSpecification.modelClass = context.resolveClass(protocol.modelClass);
  targetSpecification.targetName = guaranteeNonEmptyString(protocol.targetName);
  targetSpecification.partitionProperties = protocol.partitionProperties;
  targetSpecification.deduplicationStrategy = V1_buildDeduplicationStrategy(
    protocol.deduplicationStrategy,
    context,
  );
  targetSpecification.batchMilestoningMode = V1_buildBatchMilestoningMode(
    protocol.batchMode,
    context,
  );
  return targetSpecification;
};

export const V1_buildNestedTargetSpecification = (
  protocol: V1_NestedTargetSpecification,
  context: V1_GraphBuilderContext,
): NestedTargetSpecification => {
  const targetSpecification = new NestedTargetSpecification();
  targetSpecification.modelClass = context.resolveClass(protocol.modelClass);
  targetSpecification.targetName = guaranteeNonEmptyString(protocol.targetName);
  return targetSpecification;
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

export const V1_buildPropertyAndFlatTargetSpecification = (
  protocol: V1_PropertyAndFlatTargetSpecification,
  context: V1_GraphBuilderContext,
): PropertyAndFlatTargetSpecification => {
  //TODO: ledav -- validate property exists on model class
  const specification = new PropertyAndFlatTargetSpecification();
  specification.property = protocol.property;
  specification.targetSpecification = V1_buildFlatTargetSpecification(
    protocol.targetSpecification,
    context,
  );
  return specification;
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
    //TODO: ledav -- validate property exists on model class
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
 * batch mode
 **********/

export const V1_buildBatchMilestoningMode = (
  protocol: V1_BatchMilestoningMode,
  context: V1_GraphBuilderContext,
): BatchMilestoningMode => {
  if (protocol instanceof V1_NonMilestonedSnapshot) {
    const batchMode = new NonMilestonedSnapshot();
    batchMode.auditing = V1_buildAuditing(protocol.auditing, context);
    return batchMode;
  } else if (protocol instanceof V1_UnitemporalSnapshot) {
    const batchMode = new UnitemporalSnapshot();
    batchMode.transactionMilestoning = V1_buildTransactionMilestoning(
      protocol.transactionMilestoning,
      context,
    );
    return batchMode;
  } else if (protocol instanceof V1_BitemporalSnapshot) {
    const batchMode = new BitemporalSnapshot();
    batchMode.transactionMilestoning = V1_buildTransactionMilestoning(
      protocol.transactionMilestoning,
      context,
    );
    batchMode.validityMilestoning = V1_buildValidityMilestoning(
      protocol.validityMilestoning,
      context,
    );
    batchMode.validityDerivation = V1_buildValidityDerivation(
      protocol.validityDerivation,
      context,
    );
    return batchMode;
  } else if (protocol instanceof V1_NonMilestonedDelta) {
    const batchMode = new NonMilestonedDelta();
    batchMode.auditing = V1_buildAuditing(protocol.auditing, context);
    return batchMode;
  } else if (protocol instanceof V1_UnitemporalDelta) {
    const batchMode = new UnitemporalDelta();
    batchMode.mergeStrategy = V1_buildMergeStrategy(
      protocol.mergeStrategy,
      context,
    );
    batchMode.transactionMilestoning = V1_buildTransactionMilestoning(
      protocol.transactionMilestoning,
      context,
    );
    return batchMode;
  } else if (protocol instanceof V1_BitemporalDelta) {
    const batchMode = new BitemporalDelta();
    batchMode.mergeStrategy = V1_buildMergeStrategy(
      protocol.mergeStrategy,
      context,
    );
    batchMode.transactionMilestoning = V1_buildTransactionMilestoning(
      protocol.transactionMilestoning,
      context,
    );
    batchMode.validityMilestoning = V1_buildValidityMilestoning(
      protocol.validityMilestoning,
      context,
    );
    batchMode.validityDerivation = V1_buildValidityDerivation(
      protocol.validityDerivation,
      context,
    );
    return batchMode;
  } else if (protocol instanceof V1_AppendOnly) {
    const batchMode = new AppendOnly();
    batchMode.auditing = V1_buildAuditing(protocol.auditing, context);
    return batchMode;
  }
  throw new GraphBuilderError(
    `Unrecognized batch milestoning mode '${protocol}'`,
  );
};

// merge strategy

export const V1_buildMergeStrategy = (
  protocol: V1_MergeStrategy,
  context: V1_GraphBuilderContext,
): MergeStrategy => {
  if (protocol instanceof V1_NoDeletesMergeStrategy) {
    return new NoDeletesMergeStrategy();
  } else if (protocol instanceof V1_DeleteIndicatorMergeStrategy) {
    //TODO: ledav -- validate property exists on model class
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
  } else if (protocol instanceof V1_BatchDateTimeAuditing) {
    //TODO: ledav -- validate property exists on model class
    const auditing = new BatchDateTimeAuditing();
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
  //TODO: ledav -- validate property exists on model class
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
  //TODO: ledav -- validate property exists on model class
  if (protocol instanceof V1_DateTimeValidityMilestoning) {
    const milestoning = new DateTimeValidityMilestoning();
    milestoning.dateTimeFromName = protocol.dateTimeFromName;
    milestoning.dateTimeThruName = protocol.dateTimeThruName;
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
