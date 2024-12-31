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
  guaranteeNonNullable,
  UnsupportedOperationError,
  type PlainObject,
  isString,
  isNumber,
  isBoolean,
} from '@finos/legend-shared';
import {
  type ExecutionResult,
  TDSRow,
  ClassExecutionResult,
  JsonExecutionResult,
  TDSExecutionResult,
  TDSBuilder,
  INTERNAL__TDSColumn,
  RawExecutionResult,
  RelationalExecutionActivities,
  type ExecutionActivities,
  UnknownExecutionActivities,
  AggregationAwareActivities,
  BuilderType,
} from '../../../../../../graph-manager/action/execution/ExecutionResult.js';
import {
  type V1_ExecutionResult,
  type V1_TDSBuilder,
  type V1_INTERNAL__TDSColumn,
  type V1_ExecutionActivities,
  V1_ClassExecutionResult,
  V1_JsonExecutionResult,
  V1_TDSExecutionResult,
  V1_RawExecutionResult,
  V1_RelationalExecutionActivities,
  V1_UnknownExecutionActivity,
  V1_AggregationAwareActivities,
  type V1_ResultBuilder,
} from './V1_ExecutionResult.js';
import { V1_INTERNAL__UnknownExecutionResult } from './V1_INTERNAL__UnknownExecutionResult.js';
import { INTERNAL__UnknownExecutionResult } from '../../../../../action/execution/INTERNAL__UnknownExecutionResult.js';

const buildExecutionActivities = (
  protocol: V1_ExecutionActivities,
): ExecutionActivities => {
  if (protocol instanceof V1_RelationalExecutionActivities) {
    const metamodel = new RelationalExecutionActivities(protocol.sql);
    metamodel.comment = protocol.comment;
    return metamodel;
  } else if (protocol instanceof V1_AggregationAwareActivities) {
    const metamodel = new AggregationAwareActivities();
    metamodel.rewrittenQuery = guaranteeNonNullable(
      protocol.rewrittenQuery,
      `Aggregation aware execution activities 'rewritenQuery' field is missing`,
    );
    return metamodel;
  } else if (protocol instanceof V1_UnknownExecutionActivity) {
    const metamodel = new UnknownExecutionActivities(protocol);
    return metamodel;
  }
  throw new UnsupportedOperationError(
    `Can't build execution activities`,
    protocol,
  );
};

const buildJSONExecutionResult = (
  protocol: V1_JsonExecutionResult,
): JsonExecutionResult => {
  const metamodel = new JsonExecutionResult();
  metamodel.values = guaranteeNonNullable(
    protocol.values,
    `JSON execution result 'values' field is missing`,
  );
  return metamodel;
};

const INTERNAL__buildTDSColumn = (
  protocol: V1_INTERNAL__TDSColumn,
): INTERNAL__TDSColumn => {
  const metamodel = new INTERNAL__TDSColumn();
  metamodel.name = guaranteeNonNullable(
    protocol.name,
    `TDS column 'name' field is missing`,
  );
  metamodel.type = protocol.type;
  metamodel.doc = protocol.doc;
  metamodel.relationalType = protocol.relationalType;
  return metamodel;
};

const buildTDSBuilder = (protocol: V1_TDSBuilder): TDSBuilder => {
  const builder = new TDSBuilder();
  builder.columns = protocol.columns.map(INTERNAL__buildTDSColumn);
  return builder;
};

const buildTDSExecutionResult = (
  protocol: V1_TDSExecutionResult,
): TDSExecutionResult => {
  const metamodel = new TDSExecutionResult();
  metamodel.builder = buildTDSBuilder(
    guaranteeNonNullable(
      protocol.builder,
      `TDS execution result 'builder' field is missing`,
    ),
  );
  metamodel.activities = protocol.activities?.map(buildExecutionActivities);
  metamodel.result.columns = (
    protocol.result as {
      columns: string[];
    }
  ).columns;
  metamodel.result.rows = (
    protocol.result as {
      rows: { values: (string | number)[] }[];
    }
  ).rows.map((_row) => {
    const row = new TDSRow();
    row.values = _row.values;
    return row;
  });
  return metamodel;
};

const buildClassExecutionResult = (
  protocol: V1_ClassExecutionResult,
): ClassExecutionResult => {
  const metamodel = new ClassExecutionResult();
  metamodel.objects = guaranteeNonNullable(
    protocol.objects,
    `Class execution result 'objects' field is missing`,
  );
  metamodel.activities = protocol.activities?.map(buildExecutionActivities);
  return metamodel;
};

export const V1_buildExecutionResult = (
  protocol: V1_ExecutionResult,
): ExecutionResult => {
  if (protocol instanceof V1_INTERNAL__UnknownExecutionResult) {
    const metamodel = new INTERNAL__UnknownExecutionResult();
    metamodel.content = protocol.content;
    return metamodel;
  } else if (protocol instanceof V1_ClassExecutionResult) {
    return buildClassExecutionResult(protocol);
  } else if (protocol instanceof V1_TDSExecutionResult) {
    return buildTDSExecutionResult(protocol);
  } else if (protocol instanceof V1_JsonExecutionResult) {
    return buildJSONExecutionResult(protocol);
  } else if (protocol instanceof V1_RawExecutionResult) {
    return new RawExecutionResult(protocol.value);
  }
  throw new UnsupportedOperationError(`Can't build execution result`, protocol);
};

export const V1_deserializeExecutionResult = (
  json: PlainObject<V1_ExecutionResult> | string | null | boolean | number,
): V1_ExecutionResult => {
  if (json === null || isString(json) || isNumber(json) || isBoolean(json)) {
    return new V1_RawExecutionResult(json);
  }
  switch ((json.builder as PlainObject<V1_ResultBuilder> | undefined)?._type) {
    case BuilderType.CLASS_BUILDER:
      return V1_ClassExecutionResult.serialization.fromJson(json);
    case BuilderType.TDS_BUILDER:
      return V1_TDSExecutionResult.serialization.fromJson(json);
    case BuilderType.JSON_BUILDER:
      return V1_JsonExecutionResult.serialization.fromJson(json);
    default: {
      // Fall back to create unknown stub if not supported
      const protocol = new V1_INTERNAL__UnknownExecutionResult();
      protocol.content = json;
      return protocol;
    }
  }
};
