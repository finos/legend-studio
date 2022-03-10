import { PERSISTENCE_HASH_STRUCTURE } from '../../../../../DSLPersistence_ModelUtils';
import {
  Class,
  PackageableElement,
  PackageableElementReference,
  PackageableElementVisitor,
  Service,
} from '@finos/legend-graph';
import { type Hashable, hashArray } from '@finos/legend-shared';
import { makeObservable, observable, override } from 'mobx';

/**********
 * persistence
 **********/

export class Persistence extends PackageableElement implements Hashable {
  documentation!: string;
  owners: string[] = [];
  trigger!: Trigger;
  reader!: Reader;
  persister!: Persister;

  constructor(name: string) {
    super(name);

    makeObservable<Persistence, '_elementHashCode'>(this, {
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
      PERSISTENCE_HASH_STRUCTURE.PERSISTENCE,
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

export class ManualTrigger extends Trigger implements Hashable {
  override get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.MANUAL_TRIGGER]);
  }
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
  service!: PackageableElementReference<Service>;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.SERVICE_READER,
      this.service.hashValue,
    ]);
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
  targetShape!: TargetShape;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.BATCH_PERSISTER,
      this.targetShape,
    ]);
  }
}

/**********
 * target shape
 **********/

export abstract class TargetShape implements Hashable {
  get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.TARGET_SHAPE]);
  }
}

export class MultiFlatTarget extends TargetShape implements Hashable {
  modelClass!: PackageableElementReference<Class>;
  transactionScope!: TransactionScope;
  parts: PropertyAndFlatTarget[] = [];

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.MULTI_FLAT_TARGET,
      super.hashCode,
      this.modelClass.hashValue,
      this.transactionScope,
      hashArray(this.parts),
    ]);
  }
}

export class FlatTarget extends TargetShape implements Hashable {
  modelClass!: PackageableElementReference<Class>;
  targetName!: string;
  partitionProperties: string[] = [];
  deduplicationStrategy!: DeduplicationStrategy;
  batchMode!: BatchMilestoningMode;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.FLAT_TARGET,
      super.hashCode,
      this.modelClass.hashValue,
      this.targetName,
      hashArray(this.partitionProperties),
      this.deduplicationStrategy,
      this.batchMode,
    ]);
  }
}

export class OpaqueTarget extends TargetShape implements Hashable {
  targetName!: string;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.OPAQUE_TARGET,
      super.hashCode,
      this.targetName,
    ]);
  }
}

export class PropertyAndFlatTarget implements Hashable {
  property!: string;
  flatTarget!: FlatTarget;

  get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.PROPERTY_AND_FLAT_TARGET,
      this.property,
      this.flatTarget,
    ]);
  }
}

export enum TransactionScope {
  SINGLE_TARGET = 'SINGLE_TARGET',
  ALL_TARGETS = 'ALL_TARGETS',
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

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.BITEMPORAL_SNAPSHOT,
      this.transactionMilestoning,
      this.validityMilestoning,
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

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.BITEMPORAL_DELTA,
      this.mergeStrategy,
      this.transactionMilestoning,
      this.validityMilestoning,
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

export class AppendOnly extends BatchMilestoningMode implements Hashable {
  auditing!: Auditing;
  filterDuplicates!: boolean;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.APPEND_ONLY,
      this.auditing,
      this.filterDuplicates.toString(),
    ]);
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
  batchIdInFieldName!: string;
  batchIdOutFieldName!: string;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.BATCH_ID_TRANSACTION_MILESTONING,
      this.batchIdInFieldName,
      this.batchIdOutFieldName,
    ]);
  }
}

export class DateTimeTransactionMilestoning
  extends TransactionMilestoning
  implements Hashable
{
  dateTimeInFieldName!: string;
  dateTimeOutFieldName!: string;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.DATE_TIME_TRANSACTION_MILESTONING,
      this.dateTimeInFieldName,
      this.dateTimeOutFieldName,
    ]);
  }
}

export class BatchIdAndDateTimeTransactionMilestoning
  extends TransactionMilestoning
  implements Hashable
{
  batchIdInFieldName!: string;
  batchIdOutFieldName!: string;
  dateTimeInFieldName!: string;
  dateTimeOutFieldName!: string;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.BATCH_ID_AND_DATE_TIME_TRANSACTION_MILESTONING,
      this.batchIdInFieldName,
      this.batchIdOutFieldName,
      this.dateTimeInFieldName,
      this.dateTimeOutFieldName,
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
  dateTimeFromFieldName!: string;
  dateTimeThruFieldName!: string;
  derivation!: ValidityDerivation;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.DATE_TIME_VALIDITY_MILESTONING,
      this.dateTimeFromFieldName,
      this.dateTimeThruFieldName,
      this.derivation,
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
