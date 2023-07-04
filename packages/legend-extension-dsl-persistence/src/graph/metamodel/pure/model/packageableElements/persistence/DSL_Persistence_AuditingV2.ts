import { PERSISTENCE_HASH_STRUCTURE } from '../../../../../DSL_Persistence_HashUtils.js';
import { type Hashable, hashArray } from '@finos/legend-shared';

export abstract class AuditingV2 implements Hashable {
  abstract get hashCode(): string;
}

export class AuditingDateTimeV2 extends AuditingV2 {
  auditingDateTimeName!: string;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.AUDITING_DATE_TIME,
      this.auditingDateTimeName,
    ]);
  }
}

export class NoAuditingV2 extends AuditingV2 {
  override get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.NO_AUDITING_V2]);
  }
}
