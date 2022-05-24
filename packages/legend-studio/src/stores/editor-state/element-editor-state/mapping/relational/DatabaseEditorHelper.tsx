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
  BinaryTypeIcon,
  ToggleIcon,
  ClockIcon,
  HashtagIcon,
  QuestionCircleIcon,
  StringTypeIcon,
  ShapeTriangleIcon,
} from '@finos/legend-art';
import {
  type RelationalDataType,
  Real,
  Binary,
  Bit,
  Other,
  Date,
  Timestamp,
  Numeric,
  Decimal,
  VarBinary,
  Char,
  VarChar,
  Double,
  Float,
  Integer,
  TinyInt,
  SmallInt,
  BigInt,
  SemiStructured,
} from '@finos/legend-graph';

export const generateColumnTypeLabel = (type: RelationalDataType): string => {
  if (type instanceof VarChar) {
    return `VARCHAR(${type.size})`;
  } else if (type instanceof Char) {
    return `CHAR(${type.size})`;
  } else if (type instanceof VarBinary) {
    return `VARBINARY(${type.size})`;
  } else if (type instanceof Binary) {
    return `BINARY(${type.size})`;
  } else if (type instanceof Bit) {
    return `BIT`;
  } else if (type instanceof Numeric) {
    return `NUMERIC(${type.precision},${type.scale})`;
  } else if (type instanceof Decimal) {
    return `DECIMAL(${type.precision},${type.scale})`;
  } else if (type instanceof Double) {
    return `DOUBLE`;
  } else if (type instanceof Float) {
    return `FLOAT`;
  } else if (type instanceof Real) {
    return `REAL`;
  } else if (type instanceof Integer) {
    return `INT`;
  } else if (type instanceof BigInt) {
    return `BIGINT`;
  } else if (type instanceof SmallInt) {
    return `SMALLINT`;
  } else if (type instanceof TinyInt) {
    return `TINYINT`;
  } else if (type instanceof Date) {
    return `DATE`;
  } else if (type instanceof Timestamp) {
    return `TIMESTAMP`;
  } else if (type instanceof Other) {
    return `OTHER`;
  } else if (type instanceof SemiStructured) {
    return 'SEMI-STRUCTURED';
  }
  return '(UNKNOWN)';
};

export const renderColumnTypeIcon = (
  type: RelationalDataType,
): React.ReactNode => {
  if (type instanceof VarChar || type instanceof Char) {
    return (
      <StringTypeIcon className="relation-source-tree__icon relation-source-tree__icon__string" />
    );
  } else if (type instanceof VarBinary || type instanceof Binary) {
    return (
      <BinaryTypeIcon className="relation-source-tree__icon relation-source-tree__icon__binary" />
    );
  } else if (type instanceof Bit) {
    return (
      <ToggleIcon className="relation-source-tree__icon relation-source-tree__icon__boolean" />
    );
  } else if (
    type instanceof Numeric ||
    type instanceof Decimal ||
    type instanceof Double ||
    type instanceof Float ||
    type instanceof Real ||
    type instanceof Integer ||
    type instanceof BigInt ||
    type instanceof SmallInt ||
    type instanceof TinyInt
  ) {
    return (
      <HashtagIcon className="relation-source-tree__icon relation-source-tree__icon__number" />
    );
  } else if (type instanceof Date || type instanceof Timestamp) {
    return (
      <ClockIcon className="relation-source-tree__icon relation-source-tree__icon__time" />
    );
  } else if (type instanceof SemiStructured) {
    return (
      <ShapeTriangleIcon className="relation-source-tree__icon relation-source-tree__icon__semi-structured" />
    );
  } else if (type instanceof Other) {
    return (
      <QuestionCircleIcon className="relation-source-tree__icon relation-source-tree__icon__unknown" />
    );
  }
  return (
    <QuestionCircleIcon className="relation-source-tree__icon relation-source-tree__icon__unknown" />
  );
};
