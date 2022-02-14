import { PERSISTENCE_HASH_STRUCTURE } from '../../../../../DSLPersistence_ModelUtils';
import {
  PackageableElement,
  PackageableElementVisitor,
} from '@finos/legend-graph';
import { type Hashable, hashArray } from '@finos/legend-shared';
import { observable, makeObservable, override } from 'mobx';

/**********
 * persistence pipe
 **********/

export class PersistencePipe extends PackageableElement implements Hashable {
  documentation!: string;
  owners: string[] = [];
  trigger!: Trigger;
  reader!: Reader;
  persister!: Persister;

  constructor(name: string) {
    super(name);

    makeObservable<PersistencePipe, '_elementHashCode'>(this, {
      documentation: observable,
      owners: observable,
      trigger: observable,
      reader: observable,
      persister: observable,
      _elementHashCode: override,
    });
  }

  protected override get _elementHashCode(): string {
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
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_PackageableElement(this);
  }
}

/**********
 * trigger
 **********/

export abstract class Trigger implements Hashable {
  private readonly _$nominalTypeBrand!: 'Trigger';

  abstract get hashCode(): string;
}

export class OpaqueTrigger extends Trigger implements Hashable {
  override get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.OPAQUE_TRIGGER]);
  }
}

/**********
 * reader
 **********/

export abstract class Reader implements Hashable {
  private readonly _$nominalTypeBrand!: 'Reader';

  abstract get hashCode(): string;
}

export class ServiceReader extends Reader implements Hashable {
  service!: string;

  override get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.SERVICE_READER, this.service]);
  }
}

/**********
 * persister
 **********/

export abstract class Persister implements Hashable {
  private readonly _$nominalTypeBrand!: 'Persister';

  abstract get hashCode(): string;
}

export class StreamingPersister extends Persister implements Hashable {
  override get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.STREAMING_PERSISTER]);
  }
}

export class BatchPersister extends Persister implements Hashable {
  targetSpecification!: TargetSpecification;

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

export abstract class TargetSpecification implements Hashable {
  modelClass!: string;

  get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.TARGET_SPECIFICATION,
      this.modelClass,
    ]);
  }
}

export class GroupedFlatTargetSpecification
  extends TargetSpecification
  implements Hashable
{
  transactionScope!: TransactionScope;
  components: PropertyAndFlatTargetSpecification[] = [];

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.GROUPED_FLAT_TARGET_SPECIFICATION,
      super.hashCode,
      this.transactionScope,
      hashArray(this.components),
    ]);
  }
}

export class FlatTargetSpecification
  extends TargetSpecification
  implements Hashable
{
  targetName!: string;
  partitionProperties: string[] = [];
  deduplicationStrategy!: DeduplicationStrategy;
  batchMilestoningMode!: BatchMilestoningMode;

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

export class NestedTargetSpecification
  extends TargetSpecification
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

export enum TransactionScope {
  SINGLE_TARGET = 'SINGLE_TARGET',
  ALL_TARGETS = 'ALL_TARGETS',
}

export class PropertyAndFlatTargetSpecification implements Hashable {
  property!: string;
  targetSpecification!: FlatTargetSpecification;

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

export abstract class DeduplicationStrategy implements Hashable {
  private readonly _$nominalTypeBrand!: 'DeduplicationStrategy';

  abstract get hashCode(): string;
}

export class NoDeduplicationStrategy
  extends DeduplicationStrategy
  implements Hashable
{
  override get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.NO_DEDUPLICATION_STRATEGY]);
  }
}

export class AnyVersionDeduplicationStrategy
  extends DeduplicationStrategy
  implements Hashable
{
  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.ANY_VERSION_DEDUPLICATION_STRATEGY,
    ]);
  }
}

export class MaxVersionDeduplicationStrategy
  extends DeduplicationStrategy
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

export class OpaqueDeduplicationStrategy
  extends DeduplicationStrategy
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

export abstract class BatchMilestoningMode implements Hashable {
  private readonly _$nominalTypeBrand!: 'BatchMilestoningMode';

  abstract get hashCode(): string;
}

/**********
 * batch mode - snapshot
 **********/

