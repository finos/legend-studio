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

import { config } from 'ApplicationConfig';
import { EditorStore } from 'Stores/EditorStore';
import { EditorState } from 'Stores/editor-state/EditorState';
import { action, computed, flow, observable } from 'mobx';
import { ProjectConfiguration } from 'SDLC/configuration/ProjectConfiguration';
import { isNonNullable, guaranteeNonNullable, compareLabelFn } from 'Utilities/GeneralUtil';
import { sdlcClient } from 'API/SdlcClient';
import { Log, LOG_EVENT } from 'Utilities/Logger';
import { deserialize } from 'serializr';
import { UpdateProjectConfigurationCommand } from 'SDLC/configuration/UpdateProjectConfigurationCommand';
import { Project, ProjectSelectOption, ProjectType } from 'SDLC/project/Project';
import { Version } from 'SDLC/version/Version';
import { ProjectStructureVersion } from 'SDLC/configuration/ProjectStructureVersion';
import { EditorSdlcState } from 'Stores/EditorSdlcState';

export enum CONFIGURATION_EDITOR_TAB {
  PROJECT_STRUCTURE = 'PROJECT_STRUCTURE',
  PROJECT_DEPENDENCIES = 'PROJECT_DEPENDENCIES'
}

export class ProjectConfigurationEditorState extends EditorState {
  sdlcState: EditorSdlcState;
  @observable originalProjectConfiguration?: ProjectConfiguration; // TODO: we might want to remove this when we do change detection for project configuration
  @observable isUpdatingConfiguration = false;
  @observable projectConfiguration?: ProjectConfiguration;
  @observable selectedTab: CONFIGURATION_EDITOR_TAB;
  @observable isReadOnly = false;
  @observable versionsByProject = new Map<string, Map<string, Version>>();
  @observable projects = new Map<string, Project>();
  @observable queryHistory = new Set<string>();
  @observable isQueryingProjects = false;
  @observable associatedProjectsAndVersionsFetched = false;
  @observable isFetchingAssociatedProjectsAndVersions = false;
  @observable latestProjectStructureVersion?: ProjectStructureVersion;

  constructor(editorStore: EditorStore, sdlcState: EditorSdlcState) {
    super(editorStore);
    this.selectedTab = CONFIGURATION_EDITOR_TAB.PROJECT_STRUCTURE;
    this.isReadOnly = editorStore.isInViewerMode;
    this.sdlcState = sdlcState;
  }

  @action setOriginalProjectConfiguration(projectConfiguration: ProjectConfiguration): void { this.originalProjectConfiguration = projectConfiguration }
  @action setProjectConfiguration(projectConfiguration: ProjectConfiguration): void { this.projectConfiguration = projectConfiguration }
  @action setSelectedTab(tab: CONFIGURATION_EDITOR_TAB): void { this.selectedTab = tab }

  get headerName(): string { return 'config' }

  get currentProjectConfiguration(): ProjectConfiguration { return guaranteeNonNullable(this.projectConfiguration, 'Project configuration must exist') }
  @computed get originalConfig(): ProjectConfiguration { return guaranteeNonNullable(this.originalProjectConfiguration, 'Original project configuration is not set') }
  @computed get projectOptions(): ProjectSelectOption[] { return Array.from(this.projects.values()).map(p => p.selectOption).sort(compareLabelFn) }

  fectchAssociatedProjectsAndVersions = flow(function* (this: ProjectConfigurationEditorState, projectConfig: ProjectConfiguration) {
    this.isFetchingAssociatedProjectsAndVersions = true;
    try {
      const dependencies = projectConfig.projectDependencies;
      yield Promise.all(dependencies.map(projDep => sdlcClient.getProject(projDep.projectId)
        .then(p => { this.projects.set(p.projectId, deserialize(Project, p)) }).catch(e => { Log.error(LOG_EVENT.SDLC_PROBLEM, e) })));
      yield Promise.all(
        dependencies.map(projDep => sdlcClient.getVersions(projDep.projectId)
          .then(versions => {
            const versionMap = observable<string, Version>(new Map());
            versions.forEach(v => versionMap.set(`${v.id.majorVersion}.${v.id.minorVersion}.${v.id.patchVersion}`, deserialize(Version, v)));
            this.versionsByProject.set(projDep.projectId, versionMap);
          }).catch(e => { Log.error(LOG_EVENT.SDLC_PROBLEM, e) })
        ));
      // add production projects
      ((yield sdlcClient.getProjects(ProjectType.PRODUCTION, undefined, undefined, undefined)) as unknown as Project[]).forEach(project => this.projects.set(project.projectId, deserialize(Project, project)));
      this.associatedProjectsAndVersionsFetched = true;
    } catch (error) {
      Log.error(LOG_EVENT.SDLC_PROBLEM, error);
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isFetchingAssociatedProjectsAndVersions = false;
    }
  });

