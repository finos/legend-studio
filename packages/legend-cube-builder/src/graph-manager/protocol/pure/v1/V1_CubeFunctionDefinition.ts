/**
 * Copyright (c) 2026-present, Goldman Sachs
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
  V1_ConcreteFunctionDefinition,
  V1_deserializePackageableElement,
  V1_getFunctionNameWithoutSignature,
  V1_PackageableType,
} from '@finos/legend-graph';
import type { PlainObject } from '@finos/legend-shared';
import type { Schema } from '@finos/legend-cube';
import type { CubeFunctionDefinition } from '../../../CubeDefinitionFunctions.js';
import { V1_buildCubeSchema } from './V1_CubeRelationTypeAdapter.js';

// A user-defined function's element (PLAN §11.33), its protocol
// JSON as Depot or Studio's graph gives it, read for a definition's flow to
// open a call of it: the name a call names it by (its path without the
// signature the element's name carries), its parameters, what it returns,
// and its body. Read through legend-graph's protocol classes.

const RELATION = 'Relation';

const typeName = (path: string): string => path.split('::').at(-1) ?? path;

/** The columns a function declares it returns, `Relation<(a:Integer, …)>`; none for `Relation<Any>` */
const readDeclaredSchema = (content: PlainObject): Schema | undefined => {
  const returnType = content.returnGenericType as PlainObject | undefined;
  const [argument] = (returnType?.typeArguments ?? []) as PlainObject[];
  const rawType = argument?.rawType as PlainObject | undefined;
  if (rawType?._type !== 'relationType') {
    return undefined;
  }
  try {
    return V1_buildCubeSchema(rawType);
  } catch {
    // a column Cube can't type: the columns aren't known
    return undefined;
  }
};

/**
 * A function element's content read, or `undefined` for content that isn't
 * a function's
 */
export const V1_readCubeFunctionDefinition = (
  path: string,
  content: PlainObject,
  origin?: string,
): CubeFunctionDefinition | undefined => {
  let element: unknown;
  try {
    element = V1_deserializePackageableElement(content, []);
  } catch {
    return undefined;
  }
  if (!(element instanceof V1_ConcreteFunctionDefinition)) {
    return undefined;
  }
  const returnRawType = element.returnGenericType.rawType;
  const returnType =
    returnRawType instanceof V1_PackageableType
      ? typeName(returnRawType.fullPath)
      : RELATION;
  return {
    path,
    name: `${element.package}::${V1_getFunctionNameWithoutSignature(element)}`,
    parameters: element.parameters.map((parameter) => {
      const type = typeName(parameter.genericType.rawType.fullPath);
      return {
        name: parameter.name,
        type,
        multiplicity: {
          lowerBound: parameter.multiplicity.lowerBound,
          upperBound: parameter.multiplicity.upperBound,
        },
        isRelation: type === RELATION,
      };
    }),
    returnType,
    returnMultiplicity: {
      lowerBound: element.returnMultiplicity.lowerBound,
      upperBound: element.returnMultiplicity.upperBound,
    },
    returnsRelation: returnType === RELATION,
    declaredSchema: readDeclaredSchema(content),
    body: element.body,
    origin,
  };
};
