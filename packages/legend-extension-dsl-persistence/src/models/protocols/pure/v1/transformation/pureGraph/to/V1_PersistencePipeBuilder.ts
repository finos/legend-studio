import {
  type V1_PersistencePipe,
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
import { getPersistencePipe } from '../../../../../../../graphManager/DSLPersistence_GraphManagerHelper';
import {
  type V1_GraphBuilderContext,
  GraphBuilderError,
} from '@finos/legend-graph';
import { guaranteeNonEmptyString } from '@finos/legend-shared';
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

export const V1_buildPersistencePipe = (
  pipeProtocol: V1_PersistencePipe,
  context: V1_GraphBuilderContext,
): void => {
  const path = context.graph.buildPath(pipeProtocol.package, pipeProtocol.name);

  const pipe = getPersistencePipe(path, context.graph);
  pipe.documentation = guaranteeNonEmptyString(
    pipeProtocol.documentation,
    `Persistence pipe 'documentation' field is missing or empty`,
  );
  pipe.owners = pipeProtocol.owners;
  pipe.trigger = V1_buildTrigger(pipeProtocol.trigger, context);
  pipe.reader = V1_buildReader(pipeProtocol.reader, context);
  pipe.persister = V1_buildPersister(pipeProtocol.persister, context);
};

/**********
 * trigger
 **********/

export const V1_buildTrigger = (
  triggerProtocol: V1_Trigger,
  context: V1_GraphBuilderContext,
): Trigger => {
  if (triggerProtocol instanceof V1_OpaqueTrigger) {
    return new OpaqueTrigger();
  }
  throw new GraphBuilderError(
    `Unrecognized trigger subtype '${typeof triggerProtocol}'`,
  );
};

/**********
 * reader
 **********/

export const V1_buildReader = (
  readerProtocol: V1_Reader,
  context: V1_GraphBuilderContext,
): Reader => {
  if (readerProtocol instanceof V1_ServiceReader) {
    const reader = new ServiceReader();
    reader.service = context.resolveService(readerProtocol.service);
    return reader;
  }
  throw new GraphBuilderError(
    `Unrecognized reader subtype '${typeof readerProtocol}'`,
  );
};

/**********
 * persister
 **********/

export const V1_buildPersister = (
  persisterProtocol: V1_Persister,
  context: V1_GraphBuilderContext,
): Persister => {
  if (persisterProtocol instanceof V1_StreamingPersister) {
    return new StreamingPersister();
  } else if (persisterProtocol instanceof V1_BatchPersister) {
    const persister = new BatchPersister();
    persister.targetSpecification = V1_buildTargetSpecification(
      persisterProtocol.targetSpecification,
      context,
    );
  }
  throw new GraphBuilderError(
    `Unrecognized persister subtype '${typeof persisterProtocol}'`,
  );
};

/**********
 * target specification
 **********/

export const V1_buildTargetSpecification = (
  targetSpecificationProtocol: V1_TargetSpecification,
  context: V1_GraphBuilderContext,
): TargetSpecification => {
  if (
    targetSpecificationProtocol instanceof V1_GroupedFlatTargetSpecification
  ) {
    return V1_buildGroupedFlatTargetSpecification(
      targetSpecificationProtocol,
      context,
    );
  } else if (
    targetSpecificationProtocol instanceof V1_FlatTargetSpecification
  ) {
    return V1_buildFlatTargetSpecification(
      targetSpecificationProtocol,
      context,
    );
  } else if (
    targetSpecificationProtocol instanceof V1_NestedTargetSpecification
  ) {
    return V1_buildNestedTargetSpecification(
      targetSpecificationProtocol,
      context,
    );
  }
  throw new GraphBuilderError(
    `Unrecognized target specification subtype '${typeof targetSpecificationProtocol}'`,
  );
};

export const V1_buildGroupedFlatTargetSpecification = (
  targetSpecificationProtocol: V1_GroupedFlatTargetSpecification,
  context: V1_GraphBuilderContext,
): GroupedFlatTargetSpecification => {
  const targetSpecification = new GroupedFlatTargetSpecification();
  targetSpecification.modelClass = context.resolveClass(
    targetSpecificationProtocol.modelClass,
  );
  targetSpecification.transactionScope = V1_buildTransactionScope(
    targetSpecificationProtocol.transactionScope,
    context,
  );
  targetSpecification.components = targetSpecificationProtocol.components.map(
    (c) => V1_buildPropertyAndFlatTargetSpecification(c, context),
  );
  return targetSpecification;
};

export const V1_buildFlatTargetSpecification = (
  targetSpecificationProtocol: V1_FlatTargetSpecification,
  context: V1_GraphBuilderContext,
): FlatTargetSpecification => {
  const targetSpecification = new FlatTargetSpecification();
  targetSpecification.modelClass = context.resolveClass(
    targetSpecificationProtocol.modelClass,
  );
  targetSpecification.targetName = guaranteeNonEmptyString(
    targetSpecificationProtocol.targetName,
  );
  targetSpecification.partitionProperties =
    targetSpecificationProtocol.partitionProperties;
  targetSpecification.deduplicationStrategy = V1_buildDeduplicationStrategy(
    targetSpecificationProtocol.deduplicationStrategy,
    context,
  );
  targetSpecification.batchMilestoningMode = V1_buildBatchMilestoningMode(
    targetSpecificationProtocol.batchMode,
    context,
  );
  return targetSpecification;
};

export const V1_buildNestedTargetSpecification = (
  targetSpecificationProtocol: V1_NestedTargetSpecification,
  context: V1_GraphBuilderContext,
): NestedTargetSpecification => {
  const targetSpecification = new NestedTargetSpecification();
  targetSpecification.modelClass = context.resolveClass(
    targetSpecificationProtocol.modelClass,
  );
  targetSpecification.targetName = guaranteeNonEmptyString(
    targetSpecificationProtocol.targetName,
  );
  return targetSpecification;
};

export const V1_buildTransactionScope = (
  transactionScopeProtocol: V1_TransactionScope,
  context: V1_GraphBuilderContext,
): TransactionScope => {
  if (transactionScopeProtocol === V1_TransactionScope.SINGLE_TARGET) {
    return TransactionScope.SINGLE_TARGET;
  } else if (transactionScopeProtocol === V1_TransactionScope.ALL_TARGETS) {
    return TransactionScope.ALL_TARGETS;
  }
  throw new GraphBuilderError(
    `Unrecognized transaction scope '${transactionScopeProtocol}'`,
  );
};

export const V1_buildPropertyAndFlatTargetSpecification = (
  propertyAndFlatTargetSpecificationProtocol: V1_PropertyAndFlatTargetSpecification,
  context: V1_GraphBuilderContext,
): PropertyAndFlatTargetSpecification => {
  //TODO: ledav -- validate property exists on model class
  const propertyAndTargetSpec = new PropertyAndFlatTargetSpecification();
  propertyAndTargetSpec.property =
    propertyAndFlatTargetSpecificationProtocol.property;
  propertyAndTargetSpec.targetSpecification = V1_buildFlatTargetSpecification(
    propertyAndFlatTargetSpecificationProtocol.targetSpecification,
    context,
  );
  return propertyAndTargetSpec;
};

/**********
 * deduplication strategy
 **********/

export const V1_buildDeduplicationStrategy = (
  deduplicationStrategyProtocol: V1_DeduplicationStrategy,
  context: V1_GraphBuilderContext,
): DeduplicationStrategy => {
  if (deduplicationStrategyProtocol instanceof V1_NoDeduplicationStrategy) {
    return new NoDeduplicationStrategy();
  } else if (
    deduplicationStrategyProtocol instanceof V1_AnyVersionDeduplicationStrategy
  ) {
    return new AnyVersionDeduplicationStrategy();
  } else if (
    deduplicationStrategyProtocol instanceof V1_MaxVersionDeduplicationStrategy
  ) {
    //TODO: ledav -- validate property exists on model class
    const strategy = new MaxVersionDeduplicationStrategy();
    strategy.versionProperty = deduplicationStrategyProtocol.versionProperty;
    return strategy;
  } else if (
    deduplicationStrategyProtocol instanceof V1_OpaqueDeduplicationStrategy
  ) {
    return new OpaqueDeduplicationStrategy();
  }
  throw new GraphBuilderError(
    `Unrecognized deduplication strategy '${deduplicationStrategyProtocol}'`,
  );
};

/**********
 * batch mode
 **********/

export const V1_buildBatchMilestoningMode = (
  batchModeProtocol: V1_BatchMilestoningMode,
  context: V1_GraphBuilderContext,
): BatchMilestoningMode => {
  if (batchModeProtocol instanceof V1_NonMilestonedSnapshot) {
    const batchMode = new NonMilestonedSnapshot();
    batchMode.auditing = V1_buildAuditing(batchModeProtocol.auditing, context);
    return batchMode;
  } else if (batchModeProtocol instanceof V1_UnitemporalSnapshot) {
    const batchMode = new UnitemporalSnapshot();
    batchMode.transactionMilestoning = V1_buildTransactionMilestoning(
      batchModeProtocol.transactionMilestoning,
      context,
    );
    return batchMode;
  } else if (batchModeProtocol instanceof V1_BitemporalSnapshot) {
    const batchMode = new BitemporalSnapshot();
    batchMode.transactionMilestoning = V1_buildTransactionMilestoning(
      batchModeProtocol.transactionMilestoning,
      context,
    );
    batchMode.validityMilestoning = V1_buildValidityMilestoning(
      batchModeProtocol.validityMilestoning,
      context,
    );
    batchMode.validityDerivation = V1_buildValidityDerivation(
      batchModeProtocol.validityDerivation,
      context,
    );
    return batchMode;
  } else if (batchModeProtocol instanceof V1_NonMilestonedDelta) {
    const batchMode = new NonMilestonedDelta();
    batchMode.auditing = V1_buildAuditing(batchModeProtocol.auditing, context);
    return batchMode;
  } else if (batchModeProtocol instanceof V1_UnitemporalDelta) {
    const batchMode = new UnitemporalDelta();
    batchMode.mergeStrategy = V1_buildMergeStrategy(
      batchModeProtocol.mergeStrategy,
      context,
    );
    batchMode.transactionMilestoning = V1_buildTransactionMilestoning(
      batchModeProtocol.transactionMilestoning,
      context,
    );
    return batchMode;
  } else if (batchModeProtocol instanceof V1_BitemporalDelta) {
    const batchMode = new BitemporalDelta();
    batchMode.mergeStrategy = V1_buildMergeStrategy(
      batchModeProtocol.mergeStrategy,
      context,
    );
    batchMode.transactionMilestoning = V1_buildTransactionMilestoning(
      batchModeProtocol.transactionMilestoning,
      context,
    );
    batchMode.validityMilestoning = V1_buildValidityMilestoning(
      batchModeProtocol.validityMilestoning,
      context,
    );
    batchMode.validityDerivation = V1_buildValidityDerivation(
      batchModeProtocol.validityDerivation,
      context,
    );
    return batchMode;
  } else if (batchModeProtocol instanceof V1_AppendOnly) {
    const batchMode = new AppendOnly();
    batchMode.auditing = V1_buildAuditing(batchModeProtocol.auditing, context);
    return batchMode;
  }
  throw new GraphBuilderError(
    `Unrecognized batch milestoning mode '${batchModeProtocol}'`,
  );
};

// merge strategy

export const V1_buildMergeStrategy = (
  mergeStratgyProtocol: V1_MergeStrategy,
  context: V1_GraphBuilderContext,
): MergeStrategy => {
  if (mergeStratgyProtocol instanceof V1_NoDeletesMergeStrategy) {
    return new NoDeletesMergeStrategy();
  } else if (mergeStratgyProtocol instanceof V1_DeleteIndicatorMergeStrategy) {
    //TODO: ledav -- validate property exists on model class
    const strategy = new DeleteIndicatorMergeStrategy();
    strategy.deleteProperty = mergeStratgyProtocol.deleteProperty;
    strategy.deleteValues = mergeStratgyProtocol.deleteValues;
    return strategy;
  } else if (mergeStratgyProtocol instanceof V1_OpaqueMergeStrategy) {
    return new OpaqueMergeStrategy();
  }
  throw new GraphBuilderError(
    `Unrecognized merge strategy '${mergeStratgyProtocol}'`,
  );
};

/**********
 * auditing
 **********/

export const V1_buildAuditing = (
  auditingProtocol: V1_Auditing,
  context: V1_GraphBuilderContext,
): Auditing => {
  if (auditingProtocol instanceof V1_NoAuditing) {
    return new NoAuditing();
  } else if (auditingProtocol instanceof V1_BatchDateTimeAuditing) {
    //TODO: ledav -- validate property exists on model class
    const auditing = new BatchDateTimeAuditing();
    auditing.dateTimeProperty = auditingProtocol.dateTimeProperty;
    return auditing;
  } else if (auditingProtocol instanceof V1_OpaqueAuditing) {
    return new OpaqueAuditing();
  }
  throw new GraphBuilderError(
    `Unrecognized auditing mode '${auditingProtocol}'`,
  );
};

/**********
 * transaction milestoning
 **********/

export const V1_buildTransactionMilestoning = (
  milestoningProtocol: V1_TransactionMilestoning,
  context: V1_GraphBuilderContext,
): TransactionMilestoning => {
  //TODO: ledav -- validate property exists on model class
  if (milestoningProtocol instanceof V1_BatchIdTransactionMilestoning) {
    const milestoning = new BatchIdTransactionMilestoning();
    milestoning.batchIdInName = milestoningProtocol.batchIdInName;
    milestoning.batchIdOutName = milestoningProtocol.batchIdOutName;
    return milestoning;
  } else if (milestoningProtocol instanceof V1_DateTimeTransactionMilestoning) {
    const milestoning = new DateTimeTransactionMilestoning();
    milestoning.dateTimeInName = milestoningProtocol.dateTimeInName;
    milestoning.dateTimeOutName = milestoningProtocol.dateTimeOutName;
    return milestoning;
  } else if (
    milestoningProtocol instanceof V1_BatchIdAndDateTimeTransactionMilestoning
  ) {
    const milestoning = new BatchIdAndDateTimeTransactionMilestoning();
    milestoning.batchIdInName = milestoningProtocol.batchIdInName;
    milestoning.batchIdOutName = milestoningProtocol.batchIdOutName;
    milestoning.dateTimeInName = milestoningProtocol.dateTimeInName;
    milestoning.dateTimeOutName = milestoningProtocol.dateTimeOutName;
    return milestoning;
  } else if (milestoningProtocol instanceof V1_OpaqueTransactionMilestoning) {
    return new OpaqueTransactionMilestoning();
  }
  throw new GraphBuilderError(
    `Unrecognized transaction milestoning mode '${milestoningProtocol}'`,
  );
};

/**********
 * validity milestoning
 **********/

export const V1_buildValidityMilestoning = (
  milestoningProtocol: V1_ValidityMilestoning,
  context: V1_GraphBuilderContext,
): ValidityMilestoning => {
  //TODO: ledav -- validate property exists on model class
  if (milestoningProtocol instanceof V1_DateTimeValidityMilestoning) {
    const milestoning = new DateTimeValidityMilestoning();
    milestoning.dateTimeFromName = milestoningProtocol.dateTimeFromName;
    milestoning.dateTimeThruName = milestoningProtocol.dateTimeThruName;
    return milestoning;
  } else if (milestoningProtocol instanceof V1_OpaqueValidityMilestoning) {
    return new OpaqueValidityMilestoning();
  }
  throw new GraphBuilderError(
    `Unrecognized validity milestoning mode '${milestoningProtocol}'`,
  );
};

export const V1_buildValidityDerivation = (
  derivationProtocol: V1_ValidityDerivation,
  context: V1_GraphBuilderContext,
): ValidityDerivation => {
  if (derivationProtocol instanceof V1_SourceSpecifiesFromDateTime) {
    const derivation = new SourceSpecifiesFromDateTime();
    derivation.sourceDateTimeFromProperty =
      derivationProtocol.sourceDateTimeFromProperty;
    return derivation;
  } else if (
    derivationProtocol instanceof V1_SourceSpecifiesFromAndThruDateTime
  ) {
    const derivation = new SourceSpecifiesFromAndThruDateTime();
    derivation.sourceDateTimeFromProperty =
      derivationProtocol.sourceDateTimeFromProperty;
    derivation.sourceDateTimeThruProperty =
      derivationProtocol.sourceDateTimeThruProperty;
    return derivation;
  }
  throw new GraphBuilderError(
    `Unrecognized validity derivation mode '${derivationProtocol}'`,
  );
};
