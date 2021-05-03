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

import {
  createModelSchema,
  primitive,
  custom,
  list,
  deserialize,
  serialize,
  SKIP,
  object,
  alias,
  optional,
} from 'serializr';
import type { PlainObject } from '@finos/legend-studio-shared';
import {
  usingConstantValueSchema,
  getClass,
  deserializeArray,
  UnsupportedOperationError,
  serializeArray,
  usingModelSchema,
} from '@finos/legend-studio-shared';
import { V1_Column } from '../../../model/packageableElements/store/relational/model/V1_Column';
import { V1_Database } from '../../../model/packageableElements/store/relational/model/V1_Database';
import { V1_TablePtr } from '../../../model/packageableElements/store/relational/model/V1_TablePtr';
import { V1_Schema } from '../../../model/packageableElements/store/relational/model/V1_Schema';
import { V1_Join } from '../../../model/packageableElements/store/relational/model/V1_Join';
import { V1_Filter } from '../../../model/packageableElements/store/relational/model/V1_Filter';
import { V1_Table } from '../../../model/packageableElements/store/relational/model/V1_Table';
import type { V1_RelationalDataType } from '../../../model/packageableElements/store/relational/model/V1_RelationalDataType';
import {
  V1_VarChar,
  V1_Char,
  V1_VarBinary,
  V1_Binary,
  V1_Bit,
  V1_Numeric,
  V1_Double,
  V1_Float,
  V1_Real,
  V1_Integer,
  V1_BigInt,
  V1_SmallInt,
  V1_TinyInt,
  V1_Date,
  V1_Timestamp,
  V1_Other,
  V1_Decimal,
} from '../../../model/packageableElements/store/relational/model/V1_RelationalDataType';
import { V1_View } from '../../../model/packageableElements/store/relational/model/V1_View';
import { V1_FilterPointer } from '../../../model/packageableElements/store/relational/mapping/V1_FilterPointer';
import { V1_FilterMapping } from '../../../model/packageableElements/store/relational/mapping/V1_FilterMapping';
import { V1_JoinPointer } from '../../../model/packageableElements/store/relational/model/V1_JoinPointer';
import { V1_ColumnMapping } from '../../../model/packageableElements/store/relational/model/V1_ColumnMapping';
import type { V1_RelationalOperationElement } from '../../../model/packageableElements/store/relational/model/V1_RelationalOperationElement';
import {
  V1_DynaFunc,
  V1_ElementWithJoins,
  V1_Literal,
  V1_LiteralList,
  V1_TableAliasColumn,
} from '../../../model/packageableElements/store/relational/model/V1_RelationalOperationElement';
import {
  V1_deserializeMilestoning,
  V1_serializeMilestoning,
} from './V1_MilestoningSerializationHelper';
import type { V1_Milestoning } from '../../../model/packageableElements/store/relational/model/milestoning/V1_Milestoning';
import type { PureProtocolProcessorPlugin } from '../../../../PureProtocolProcessorPlugin';
import { V1_RelationalDatabaseConnection } from '../../../model/packageableElements/store/relational/connection/V1_RelationalDatabaseConnection';
import {
  V1_deserializePostProcessor,
  V1_serializePostProcessor,
} from './V1_PostProcessorSerializationHelper';
import type { V1_PostProcessor } from '../../../model/packageableElements/store/relational/connection/postprocessor/V1_PostProcessor';
import {
  V1_ConnectionType,
  V1_deserializeAuthenticationStrategy,
  V1_deserializeDatasourceSpecification,
  V1_serializeAuthenticationStrategy,
  V1_serializeDatasourceSpecification,
} from './V1_ConnectionSerializationHelper';

export const V1_DATABASE_ELEMENT_PROTOCOL_TYPE = 'relational';

enum V1_FilterType {
  STANDARD = 'filter',
  MULTI_GRAIN = 'MultiGrainFilter',
}

enum V1_RelationalOperationElementType {
  DYNA_FUNC = 'dynaFunc',
  ELEMENT_WITH_JOINS = 'elemtWithJoins',
  LITERAL = 'literal',
  LITERAL_LIST = 'literalList',
  TABLE_ALIAS_COLUMN = 'column',
}

const V1_TablePtrType = 'Table';

