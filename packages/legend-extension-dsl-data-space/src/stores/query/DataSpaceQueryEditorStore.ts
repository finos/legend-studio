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
  extractElementNameFromPath,
  QueryTaggedValue,
} from '@finos/legend-graph';
import {
  QueryEditorStore,
  type QueryExportConfiguration,
  type LegendQueryPluginManager,
  type LegendQueryApplicationStore,
} from '@finos/legend-application-query';
import type {
  DepotServerClient,
  ProjectGAVCoordinates,
} from '@finos/legend-server-depot';
import { guaranteeNonNullable, uuid } from '@finos/legend-shared';
import {
  QUERY_PROFILE_PATH,
  QUERY_PROFILE_TAG_DATA_SPACE,
} from '../../DSLDataSpace_Const.js';
import { getDataSpace } from '../../graphManager/DSLDataSpace_GraphManagerHelper.js';

const createQueryDataSpaceTaggedValue = (
  dataSpacePath: string,
): QueryTaggedValue => {
  const taggedValue = new QueryTaggedValue();
  taggedValue.profile = QUERY_PROFILE_PATH;
  taggedValue.tag = QUERY_PROFILE_TAG_DATA_SPACE;
  taggedValue.value = dataSpacePath;
  return taggedValue;
};

export class DataSpaceQueryEditorStore extends QueryEditorStore {
  groupId: string;
  artifactId: string;
  versionId: string;
  dataSpacePath: string;
  executionContext: string;
  runtimePath: string | undefined;
  classPath: string | undefined;

  constructor(
    applicationStore: LegendQueryApplicationStore,
    depotServerClient: DepotServerClient,
    pluginManager: LegendQueryPluginManager,
    groupId: string,
    artifactId: string,
    versionId: string,
    dataSpacePath: string,
    executionContext: string,
    runtimePath: string | undefined,
    executionKey: string | undefined,
  ) {
    super(applicationStore, depotServerClient, pluginManager);

    this.groupId = groupId;
    this.artifactId = artifactId;
    this.versionId = versionId;
    this.dataSpacePath = dataSpacePath;
    this.executionContext = executionContext;
    this.runtimePath = runtimePath;
    this.classPath = executionKey;
  }

  getProjectInfo(): ProjectGAVCoordinates {
    return {
      groupId: this.groupId,
      artifactId: this.artifactId,
      versionId: this.versionId,
    };
  }

  async setUpBuilderState(): Promise<void> {
    this.queryBuilderState.querySetupState.setMappingIsReadOnly(true);
    this.queryBuilderState.querySetupState.setRuntimeIsReadOnly(true);

    const dataSpace = getDataSpace(
      this.dataSpacePath,
      this.graphManagerState.graph,
    );
    const executionContext = guaranteeNonNullable(
      dataSpace.executionContexts.find(
        (context) => context.name === this.executionContext,
      ),
      `Can't find execution context '${this.executionContext}'`,
    );
    this.queryBuilderState.querySetupState.setMapping(
      executionContext.mapping.value,
    );
    this.queryBuilderState.querySetupState.setRuntimeValue(
      (this.runtimePath
        ? this.graphManagerState.graph.getRuntime(this.runtimePath)
        : executionContext.defaultRuntime.value
      ).runtimeValue,
    );

    if (this.classPath) {
      this.queryBuilderState.changeClass(
        this.queryBuilderState.graphManagerState.graph.getClass(this.classPath),
      );
      this.queryBuilderState.querySetupState.setClassIsReadOnly(true);
    } else {
      // TODO?: should we set the class here automatically?

      // initialize query builder state after setting up
      this.queryBuilderState.resetQueryBuilder();
      this.queryBuilderState.resetQuerySetup();
    }
  }

  async getExportConfiguration(): Promise<QueryExportConfiguration> {
    return {
      defaultName: `New Query for ${extractElementNameFromPath(
        this.dataSpacePath,
      )}[${this.executionContext}]`,
      decorator: (query: Query): void => {
        query.id = uuid();
        query.groupId = this.groupId;
        query.artifactId = this.artifactId;
        query.versionId = this.versionId;
        query.taggedValues = [
          createQueryDataSpaceTaggedValue(this.dataSpacePath),
        ];
      },
    };
  }
}
