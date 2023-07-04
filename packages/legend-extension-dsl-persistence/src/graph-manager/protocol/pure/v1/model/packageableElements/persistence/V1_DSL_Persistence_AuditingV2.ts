import { PERSISTENCE_HASH_STRUCTURE } from '../../../../../../../graph/DSL_Persistence_HashUtils.js';
import { type Hashable, hashArray } from '@finos/legend-shared';

export abstract class V1_AuditingV2 implements Hashable {
  abstract get hashCode(): string;
}

export class V1_AuditingDateTimeV2 extends V1_AuditingV2 {
  auditingDateTimeName!: string;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.AUDITING_DATE_TIME,
      this.auditingDateTimeName,
    ]);
  }
}

export class V1_NoAuditingV2 extends V1_AuditingV2 {
  override get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.NO_AUDITING_V2]);
  }
}
