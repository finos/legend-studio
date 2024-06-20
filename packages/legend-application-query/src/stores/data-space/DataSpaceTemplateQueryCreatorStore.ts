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
  QueryProjectCoordinates,
  extractElementNameFromPath,
  type Query,
  type RawLambda,
  type QuerySearchSpecification,
} from '@finos/legend-graph';
import {
  type DepotServerClient,
  StoreProjectData,
} from '@finos/legend-server-depot';
import { filterByType, guaranteeNonNullable, uuid } from '@finos/legend-shared';
import {
  type QueryBuilderState,
  QueryBuilderDataBrowserWorkflow,
} from '@finos/legend-query-builder';
import {
  parseGACoordinates,
  type ProjectGAVCoordinates,
} from '@finos/legend-storage';
import {
  QueryBuilderActionConfig_QueryApplication,
  QueryEditorStore,
  type QueryPersistConfiguration,
} from '../QueryEditorStore.js';
import type { LegendQueryApplicationStore } from '../LegendQueryBaseStore.js';
import {
  DSL_DataSpace_getGraphManagerExtension,
  DataSpaceExecutableTemplate,
  getDataSpace,
  retrieveAnalyticsResultCache,
} from '@finos/legend-extension-dsl-data-space/graph';
import {
  DataSpaceQueryBuilderState,
  createQueryClassTaggedValue,
  createQueryDataSpaceTaggedValue,
  type DataSpaceInfo,
} from '@finos/legend-extension-dsl-data-space/application';
import { createDataSpaceDepoRepo } from './DataSpaceQueryBuilderHelper.js';

export class DataSpaceTemplateQueryCreatorStore extends QueryEditorStore {
  readonly groupId: string;
  readonly artifactId: string;
  readonly versionId: string;
  readonly dataSpacePath: string;
  readonly templateQueryId: string;
  templateQueryTitle?: string;

  constructor(
    applicationStore: LegendQueryApplicationStore,
    depotServerClient: DepotServerClient,
    groupId: string,
    artifactId: string,
    versionId: string,
    dataSpacePath: string,
    templateQueryId: string,
  ) {
    super(applicationStore, depotServerClient);

    this.groupId = groupId;
    this.artifactId = artifactId;
    this.versionId = versionId;
    this.dataSpacePath = dataSpacePath;
    this.templateQueryId = templateQueryId;
  }

  getProjectInfo(): ProjectGAVCoordinates {
    return {
      groupId: this.groupId,
      artifactId: this.artifactId,
      versionId: this.versionId,
    };
  }

  async initializeQueryBuilderState(): Promise<QueryBuilderState> {
    const dataSpace = getDataSpace(
      this.dataSpacePath,
      this.graphManagerState.graph,
    );
    const dataSpaceExecutableTemplate = guaranteeNonNullable(
      dataSpace.executables
        ?.filter(filterByType(DataSpaceExecutableTemplate))
        .find((executable) => executable.id === this.templateQueryId),
      `Can't find template query with id '${this.templateQueryId}'`,
    );
    const executionContext = guaranteeNonNullable(
      dataSpaceExecutableTemplate.executionContextKey
        ? dataSpace.executionContexts.filter(
            (ec) => ec.name === dataSpaceExecutableTemplate.executionContextKey,
          )[0]
        : dataSpace.defaultExecutionContext,
      `Can't find execution context '${dataSpaceExecutableTemplate.executionContextKey}'`,
    );
    this.templateQueryTitle = dataSpaceExecutableTemplate.title;
    let dataSpaceAnalysisResult;
    try {
      const project = StoreProjectData.serialization.fromJson(
        await this.depotServerClient.getProject(this.groupId, this.artifactId),
      );
      dataSpaceAnalysisResult = await DSL_DataSpace_getGraphManagerExtension(
        this.graphManagerState.graphManager,
      ).retrieveDataSpaceAnalysisFromCache(() =>
        retrieveAnalyticsResultCache(
          project,
          this.versionId,
          dataSpace.path,
          this.depotServerClient,
        ),
      );
    } catch {
      // do nothing
    }
    const sourceInfo = {
      groupId: this.groupId,
      artifactId: this.artifactId,
      versionId: this.versionId,
      dataSpace: dataSpace.path,
    };
    const queryBuilderState = new DataSpaceQueryBuilderState(
      this.applicationStore,
      this.graphManagerState,
      QueryBuilderDataBrowserWorkflow.INSTANCE,
      new QueryBuilderActionConfig_QueryApplication(this),
      dataSpace,
      executionContext,
      createDataSpaceDepoRepo(
        this,
        this.groupId,
        this.artifactId,
        this.versionId,
        undefined,
      ),
      (dataSpaceInfo: DataSpaceInfo) => {
        this.applicationStore.notificationService.notifyWarning(
          `Can't switch data space to visit current template query`,
        );
      },
      dataSpaceAnalysisResult,
      undefined,
      undefined,
      undefined,
      this.applicationStore.config.options.queryBuilderConfig,
      sourceInfo,
    );
    queryBuilderState.setExecutionContext(executionContext);
    queryBuilderState.propagateExecutionContextChange(executionContext);
    queryBuilderState.initializeWithQuery(dataSpaceExecutableTemplate.query);
    return queryBuilderState;
  }

  getPersistConfiguration(
    lambda: RawLambda,
    options?: { update?: boolean | undefined },
  ): QueryPersistConfiguration {
    return {
      defaultName: options?.update
        ? `${extractElementNameFromPath(this.dataSpacePath)}`
        : `New Query for ${extractElementNameFromPath(this.dataSpacePath)}[${
            this.templateQueryId
          }]`,
      decorator: (query: Query): void => {
        query.id = uuid();
        query.groupId = this.groupId;
        query.artifactId = this.artifactId;
        query.versionId = this.versionId;
        if (this.queryBuilderState?.class) {
          query.taggedValues = [
            createQueryClassTaggedValue(this.queryBuilderState.class.path),
          ];
        }
      },
    };
  }

  override decorateSearchSpecification(
    val: QuerySearchSpecification,
  ): QuerySearchSpecification {
    const currentProjectCoordinates = new QueryProjectCoordinates();
    currentProjectCoordinates.groupId = this.groupId;
    currentProjectCoordinates.artifactId = this.artifactId;
    val.projectCoordinates = [
      // either get queries for the current project
      currentProjectCoordinates,
      // or any of its dependencies
      ...Array.from(
        this.graphManagerState.graph.dependencyManager.projectDependencyModelsIndex.keys(),
      ).map((dependencyKey) => {
        const { groupId, artifactId } = parseGACoordinates(dependencyKey);
        const coordinates = new QueryProjectCoordinates();
        coordinates.groupId = groupId;
        coordinates.artifactId = artifactId;
        return coordinates;
      }),
    ];
    val.taggedValues = [createQueryDataSpaceTaggedValue(this.dataSpacePath)];
    val.combineTaggedValuesCondition = true;
    return val;
  }
}
