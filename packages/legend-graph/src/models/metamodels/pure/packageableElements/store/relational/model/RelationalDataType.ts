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

import { CORE_HASH_STRUCTURE } from '../../../../../../../MetaModelConst';
import { hashArray } from '@finos/legend-shared';

export abstract class /*toCHECK*/ RelationalDataType {
  abstract get hashCode(): string;
}

export class /*toCHECK*/ BigInt extends RelationalDataType {
  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.RELATIONAL_DATATYPE_BIGINT]);
  }
}

export class /*toCHECK*/ SmallInt extends RelationalDataType {
  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.RELATIONAL_DATATYPE_SMALLINT]);
  }
}

export class /*toCHECK*/ TinyInt extends RelationalDataType {
  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.RELATIONAL_DATATYPE_TINYINT]);
  }
}

export class /*toCHECK*/ Integer extends RelationalDataType {
  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.RELATIONAL_DATATYPE_INTEGER]);
  }
}

export class /*toCHECK*/ Float extends RelationalDataType {
  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.RELATIONAL_DATATYPE_FLOAT]);
  }
}

export class /*toCHECK*/ Double extends RelationalDataType {
  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.RELATIONAL_DATATYPE_DOUBLE]);
  }
}

export class /*toCHECK*/ VarChar extends RelationalDataType {
  size: number;

  constructor(size: number) {
    super();
    this.size = size;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.RELATIONAL_DATATYPE_VARCHAR,
      this.size.toString(),
    ]);
  }
}

export class /*toCHECK*/ Char extends RelationalDataType {
  size: number;

  constructor(size: number) {
    super();
    this.size = size;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.RELATIONAL_DATATYPE_CHAR,
      this.size.toString(),
    ]);
  }
}

export class /*toCHECK*/ VarBinary extends RelationalDataType {
  size: number;

  constructor(size: number) {
    super();
    this.size = size;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.RELATIONAL_DATATYPE_VARBINARY,
      this.size.toString(),
    ]);
  }
}

export class /*toCHECK*/ Decimal extends RelationalDataType {
  precision: number;
  scale: number;

  constructor(precision: number, scale: number) {
    super();
    this.precision = precision;
    this.scale = scale;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.RELATIONAL_DATATYPE_DECIMAL,
      this.precision.toString(),
      this.scale.toString(),
    ]);
  }
}

export class /*toCHECK*/ Numeric extends RelationalDataType {
  precision: number;
  scale: number;

  constructor(precision: number, scale: number) {
    super();
    this.precision = precision;
    this.scale = scale;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.RELATIONAL_DATATYPE_NUMERIC,
      this.precision.toString(),
      this.scale.toString(),
    ]);
  }
}

export class /*toCHECK*/ Timestamp extends RelationalDataType {
  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.RELATIONAL_DATATYPE_TIMESTAMP]);
  }
}

export class /*toCHECK*/ Date extends RelationalDataType {
  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.RELATIONAL_DATATYPE_DATE]);
  }
}

export class /*toCHECK*/ Other extends RelationalDataType {
  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.RELATIONAL_DATATYPE_VARCHAR]);
  }
}

export class /*toCHECK*/ Bit extends RelationalDataType {
  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.RELATIONAL_DATATYPE_BIT]);
  }
}

export class /*toCHECK*/ Binary extends RelationalDataType {
  size: number;

  constructor(size: number) {
    super();
    this.size = size;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.RELATIONAL_DATATYPE_BINARY,
      this.size.toString(),
    ]);
  }
}

export class /*toCHECK*/ Real extends RelationalDataType {
  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.RELATIONAL_DATATYPE_REAL]);
  }
}

export class /*toCHECK*/ SemiStructured extends RelationalDataType {
  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.RELATIONAL_DATATYPE_SEMISTRUCTURED]);
  }
}
