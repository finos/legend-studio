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

import { hashArray, type Hashable } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../graph/Core_HashUtils.js';
import type { FlatDataSection } from './FlatDataSection.js';
import type { PrimitiveType } from '../../../domain/PrimitiveType.js';

export abstract class FlatDataDataType {
  readonly _correspondingPrimitiveType?: PrimitiveType | undefined;

  constructor(correspondingPrimitiveType?: PrimitiveType) {
    this._correspondingPrimitiveType = correspondingPrimitiveType;
  }

  abstract get hashCode(): string;
}

export class FlatDataBoolean extends FlatDataDataType implements Hashable {
  trueString?: string | undefined;
  falseString?: string | undefined;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.FLAT_DATA_BOOLEAN,
      this.trueString ?? '',
      this.falseString ?? '',
    ]);
  }
}

export class FlatDataString extends FlatDataDataType implements Hashable {
  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.FLAT_DATA_STRING]);
  }
}

export class FlatDataNumber extends FlatDataDataType implements Hashable {
  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.FLAT_DATA_NUMBER]);
  }
}

export class FlatDataInteger extends FlatDataNumber implements Hashable {
  override get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.FLAT_DATA_INTEGER]);
  }
}

export class FlatDataFloat extends FlatDataNumber implements Hashable {
  override get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.FLAT_DATA_FLOAT]);
  }
}

export class FlatDataDecimal extends FlatDataNumber implements Hashable {
  override get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.FLAT_DATA_DECIMAL]);
  }
}

export class FlatDataDate extends FlatDataDataType implements Hashable {
  dateFormat?: string[] | undefined;
  timeZone?: string | undefined;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.FLAT_DATA_DATE,
      this.dateFormat ? hashArray(this.dateFormat) : '',
      this.timeZone ?? '',
    ]);
  }
}

export class FlatDataDateTime extends FlatDataDate implements Hashable {
  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.FLAT_DATA_DATE_TIME,
      this.dateFormat ? hashArray(this.dateFormat) : '',
      this.timeZone ?? '',
    ]);
  }
}

export class FlatDataStrictDate extends FlatDataDate implements Hashable {
  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.FLAT_DATA_STRICT_DATE,
      this.dateFormat ? hashArray(this.dateFormat) : '',
      this.timeZone ?? '',
    ]);
  }
}

export class FlatDataRecordField implements Hashable {
  label: string;
  flatDataDataType: FlatDataDataType;
  optional: boolean;
  address?: string | undefined;

  constructor(
    label: string,
    flatDataDataType: FlatDataDataType,
    optional: boolean,
  ) {
    this.label = label;
    this.flatDataDataType = flatDataDataType;
    this.optional = optional;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.FLAT_DATA_RECORD_FIELD,
      this.label,
      this.flatDataDataType,
      this.optional.toString(),
      this.address ?? '',
    ]);
  }
}

/**
 * NOTE: the fact that we have `fields` in `FlatDataRecordType` like this is misleading. What we should have and what Dave
 * also agreed on is that we will have another class `X` that is the super type of `RootFlatDataRecordType` and contains `fields`
 * instead of `FlatDataRecordType` as `FlatDataRecordType` is just a normal type like `FlatDataBoolean` that signals the driver
 * to look for a record type.
 *
 * As for `RootFlatDataRecordType` it should extends `X` so that we remain open for the possibility that flat data can have embedded
 * structure. Also `X` should not have name, as it can be embedded.
 */
export class FlatDataRecordType extends FlatDataDataType implements Hashable {
  fields: FlatDataRecordField[] = [];

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.FLAT_DATA_RECORD_TYPE,
      hashArray(this.fields),
    ]);
  }
}

export class RootFlatDataRecordType
  extends FlatDataRecordType
  implements Hashable
{
  readonly _OWNER: FlatDataSection;

  constructor(owner: FlatDataSection) {
    super();
    this._OWNER = owner;
  }

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.FLAT_DATA_ROOT_RECORD_TYPE,
      hashArray(this.fields),
    ]);
  }
}
