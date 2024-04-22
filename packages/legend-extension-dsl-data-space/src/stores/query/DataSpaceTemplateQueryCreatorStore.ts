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
  extractElementNameFromPath,
  type Query,
  type RawLambda,
} from '@finos/legend-graph';
import {
  QueryEditorStore,
  type QueryPersistConfiguration,
  type LegendQueryApplicationStore,
  createViewProjectHandler,
  createViewSDLCProjectHandler,
} from '@finos/legend-application-query';
import {
  type DepotServerClient,
  StoreProjectData,
} from '@finos/legend-server-depot';
import { filterByType, guaranteeNonNullable, uuid } from '@finos/legend-shared';

import { getDataSpace } from '../../graph-manager/DSL_DataSpace_GraphManagerHelper.js';
import {
  DataSpaceQueryBuilderState,
  DataSpaceProjectInfo,
} from '../query-builder/DataSpaceQueryBuilderState.js';
import type { DataSpaceInfo } from '../shared/DataSpaceInfo.js';
import { generateDataSpaceTemplateQueryCreatorRoute } from '../../__lib__/query/DSL_DataSpace_LegendQueryNavigation.js';
import {
  DataSpaceExecutableTemplate,
  type DataSpaceExecutionContext,
} from '../../graph/metamodel/pure/model/packageableElements/dataSpace/DSL_DataSpace_DataSpace.js';
import type { QueryBuilderState } from '@finos/legend-query-builder';
import type { ProjectGAVCoordinates } from '@finos/legend-storage';
import { DSL_DataSpace_getGraphManagerExtension } from '../../graph-manager/protocol/pure/DSL_DataSpace_PureGraphManagerExtension.js';
import { retrieveAnalyticsResultCache } from '../../graph-manager/action/analytics/DataSpaceAnalysisHelper.js';
import {
  createQueryDataSpaceTaggedValue,
  createQueryClassTaggedValue,
} from './DataSpaceQueryCreatorStore.js';

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
    const projectInfo = new DataSpaceProjectInfo(
      this.groupId,
      this.artifactId,
      this.versionId,
      createViewProjectHandler(this.applicationStore),
      createViewSDLCProjectHandler(
        this.applicationStore,
        this.depotServerClient,
      ),
    );
    const sourceInfo = {
      groupId: projectInfo.groupId,
      artifactId: projectInfo.artifactId,
      versionId: projectInfo.versionId,
      dataSpace: dataSpace.path,
    };
    const queryBuilderState = new DataSpaceQueryBuilderState(
      this.applicationStore,
      this.graphManagerState,
      this.depotServerClient,
      dataSpace,
      executionContext,
      (dataSpaceInfo: DataSpaceInfo) => {
        this.applicationStore.notificationService.notifyWarning(
          `Can't switch data space to visit current template query`,
        );
      },
      true,
      dataSpaceAnalysisResult,
      (ec: DataSpaceExecutionContext) => {
        this.applicationStore.navigationService.navigator.updateCurrentLocation(
          generateDataSpaceTemplateQueryCreatorRoute(
            this.groupId,
            this.artifactId,
            this.versionId,
            dataSpace.path,
            this.templateQueryId,
          ),
        );
      },
      undefined,
      undefined,
      projectInfo,
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
            createQueryDataSpaceTaggedValue(this.dataSpacePath),
            createQueryClassTaggedValue(this.queryBuilderState.class.path),
          ];
        } else {
          query.taggedValues = [
            createQueryDataSpaceTaggedValue(this.dataSpacePath),
          ];
        }
      },
    };
  }
}
