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
  deserialize,
  custom,
  serialize,
  primitive,
  list,
  optional,
} from 'serializr';
import {
  type PlainObject,
  optionalCustom,
  deserializeMap,
  serializeMap,
  usingModelSchema,
  usingConstantValueSchema,
  UnsupportedOperationError,
  customList,
} from '@finos/legend-shared';
import type { V1_ExecutionPlan } from '../../../../model/executionPlan/V1_ExecutionPlan.js';
import { V1_SimpleExecutionPlan } from '../../../../model/executionPlan/V1_SimpleExecutionPlan.js';
import { V1_Protocol } from '../../../../model/V1_Protocol.js';
import { V1_DataTypeResultType } from '../../../../model/executionPlan/results/V1_DataTypeResultType.js';
import { V1_TDSResultType } from '../../../../model/executionPlan/results/V1_TDSResultType.js';
import { V1_TDSColumn } from '../../../../model/executionPlan/results/V1_TDSColumn.js';
import type { V1_ResultType } from '../../../../model/executionPlan/results/V1_ResultType.js';
import { V1_multiplicitySchema } from '../V1_CoreSerializationHelper.js';
import { V1_RelationalTDSInstantiationExecutionNode } from '../../../../model/executionPlan/nodes/V1_RelationalTDSInstantiationExecutionNode.js';
import { V1_SQLExecutionNode } from '../../../../model/executionPlan/nodes/V1_SQLExecutionNode.js';
import { V1_SQLResultColumn } from '../../../../model/executionPlan/nodes/V1_SQLResultColumn.js';
import {
  V1_deserializeDatabaseConnectionValue,
  V1_serializeDatabaseConnectionValue,
} from '../V1_ConnectionSerializationHelper.js';

// ---------------------------------------- Result Type ----------------------------------------

export enum V1_ExecutionResultTypeType {
  DATA_TYPE = 'dataType',
  TDS = 'tds',
}

const dataTypeResultTypeModelSchema = createModelSchema(V1_DataTypeResultType, {
  _type: usingConstantValueSchema(V1_ExecutionResultTypeType.DATA_TYPE),
  dataType: primitive(),
});

const TDSColumnModelSchema = createModelSchema(V1_TDSColumn, {
  doc: optional(primitive()),
  enumMapping: optionalCustom(
    (val) => serializeMap(val, (v) => v),
    (val) => deserializeMap(val, (v) => v),
  ),
  name: primitive(),
  relationalType: optional(primitive()),
  type: optional(primitive()),
});

const TDSResultTypeModelSchema = createModelSchema(V1_TDSResultType, {
  _type: usingConstantValueSchema(V1_ExecutionResultTypeType.TDS),
  tdsColumns: list(usingModelSchema(TDSColumnModelSchema)),
});

const V1_serializeResultType = (
  protocol: V1_ResultType,
): PlainObject<V1_ResultType> => {
  if (protocol instanceof V1_DataTypeResultType) {
    return serialize(dataTypeResultTypeModelSchema, protocol);
  } else if (protocol instanceof V1_TDSResultType) {
    return serialize(TDSResultTypeModelSchema, protocol);
  }
  throw new UnsupportedOperationError(
    `Can't serialize execution result type`,
    protocol,
  );
};

const V1_deserializeResultType = (
  json: PlainObject<V1_ResultType>,
): V1_ResultType => {
  switch (json._type) {
    case V1_ExecutionResultTypeType.DATA_TYPE:
      return deserialize(dataTypeResultTypeModelSchema, json);
    case V1_ExecutionResultTypeType.TDS:
      return deserialize(TDSResultTypeModelSchema, json);
    default:
      throw new UnsupportedOperationError(
        `Can't deserialize execution result type of type '${json._type}'`,
      );
  }
};

// ---------------------------------------- Node ----------------------------------------

export enum V1_ExecutionNodeType {
  RELATIONAL_TDS_INSTANTIATION = 'relationalTdsInstantiation',
  SQL = 'sql',
}

