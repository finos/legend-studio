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
  type LegendStudioApplicationStore,
  EditorStore,
} from '@finos/legend-application-studio';
import { GraphManagerState } from '@finos/legend-graph';
import type { QueryBuilderState } from '@finos/legend-query-builder';
import { DepotServerClient, ProjectData } from '@finos/legend-server-depot';
import { SDLCServerClient, WorkspaceType } from '@finos/legend-server-sdlc';
import type { GeneratorFn } from '@finos/legend-shared';
import { flow, flowResult, makeObservable } from 'mobx';
import { parseServiceCoordinates } from './DSL_Service_LegendStudioRouter.js';

type ProjectServiceCoordinates = {
  projectId: string;
  groupWorkspaceId: string;
  servicePath: string;
};

export abstract class ServiceQueryEditorStore extends EditorStore {
  queryBuilderState?: QueryBuilderState | undefined;

  constructor(
    applicationStore: LegendStudioApplicationStore,
    sdlcServerClient: SDLCServerClient,
    depotServerClient: DepotServerClient,
  ) {
    const graphManagerState = new GraphManagerState(
      applicationStore.pluginManager,
      applicationStore.log,
    );
    super(
      applicationStore,
      sdlcServerClient,
      depotServerClient,
      graphManagerState,
    );

    makeObservable(this, {
      initializeWithServiceQuery: flow,
    });
  }

  abstract fetchServiceInformation(): Promise<ProjectServiceCoordinates>;

  *initializeWithServiceQuery(): GeneratorFn<void> {
    const serviceInfo =
      (yield this.fetchServiceInformation()) as ProjectServiceCoordinates;

    yield flowResult(
      this.initialize(
        serviceInfo.projectId,
        serviceInfo.groupWorkspaceId,
        WorkspaceType.GROUP,
      ),
    );

    // do something
    console.log(
      'a;aaa',
      this.graphManagerState.graph.getService(serviceInfo.servicePath),
    );
  }
}

export class ServiceQueryUpdaterStore extends ServiceQueryEditorStore {
  readonly serviceCoordinates: string;
  readonly groupWorkspaceId: string;

  constructor(
    applicationStore: LegendStudioApplicationStore,
    sdlcServerClient: SDLCServerClient,
    depotServerClient: DepotServerClient,
    serviceCoordinates: string,
    groupWorkspaceId: string,
  ) {
    super(applicationStore, sdlcServerClient, depotServerClient);

    this.serviceCoordinates = serviceCoordinates;
    this.groupWorkspaceId = groupWorkspaceId;
  }

  async fetchServiceInformation(): Promise<ProjectServiceCoordinates> {
    const { groupId, artifactId, servicePath } = parseServiceCoordinates(
      this.serviceCoordinates,
    );
    const project = ProjectData.serialization.fromJson(
      await this.depotServerClient.getProject(groupId, artifactId),
    );

    return {
      projectId: project.projectId,
      groupWorkspaceId: this.groupWorkspaceId,
      servicePath,
    };
  }
}

export class ProjectServiceQueryUpdaterStore extends ServiceQueryEditorStore {
  readonly projectId: string;
  readonly groupWorkspaceId: string;
  readonly servicePath: string;

  constructor(
    applicationStore: LegendStudioApplicationStore,
    sdlcServerClient: SDLCServerClient,
    depotServerClient: DepotServerClient,
    projectId: string,
    groupWorkspaceId: string,
    servicePath: string,
  ) {
    super(applicationStore, sdlcServerClient, depotServerClient);

    this.projectId = projectId;
    this.groupWorkspaceId = groupWorkspaceId;
    this.servicePath = servicePath;
  }

  async fetchServiceInformation(): Promise<ProjectServiceCoordinates> {
    return {
      projectId: this.projectId,
      groupWorkspaceId: this.groupWorkspaceId,
      servicePath: this.servicePath,
    };
  }
}
