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

export const V1_genericTypeModelSchema = createModelSchema(V1_GenericType, {
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

const packageableTypeModelSchema = createModelSchema(V1_PackageableType, {
  _type: usingConstantValueSchema(V1_Type_Type.PACKAGEABLE_TYPE),
  fullPath: primitive(),
});

const V1_relationTypeColumnModelSchema = createModelSchema(
  V1_RelationTypeColumn,
  {
    name: primitive(),
    genericType: custom(
      (val) => serialize(V1_genericTypeModelSchema, val),
      (val) => V1_deserializeGenericType(val),
      {
        beforeDeserialize: function (callback, jsonValue, jsonParentValue) {
          /** @backwardCompatibility */
          if (
            jsonParentValue.type !== undefined &&
            jsonParentValue.genericType === undefined
          ) {
            callback(null, jsonParentValue.type);
          } else {
            callback(null, jsonParentValue.genericType);
          }
        },
      },
    ),
  },
);

export const V1_relationTypeModelSchema = createModelSchema(V1_RelationType, {
  _type: usingConstantValueSchema(V1_Type_Type.RELATION_TYPE),
  columns: list(usingModelSchema(V1_relationTypeColumnModelSchema)),
});

export function V1_deserializeType(json: PlainObject<V1_Type>): V1_Type {
  switch (json._type) {
    case V1_Type_Type.PACKAGEABLE_TYPE:
      return deserialize(packageableTypeModelSchema, json);
    case V1_Type_Type.RELATION_TYPE:
      return deserialize(V1_relationTypeModelSchema, json);
    default:
      throw new UnsupportedOperationError(
        `Can't deserialize type: '${json._type}'`,
      );
  }
}

export function V1_serializeType(protocol: V1_Type): PlainObject<V1_Type> {
  if (protocol instanceof V1_PackageableType) {
    return serialize(packageableTypeModelSchema, protocol);
  } else if (protocol instanceof V1_RelationType) {
    return serialize(V1_relationTypeModelSchema, protocol);
  }
  throw new UnsupportedOperationError(`Can't serialize type`, protocol);
}

const appendAnyGenericType = (current: V1_GenericType): void => {
  current.multiplicityArguments = [new V1_Multiplicity(1, undefined)];
  const _anytype = new V1_PackageableType();
  _anytype.fullPath = CORE_PURE_PATH.ANY;
  const arGenType = new V1_GenericType();
  arGenType.rawType = _anytype;
  current.typeArguments = [arGenType];
};

export function V1_deserializeGenericType(
  val: PlainObject<V1_GenericType> | string,
): V1_GenericType {
  /** @backwardCompatibility */
  let genericType: V1_GenericType;
  if (isString(val)) {
    genericType = new V1_GenericType();
    const packageableType = new V1_PackageableType();
    packageableType.fullPath = val;
    genericType.rawType = packageableType;
    if (matchFunctionName(val, CORE_PURE_PATH.TABULAR_RESULT)) {
      appendAnyGenericType(genericType);
    }
  } else {
    genericType = deserialize(V1_genericTypeModelSchema, val);
  }
  const classPath = returnUndefOnError(() =>
    V1_getGenericTypeFullPath(genericType),
  );
  if (
    classPath &&
    matchFunctionName(classPath, CORE_PURE_PATH.TABULAR_RESULT) &&
    !genericType.multiplicityArguments.length &&
    !genericType.typeArguments.length
  ) {
    appendAnyGenericType(genericType);
  }
  return genericType;
}
