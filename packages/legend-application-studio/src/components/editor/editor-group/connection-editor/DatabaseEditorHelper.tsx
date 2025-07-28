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
  SerializeIcon,
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
  Json,
  PRECISE_PRIMITIVE_TYPE,
  PRIMITIVE_TYPE,
} from '@finos/legend-graph';

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
  } else if (type instanceof Json) {
    return (
      <SerializeIcon className="relation-source-tree__icon relation-source-tree__icon__json" />
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

export const renderColumnTypeIconFromType = (type: string): React.ReactNode => {
  switch (type) {
    case PRECISE_PRIMITIVE_TYPE.VARCHAR:
      return (
        <StringTypeIcon className="relation-source-tree__icon relation-source-tree__icon__string" />
      );
    case PRIMITIVE_TYPE.BINARY:
      return (
        <BinaryTypeIcon className="relation-source-tree__icon relation-source-tree__icon__binary" />
      );
    case PRIMITIVE_TYPE.BOOLEAN:
      return (
        <ToggleIcon className="relation-source-tree__icon relation-source-tree__icon__boolean" />
      );
    case PRECISE_PRIMITIVE_TYPE.INT:
    case PRECISE_PRIMITIVE_TYPE.TINY_INT:
    case PRECISE_PRIMITIVE_TYPE.U_TINY_INT:
    case PRECISE_PRIMITIVE_TYPE.SMALL_INT:
    case PRECISE_PRIMITIVE_TYPE.U_SMALL_INT:
    case PRECISE_PRIMITIVE_TYPE.U_INT:
    case PRECISE_PRIMITIVE_TYPE.BIG_INT:
    case PRECISE_PRIMITIVE_TYPE.U_BIG_INT:
    case PRECISE_PRIMITIVE_TYPE.FLOAT:
    case PRECISE_PRIMITIVE_TYPE.DOUBLE:
    case PRECISE_PRIMITIVE_TYPE.DECIMAL:
      return (
        <HashtagIcon className="relation-source-tree__icon relation-source-tree__icon__number" />
      );
    case PRECISE_PRIMITIVE_TYPE.STRICTDATE:
    case PRECISE_PRIMITIVE_TYPE.DATETIME:
    case PRECISE_PRIMITIVE_TYPE.STRICTTIME:
      return (
        <ClockIcon className="relation-source-tree__icon relation-source-tree__icon__time" />
      );
    default:
      return (
        <QuestionCircleIcon className="relation-source-tree__icon relation-source-tree__icon__unknown" />
      );
  }
};
