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
  DataProductAccessType,
  V1_ModelAccessPointGroupInfo,
  type V1_DataProductArtifact,
} from '@finos/legend-graph';
import { filterByType } from '@finos/legend-shared';

export const resolveDefaultDataProductAccessType = (
  dataProductArtifact: V1_DataProductArtifact,
): { type: DataProductAccessType; id: string } => {
  const modelAcessGroup = dataProductArtifact.accessPointGroups.filter(
    filterByType(V1_ModelAccessPointGroupInfo),
  )[0];
  if (modelAcessGroup) {
    return {
      type: DataProductAccessType.MODEL,
      id: modelAcessGroup.id,
    };
  }

  const native =
    dataProductArtifact.nativeModelAccess?.nativeModelExecutionContexts[0];
  if (native) {
    return {
      type: DataProductAccessType.NATIVE,
      id: native.key,
    };
  }
  throw new Error(
    `Data Product not supported for querying on legend query ${dataProductArtifact.dataProduct.path}. Must contain a model access point or native model access.`,
  );
};
