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

import { resolveCubeType, Schema, SchemaColumn } from '@finos/legend-cube';
import {
  V1_CInteger,
  V1_PackageableType,
  type V1_RelationType,
  V1_relationTypeModelSchema,
} from '@finos/legend-graph';
import type { PlainObject } from '@finos/legend-shared';
import { deserialize } from 'serializr';

// The engine's relation type → a Cube schema (PLAN §6.2.6), read through
// legend-graph's protocol schema. Its graph-manager wrappers are bypassed:
// they drop type parameters (D8).

/**
 * The schema of a relation type: one column per relation column, in order,
 * typed by its path and parameters (an unknown type is opaque) and nullable
 * when it may be empty
 */
export const V1_buildCubeSchema = (json: PlainObject): Schema => {
  const relationType = deserialize(
    V1_relationTypeModelSchema,
    json,
  ) as V1_RelationType;
  return new Schema(
    relationType.columns.map((column) => {
      const { rawType, typeVariableValues } = column.genericType;
      if (!(rawType instanceof V1_PackageableType)) {
        throw new Error(`Column "${column.name}" has a type Cube can't read`);
      }
      const params = typeVariableValues.map((value) => {
        if (!(value instanceof V1_CInteger)) {
          throw new Error(
            `Column "${column.name}" has a type parameter Cube can't read`,
          );
        }
        return value.value;
      });
      return new SchemaColumn(
        column.name,
        resolveCubeType(rawType.fullPath, params),
        column.multiplicity.lowerBound === 0,
      );
    }),
  );
};
