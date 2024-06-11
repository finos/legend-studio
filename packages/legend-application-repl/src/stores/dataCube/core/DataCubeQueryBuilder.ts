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
  V1_AppliedFunction,
  V1_ClassInstance,
  V1_ClassInstanceType,
  V1_ColSpec,
  V1_Collection,
  V1_Multiplicity,
  V1_PackageableElementPtr,
  V1_deserializeValueSpecification,
  extractElementNameFromPath,
  type V1_Lambda,
  type V1_ValueSpecification,
} from '@finos/legend-graph';
import type { DataCubeQuerySnapshot } from './DataCubeQuerySnapshot.js';
import { guaranteeNonNullable } from '@finos/legend-shared';
import {
  DATA_CUBE_COLUMN_SORT_DIRECTION,
  DATA_CUBE_FUNCTIONS,
} from '../DataCubeMetaModelConst.js';

function createColSpec(
  name: string,
  type?: string | undefined,
  function1?: V1_Lambda | undefined,
  function2?: V1_Lambda | undefined,
): V1_ClassInstance {
  const instance = new V1_ClassInstance();
  instance.type = V1_ClassInstanceType.COL_SPEC;
  const colSpec = new V1_ColSpec();
  colSpec.name = name;
  colSpec.type = type;
  colSpec.function1 = function1;
  colSpec.function2 = function2;
  instance.value = colSpec;
  return instance;
}

export function buildExecutableQueryFromSnapshot(
  snapshot: DataCubeQuerySnapshot,
): V1_ValueSpecification {
  const sourceQuery = V1_deserializeValueSpecification(
    snapshot.sourceQuery,
    [],
  );
  const sequence: V1_AppliedFunction[] = [];

  // --------------------------------- LEAF EXTEND ---------------------------------
  // TODO: @akphi - implement this

  // --------------------------------- FILTER ---------------------------------
  // TODO: @akphi - implement this

  // --------------------------------- RENAME ---------------------------------
  // TODO: @akphi - implement this

  // --------------------------------- GROUP BY ---------------------------------
  // TODO: @akphi - implement this

  // --------------------------------- SELECT ---------------------------------
  // TODO: @akphi - implement this

  // --------------------------------- PIVOT ---------------------------------
  // TODO: @akphi - implement this

  // --------------------------------- CAST ---------------------------------
  // TODO: @akphi - implement this

  // --------------------------------- GROUP EXTEND ---------------------------------
  // TODO: @akphi - implement this

  // --------------------------------- SORT ---------------------------------

  if (snapshot.sortColumns.length) {
    const sort = new V1_AppliedFunction();
    sort.function = extractElementNameFromPath(DATA_CUBE_FUNCTIONS.SORT);
    const sortInfos = new V1_Collection();
    sortInfos.multiplicity = new V1_Multiplicity(
      snapshot.sortColumns.length,
      snapshot.sortColumns.length,
    );
    snapshot.sortColumns.forEach((sortCol) => {
      const sortInfo = new V1_AppliedFunction();
      sortInfo.function = extractElementNameFromPath(
        sortCol.direction === DATA_CUBE_COLUMN_SORT_DIRECTION.ASCENDING
          ? DATA_CUBE_FUNCTIONS.ASC
          : DATA_CUBE_FUNCTIONS.DESC,
      );
      sortInfo.parameters.push(createColSpec(sortCol.name));
      sortInfos.values.push(sortInfo);
    });
    sort.parameters.push(sortInfos);
    sequence.push(sort);
  }

  // --------------------------------- LIMIT ---------------------------------
  // TODO: @akphi - implement this

  // --------------------------------- FROM ---------------------------------

  const fromFunc = new V1_AppliedFunction();
  fromFunc.function = extractElementNameFromPath(DATA_CUBE_FUNCTIONS.FROM);
  const runtimePtr = new V1_PackageableElementPtr();
  runtimePtr.fullPath = snapshot.runtime;
  fromFunc.parameters.push(runtimePtr);
  sequence.push(fromFunc);

  // --------------------------------- FINALIZE ---------------------------------

  if (!sequence.length) {
    return sourceQuery;
  }
  for (let i = 0; i < sequence.length; i++) {
    guaranteeNonNullable(sequence[i]).parameters.unshift(
      i === 0 ? sourceQuery : guaranteeNonNullable(sequence[i - 1]),
    );
  }

  return guaranteeNonNullable(sequence[sequence.length - 1]);
}

// export async function buildPersistentQueryFromSnapshot(
//   snapshot: DataCubeQuerySnapshot,
// ) {
//   return new DataCubeQuery(
//     snapshot.name,
//     snapshot.sourceQuery,
//     snapshot.configuration,
//   );
// }

// name!: string;
// query!: string;
// partialQuery!: string;
// source!: DataCubeQuerySource;
// configuration!: DataCubeConfiguration;
