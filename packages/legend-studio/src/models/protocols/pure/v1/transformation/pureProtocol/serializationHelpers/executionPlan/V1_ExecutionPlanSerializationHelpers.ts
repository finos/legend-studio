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
  SKIP,
} from 'serializr';
import type { PlainObject } from '@finos/legend-studio-shared';
import { deserializeArray, serializeArray } from '@finos/legend-studio-shared';
import {
  deseralizeMap,
  serializeMap,
  usingModelSchema,
  usingConstantValueSchema,
  getClass,
  UnsupportedOperationError,
} from '@finos/legend-studio-shared';
import type { V1_ExecutionPlan } from '../../../../model/executionPlan/V1_ExecutionPlan';
import { V1_SimpleExecutionPlan } from '../../../../model/executionPlan/V1_SimpleExecutionPlan';
import { V1_Protocol } from '../../../../model/V1_Protocol';
import { V1_DataTypeResultType } from '../../../../model/executionPlan/results/V1_DataTypeResultType';
import { V1_TDSResultType } from '../../../../model/executionPlan/results/V1_TDSResultType';
import { V1_TDSColumn } from '../../../../model/executionPlan/results/V1_TDSColumn';
import type { V1_ResultType } from '../../../../model/executionPlan/results/V1_ResultType';
import { V1_multiplicitySchema } from '../V1_CoreSerializationHelper';
import { V1_RelationalTDSInstantiationExecutionNode } from '../../../../model/executionPlan/nodes/V1_RelationalTDSInstantiationExecutionNode';
import { V1_SQLExecutionNode } from '../../../../model/executionPlan/nodes/V1_SQLExecutionNode';
import { V1_SQLResultColumn } from '../../../../model/executionPlan/nodes/V1_SQLResultColumn';
import {
  V1_deserializeDatabaseConnectionValue,
  V1_serializeDatabaseConnectionValue,
} from '../V1_ConnectionSerializationHelper';

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
  enumMapping: custom(
    (val) => (val ? serializeMap(val) : SKIP),
    (val) => (val ? deseralizeMap(val) : undefined),
  ),
  name: primitive(),
  relationalType: optional(primitive()),
  type: optional(primitive()),
});

const TDSResultTypeModelSchema = createModelSchema(V1_TDSResultType, {
  _type: usingConstantValueSchema(V1_ExecutionResultTypeType.TDS),
  tdsColumns: list(usingModelSchema(TDSColumnModelSchema)),
});

const V1_serializeExecutionResultType = (
  protocol: V1_ResultType,
): PlainObject<V1_ResultType> => {
  if (protocol instanceof V1_DataTypeResultType) {
    return serialize(dataTypeResultTypeModelSchema, protocol);
  } else if (protocol instanceof V1_TDSResultType) {
    return serialize(TDSResultTypeModelSchema, protocol);
  }
  throw new UnsupportedOperationError(
    `Can't serialize execution result type of type '${
      getClass(protocol).name
    }'`,
  );
};

const V1_deserializeExecutionResultType = (
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
      custom(
        (val) => V1_serializeExecutionNode(val),
        (val) => V1_deserializeExecutionNode(val),
      ),
    ),
    resultSizeRange: usingModelSchema(V1_multiplicitySchema),
    resultType: custom(
      (val) => V1_serializeExecutionResultType(val),
      (val) => V1_deserializeExecutionResultType(val),
    ),
  },
);

const SQLResultColumnModelSchema = createModelSchema(V1_SQLResultColumn, {
  dataType: primitive(),
  label: primitive(),
});

const SQLExecutionNodeModelSchema = createModelSchema(V1_SQLExecutionNode, {
  _type: usingConstantValueSchema(V1_ExecutionNodeType.SQL),
  connection: custom(
    (val) => V1_serializeDatabaseConnectionValue(val),
    (val) => V1_deserializeDatabaseConnectionValue(val),
  ),
  executionNodes: custom(
    (values) =>
      serializeArray(values, (value) => V1_serializeExecutionNode(value), true),
    (values) =>
      deserializeArray(
        values,
        (value) => V1_deserializeExecutionNode(value),
        false,
      ),
  ),
  onConnectionCloseCommitQuery: optional(primitive()),
  onConnectionCloseRollbackQuery: optional(primitive()),
  resultColumns: list(usingModelSchema(SQLResultColumnModelSchema)),
  resultSizeRange: usingModelSchema(V1_multiplicitySchema),
  resultType: custom(
    (val) => V1_serializeExecutionResultType(val),
    (val) => V1_deserializeExecutionResultType(val),
  ),
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
    `Can't serialize execution node of type '${getClass(protocol).name}'`,
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
      (val) => V1_serializeExecutionNode(val),
      (val) => V1_deserializeExecutionNode(val),
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
    `Can't serialize execution plan of type '${getClass(protocol).name}'`,
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
