import { type Hashable, hashArray } from '@finos/legend-shared';
import {
  type V1_PackageableElementVisitor,
  V1_PackageableElement,
} from '@finos/legend-graph';
import { PERSISTENCE_HASH_STRUCTURE } from '../../../../../../DSLPersistence_ModelUtils';

/**********
 * persistence pipe
 **********/

export class V1_PersistencePipe
  extends V1_PackageableElement
  implements Hashable
{
  documentation!: string;
  owners: string[] = [];
  trigger!: V1_Trigger;
  reader!: V1_Reader;
  persister!: V1_Persister;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.PERSISTENCE_PIPE,
      this.documentation,
      hashArray(this.owners),
      this.trigger,
      this.reader,
      this.persister,
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: V1_PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_PackageableElement(this);
  }
}

/**********
 * trigger
 **********/

export abstract class V1_Trigger implements Hashable {
  private readonly _$nominalTypeBrand!: 'V1_Trigger';

  abstract get hashCode(): string;
}

export class V1_OpaqueTrigger extends V1_Trigger implements Hashable {
  override get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.OPAQUE_TRIGGER]);
  }
}

/**********
 * reader
 **********/

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

/**********
 * persister
 **********/

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

/**********
 * target specification
 **********/

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
      this.targetName,
      hashArray(this.partitionProperties),
      this.deduplicationStrategy,
      this.batchMilestoningMode,
    ]);
  }
}

export class V1_NestedTargetSpecification
  extends V1_TargetSpecification
  implements Hashable
{
  targetName!: string;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.NESTED_TARGET_SPECIFICATION,
      super.hashCode,
      this.targetName,
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

/**********
 * deduplication strategy
 **********/

export abstract class V1_DeduplicationStrategy implements Hashable {
  private readonly _$nominalTypeBrand!: 'V1_DeduplicationStrategy';

  abstract get hashCode(): string;
}

export class V1_NoDeduplicationStrategy
  extends V1_DeduplicationStrategy
  implements Hashable
{
  override get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.NO_DEDUPLICATION_STRATEGY]);
  }
}

export class V1_AnyVersionDeduplicationStrategy
  extends V1_DeduplicationStrategy
  implements Hashable
{
  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.ANY_VERSION_DEDUPLICATION_STRATEGY,
    ]);
  }
}

export class V1_MaxVersionDeduplicationStrategy
  extends V1_DeduplicationStrategy
  implements Hashable
{
  versionProperty!: string;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.MAX_VERSION_DEDUPLICATION_STRATEGY,
      this.versionProperty,
    ]);
  }
}

export class V1_OpaqueDeduplicationStrategy
  extends V1_DeduplicationStrategy
  implements Hashable
{
  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.OPAQUE_DEDUPLICATION_STRATEGY,
    ]);
  }
}

/**********
 * batch mode
 **********/

export abstract class V1_BatchMilestoningMode implements Hashable {
  private readonly _$nominalTypeBrand!: 'V1_BatchMilestoningMode';

  abstract get hashCode(): string;
}

/**********
 * batch mode - snapshot
 **********/

export class V1_NonMilestonedSnapshot
  extends V1_BatchMilestoningMode
  implements Hashable
{
  auditing!: V1_Auditing;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.NON_MILESTONED_SNAPSHOT,
      this.auditing,
    ]);
  }
}

export class V1_UnitemporalSnapshot
  extends V1_BatchMilestoningMode
  implements Hashable
{
  transactionMilestoning!: V1_TransactionMilestoning;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.UNITEMPORAL_SNAPSHOT,
      this.transactionMilestoning,
    ]);
  }
}

export class V1_BitemporalSnapshot
  extends V1_BatchMilestoningMode
  implements Hashable
{
  transactionMilestoning!: V1_TransactionMilestoning;
  validityMilestoning!: V1_ValidityMilestoning;
  validityDerivation!: V1_ValidityDerivation;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.BITEMPORAL_SNAPSHOT,
      this.transactionMilestoning,
      this.validityMilestoning,
      this.validityDerivation,
    ]);
  }
}

/**********
 * batch mode - delta
 **********/

export class V1_NonMilestonedDelta
  extends V1_BatchMilestoningMode
  implements Hashable
{
  auditing!: V1_Auditing;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.NON_MILESTONED_DELTA,
      this.auditing,
    ]);
  }
}

export class V1_UnitemporalDelta
  extends V1_BatchMilestoningMode
  implements Hashable
{
  mergeStrategy!: V1_MergeStrategy;
  transactionMilestoning!: V1_TransactionMilestoning;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.UNITEMPORAL_DELTA,
      this.mergeStrategy,
      this.transactionMilestoning,
    ]);
  }
}

export class V1_BitemporalDelta
  extends V1_BatchMilestoningMode
  implements Hashable
{
  mergeStrategy!: V1_MergeStrategy;
  transactionMilestoning!: V1_TransactionMilestoning;
  validityMilestoning!: V1_ValidityMilestoning;
  validityDerivation!: V1_ValidityDerivation;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.BITEMPORAL_DELTA,
      this.mergeStrategy,
      this.transactionMilestoning,
      this.validityMilestoning,
      this.validityDerivation,
    ]);
  }
}

