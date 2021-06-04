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

import type { Hashable } from '@finos/legend-studio-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../../MetaModelConst';
import { hashArray } from '@finos/legend-studio-shared';

export abstract class V1_FlatDataDataType implements Hashable {
  private readonly _$nominalTypeBrand!: 'V1_FlatDataDataType';

  abstract get hashCode(): string;
}

export class V1_FlatDataBoolean
  extends V1_FlatDataDataType
  implements Hashable
{
  trueString?: string;
  falseString?: string;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.FLAT_DATA_BOOLEAN,
      this.trueString ?? '',
      this.falseString ?? '',
    ]);
  }
}

export class V1_FlatDataString extends V1_FlatDataDataType implements Hashable {
  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.FLAT_DATA_STRING]);
  }
}

export class V1_FlatDataNumber extends V1_FlatDataDataType implements Hashable {
  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.FLAT_DATA_NUMBER]);
  }
}

export class V1_FlatDataInteger extends V1_FlatDataNumber implements Hashable {
  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.FLAT_DATA_INTEGER]);
  }
}

export class V1_FlatDataFloat extends V1_FlatDataNumber implements Hashable {
  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.FLAT_DATA_FLOAT]);
  }
}

export class V1_FlatDataDecimal extends V1_FlatDataNumber implements Hashable {
  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.FLAT_DATA_DECIMAL]);
  }
}

export class V1_FlatDataDate extends V1_FlatDataDataType implements Hashable {
  dateFormat?: string;
  timeZone?: string;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.FLAT_DATA_DATE,
      this.dateFormat ?? '',
      this.timeZone ?? '',
    ]);
  }
}

export class V1_FlatDataDateTime extends V1_FlatDataDate implements Hashable {
  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.FLAT_DATA_DATE_TIME,
      this.dateFormat ?? '',
      this.timeZone ?? '',
    ]);
  }
}

export class V1_FlatDataStrictDate extends V1_FlatDataDate implements Hashable {
  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.FLAT_DATA_STRICT_DATE,
      this.dateFormat ?? '',
      this.timeZone ?? '',
    ]);
  }
}

export class V1_FlatDataRecordField implements Hashable {
  label!: string;
  flatDataDataType!: V1_FlatDataDataType;
  optional!: boolean;
  address?: string;

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

export class V1_FlatDataRecordType
  extends V1_FlatDataDataType
  implements Hashable
{
  fields: V1_FlatDataRecordField[] = [];

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.FLAT_DATA_RECORD_TYPE,
      hashArray(this.fields),
    ]);
  }
}

export class V1_RootFlatDataRecordType
  extends V1_FlatDataRecordType
  implements Hashable
{
  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.FLAT_DATA_ROOT_RECORD_TYPE,
      hashArray(this.fields),
    ]);
  }
}
