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
  type AbstractPureGraphManager,
  AbstractPureGraphManagerExtension,
} from '@finos/legend-graph';
import type { Entity } from '@finos/legend-storage';
import {
  guaranteeNonNullable,
  type ActionState,
  type PlainObject,
} from '@finos/legend-shared';
import type { DataSpaceAnalysisResult } from '../../action/analytics/DataSpaceAnalysis.js';

export abstract class DSL_DataSpace_PureGraphManagerExtension extends AbstractPureGraphManagerExtension {
  abstract analyzeDataSpace(
    dataSpacePath: string,
    entities: Entity[],
    dependencyEntitiesRetriever: () => Promise<Map<string, Entity[]>>,
    cacheRetriever?: () => Promise<PlainObject<DataSpaceAnalysisResult>>,
    actionState?: ActionState,
  ): Promise<DataSpaceAnalysisResult>;
}

export const DSL_DataSpace_getGraphManagerExtension = (
  graphManager: AbstractPureGraphManager,
): DSL_DataSpace_PureGraphManagerExtension =>
  guaranteeNonNullable(
    graphManager.extensions.find(
      (extension) =>
        extension instanceof DSL_DataSpace_PureGraphManagerExtension,
    ),
    `Can't find DSL Data Space Pure graph manager extension`,
  ) as DSL_DataSpace_PureGraphManagerExtension;
