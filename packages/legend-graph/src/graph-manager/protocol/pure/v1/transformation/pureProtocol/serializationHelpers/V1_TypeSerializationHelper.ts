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
  custom,
  deserialize,
  list,
  primitive,
  serialize,
  SKIP,
} from 'serializr';
import { V1_GenericType } from '../../../model/packageableElements/type/V1_GenericType.js';
import { V1_PackageableType } from '../../../model/packageableElements/type/V1_PackageableType.js';
import type { V1_Type } from '../../../model/packageableElements/type/V1_Type.js';
import {
  customList,
  isString,
  optionalCustomList,
  returnUndefOnError,
  UnsupportedOperationError,
  usingConstantValueSchema,
  usingModelSchema,
  type PlainObject,
} from '@finos/legend-shared';
import { V1_Multiplicity } from '../../../model/packageableElements/domain/V1_Multiplicity.js';
import { V1_multiplicityModelSchema } from './V1_CoreSerializationHelper.js';
import { matchFunctionName } from '../../../../../../../graph/MetaModelUtils.js';
import { CORE_PURE_PATH } from '../../../../../../../graph/MetaModelConst.js';
import { V1_getGenericTypeFullPath } from '../../../helpers/V1_DomainHelper.js';
import {
  V1_RelationType,
  V1_RelationTypeColumn,
} from '../../../model/packageableElements/type/V1_RelationType.js';

export enum V1_Type_Type {
  PACKAGEABLE_TYPE = 'packageableType',
  RELATION_TYPE = 'relationType',
}

const packageableTypeSchema = createModelSchema(V1_PackageableType, {
  _type: usingConstantValueSchema(V1_Type_Type.PACKAGEABLE_TYPE),
  fullPath: primitive(),
});

const relationTypeColumnSchema = createModelSchema(V1_RelationTypeColumn, {
  name: primitive(),
  type: primitive(),
});

const relationTypeSchema = createModelSchema(V1_RelationType, {
  _type: usingConstantValueSchema(V1_Type_Type.RELATION_TYPE),
  columns: list(usingModelSchema(relationTypeColumnSchema)),
});

export function V1_deserializeType(json: PlainObject<V1_Type>): V1_Type {
  switch (json._type) {
    case V1_Type_Type.PACKAGEABLE_TYPE:
      return deserialize(packageableTypeSchema, json);
    case V1_Type_Type.RELATION_TYPE:
      return deserialize(relationTypeSchema, json);
    default:
      throw new UnsupportedOperationError(
        `Can't deserialize type: '${json._type}'`,
      );
  }
}

export function V1_serializeType(protocol: V1_Type): PlainObject<V1_Type> {
  if (protocol instanceof V1_PackageableType) {
    return serialize(packageableTypeSchema, protocol);
  } else if (protocol instanceof V1_RelationType) {
    return serialize(relationTypeSchema, protocol);
  }

  throw new UnsupportedOperationError(`Can't serialize type`, protocol);
}

export const V1_GenericTypeModelSchema = createModelSchema(V1_GenericType, {
  multiplicityArguments: customList(
    (val: V1_Multiplicity) => serialize(V1_multiplicityModelSchema, val),
    (val) => deserialize(V1_multiplicityModelSchema, val),
    {
      INTERNAL__forceReturnEmptyInTest: true,
    },
  ),
  rawType: custom(
    (val) => V1_serializeType(val),
    (val) => V1_deserializeType(val),
  ),
  typeArguments: optionalCustomList(
    // To avoid circular dependency, we need to use V1_GenericType object model schema
    // instead of the static V1_GenericType model schema
    (value) => serialize(V1_GenericType, value),
    (value) => deserialize(V1_GenericType, value),
    {
      INTERNAL__forceReturnEmptyInTest: true,
    },
  ),
  typeVariableValues: optionalCustomList(
    // TODO
    (value) => SKIP,
    (value) => SKIP,
    {
      INTERNAL__forceReturnEmptyInTest: true,
    },
  ),
});

const appendAnyGenericType = (current: V1_GenericType): void => {
  current.multiplicityArguments = [new V1_Multiplicity(1, undefined)];
  const _anytype = new V1_PackageableType();
  _anytype.fullPath = CORE_PURE_PATH.ANY;
  const arGenType = new V1_GenericType();
  arGenType.rawType = _anytype;
  current.typeArguments = [arGenType];
};

export const V1_deserializeGenericType = (
  val: PlainObject<V1_GenericType> | string,
): V1_GenericType => {
  /** @backwardCompatibility */
  let genType: V1_GenericType;
  if (isString(val)) {
    genType = new V1_GenericType();
    const packageableType = new V1_PackageableType();
    packageableType.fullPath = val;
    genType.rawType = packageableType;
    if (matchFunctionName(val, CORE_PURE_PATH.TABULAR_RESULT)) {
      appendAnyGenericType(genType);
    }
  } else {
    genType = deserialize(V1_GenericTypeModelSchema, val);
  }
  const classPath = returnUndefOnError(() =>
    V1_getGenericTypeFullPath(genType),
  );
  if (
    classPath &&
    matchFunctionName(classPath, CORE_PURE_PATH.TABULAR_RESULT) &&
    !genType.multiplicityArguments.length &&
    !genType.typeArguments.length
  ) {
    appendAnyGenericType(genType);
  }
  return genType;
};
