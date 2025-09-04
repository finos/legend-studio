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
  type PureProtocolProcessorPlugin,
  type QueryInfo,
  type PureModel,
  type GraphManagerOperationReport,
  AbstractPureGraphManagerExtension,
} from '@finos/legend-graph';
import type {
  Entity,
  ProjectGAVCoordinates,
  StoredFileGeneration,
} from '@finos/legend-storage';
import {
  type ActionState,
  type PlainObject,
  guaranteeNonNullable,
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

  abstract retrieveDataSpaceAnalysisFromCache(
    cacheRetriever: () => Promise<PlainObject<DataSpaceAnalysisResult>>,
    actionState?: ActionState,
  ): Promise<DataSpaceAnalysisResult | undefined>;

  abstract analyzeDataSpaceCoverage(
    dataSpacePath: string,
    functionEntitiesRetriever: () => Promise<
      [PlainObject<Entity>[], PlainObject<Entity>[]]
    >,
    runtimeEntitiesRetriever: () => Promise<
      [PlainObject<Entity>[], PlainObject<Entity>[]]
    >,
    cacheRetriever?: () => Promise<PlainObject<StoredFileGeneration>[]>,
    actionState?: ActionState,
    graphReport?: GraphManagerOperationReport | undefined,
    pureGraph?: PureModel | undefined,
    executionContext?: string | undefined,
    mappingPath?: string | undefined,
    projectInfo?: ProjectGAVCoordinates,
    templateQueryId?: string,
  ): Promise<DataSpaceAnalysisResult>;

  abstract addNewExecutableToDataSpaceEntity(
    dataSpaceEntity: Entity,
    currentQuery: QueryInfo,
    executable: {
      id: string;
      title: string;
      description?: string;
    },
  ): Promise<Entity>;

  abstract IsTemplateQueryIdValid(dataSpaceEntity: Entity, id: string): boolean;

  abstract buildDataSpaceAnalytics(
    json: PlainObject<V1_DataSpaceAnalysisResult>,
    plugins: PureProtocolProcessorPlugin[],
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
    `Can't find DSL Data Product Pure graph manager extension`,
  );