enum V1_RelationalDataTypeType {
  VARCHAR = 'Varchar',
  CHAR = 'Char',
  VARBINARY = 'Varbinary',
  BINARY = 'Binary',
  BIT = 'Bit',
  NUMERIC = 'Numeric',
  DECIMAL = 'Decimal',
  DOUBLE = 'Double',
  FLOAT = 'Float',
  REAL = 'Real',
  INTEGER = 'Integer',
  BIGINT = 'BigInt',
  SMALLINT = 'SmallInt',
  TINYINT = 'TinyInt',
  DATE = 'Date',
  TIMESTAMP = 'Timestamp',
  ARRAY = 'Array',
  OTHER = 'Other',
}

const V1_otherRelationalDataTypeModelSchema = createModelSchema(V1_Other, {
  _type: usingConstantValueSchema(V1_RelationalDataTypeType.OTHER),
});
const V1_timestampRelationalDataTypeModelSchema = createModelSchema(
  V1_Timestamp,
  {
    _type: usingConstantValueSchema(V1_RelationalDataTypeType.TIMESTAMP),
  },
);
const V1_dateRelationalDataTypeModelSchema = createModelSchema(V1_Date, {
  _type: usingConstantValueSchema(V1_RelationalDataTypeType.DATE),
});
const V1_realRelationalDataTypeModelSchema = createModelSchema(V1_Real, {
  _type: usingConstantValueSchema(V1_RelationalDataTypeType.REAL),
});
const V1_floatRelationalDataTypeModelSchema = createModelSchema(V1_Float, {
  _type: usingConstantValueSchema(V1_RelationalDataTypeType.FLOAT),
});
const V1_doubleRelationalDataTypeModelSchema = createModelSchema(V1_Double, {
  _type: usingConstantValueSchema(V1_RelationalDataTypeType.DOUBLE),
});

const V1_decimalRelationalDataTypeModelSchema = createModelSchema(V1_Decimal, {
  _type: usingConstantValueSchema(V1_RelationalDataTypeType.DECIMAL),
  precision: primitive(),
  scale: primitive(),
});

const V1_numericRelationalDataTypeModelSchema = createModelSchema(V1_Numeric, {
  _type: usingConstantValueSchema(V1_RelationalDataTypeType.NUMERIC),
  precision: primitive(),
  scale: primitive(),
});

const V1_tinyIntRelationalDataTypeModelSchema = createModelSchema(V1_TinyInt, {
  _type: usingConstantValueSchema(V1_RelationalDataTypeType.TINYINT),
});
const V1_smallIntRelationalDataTypeModelSchema = createModelSchema(
  V1_SmallInt,
  {
    _type: usingConstantValueSchema(V1_RelationalDataTypeType.SMALLINT),
  },
);
const V1_bigIntRelationalDataTypeModelSchema = createModelSchema(V1_BigInt, {
  _type: usingConstantValueSchema(V1_RelationalDataTypeType.BIGINT),
});
const V1_integerRelationalDataTypeModelSchema = createModelSchema(V1_Integer, {
  _type: usingConstantValueSchema(V1_RelationalDataTypeType.INTEGER),
});
const V1_bitRelationalDataTypeModelSchema = createModelSchema(V1_Bit, {
  _type: usingConstantValueSchema(V1_RelationalDataTypeType.BIT),
});

const V1_binaryRelationalDataTypeModelSchema = createModelSchema(V1_Binary, {
  _type: usingConstantValueSchema(V1_RelationalDataTypeType.BINARY),
  size: primitive(),
});

const V1_varBinaryRelationalDataTypeModelSchema = createModelSchema(
  V1_VarBinary,
  {
    _type: usingConstantValueSchema(V1_RelationalDataTypeType.VARBINARY),
    size: primitive(),
  },
);

const V1_charRelationalDataTypeModelSchema = createModelSchema(V1_Char, {
  _type: usingConstantValueSchema(V1_RelationalDataTypeType.CHAR),
  size: primitive(),
});

const V1_varCharRelationalDataTypeModelSchema = createModelSchema(V1_VarChar, {
  _type: usingConstantValueSchema(V1_RelationalDataTypeType.VARCHAR),
  size: primitive(),
});

