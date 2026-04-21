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

import { IllegalStateError } from '@finos/legend-shared';
import {
  type QueryBuilderState,
  QueryBuilderDataBrowserWorkflow,
} from '@finos/legend-query-builder';
import { QueryBuilderActionConfig_QueryApplication } from '../QueryEditorStore.js';
import type { LegendQueryApplicationStore } from '../LegendQueryBaseStore.js';
import type { DepotServerClient } from '@finos/legend-server-depot';
import { generateDataSpaceTemplateQueryCreatorRoute } from '../../__lib__/DSL_DataSpace_LegendQueryNavigation.js';
import {
  DataSpacePackageableElementExecutable,
  getDataSpace,
  getExecutionContextFromDataspaceExecutable,
  getQueryFromDataspaceExecutable,
} from '@finos/legend-extension-dsl-data-space/graph';
import {
  type ResolvedDataSpaceEntityWithOrigin,
  createQueryDataSpaceTaggedValue,
} from '@finos/legend-extension-dsl-data-space/application';
import { LegendQueryDataSpaceQueryBuilderState } from './query-builder/LegendQueryDataSpaceQueryBuilderState.js';
import { DataProductSelectorState } from './DataProductSelectorState.js';
import { BaseTemplateQueryCreatorStore } from '../BaseTemplateQueryCreatorStore.js';

export class DataSpaceTemplateQueryCreatorStore extends BaseTemplateQueryCreatorStore {
  readonly dataSpacePath: string;

  constructor(
    applicationStore: LegendQueryApplicationStore,
    depotServerClient: DepotServerClient,
    groupId: string,
    artifactId: string,
    versionId: string,
    dataSpacePath: string,
    templateQueryId: string,
    urlQueryParamValues: Record<string, string> | undefined,
  ) {
    super(
      applicationStore,
      depotServerClient,
      groupId,
      artifactId,
      versionId,
      templateQueryId,
      urlQueryParamValues,
    );
    this.dataSpacePath = dataSpacePath;
  }

  override getEditorRoute(): string {
    return generateDataSpaceTemplateQueryCreatorRoute(
      this.groupId,
      this.artifactId,
      this.versionId,
      this.dataSpacePath,
      this.templateQueryId,
    );
  }

  override getEntityPath(): string {
    return this.dataSpacePath;
  }

  override getSearchTaggedValues(): {
    profile: string;
    tag: string;
    value: string;
  }[] {
    return [createQueryDataSpaceTaggedValue(this.dataSpacePath)];
  }

  override getQueryDecoratorTaggedValues():
    | { profile: string; tag: string; value: string }[]
    | undefined {
    return undefined;
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
    const queryBuilderState = new LegendQueryDataSpaceQueryBuilderState(
      this.applicationStore,
      this.graphManagerState,
      QueryBuilderDataBrowserWorkflow.INSTANCE,
      new QueryBuilderActionConfig_QueryApplication(this),
      dataSpace,
      executionContext,
      isLightGraphEnabled,
      this.depotServerClient,
      {
        groupId: this.groupId,
        artifactId: this.artifactId,
        versionId: this.versionId,
      },
      undefined,
      async (dataSpaceInfo: ResolvedDataSpaceEntityWithOrigin) => {
        this.applicationStore.notificationService.notifyWarning(
          `Can't switch data product to visit current template query`,
        );
      },
      new DataProductSelectorState(
        this.depotServerClient,
        this.applicationStore,
      ),
      () => {
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

    const defaultParameters = await this.resolveDefaultParameters(query);
    queryBuilderState.initializeWithQuery(query, defaultParameters);
    return queryBuilderState;
  }
}