export class NonMilestonedSnapshot
  extends BatchMilestoningMode
  implements Hashable
{
  auditing!: Auditing;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.NON_MILESTONED_SNAPSHOT,
      this.auditing,
    ]);
  }
}

export class UnitemporalSnapshot
  extends BatchMilestoningMode
  implements Hashable
{
  transactionMilestoning!: TransactionMilestoning;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.UNITEMPORAL_SNAPSHOT,
      this.transactionMilestoning,
    ]);
  }
}

export class BitemporalSnapshot
  extends BatchMilestoningMode
  implements Hashable
{
  transactionMilestoning!: TransactionMilestoning;
  validityMilestoning!: ValidityMilestoning;
  validityDerivation!: ValidityDerivation;

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

export class NonMilestonedDelta
  extends BatchMilestoningMode
  implements Hashable
{
  auditing!: Auditing;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.NON_MILESTONED_DELTA,
      this.auditing,
    ]);
  }
}

export class UnitemporalDelta extends BatchMilestoningMode implements Hashable {
  mergeStrategy!: MergeStrategy;
  transactionMilestoning!: TransactionMilestoning;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.UNITEMPORAL_DELTA,
      this.mergeStrategy,
      this.transactionMilestoning,
    ]);
  }
}

export class BitemporalDelta extends BatchMilestoningMode implements Hashable {
  mergeStrategy!: MergeStrategy;
  transactionMilestoning!: TransactionMilestoning;
  validityMilestoning!: ValidityMilestoning;
  validityDerivation!: ValidityDerivation;

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

export abstract class MergeStrategy implements Hashable {
  private readonly _$nominalTypeBrand!: 'MergeStrategy';

  abstract get hashCode(): string;
}

export class NoDeletesMergeStrategy extends MergeStrategy implements Hashable {
  override get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.NO_DELETES_MERGE_STRATEGY]);
  }
}

export class DeleteIndicatorMergeStrategy
  extends MergeStrategy
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

export class OpaqueMergeStrategy extends MergeStrategy implements Hashable {
  override get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.OPAQUE_MERGE_STRATEGY]);
  }
}

/**********
 * batch mode - append only
 **********/

export class NonAppendOnly extends BatchMilestoningMode implements Hashable {
  auditing!: Auditing;

  override get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.APPEND_ONLY, this.auditing]);
  }
}

/**********
 * auditing
 **********/

export abstract class Auditing implements Hashable {
  private readonly _$nominalTypeBrand!: 'Auditing';

  abstract get hashCode(): string;
}

export class NoAuditing extends Auditing implements Hashable {
  override get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.NO_AUDITING]);
  }
}

export class BatchDateTimeAuditing extends Auditing implements Hashable {
  dateTimeProperty!: string;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.BATCH_DATE_TIME_AUDITING,
      this.dateTimeProperty,
    ]);
  }
}

export class OpaqueAuditing extends Auditing implements Hashable {
  override get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.OPAQUE_AUDITING]);
  }
}

/**********
 * transaction milestoning
 **********/

export abstract class TransactionMilestoning implements Hashable {
  private readonly _$nominalTypeBrand!: 'TransactionMilestoning';

  abstract get hashCode(): string;
}

export class BatchIdTransactionMilestoning
  extends TransactionMilestoning
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

export class DateTimeTransactionMilestoning
  extends TransactionMilestoning
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

export class BatchIdAndDateTimeTransactionMilestoning
  extends TransactionMilestoning
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

export class OpaqueTransactionMilestoning
  extends TransactionMilestoning
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

export abstract class ValidityMilestoning implements Hashable {
  private readonly _$nominalTypeBrand!: 'ValidityMilestoning';

  abstract get hashCode(): string;
}

export class DateTimeValidityMilestoning
  extends ValidityMilestoning
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

export class OpaqueValidityMilestoning
  extends ValidityMilestoning
  implements Hashable
{
  override get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.OPAQUE_VALIDITY_MILESTONING]);
  }
}

// validity derivation

export abstract class ValidityDerivation implements Hashable {
  private readonly _$nominalTypeBrand!: 'ValidityDerivation';

  abstract get hashCode(): string;
}

export class SourceSpecifiesFromDateTime
  extends ValidityDerivation
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

export class SourceSpecifiesFromAndThruDateTime
  extends ValidityDerivation
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