const V1_serializeColType = (
  protocol: V1_RelationalDataType,
): PlainObject<V1_RelationalDataType> => {
  if (protocol instanceof V1_VarChar) {
    return serialize(V1_varCharRelationalDataTypeModelSchema, protocol);
  } else if (protocol instanceof V1_Char) {
    return serialize(V1_charRelationalDataTypeModelSchema, protocol);
  } else if (protocol instanceof V1_VarBinary) {
    return serialize(V1_varBinaryRelationalDataTypeModelSchema, protocol);
  } else if (protocol instanceof V1_Binary) {
    return serialize(V1_binaryRelationalDataTypeModelSchema, protocol);
  } else if (protocol instanceof V1_Bit) {
    return serialize(V1_bitRelationalDataTypeModelSchema, protocol);
  } else if (protocol instanceof V1_Numeric) {
    return serialize(V1_numericRelationalDataTypeModelSchema, protocol);
  } else if (protocol instanceof V1_Double) {
    return serialize(V1_doubleRelationalDataTypeModelSchema, protocol);
  } else if (protocol instanceof V1_Float) {
    return serialize(V1_floatRelationalDataTypeModelSchema, protocol);
  } else if (protocol instanceof V1_Real) {
    return serialize(V1_realRelationalDataTypeModelSchema, protocol);
  } else if (protocol instanceof V1_Integer) {
    return serialize(V1_integerRelationalDataTypeModelSchema, protocol);
  } else if (protocol instanceof V1_BigInt) {
    return serialize(V1_bigIntRelationalDataTypeModelSchema, protocol);
  } else if (protocol instanceof V1_SmallInt) {
    return serialize(V1_smallIntRelationalDataTypeModelSchema, protocol);
  } else if (protocol instanceof V1_TinyInt) {
    return serialize(V1_tinyIntRelationalDataTypeModelSchema, protocol);
  } else if (protocol instanceof V1_Date) {
    return serialize(V1_dateRelationalDataTypeModelSchema, protocol);
  } else if (protocol instanceof V1_Timestamp) {
    return serialize(V1_timestampRelationalDataTypeModelSchema, protocol);
  } else if (protocol instanceof V1_Decimal) {
    return serialize(V1_decimalRelationalDataTypeModelSchema, protocol);
  } else if (protocol instanceof V1_Other) {
    return serialize(V1_otherRelationalDataTypeModelSchema, protocol);
  }
  throw new UnsupportedOperationError(
    `Can't serialize relational column data type '${getClass(protocol).name}'`,
  );
};

const V1_deserializeColType = (
  json: PlainObject<V1_RelationalDataType>,
): V1_RelationalDataType => {
  switch (json._type) {
    case V1_RelationalDataTypeType.VARCHAR:
      return deserialize(V1_varCharRelationalDataTypeModelSchema, json);
    case V1_RelationalDataTypeType.CHAR:
      return deserialize(V1_charRelationalDataTypeModelSchema, json);
    case V1_RelationalDataTypeType.VARBINARY:
      return deserialize(V1_varBinaryRelationalDataTypeModelSchema, json);
    case V1_RelationalDataTypeType.BINARY:
      return deserialize(V1_binaryRelationalDataTypeModelSchema, json);
    case V1_RelationalDataTypeType.BIT:
      return deserialize(V1_bitRelationalDataTypeModelSchema, json);
    case V1_RelationalDataTypeType.NUMERIC:
      return deserialize(V1_numericRelationalDataTypeModelSchema, json);
    case V1_RelationalDataTypeType.DOUBLE:
      return deserialize(V1_doubleRelationalDataTypeModelSchema, json);
    case V1_RelationalDataTypeType.FLOAT:
      return deserialize(V1_floatRelationalDataTypeModelSchema, json);
    case V1_RelationalDataTypeType.REAL:
      return deserialize(V1_realRelationalDataTypeModelSchema, json);
    case V1_RelationalDataTypeType.INTEGER:
      return deserialize(V1_integerRelationalDataTypeModelSchema, json);
    case V1_RelationalDataTypeType.BIGINT:
      return deserialize(V1_bigIntRelationalDataTypeModelSchema, json);
    case V1_RelationalDataTypeType.SMALLINT:
      return deserialize(V1_smallIntRelationalDataTypeModelSchema, json);
    case V1_RelationalDataTypeType.TINYINT:
      return deserialize(V1_tinyIntRelationalDataTypeModelSchema, json);
    case V1_RelationalDataTypeType.DATE:
      return deserialize(V1_dateRelationalDataTypeModelSchema, json);
    case V1_RelationalDataTypeType.TIMESTAMP:
      return deserialize(V1_timestampRelationalDataTypeModelSchema, json);
    case V1_RelationalDataTypeType.ARRAY:
      return deserialize(V1_otherRelationalDataTypeModelSchema, json);
    case V1_RelationalDataTypeType.DECIMAL:
      return deserialize(V1_decimalRelationalDataTypeModelSchema, json);
    case V1_RelationalDataTypeType.OTHER:
      return deserialize(V1_otherRelationalDataTypeModelSchema, json);
    default:
      throw new UnsupportedOperationError(
        `Can't deserialize relational column data type '${json._type}'`,
      );
  }
};

