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

import { CORE_HASH_STRUCTURE } from '../../../../../../../graph/Core_HashUtils.js';
import { hashArray } from '@finos/legend-shared';

export abstract class RelationalDataType {
  abstract get hashCode(): string;
}

export class BigInt extends RelationalDataType {
  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.RELATIONAL_DATATYPE_BIGINT]);
  }
}

export class SmallInt extends RelationalDataType {
  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.RELATIONAL_DATATYPE_SMALLINT]);
  }
}

export class TinyInt extends RelationalDataType {
  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.RELATIONAL_DATATYPE_TINYINT]);
  }
}

export class Integer extends RelationalDataType {
  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.RELATIONAL_DATATYPE_INTEGER]);
  }
}

export class Float extends RelationalDataType {
  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.RELATIONAL_DATATYPE_FLOAT]);
  }
}

export class Double extends RelationalDataType {
  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.RELATIONAL_DATATYPE_DOUBLE]);
  }
}

export class VarChar extends RelationalDataType {
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

export class Char extends RelationalDataType {
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

export class VarBinary extends RelationalDataType {
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

export class Decimal extends RelationalDataType {
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

export class Numeric extends RelationalDataType {
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

export class Timestamp extends RelationalDataType {
  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.RELATIONAL_DATATYPE_TIMESTAMP]);
  }
}

export class Date extends RelationalDataType {
  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.RELATIONAL_DATATYPE_DATE]);
  }
}

export class Other extends RelationalDataType {
  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.RELATIONAL_DATATYPE_VARCHAR]);
  }
}

export class Bit extends RelationalDataType {
  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.RELATIONAL_DATATYPE_BIT]);
  }
}

export class Binary extends RelationalDataType {
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

export class Real extends RelationalDataType {
  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.RELATIONAL_DATATYPE_REAL]);
  }
}

export class SemiStructured extends RelationalDataType {
  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.RELATIONAL_DATATYPE_SEMISTRUCTURED]);
  }
}

export class Json extends RelationalDataType {
  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.RELATIONAL_DATATYPE_JSON]);
  }
}
