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
  type Query,
  type QuerySearchSpecification,
  type RawLambda,
  QueryProjectCoordinates,
  extractElementNameFromPath,
} from '@finos/legend-graph';
import { type DepotServerClient } from '@finos/legend-server-depot';
import {
  IllegalStateError,
  uuid,
  type GeneratorFn,
} from '@finos/legend-shared';
import {
  type QueryBuilderState,
  QueryBuilderDataBrowserWorkflow,
} from '@finos/legend-query-builder';
import {
  type ProjectGAVCoordinates,
  parseGACoordinates,
} from '@finos/legend-storage';
import {
  type QueryPersistConfiguration,
  QueryBuilderActionConfig_QueryApplication,
  QueryEditorStore,
} from '../QueryEditorStore.js';
import type { LegendQueryApplicationStore } from '../LegendQueryBaseStore.js';
import {
  DataSpacePackageableElementExecutable,
  getDataSpace,
  getExecutionContextFromDataspaceExecutable,
  getQueryFromDataspaceExecutable,
} from '@finos/legend-extension-dsl-data-space/graph';
import {
  type DataSpaceInfo,
  DataSpaceQueryBuilderState,
  createQueryClassTaggedValue,
  createQueryDataSpaceTaggedValue,
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

  override *buildGraph(): GeneratorFn<void> {
    // do nothing
  }

  async initializeQueryBuilderState(): Promise<QueryBuilderState> {
    const { dataSpaceAnalysisResult, isLightGraphEnabled } =
      await this.buildGraphAndDataspaceAnalyticsResult(
        this.groupId,
        this.artifactId,
        this.versionId,
        undefined,
        this.dataSpacePath,
        this.templateQueryId,
      );
    const dataSpace = getDataSpace(
      this.dataSpacePath,
      this.graphManagerState.graph,
    );
    let query;
    let executionContext;
    if (dataSpace.executables && dataSpace.executables.length > 0) {
      let template = dataSpace.executables.find(
        (ex) => ex.id === this.templateQueryId,
      );
      if (!template) {
        template = dataSpace.executables.find(
          (executable) =>
            executable instanceof DataSpacePackageableElementExecutable &&
            executable.executable.value.path === this.templateQueryId,
        );
      }
      if (!template) {
        throw new IllegalStateError(
          `Can't find template query with id '${this.templateQueryId}'`,
        );
      }
      executionContext = getExecutionContextFromDataspaceExecutable(
        dataSpace,
        template,
      );
      query = getQueryFromDataspaceExecutable(template, this.graphManagerState);
      this.templateQueryTitle = template.title;
    } else {
      let template = dataSpaceAnalysisResult?.executables.find(
        (executable) => executable.info?.id === this.templateQueryId,
      );
      if (!template) {
        template = dataSpaceAnalysisResult?.executables.find(
          (executable) => executable.executable === this.templateQueryId,
        );
      }
      if (!template) {
        throw new IllegalStateError(
          `Can't find template query with id '${this.templateQueryId}'`,
        );
      }
      executionContext =
        template.info?.executionContextKey === undefined
          ? dataSpace.defaultExecutionContext
          : dataSpace.executionContexts.find(
              (ex) => ex.name === template.info?.executionContextKey,
            );
      if (template.info) {
        query = await this.graphManagerState.graphManager.pureCodeToLambda(
          template.info.query,
        );
      }
      this.templateQueryTitle = template.title;
    }
    if (!query) {
      throw new IllegalStateError(
        `Can't fetch query from data product executable`,
      );
    }
    if (!executionContext) {
      throw new IllegalStateError(
        `Can't find a correpsonding execution context`,
      );
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
      isLightGraphEnabled,
      createDataSpaceDepoRepo(
        this,
        this.groupId,
        this.artifactId,
        this.versionId,
        undefined,
      ),
      async (dataSpaceInfo: DataSpaceInfo) => {
        this.applicationStore.notificationService.notifyWarning(
          `Can't switch data product to visit current template query`,
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
    await queryBuilderState.propagateExecutionContextChange(true);
    queryBuilderState.initializeWithQuery(query);
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