const columnModelSchema = createModelSchema(V1_Column, {
  name: primitive(),
  nullable: optional(primitive()),
  type: custom(
    (val) => V1_serializeColType(val),
    (val) => V1_deserializeColType(val),
  ),
});

export const V1_tablePtrModelSchema = createModelSchema(V1_TablePtr, {
  _type: usingConstantValueSchema(V1_TablePtrType),
  database: primitive(),
  schema: primitive(),
  table: primitive(),
});

const V1_filterPointerModelSchema = createModelSchema(V1_FilterPointer, {
  db: primitive(),
  name: primitive(),
});

const V1_joinPointerModelSchema = createModelSchema(V1_JoinPointer, {
  db: primitive(),
  joinType: primitive(),
  name: primitive(),
});

const V1_dynaFuncModelSchema = createModelSchema(V1_DynaFunc, {
  _type: usingConstantValueSchema(V1_RelationalOperationElementType.DYNA_FUNC),
  funcName: primitive(),
  parameters: list(
    custom(
      (val) => V1_serializeRelationalOperationElement(val),
      (val) => V1_deserializeRelationalOperationElement(val),
    ),
  ),
});

const V1_elementWithJoinsModelSchema = createModelSchema(V1_ElementWithJoins, {
  _type: usingConstantValueSchema(
    V1_RelationalOperationElementType.ELEMENT_WITH_JOINS,
  ),
  joins: list(usingModelSchema(V1_joinPointerModelSchema)),
  relationalElement: custom(
    (val) =>
      val === undefined ? SKIP : V1_serializeRelationalOperationElement(val),
    (val) =>
      val === undefined ? SKIP : V1_deserializeRelationalOperationElement(val),
  ),
});

const V1_literalModelSchema = createModelSchema(V1_Literal, {
  _type: usingConstantValueSchema(V1_RelationalOperationElementType.LITERAL),
  value: custom(
    (val) => {
      if (typeof val === 'string' || typeof val === 'number') {
        return val;
      }
      return V1_serializeRelationalOperationElement(val);
    },
    (val) => {
      if (typeof val === 'string' || typeof val === 'number') {
        return val;
      }
      return V1_deserializeRelationalOperationElement(val);
    },
  ),
});

const V1_literalListModelSchema = createModelSchema(V1_LiteralList, {
  _type: usingConstantValueSchema(
    V1_RelationalOperationElementType.LITERAL_LIST,
  ),
  values: list(usingModelSchema(V1_literalModelSchema)),
});

const V1_tableAliasColumnModelSchema = createModelSchema(V1_TableAliasColumn, {
  _type: usingConstantValueSchema(
    V1_RelationalOperationElementType.TABLE_ALIAS_COLUMN,
  ),
  column: primitive(),
  table: usingModelSchema(V1_tablePtrModelSchema),
  tableAlias: primitive(),
});

export function V1_serializeRelationalOperationElement(
  protocol: V1_RelationalOperationElement,
): V1_RelationalOperationElement {
  if (protocol instanceof V1_DynaFunc) {
    return serialize(V1_dynaFuncModelSchema, protocol);
  } else if (protocol instanceof V1_ElementWithJoins) {
    return serialize(V1_elementWithJoinsModelSchema, protocol);
  } else if (protocol instanceof V1_Literal) {
    return serialize(V1_literalModelSchema, protocol);
  } else if (protocol instanceof V1_LiteralList) {
    return serialize(V1_literalListModelSchema, protocol);
  } else if (protocol instanceof V1_TableAliasColumn) {
    return serialize(V1_tableAliasColumnModelSchema, protocol);
  }
  throw new UnsupportedOperationError(
    `Can't serialize relational operation element of type '${
      getClass(protocol).name
    }'`,
  );
}

export function V1_deserializeRelationalOperationElement(
  json: PlainObject<V1_RelationalOperationElement>,
): V1_RelationalOperationElement {
  switch (json._type) {
    case V1_RelationalOperationElementType.DYNA_FUNC:
      return deserialize(V1_dynaFuncModelSchema, json);
    case V1_RelationalOperationElementType.ELEMENT_WITH_JOINS:
      return deserialize(V1_elementWithJoinsModelSchema, json);
    case V1_RelationalOperationElementType.LITERAL:
      return deserialize(V1_literalModelSchema, json);
    case V1_RelationalOperationElementType.LITERAL_LIST:
      return deserialize(V1_literalListModelSchema, json);
    case V1_RelationalOperationElementType.TABLE_ALIAS_COLUMN:
      return deserialize(V1_tableAliasColumnModelSchema, json);
    default:
      throw new UnsupportedOperationError(
        `Can't deserialize relational operation element of type '${json._type}'`,
      );
  }
}

