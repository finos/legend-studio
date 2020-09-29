/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, { createContext, useContext } from 'react';
import { guaranteeNonNullable, isNonNullable } from 'Utilities/GeneralUtil';
import { observable, flow } from 'mobx';
import { sdlcClient } from 'API/SdlcClient';
import { Log, LOG_EVENT } from 'Utilities/Logger';
import { Project, ProjectType } from 'SDLC/project/Project';
import { useApplicationStore, ApplicationStore } from 'Stores/ApplicationStore';
import { deserialize } from 'serializr';
import { Build } from 'SDLC/build/Build';
import { useLocalStore } from 'mobx-react-lite';

export class ProjectDashboardStore {
  applicationStore: ApplicationStore;
  @observable projects: Map<string, Project> = new Map<string, Project>();
  /**
   * `undefined` when we are loading the build
   * `null` when there are no builds available
   */
  @observable currentBuildByProject: Map<string, Build | undefined | null> = new Map<string, Build | undefined | null>();
  @observable isFetchingProjects = false;

  constructor(applicationStore: ApplicationStore) {
    this.applicationStore = applicationStore;
  }

  fetchProjects = flow(function* (this: ProjectDashboardStore) {
    this.isFetchingProjects = true;
    try {
      yield Promise.all([this.fetchProjectByType(ProjectType.PRODUCTION), this.fetchProjectByType(ProjectType.PROTOTYPE)]);
    } catch (error) {
      Log.error(LOG_EVENT.SETUP_PROBLEM, error);
      this.applicationStore.notifyError(error);
    } finally {
      this.isFetchingProjects = false;
    }
  });

  private fetchProjectByType = flow(function* (this: ProjectDashboardStore, projectType: ProjectType) {
    const projects = (yield sdlcClient.getProjects(projectType, false, undefined, undefined)) as unknown as Project[];
    projects.filter(isNonNullable).forEach(project => this.projects.set(project.projectId, deserialize(Project, project)));
    projects.forEach(project => this.currentBuildByProject.set(project.projectId, undefined));
    yield Promise.all(projects.map(project => this.fetchProjectCurrentBuildStatus(project)));
  });

  private fetchProjectCurrentBuildStatus = flow(function* (this: ProjectDashboardStore, project: Project) {
    try {
      const builds = (yield sdlcClient.getBuilds(project.projectId, undefined, undefined, undefined, 1)) as unknown as Build[];
      this.currentBuildByProject.set(project.projectId, builds.length !== 0 ? deserialize(Build, builds[0]) : null);
    } catch (error) {
      Log.error(LOG_EVENT.SETUP_PROBLEM, error);
      this.applicationStore.notifyError(error);
    }
  });
}

const ProjectDashboardStoreContext = createContext<ProjectDashboardStore | undefined>(undefined);

export const ProjectDashboardStoreProvider = ({ children }: { children: React.ReactNode }): React.ReactElement => {
  const applicationStore = useApplicationStore();
  const store = useLocalStore(() => new ProjectDashboardStore(applicationStore));
  return <ProjectDashboardStoreContext.Provider value={store}>{children}</ProjectDashboardStoreContext.Provider>;
};

export const useProjectDashboardStore = (): ProjectDashboardStore =>
  guaranteeNonNullable(useContext(ProjectDashboardStoreContext), 'useProjectDashboardStore() hook must be used inside ProjectDashboardStoreContext context provider');
