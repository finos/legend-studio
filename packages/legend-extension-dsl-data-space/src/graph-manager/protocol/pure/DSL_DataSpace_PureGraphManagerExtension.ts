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
  type PureProtocolProcessorPlugin,
  type V1_PureModelContextData,
  type PureModel,
  type GraphManagerOperationReport,
} from '@finos/legend-graph';
import type { Entity, ProjectGAVCoordinates } from '@finos/legend-storage';
import {
  guaranteeNonNullable,
  type ActionState,
  type PlainObject,
} from '@finos/legend-shared';
import type { DataSpaceAnalysisResult } from '../../action/analytics/DataSpaceAnalysis.js';
import type { V1_DataSpaceAnalysisResult } from './v1/engine/analytics/V1_DataSpaceAnalysis.js';

export abstract class DSL_DataSpace_PureGraphManagerExtension extends AbstractPureGraphManagerExtension {
  abstract analyzeDataSpace(
    dataSpacePath: string,
    entitiesRetriever: () => Promise<Entity[]>,
    cacheRetriever?: () => Promise<PlainObject<DataSpaceAnalysisResult>>,
    actionState?: ActionState,
  ): Promise<DataSpaceAnalysisResult>;

  abstract analyzeDataSpaceCoverage(
    dataSpacePath: string,
    entitiesRetriever: () => Promise<Entity[]>,
    cacheRetriever?: () => Promise<PlainObject<DataSpaceAnalysisResult>>,
    actionState?: ActionState,
  ): Promise<V1_DataSpaceAnalysisResult>;

  abstract buildDataSpaceAnalytics(
    analytics:
      | PlainObject<V1_DataSpaceAnalysisResult>
      | V1_DataSpaceAnalysisResult,
    plugins: PureProtocolProcessorPlugin[],
    graphReport?: GraphManagerOperationReport | undefined,
    pureGraph?: PureModel | undefined,
    pmcd?: V1_PureModelContextData | undefined,
    projectInfo?: ProjectGAVCoordinates,
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
