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

import { UnsupportedOperationError } from '@finos/legend-shared';
import {
  LakehouseAccessPoint,
  type AccessPoint,
  UnknownAccessPoint,
} from '../../../../../../../../graph/metamodel/pure/dataProduct/DataProduct.js';
import {
  V1_LakehouseAccessPoint,
  V1_UnknownAccessPoint,
  type V1_AccessPoint,
} from '../../../../model/packageableElements/dataProduct/V1_DataProduct.js';
import type { V1_GraphBuilderContext } from '../V1_GraphBuilderContext.js';
import { V1_buildRawLambdaWithResolvedPaths } from './V1_ValueSpecificationPathResolver.js';

export const V1_buildAccessPoint = (
  ap: V1_AccessPoint,
  context: V1_GraphBuilderContext,
): AccessPoint => {
  if (ap instanceof V1_LakehouseAccessPoint) {
    const lakeAccessPoint = new LakehouseAccessPoint(
      ap.id,
      ap.targetEnvironment,
      V1_buildRawLambdaWithResolvedPaths(
        ap.func.parameters,
        ap.func.body,
        context,
      ),
    );
    lakeAccessPoint.reproducible = ap.reproducible;
    lakeAccessPoint.description = ap.description;
    return lakeAccessPoint;
  } else if (ap instanceof V1_UnknownAccessPoint) {
    const unkown = new UnknownAccessPoint(ap.id);
    unkown.content = ap.content;
    return unkown;
  }
  throw new UnsupportedOperationError(
    `Unsupported data product access type ${ap}`,
  );
};
