import type { V1_PersistencePipe } from '../../../model/packageableElements/persistence/V1_Persistence';
import {
  V1_BatchMilestoningMode,
  V1_BatchPersister,
  V1_DeduplicationStrategy,
  V1_FlatTargetSpecification,
  V1_GroupedFlatTargetSpecification,
  V1_NestedTargetSpecification,
  V1_OpaqueTrigger,
  V1_Persister,
  V1_PropertyAndFlatTargetSpecification,
  V1_Reader,
  V1_ServiceReader,
  V1_StreamingPersister,
  V1_TargetSpecification,
  V1_TransactionScope,
  V1_Trigger,
} from '../../../model/packageableElements/persistence/V1_Persistence';
import { getPersistencePipe } from '../../../../../../../graphManager/DSLPersistence_GraphManagerHelper';
import type { V1_GraphBuilderContext } from '@finos/legend-graph';
import { GraphBuilderError } from '@finos/legend-graph';
import { guaranteeNonEmptyString } from '@finos/legend-shared';
import {
  BatchMilestoningMode,
  BatchPersister,
  DeduplicationStrategy,
  FlatTargetSpecification,
  GroupedFlatTargetSpecification,
  NestedTargetSpecification,
  OpaqueTrigger,
  Persister,
  PropertyAndFlatTargetSpecification,
  Reader,
  ServiceReader,
  StreamingPersister,
  TargetSpecification,
  TransactionScope,
  Trigger,
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
  const propertyAndFlatTargetSpecification =
    new PropertyAndFlatTargetSpecification();
  //TODO: ledav -- validate property exists on model class
  propertyAndFlatTargetSpecification.property =
    propertyAndFlatTargetSpecificationProtocol.property;
  propertyAndFlatTargetSpecification.targetSpecification =
    V1_buildFlatTargetSpecification(
      propertyAndFlatTargetSpecificationProtocol.targetSpecification,
      context,
    );
  return propertyAndFlatTargetSpecification;
};

/**********
 * deduplication strategy
 **********/

export const V1_buildDeduplicationStrategy = (
  deduplicationStrategyProtocol: V1_DeduplicationStrategy,
  context: V1_GraphBuilderContext,
): DeduplicationStrategy => {
  throw new GraphBuilderError(
    `Unrecognized deduplication strategy '${deduplicationStrategyProtocol}'`,
  );
};

/**********
 * batch mode
 **********/

export const V1_buildBatchMilestoningMode = (
  batchMilestoningModeProtocol: V1_BatchMilestoningMode,
  context: V1_GraphBuilderContext,
): BatchMilestoningMode => {
  throw new GraphBuilderError(
    `Unrecognized batch milestoning mode '${batchMilestoningModeProtocol}'`,
  );
};
