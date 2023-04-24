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

import { type Hashable, hashArray } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../../../graph/Core_HashUtils.js';

export abstract class V1_RelationalDataType implements Hashable {
  abstract get hashCode(): string;
}

export class V1_VarChar extends V1_RelationalDataType implements Hashable {
  size!: number;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.RELATIONAL_DATATYPE_VARCHAR,
      this.size.toString(),
    ]);
  }
}

export class V1_Char extends V1_RelationalDataType implements Hashable {
  size!: number;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.RELATIONAL_DATATYPE_CHAR,
      this.size.toString(),
    ]);
  }
}

export class V1_VarBinary extends V1_RelationalDataType implements Hashable {
  size!: number;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.RELATIONAL_DATATYPE_VARBINARY,
      this.size.toString(),
    ]);
  }
}

export class V1_Binary extends V1_RelationalDataType implements Hashable {
  size!: number;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.RELATIONAL_DATATYPE_BINARY,
      this.size.toString(),
    ]);
  }
}

export class V1_Bit extends V1_RelationalDataType implements Hashable {
  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.RELATIONAL_DATATYPE_BIT]);
  }
}

export class V1_Integer extends V1_RelationalDataType implements Hashable {
  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.RELATIONAL_DATATYPE_INTEGER]);
  }
}

export class V1_BigInt extends V1_RelationalDataType implements Hashable {
  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.RELATIONAL_DATATYPE_BIGINT]);
  }
}

export class V1_SmallInt extends V1_RelationalDataType implements Hashable {
  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.RELATIONAL_DATATYPE_SMALLINT]);
  }
}

export class V1_TinyInt extends V1_RelationalDataType implements Hashable {
  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.RELATIONAL_DATATYPE_TINYINT]);
  }
}

export class V1_Numeric extends V1_RelationalDataType implements Hashable {
  precision!: number;
  scale!: number;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.RELATIONAL_DATATYPE_NUMERIC,
      this.precision.toString(),
      this.scale.toString(),
    ]);
  }
}

export class V1_Decimal extends V1_RelationalDataType implements Hashable {
  precision!: number;
  scale!: number;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.RELATIONAL_DATATYPE_DECIMAL,
      this.precision.toString(),
      this.scale.toString(),
    ]);
  }
}

export class V1_Double extends V1_RelationalDataType implements Hashable {
  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.RELATIONAL_DATATYPE_DOUBLE]);
  }
}

export class V1_Float extends V1_RelationalDataType implements Hashable {
  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.RELATIONAL_DATATYPE_FLOAT]);
  }
}

export class V1_Real extends V1_RelationalDataType implements Hashable {
  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.RELATIONAL_DATATYPE_REAL]);
  }
}

export class V1_Date extends V1_RelationalDataType implements Hashable {
  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.RELATIONAL_DATATYPE_DATE]);
  }
}

export class V1_Timestamp extends V1_RelationalDataType implements Hashable {
  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.RELATIONAL_DATATYPE_TIMESTAMP]);
  }
}

export class V1_Other extends V1_RelationalDataType implements Hashable {
  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.RELATIONAL_DATATYPE_VARCHAR]);
  }
}

export class V1_SemiStructured
  extends V1_RelationalDataType
  implements Hashable
{
  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.RELATIONAL_DATATYPE_SEMISTRUCTURED]);
  }
}

export class V1_Json extends V1_RelationalDataType implements Hashable {
  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.RELATIONAL_DATATYPE_JSON]);
  }
}
