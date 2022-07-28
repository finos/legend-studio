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

import { Workspace } from '@finos/legend-server-sdlc';
import { Project } from '@finos/legend-server-sdlc';
import {
  generateEnumerableNameFromToken,
  GeneratorFn,
  PlainObject,
} from '@finos/legend-shared';
import { ActionState, guaranteeNonNullable } from '@finos/legend-shared';
import { flow, makeObservable, observable } from 'mobx';
import type { QueryEditorStore } from './QueryEditorStore.js';
import type { SDLCInstanceOption } from './QuerySDLCState.js';

export class QueryServiceState {
  queryEditorStore: QueryEditorStore;

  // options
  project: Project | undefined;
  projects: Project[] | undefined;
  workspaces: Workspace[] = [];
  workspaceName = '';
  initializingState = ActionState.create();
  openModal = false;

  constructor(editorStore: QueryEditorStore) {
    this.queryEditorStore = editorStore;

    makeObservable(this, {
      promote: flow,
      projects: observable,
      workspaces: observable,
      initializingState: observable,
    });
  }

  *init(): GeneratorFn<void> {
    try {
      if (this.projects === undefined) {
        const sdlcServer = this.queryEditorStore.sdlcState.sdlcServer;
        // TODO: should default just to users ?
        const projects = (
          (yield sdlcServer.getProjects(
            undefined,
            undefined,
            undefined,
            undefined,
          )) as PlainObject<Project>[]
        ).map((v) => Project.serialization.fromJson(v));
        this.projects = projects;
        const associatedSdlcProject = projects.find(
          (project) =>
            project.projectId ===
            this.queryEditorStore.sdlcState.depotProject?.projectId,
        );
        this.project = associatedSdlcProject ?? projects[0];
        const project = this.project;
        if (project) {
          this.workspaces = (
            (yield sdlcServer.getWorkspaces(
              project.projectId,
            )) as PlainObject<Workspace>[]
          ).map((v) => Workspace.serialization.fromJson(v));
          const workspaceName = generateEnumerableNameFromToken(
            this.workspaces.map((w) => w.workspaceId),
            `promoteServiceWorkspace`,
          );
          this.workspaceName = workspaceName;
        }
        this.openModal = true;
      }
    } catch (error) {

    }
  }



  *fetchProjectMetadata(): void {
    try {


    }


    catch(error){



    }

  }

  // *promote(): void {
  //   try {
  //     const project = guaranteeNonNullable(this.project);
  //     const entities =
  //       yield this.queryEditorStore.sdlcState.sdlcServer.getEntities(
  //         project.projectId,
  //         undefined,
  //       );

  //     const service = new

  //   } catch (error) {

  //   }
  // }
}