  updateProjectConfiguration = flow(function* (this: ProjectConfigurationEditorState, updateConfigurationCommand: UpdateProjectConfigurationCommand) {
    try {
      this.isUpdatingConfiguration = true;
      yield sdlcClient.updateConfiguration(this.editorStore.sdlcState.currentProjectId, this.editorStore.sdlcState.currentWorkspaceId, updateConfigurationCommand);
      this.editorStore.reset();
      // reset editor
      yield this.editorStore.sdlcState.fetchCurrentWorkspace(this.editorStore.sdlcState.currentProjectId, this.editorStore.sdlcState.currentWorkspaceId);
      yield this.sdlcState.fetchCurrentRevision(this.editorStore.sdlcState.currentProjectId, this.editorStore.sdlcState.currentWorkspaceId);
      yield this.editorStore.initMode();
      this.editorStore.openSingletonEditorState(this.editorStore.projectConfigurationEditorState);
    } catch (err) {
      Log.error(LOG_EVENT.SDLC_PROBLEM, err);
      this.editorStore.applicationStore.notifyError(err);
    } finally {
      this.isUpdatingConfiguration = false;
    }
  });

  // FIXME: as of now we do caching on the query, we might want to rethink this strategy although it makes sense
  // but UX-wise, it's awkward that user have to refresh the browser in order to refresh this cache.
  queryProjects = flow(function* (this: ProjectConfigurationEditorState, query: string) {
    if (!this.queryHistory.has(query) && query) {
      this.isQueryingProjects = true;
      try {
        const projects = (yield sdlcClient.getProjects(ProjectType.PRODUCTION, false, query, undefined)) as unknown as Project[];
        projects.filter(isNonNullable).forEach(project => this.projects.set(project.projectId, deserialize(Project, project)));
        this.queryHistory.add(query);
      } catch (error) {
        Log.error(LOG_EVENT.SDLC_PROBLEM, error);
        this.editorStore.applicationStore.notifyError(error);
      } finally {
        this.isQueryingProjects = false;
      }
    }
  });

  getProjectVersions = flow(function* (this: ProjectConfigurationEditorState, projectId: string) {
    try {
      const versions = (yield sdlcClient.getVersions(projectId)) as unknown as Version[];
      const versionMap = observable<string, Version>(new Map());
      versions.forEach(v => versionMap.set(`${v.id.majorVersion}.${v.id.minorVersion}.${v.id.patchVersion}`, deserialize(Version, v)));
      this.versionsByProject.set(projectId, versionMap);
    } catch (error) {
      Log.error(LOG_EVENT.SDLC_PROBLEM, error);
      this.editorStore.applicationStore.notifyError(error);
    }
  });

  updateToLatestStructure = flow(function* (this: ProjectConfigurationEditorState) {
    if (this.latestProjectStructureVersion) {
      try {
        const updateCommand = new UpdateProjectConfigurationCommand(this.currentProjectConfiguration.groupId, this.currentProjectConfiguration.artifactId, this.latestProjectStructureVersion, `update project configuration from ${config.appName}`);
        yield this.updateProjectConfiguration(updateCommand);
      } catch (err) {
        Log.error(LOG_EVENT.SDLC_PROBLEM, err);
        this.editorStore.applicationStore.notifyError(err);
      }
    }
  })

  // TODO: we will need to remove this in the future when we have a better strategy for change detection and persistence of project config
  updateConfigs = flow(function* (this: ProjectConfigurationEditorState) {
    this.isUpdatingConfiguration = true;
    try {
      const updateProjectConfigurationCommand = new UpdateProjectConfigurationCommand(this.currentProjectConfiguration.groupId, this.currentProjectConfiguration.artifactId, this.currentProjectConfiguration.projectStructureVersion, `update project configuration from ${config.appName}`);
      updateProjectConfigurationCommand.projectDependenciesToAdd = this.currentProjectConfiguration.projectDependencies.filter(dep => !this.originalConfig.projectDependencies.find(originalProjDep => originalProjDep.hashCode === dep.hashCode));
      updateProjectConfigurationCommand.projectDependenciesToRemove = this.originalConfig.projectDependencies.filter(originalProjDep => !this.currentProjectConfiguration.projectDependencies.find(dep => dep.hashCode === originalProjDep.hashCode));
      yield this.updateProjectConfiguration(updateProjectConfigurationCommand);
    } catch (err) {
      Log.error(LOG_EVENT.SDLC_PROBLEM, err);
      this.editorStore.applicationStore.notifyError(err);
    } finally {
      this.isUpdatingConfiguration = false;
    }
  });

  fetchLatestProjectStructureVersion = flow(function* (this: ProjectConfigurationEditorState) {
    if (!config.features.BETA__demoMode) {
      try {
        this.latestProjectStructureVersion = deserialize(ProjectStructureVersion, (yield sdlcClient.getLatestProjectStructureVersion()) as unknown as ProjectStructureVersion);
      } catch (error) {
        Log.error(LOG_EVENT.SDLC_PROBLEM, error);
        this.editorStore.applicationStore.notifyError(error);
      }
    }
  })
}
