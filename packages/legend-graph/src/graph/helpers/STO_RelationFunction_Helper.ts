/**
 * Copyright (c) 2025-present, Goldman Sachs
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

import { isEmpty, isNonNullable } from '@finos/legend-shared';
import type { RelationColumn } from '../metamodel/pure/packageableElements/relation/RelationType.js';
import { InstanceValue } from '../metamodel/pure/valueSpecification/InstanceValue.js';

export const isStubbed_RelationColumn = (column: RelationColumn): boolean =>
  isEmpty(column);

/**
 * A relation column's type, as its name with the values of its type
 * variables, if any: `Varchar(32)`, `Decimal(18, 4)`, `String`
 */
export const getRelationColumnTypeLabel = (column: RelationColumn): string => {
  const typeName = column.genericType.value.rawType.name;
  const args = (column.genericType.value.typeVariableValues ?? [])
    .map((value) =>
      value instanceof InstanceValue ? value.values[0] : undefined,
    )
    .filter(isNonNullable);
  return args.length > 0 ? `${typeName}(${args.join(', ')})` : typeName;
};