const relationalTDSInstantationExecutionNodeModelSchema = createModelSchema(
  V1_RelationalTDSInstantiationExecutionNode,
  {
    _type: usingConstantValueSchema(
      V1_ExecutionNodeType.RELATIONAL_TDS_INSTANTIATION,
    ),
    executionNodes: list(
      custom(V1_serializeExecutionNode, V1_deserializeExecutionNode),
    ),
    resultSizeRange: usingModelSchema(V1_multiplicitySchema),
    resultType: custom(V1_serializeResultType, V1_deserializeResultType),
  },
);

const SQLResultColumnModelSchema = createModelSchema(V1_SQLResultColumn, {
  dataType: primitive(),
  label: primitive(),
});

const SQLExecutionNodeModelSchema = createModelSchema(V1_SQLExecutionNode, {
  _type: usingConstantValueSchema(V1_ExecutionNodeType.SQL),
  connection: custom(
    V1_serializeDatabaseConnectionValue,
    V1_deserializeDatabaseConnectionValue,
  ),
  executionNodes: customList(
    V1_serializeExecutionNode,
    V1_deserializeExecutionNode,
  ),
  onConnectionCloseCommitQuery: optional(primitive()),
  onConnectionCloseRollbackQuery: optional(primitive()),
  resultColumns: list(usingModelSchema(SQLResultColumnModelSchema)),
  resultSizeRange: usingModelSchema(V1_multiplicitySchema),
  resultType: custom(V1_serializeResultType, V1_deserializeResultType),
  sqlQuery: primitive(),
});

export function V1_serializeExecutionNode(
  protocol: V1_ResultType,
): PlainObject<V1_ResultType> {
  if (protocol instanceof V1_RelationalTDSInstantiationExecutionNode) {
    return serialize(
      relationalTDSInstantationExecutionNodeModelSchema,
      protocol,
    );
  } else if (protocol instanceof V1_SQLExecutionNode) {
    return serialize(SQLExecutionNodeModelSchema, protocol);
  }
  throw new UnsupportedOperationError(
    `Can't serialize execution node`,
    protocol,
  );
}

export function V1_deserializeExecutionNode(
  json: PlainObject<V1_ResultType>,
): V1_ResultType {
  switch (json._type) {
    case V1_ExecutionNodeType.RELATIONAL_TDS_INSTANTIATION:
      return deserialize(
        relationalTDSInstantationExecutionNodeModelSchema,
        json,
      );
    case V1_ExecutionNodeType.SQL:
      return deserialize(SQLExecutionNodeModelSchema, json);
    default:
      throw new UnsupportedOperationError(
        `Can't deserialize execution node of type '${json._type}'`,
      );
  }
}

// ---------------------------------------- Plan ----------------------------------------

export enum V1_ExecutionPlanType {
  SINGLE = 'simple',
  COMPOSITE = 'composite',
}

const SimpleExecutionPlanModelSchema = createModelSchema(
  V1_SimpleExecutionPlan,
  {
    // TODO: check why Pure returns plan without _type flag
    // _type: usingConstantValueSchema(V1_ExecutionPlanType.SINGLE),
    authDependent: primitive(),
    kerberos: optional(primitive()),
    rootExecutionNode: custom(
      V1_serializeExecutionNode,
      V1_deserializeExecutionNode,
    ),
    serializer: usingModelSchema(V1_Protocol.serialization.schema),
    templateFunctions: list(primitive()),
  },
);

export const V1_serializeExecutionPlan = (
  protocol: V1_ExecutionPlan,
): PlainObject<V1_ExecutionPlan> => {
  if (protocol instanceof V1_SimpleExecutionPlan) {
    return serialize(SimpleExecutionPlanModelSchema, protocol);
  }
  throw new UnsupportedOperationError(
    `Can't serialize execution plan`,
    protocol,
  );
};

export const V1_deserializeExecutionPlan = (
  json: PlainObject<V1_ExecutionPlan>,
): V1_ExecutionPlan => {
  switch (json._type) {
    case V1_ExecutionPlanType.SINGLE:
    default:
      // TODO: check why Pure returns plan without _type flag
      return deserialize(SimpleExecutionPlanModelSchema, json);
  }
};
