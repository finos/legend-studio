import { type Hashable, hashArray } from '@finos/legend-shared';
import {
  V1_PackageableElement,
  type V1_PackageableElementVisitor,
} from '@finos/legend-graph';
import { PERSISTENCE_HASH_STRUCTURE } from '../../../../../../DSLPersistence_ModelUtils';

// ***********
// persistence pipe
// ***********

export class V1_PersistencePipe
  extends V1_PackageableElement
  implements Hashable
{
  documentation!: string;
  owners: string[] = [];
  trigger!: V1_Trigger;
  reader!: V1_Reader;

  accept_PackageableElementVisitor<T>(
    visitor: V1_PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_PackageableElement(this);
  }
}

// ***********
// trigger
// ***********

export abstract class V1_Trigger implements Hashable {
  private readonly _$nominalTypeBrand!: 'V1_Trigger';

  abstract get hashCode(): string;
}

export class V1_OpaqueTrigger extends V1_Trigger implements Hashable {
  override get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.OPAQUE_TRIGGER]);
  }
}

// ***********
// reader
// ***********

export abstract class V1_Reader implements Hashable {
  private readonly _$nominalTypeBrand!: 'V1_Reader';

  abstract get hashCode(): string;
}

export class V1_ServiceReader extends V1_Reader implements Hashable {
  service!: string;

  override get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.SERVICE_READER, this.service]);
  }
}

// ***********
// persister
// ***********

export abstract class V1_Persister implements Hashable {
  private readonly _$nominalTypeBrand!: 'V1_Persister';

  abstract get hashCode(): string;
}

export class V1_StreamingPersister extends V1_Persister implements Hashable {
  override get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.STREAMING_PERSISTER]);
  }
}

export class V1_BatchPersister extends V1_Persister implements Hashable {
  targetSpecification!: V1_TargetSpecification;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.BATCH_PERSISTER,
      this.targetSpecification,
    ]);
  }
}

// ***********
// target specification
// ***********

export abstract class V1_TargetSpecification implements Hashable {
  modelClass!: string;

  get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.TARGET_SPECIFICATION,
      this.modelClass,
    ]);
  }
}

export class V1_GroupedFlatTargetSpecification
  extends V1_TargetSpecification
  implements Hashable
{
  transactionScope!: V1_TransactionScope;
  components: V1_PropertyAndFlatTargetSpecification[] = [];

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.GROUPED_FLAT_TARGET_SPECIFICATION,
      super.hashCode,
      this.transactionScope,
      hashArray(this.components),
    ]);
  }
}

export enum V1_TransactionScope {
  SINGLE_TARGET = 'SINGLE_TARGET',
  ALL_TARGETS = 'ALL_TARGETS',
}

export class V1_PropertyAndFlatTargetSpecification implements Hashable {
  property!: string;
  targetSpecification!: V1_FlatTargetSpecification;

  get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.PROPERTY_AND_FLAT_TARGET_SPECIFICATION,
      this.property,
      this.targetSpecification,
    ]);
  }
}

export class V1_FlatTargetSpecification
  extends V1_TargetSpecification
  implements Hashable
{
  targetName!: string;
  partitionProperties: string[] = [];
  deduplicationStrategy!: V1_DeduplicationStrategy;
  batchMilestoningMode!: V1_BatchMilestoningMode;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.FLAT_TARGET_SPECIFICATION,
      super.hashCode,
      hashArray(this.partitionProperties),
      this.deduplicationStrategy,
      this.batchMilestoningMode,
    ]);
  }
}

export abstract class V1_DeduplicationStrategy implements Hashable {
  private readonly _$nominalTypeBrand!: 'V1_DeduplicationStrategy';

  abstract get hashCode(): string;
}

export abstract class V1_BatchMilestoningMode implements Hashable {
  private readonly _$nominalTypeBrand!: 'V1_BatchMilestoningMode';

  abstract get hashCode(): string;
}
