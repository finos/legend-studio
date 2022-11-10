/**
 * Copyright (c) 2020-present, Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { PERSISTENCE_HASH_STRUCTURE } from '../../../../../DSL_Persistence_HashUtils.js';
import { type Hashable, hashArray } from '@finos/legend-shared';

// transaction milestoning

export abstract class TransactionMilestoning implements Hashable {
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
  derivation?: TransactionDerivation;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.DATE_TIME_TRANSACTION_MILESTONING,
      this.dateTimeInName,
      this.dateTimeOutName,
      this.derivation ?? '',
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
  derivation?: TransactionDerivation;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.BATCH_ID_AND_DATE_TIME_TRANSACTION_MILESTONING,
      this.batchIdInName,
      this.batchIdOutName,
      this.dateTimeInName,
      this.dateTimeOutName,
      this.derivation ?? '',
    ]);
  }
}

// transaction derivation

export abstract class TransactionDerivation implements Hashable {
  abstract get hashCode(): string;
}

export class SourceSpecifiesInDateTime
  extends TransactionDerivation
  implements Hashable
{
  sourceDateTimeInField!: string;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.SOURCE_SPECIFIES_IN_DATE_TIME,
      this.sourceDateTimeInField,
    ]);
  }
}

export class SourceSpecifiesInAndOutDateTime
  extends TransactionDerivation
  implements Hashable
{
  sourceDateTimeInField!: string;
  sourceDateTimeOutField!: string;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.SOURCE_SPECIFIES_IN_AND_OUT_DATE_TIME,
      this.sourceDateTimeInField,
      this.sourceDateTimeOutField,
    ]);
  }
}

// validity milestoning

export abstract class ValidityMilestoning implements Hashable {
  abstract get hashCode(): string;
}

export class DateTimeValidityMilestoning
  extends ValidityMilestoning
  implements Hashable
{
  dateTimeFromName!: string;
  dateTimeThruName!: string;
  derivation!: ValidityDerivation;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.DATE_TIME_VALIDITY_MILESTONING,
      this.dateTimeFromName,
      this.dateTimeThruName,
      this.derivation,
    ]);
  }
}

// validity derivation

export abstract class ValidityDerivation implements Hashable {
  abstract get hashCode(): string;
}

export class SourceSpecifiesFromDateTime
  extends ValidityDerivation
  implements Hashable
{
  sourceDateTimeFromField!: string;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.SOURCE_SPECIFIES_FROM_DATE_TIME,
      this.sourceDateTimeFromField,
    ]);
  }
}

export class SourceSpecifiesFromAndThruDateTime
  extends ValidityDerivation
  implements Hashable
{
  sourceDateTimeFromField!: string;
  sourceDateTimeThruField!: string;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.SOURCE_SPECIFIES_FROM_AND_THRU_DATE_TIME,
      this.sourceDateTimeFromField,
      this.sourceDateTimeThruField,
    ]);
  }
}
