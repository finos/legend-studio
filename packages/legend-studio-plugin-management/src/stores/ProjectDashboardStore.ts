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

import type { GeneratorFn, PlainObject } from '@finos/legend-shared';
import { makeAutoObservable } from 'mobx';
import type { ApplicationStore } from '@finos/legend-studio';
import type { SDLCServerClient } from '@finos/legend-server-sdlc';
import { Build, Project, ProjectType } from '@finos/legend-server-sdlc';

export class ProjectDashboardStore {
  applicationStore: ApplicationStore;
  sdlcServerClient: SDLCServerClient;
  projects: Map<string, Project> = new Map<string, Project>();
  /**
   * `undefined` when we are loading the build
   * `null` when there are no builds available
   */
  currentBuildByProject: Map<string, Build | undefined | null> = new Map<
    string,
    Build | undefined | null
  >();
  isFetchingProjects = false;

  constructor(
    applicationStore: ApplicationStore,
    sdlcServerClient: SDLCServerClient,
  ) {
    makeAutoObservable(this, {
      applicationStore: false,
      sdlcServerClient: false,
    });

    this.applicationStore = applicationStore;
    this.sdlcServerClient = sdlcServerClient;
  }

  *fetchProjects(): GeneratorFn<void> {
    this.isFetchingProjects = true;
    try {
      yield Promise.all([
        this.fetchProjectByType(ProjectType.PRODUCTION),
        this.fetchProjectByType(ProjectType.PROTOTYPE),
      ]);
    } catch (error: unknown) {
      this.applicationStore.notifyError(error);
    } finally {
      this.isFetchingProjects = false;
    }
  }

  *fetchProjectByType(projectType: ProjectType): GeneratorFn<void> {
    const projects = (
      (yield this.sdlcServerClient.getProjects(
        projectType,
        false,
        undefined,
        undefined,
      )) as PlainObject<Project>[]
    ).map((project) => Project.serialization.fromJson(project));
    projects.forEach((project) =>
      this.projects.set(project.projectId, project),
    );
    projects.forEach((project) =>
      this.currentBuildByProject.set(project.projectId, undefined),
    );
    yield Promise.all(
      projects.map((project) => this.fetchProjectCurrentBuildStatus(project)),
    );
  }

  *fetchProjectCurrentBuildStatus(project: Project): GeneratorFn<void> {
    try {
      const builds = (yield this.sdlcServerClient.getBuilds(
        project.projectId,
        undefined,
        undefined,
        undefined,
        1,
      )) as PlainObject<Build>[];
      this.currentBuildByProject.set(
        project.projectId,
        builds.length !== 0 ? Build.serialization.fromJson(builds[0]) : null,
      );
    } catch (error: unknown) {
      this.applicationStore.notifyError(error);
    }
  }
}
