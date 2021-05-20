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

import { observable, computed, action, makeObservable } from 'mobx';
import { hashArray } from '@finos/legend-studio-shared';
import type { Hashable } from '@finos/legend-studio-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../MetaModelConst';
import type { FlatDataSection } from './FlatDataSection';
import type { PrimitiveType } from '../../../../../model/packageableElements/domain/PrimitiveType';

export abstract class FlatDataDataType {
  correspondingPrimitiveType?: PrimitiveType;

  constructor(correspondingPrimitiveType?: PrimitiveType) {
    this.correspondingPrimitiveType = correspondingPrimitiveType;
  }

  abstract get hashCode(): string;
}

export class FlatDataBoolean extends FlatDataDataType implements Hashable {
  trueString?: string;
  falseString?: string;

  constructor(correspondingPrimitiveType?: PrimitiveType) {
    super(correspondingPrimitiveType);

    makeObservable(this, {
      trueString: observable,
      falseString: observable,
      hashCode: computed,
    });
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.FLAT_DATA_BOOLEAN,
      this.trueString ?? '',
      this.falseString ?? '',
    ]);
  }
}

export class FlatDataString extends FlatDataDataType implements Hashable {
  constructor(correspondingPrimitiveType?: PrimitiveType) {
    super(correspondingPrimitiveType);

    makeObservable(this, {
      hashCode: computed,
    });
  }

  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.FLAT_DATA_STRING]);
  }
}

export class FlatDataNumber extends FlatDataDataType implements Hashable {
  constructor(correspondingPrimitiveType?: PrimitiveType) {
    super(correspondingPrimitiveType);

    makeObservable(this, {
      hashCode: computed,
    });
  }

  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.FLAT_DATA_NUMBER]);
  }
}

export class FlatDataInteger extends FlatDataNumber implements Hashable {
  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.FLAT_DATA_INTEGER]);
  }
}

export class FlatDataFloat extends FlatDataNumber implements Hashable {
  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.FLAT_DATA_FLOAT]);
  }
}

export class FlatDataDecimal extends FlatDataNumber implements Hashable {
  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.FLAT_DATA_DECIMAL]);
  }
}

export class FlatDataDate extends FlatDataDataType implements Hashable {
  dateFormat?: string;
  timeZone?: string;

  constructor(correspondingPrimitiveType?: PrimitiveType) {
    super(correspondingPrimitiveType);

    makeObservable(this, {
      dateFormat: observable,
      timeZone: observable,
      setDateFormat: action,
      setTimeZone: action,
      hashCode: computed,
    });
  }

  setDateFormat(value: string | undefined): void {
    this.dateFormat = value;
  }
  setTimeZone(value: string | undefined): void {
    this.timeZone = value;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.FLAT_DATA_DATE,
      this.dateFormat ?? '',
      this.timeZone ?? '',
    ]);
  }
}

export class FlatDataDateTime extends FlatDataDate implements Hashable {
  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.FLAT_DATA_DATE_TIME,
      this.dateFormat ?? '',
      this.timeZone ?? '',
    ]);
  }
}

export class FlatDataStrictDate extends FlatDataDate implements Hashable {
  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.FLAT_DATA_STRICT_DATE,
      this.dateFormat ?? '',
      this.timeZone ?? '',
    ]);
  }
}

export class FlatDataRecordField implements Hashable {
  label: string;
  flatDataDataType: FlatDataDataType;
  optional: boolean;
  address?: string;

  constructor(
    label: string,
    flatDataDataType: FlatDataDataType,
    optional: boolean,
  ) {
    makeObservable(this, {
      label: observable,
      flatDataDataType: observable,
      optional: observable,
      address: observable,
      setAddress: action,
      hashCode: computed,
    });

    this.label = label;
    this.flatDataDataType = flatDataDataType;
    this.optional = optional;
  }

  setAddress(value: string | undefined): void {
    this.address = value;
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
 * FIXME: the fact that we have `fields` in `FlatDataRecordType` like this is misleading. What we should have and what Dave
 * also agreed on is that we will have another class `X` that is the super type of `RootFlatDataRecordType` and contains `fields`
 * instead of `FlatDataRecordType` as `FlatDataRecordType` is just a normal type like `FlatDataBoolean` that signals the driver
 * to look for a record type.
 *
 * As for `RootFlatDataRecordType` it should extends `X` so that we remain open for the possibility that flat data can have embedded
 * structure. Also `X` should not have name, as it can be embedded.
 */
export class FlatDataRecordType extends FlatDataDataType implements Hashable {
  fields: FlatDataRecordField[] = [];

  constructor(correspondingPrimitiveType?: PrimitiveType) {
    super(correspondingPrimitiveType);

    makeObservable(this, {
      fields: observable,
      hashCode: computed,
    });
  }

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
  owner: FlatDataSection;

  constructor(owner: FlatDataSection) {
    super();
    this.owner = owner;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.FLAT_DATA_ROOT_RECORD_TYPE,
      hashArray(this.fields),
    ]);
  }
}