// merge strategy

export abstract class V1_MergeStrategy implements Hashable {
  private readonly _$nominalTypeBrand!: 'V1_MergeStrategy';

  abstract get hashCode(): string;
}

export class V1_NoDeletesMergeStrategy
  extends V1_MergeStrategy
  implements Hashable
{
  override get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.NO_DELETES_MERGE_STRATEGY]);
  }
}

export class V1_DeleteIndicatorMergeStrategy
  extends V1_MergeStrategy
  implements Hashable
{
  deleteProperty!: string;
  deleteValues: string[] = [];

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.DELETE_INDICATOR_MERGE_STRATEGY,
      this.deleteProperty,
      hashArray(this.deleteValues),
    ]);
  }
}

export class V1_OpaqueMergeStrategy
  extends V1_MergeStrategy
  implements Hashable
{
  override get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.OPAQUE_MERGE_STRATEGY]);
  }
}

/**********
 * batch mode - append only
 **********/

export class V1_NonAppendOnly
  extends V1_BatchMilestoningMode
  implements Hashable
{
  auditing!: V1_Auditing;

  override get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.APPEND_ONLY, this.auditing]);
  }
}

/**********
 * auditing
 **********/

export abstract class V1_Auditing implements Hashable {
  private readonly _$nominalTypeBrand!: 'V1_Auditing';

  abstract get hashCode(): string;
}

export class V1_NoAuditing extends V1_Auditing implements Hashable {
  override get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.NO_AUDITING]);
  }
}

export class V1_BatchDateTimeAuditing extends V1_Auditing implements Hashable {
  dateTimeProperty!: string;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.BATCH_DATE_TIME_AUDITING,
      this.dateTimeProperty,
    ]);
  }
}

export class V1_OpaqueAuditing extends V1_Auditing implements Hashable {
  override get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.OPAQUE_AUDITING]);
  }
}

/**********
 * transaction milestoning
 **********/

export abstract class V1_TransactionMilestoning implements Hashable {
  private readonly _$nominalTypeBrand!: 'V1_TransactionMilestoning';

  abstract get hashCode(): string;
}

export class V1_BatchIdTransactionMilestoning
  extends V1_TransactionMilestoning
  implements Hashable
{
  batchIdInName!: string;
  batchIdOutName!: string;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.BATCH_ID_TRANSACTION_MILESTONING,
      this.batchIdInName,
      this.batchIdOutName,
    ]);
  }
}

export class V1_DateTimeTransactionMilestoning
  extends V1_TransactionMilestoning
  implements Hashable
{
  dateTimeInName!: string;
  dateTimeOutName!: string;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.DATE_TIME_TRANSACTION_MILESTONING,
      this.dateTimeInName,
      this.dateTimeOutName,
    ]);
  }
}

export class V1_BatchIdAndDateTimeTransactionMilestoning
  extends V1_TransactionMilestoning
  implements Hashable
{
  batchIdInName!: string;
  batchIdOutName!: string;
  dateTimeInName!: string;
  dateTimeOutName!: string;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.BATCH_ID_AND_DATE_TIME_TRANSACTION_MILESTONING,
      this.batchIdInName,
      this.batchIdOutName,
      this.dateTimeInName,
      this.dateTimeOutName,
    ]);
  }
}

export class V1_OpaqueTransactionMilestoning
  extends V1_TransactionMilestoning
  implements Hashable
{
  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.OPAQUE_TRANSACTION_MILESTONING,
    ]);
  }
}

/**********
 * validity milestoning
 **********/

export abstract class V1_ValidityMilestoning implements Hashable {
  private readonly _$nominalTypeBrand!: 'V1_ValidityMilestoning';

  abstract get hashCode(): string;
}

export class V1_DateTimeValidityMilestoning
  extends V1_ValidityMilestoning
  implements Hashable
{
  dateTimeFromName!: string;
  dateTimeThruName!: string;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.DATE_TIME_VALIDITY_MILESTONING,
      this.dateTimeFromName,
      this.dateTimeThruName,
    ]);
  }
}

export class V1_OpaqueValidityMilestoning
  extends V1_ValidityMilestoning
  implements Hashable
{
  override get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.OPAQUE_VALIDITY_MILESTONING]);
  }
}

// validity derivation

export abstract class V1_ValidityDerivation implements Hashable {
  private readonly _$nominalTypeBrand!: 'V1_ValidityDerivation';

  abstract get hashCode(): string;
}

export class V1_SourceSpecifiesFromDateTime
  extends V1_ValidityDerivation
  implements Hashable
{
  sourceDateTimeFromProperty!: string;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.SOURCE_SPECIFIES_FROM_DATE_TIME,
      this.sourceDateTimeFromProperty,
    ]);
  }
}

export class V1_SourceSpecifiesFromAndThruDateTime
  extends V1_ValidityDerivation
  implements Hashable
{
  sourceDateTimeFromProperty!: string;
  sourceDateTimeThruProperty!: string;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.SOURCE_SPECIFIES_FROM_AND_THRU_DATE_TIME,
      this.sourceDateTimeFromProperty,
      this.sourceDateTimeThruProperty,
    ]);
  }
}