export const V1_filterMappingModelSchema = createModelSchema(V1_FilterMapping, {
  filter: usingModelSchema(V1_filterPointerModelSchema),
  joins: list(usingModelSchema(V1_joinPointerModelSchema)),
});

const V1_columnMappingModelSchema = createModelSchema(V1_ColumnMapping, {
  name: primitive(),
  operation: custom(
    (val) => V1_serializeRelationalOperationElement(val),
    (val) => V1_deserializeRelationalOperationElement(val),
  ),
});

const V1_viewModelSchema = createModelSchema(V1_View, {
  columnMappings: list(usingModelSchema(V1_columnMappingModelSchema)),
  distinct: primitive(),
  filter: usingModelSchema(V1_filterMappingModelSchema),
  groupBy: list(
    custom(
      (val) => V1_serializeRelationalOperationElement(val),
      (val) => V1_deserializeRelationalOperationElement(val),
    ),
  ),
  mainTable: usingModelSchema(V1_tablePtrModelSchema),
  name: primitive(),
  primaryKey: list(primitive()),
});

const V1_schemaModelSchema = createModelSchema(V1_Schema, {
  name: primitive(),
  tables: list(object(V1_Table)),
  views: list(usingModelSchema(V1_viewModelSchema)),
});

const V1_joinModelSchema = createModelSchema(V1_Join, {
  name: primitive(),
  operation: custom(
    (val) => V1_serializeRelationalOperationElement(val),
    (val) => V1_deserializeRelationalOperationElement(val),
  ),
  target: primitive(),
});

const V1_filterModelSchema = createModelSchema(V1_Filter, {
  _type: usingConstantValueSchema(V1_FilterType.STANDARD),
  name: primitive(),
  operation: custom(
    (val) => V1_serializeRelationalOperationElement(val),
    (val) => V1_deserializeRelationalOperationElement(val),
  ),
});

const V1_setupTableSerialization = (
  plugins: PureProtocolProcessorPlugin[],
): void => {
  createModelSchema(V1_Table, {
    columns: list(usingModelSchema(columnModelSchema)),
    milestoning: custom(
      (values) =>
        serializeArray(
          values,
          (value) => V1_serializeMilestoning(value, plugins),
          true,
        ),
      (values) =>
        deserializeArray(
          values,
          (value: PlainObject<V1_Milestoning>) =>
            V1_deserializeMilestoning(value, plugins),
          false,
        ),
    ),
    name: primitive(),
    primaryKey: list(primitive()),
  });
};

const V1_setupRelationalDatabaseConnectionModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): void => {
  createModelSchema(V1_RelationalDatabaseConnection, {
    _type: usingConstantValueSchema(
      V1_ConnectionType.RELATIONAL_DATABASE_CONNECTION,
    ),
    authenticationStrategy: custom(
      (val) => V1_serializeAuthenticationStrategy(val, plugins),
      (val) => V1_deserializeAuthenticationStrategy(val, plugins),
    ),
    datasourceSpecification: custom(
      (val) => V1_serializeDatasourceSpecification(val, plugins),
      (val) => V1_deserializeDatasourceSpecification(val, plugins),
    ),
    store: alias('element', primitive()),
    quoteIdentifiers: optional(primitive()),
    timeZone: optional(primitive()),
    postProcessors: custom(
      (values) =>
        serializeArray(
          values,
          (value) => V1_serializePostProcessor(value, plugins),
          true,
        ),
      (values) =>
        deserializeArray(
          values,
          (value: PlainObject<V1_PostProcessor>) =>
            V1_deserializePostProcessor(value, plugins),
          false,
        ),
    ),
    type: primitive(),
  });
};

export const V1_setupDatabaseSerialization = (
  plugins: PureProtocolProcessorPlugin[],
): void => {
  V1_setupTableSerialization(plugins);
  V1_setupRelationalDatabaseConnectionModelSchema(plugins);
};

export const V1_databaseModelSchema = createModelSchema(V1_Database, {
  _type: usingConstantValueSchema(V1_DATABASE_ELEMENT_PROTOCOL_TYPE),
  filters: list(usingModelSchema(V1_filterModelSchema)),
  includedStores: list(primitive()),
  joins: list(usingModelSchema(V1_joinModelSchema)),
  name: primitive(),
  package: primitive(),
  schemas: list(usingModelSchema(V1_schemaModelSchema)),
});
