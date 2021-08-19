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

import type { EditorStore } from '../EditorStore';
import { EditorState } from '../editor-state/EditorState';
import {
  action,
  computed,
  flow,
  observable,
  makeObservable,
  flowResult,
} from 'mobx';
import type { GeneratorFn, PlainObject } from '@finos/legend-shared';
import {
  LogEvent,
  assertErrorThrown,
  guaranteeNonNullable,
  compareLabelFn,
} from '@finos/legend-shared';
import { SDLC_LOG_EVENT } from '../../utils/SDLCLogEvent';
import type { EditorSdlcState } from '../EditorSdlcState';
import type {
  ProjectConfiguration,
  ProjectSelectOption,
} from '@finos/legend-server-sdlc';
import {
  Project,
  ProjectStructureVersion,
  ProjectType,
  UpdateProjectConfigurationCommand,
  Version,
} from '@finos/legend-server-sdlc';

export enum CONFIGURATION_EDITOR_TAB {
  PROJECT_STRUCTURE = 'PROJECT_STRUCTURE',
  PROJECT_DEPENDENCIES = 'PROJECT_DEPENDENCIES',
}

export class ProjectConfigurationEditorState extends EditorState {
  sdlcState: EditorSdlcState;
  originalProjectConfiguration?: ProjectConfiguration; // TODO: we might want to remove this when we do change detection for project configuration
  isUpdatingConfiguration = false;
  projectConfiguration?: ProjectConfiguration;
  selectedTab: CONFIGURATION_EDITOR_TAB;
  isReadOnly = false;
  versionsByProject = new Map<string, Map<string, Version>>();
  projects = new Map<string, Project>();
  queryHistory = new Set<string>();
  isQueryingProjects = false;
  associatedProjectsAndVersionsFetched = false;
  isFetchingAssociatedProjectsAndVersions = false;
  latestProjectStructureVersion?: ProjectStructureVersion;

  constructor(editorStore: EditorStore, sdlcState: EditorSdlcState) {
    super(editorStore);

    makeObservable(this, {
      originalProjectConfiguration: observable,
      isUpdatingConfiguration: observable,
      projectConfiguration: observable,
      selectedTab: observable,
      isReadOnly: observable,
      versionsByProject: observable,
      projects: observable,
      queryHistory: observable,
      isQueryingProjects: observable,
      associatedProjectsAndVersionsFetched: observable,
      isFetchingAssociatedProjectsAndVersions: observable,
      latestProjectStructureVersion: observable,
      originalConfig: computed,
      projectOptions: computed,
      setOriginalProjectConfiguration: action,
      setProjectConfiguration: action,
      setSelectedTab: action,
      fectchAssociatedProjectsAndVersions: flow,
      updateProjectConfiguration: flow,
      queryProjects: flow,
      getProjectVersions: flow,
      updateToLatestStructure: flow,
      updateConfigs: flow,
      fetchLatestProjectStructureVersion: flow,
    });

    this.selectedTab = CONFIGURATION_EDITOR_TAB.PROJECT_STRUCTURE;
    this.isReadOnly = editorStore.isInViewerMode;
    this.sdlcState = sdlcState;
  }

  setOriginalProjectConfiguration(
    projectConfiguration: ProjectConfiguration,
  ): void {
    this.originalProjectConfiguration = projectConfiguration;
  }

  setProjectConfiguration(projectConfiguration: ProjectConfiguration): void {
    this.projectConfiguration = projectConfiguration;
  }

  setSelectedTab(tab: CONFIGURATION_EDITOR_TAB): void {
    this.selectedTab = tab;
  }

  get headerName(): string {
    return 'config';
  }

  get currentProjectConfiguration(): ProjectConfiguration {
    return guaranteeNonNullable(
      this.projectConfiguration,
      'Project configuration must exist',
    );
  }

  get originalConfig(): ProjectConfiguration {
    return guaranteeNonNullable(
      this.originalProjectConfiguration,
      'Original project configuration is not set',
    );
  }

  get projectOptions(): ProjectSelectOption[] {
    return Array.from(this.projects.values())
      .map((p) => p.selectOption)
      .sort(compareLabelFn);
  }

  *fectchAssociatedProjectsAndVersions(
    projectConfig: ProjectConfiguration,
  ): GeneratorFn<void> {
    this.isFetchingAssociatedProjectsAndVersions = true;
    try {
      const dependencies = projectConfig.projectDependencies;
      yield Promise.all(
        dependencies.map((projDep) =>
          this.sdlcState.sdlcClient
            .getProject(projDep.projectId)
            .then((projectObj) => {
              const project = Project.serialization.fromJson(projectObj);
              this.projects.set(project.projectId, project);
            })
            .catch((e) => {
              this.editorStore.applicationStore.log.error(
                LogEvent.create(SDLC_LOG_EVENT.SDLC_MANAGER_FAILURE),
                e,
              );
            }),
        ),
      );
      yield Promise.all(
        dependencies.map((projDep) =>
          this.sdlcState.sdlcClient
            .getVersions(projDep.projectId)
            .then((versions) => {
              const versionMap = observable<string, Version>(new Map());
              versions
                .map((version) => Version.serialization.fromJson(version))
                .forEach((version) => versionMap.set(version.id.id, version));
              this.versionsByProject.set(projDep.projectId, versionMap);
            })
            .catch((e) => {
              this.editorStore.applicationStore.log.error(
                LogEvent.create(SDLC_LOG_EVENT.SDLC_MANAGER_FAILURE),
                e,
              );
            }),
        ),
      );
      // add production projects
      (
        (yield this.sdlcState.sdlcClient.getProjects(
          ProjectType.PRODUCTION,
          undefined,
          undefined,
          undefined,
        )) as PlainObject<Project>[]
      )
        .map((project) => Project.serialization.fromJson(project))
        .forEach((project) => this.projects.set(project.projectId, project));
      this.associatedProjectsAndVersionsFetched = true;
    } catch (error: unknown) {
      this.editorStore.applicationStore.log.error(
        LogEvent.create(SDLC_LOG_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isFetchingAssociatedProjectsAndVersions = false;
    }
  }

  *updateProjectConfiguration(
    updateConfigurationCommand: UpdateProjectConfigurationCommand,
  ): GeneratorFn<void> {
    try {
      this.isUpdatingConfiguration = true;
      yield this.sdlcState.sdlcClient.updateConfiguration(
        this.editorStore.sdlcState.currentProjectId,
        this.editorStore.sdlcState.currentWorkspaceId,
        UpdateProjectConfigurationCommand.serialization.toJson(
          updateConfigurationCommand,
        ),
      );
      this.editorStore.reset();
      // reset editor
      yield flowResult(
        this.editorStore.sdlcState.fetchCurrentWorkspace(
          this.editorStore.sdlcState.currentProjectId,
          this.editorStore.sdlcState.currentWorkspaceId,
        ),
      );
      yield flowResult(
        this.sdlcState.fetchCurrentRevision(
          this.editorStore.sdlcState.currentProjectId,
          this.editorStore.sdlcState.currentWorkspaceId,
        ),
      );
      yield flowResult(this.editorStore.initMode());
      this.editorStore.openSingletonEditorState(
        this.editorStore.projectConfigurationEditorState,
      );
    } catch (error: unknown) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(SDLC_LOG_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isUpdatingConfiguration = false;
    }
  }

  // FIXME: as of now we do caching on the query, we might want to rethink this strategy although it makes sense
  // but UX-wise, it's awkward that user have to refresh the browser in order to refresh this cache.
  *queryProjects(query: string): GeneratorFn<void> {
    if (!this.queryHistory.has(query) && query) {
      this.isQueryingProjects = true;
      try {
        (
          (yield this.sdlcState.sdlcClient.getProjects(
            ProjectType.PRODUCTION,
            false,
            query,
            undefined,
          )) as PlainObject<Project>[]
        )
          .map((project) => Project.serialization.fromJson(project))
          .forEach((project) => this.projects.set(project.projectId, project));
        this.queryHistory.add(query);
      } catch (error: unknown) {
        this.editorStore.applicationStore.log.error(
          LogEvent.create(SDLC_LOG_EVENT.SDLC_MANAGER_FAILURE),
          error,
        );
        this.editorStore.applicationStore.notifyError(error);
      } finally {
        this.isQueryingProjects = false;
      }
    }
  }

  *getProjectVersions(projectId: string): GeneratorFn<void> {
    try {
      const versionMap = observable<string, Version>(new Map());
      (
        (yield this.sdlcState.sdlcClient.getVersions(
          projectId,
        )) as PlainObject<Version>[]
      )
        .map((version) => Version.serialization.fromJson(version))
        .forEach((version) => versionMap.set(version.id.id, version));
      this.versionsByProject.set(projectId, versionMap);
    } catch (error: unknown) {
      this.editorStore.applicationStore.log.error(
        LogEvent.create(SDLC_LOG_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    }
  }

  *updateToLatestStructure(): GeneratorFn<void> {
    if (this.latestProjectStructureVersion) {
      try {
        const updateCommand = new UpdateProjectConfigurationCommand(
          this.currentProjectConfiguration.groupId,
          this.currentProjectConfiguration.artifactId,
          this.latestProjectStructureVersion,
          `update project configuration from ${this.editorStore.applicationStore.config.appName}`,
        );
        yield flowResult(this.updateProjectConfiguration(updateCommand));
      } catch (error: unknown) {
        this.editorStore.applicationStore.log.error(
          LogEvent.create(SDLC_LOG_EVENT.SDLC_MANAGER_FAILURE),
          error,
        );
        this.editorStore.applicationStore.notifyError(error);
      }
    }
  }

  // FIXME: we will probably need to remove this in the future when we have a better strategy for change detection and persistence of project config
  *updateConfigs(): GeneratorFn<void> {
    this.isUpdatingConfiguration = true;
    try {
      const updateProjectConfigurationCommand =
        new UpdateProjectConfigurationCommand(
          this.currentProjectConfiguration.groupId,
          this.currentProjectConfiguration.artifactId,
          this.currentProjectConfiguration.projectStructureVersion,
          `update project configuration from ${this.editorStore.applicationStore.config.appName}`,
        );
      updateProjectConfigurationCommand.projectDependenciesToAdd =
        this.currentProjectConfiguration.projectDependencies.filter(
          (dep) =>
            !this.originalConfig.projectDependencies.find(
              (originalProjDep) => originalProjDep.hashCode === dep.hashCode,
            ),
        );
      updateProjectConfigurationCommand.projectDependenciesToRemove =
        this.originalConfig.projectDependencies.filter(
          (originalProjDep) =>
            !this.currentProjectConfiguration.projectDependencies.find(
              (dep) => dep.hashCode === originalProjDep.hashCode,
            ),
        );
      yield flowResult(
        this.updateProjectConfiguration(updateProjectConfigurationCommand),
      );
    } catch (error: unknown) {
      this.editorStore.applicationStore.log.error(
        LogEvent.create(SDLC_LOG_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isUpdatingConfiguration = false;
    }
  }

  *fetchLatestProjectStructureVersion(): GeneratorFn<void> {
    try {
      this.latestProjectStructureVersion =
        ProjectStructureVersion.serialization.fromJson(
          (yield this.sdlcState.sdlcClient.getLatestProjectStructureVersion()) as PlainObject<ProjectStructureVersion>,
        );
    } catch (error: unknown) {
      this.editorStore.applicationStore.log.error(
        LogEvent.create(SDLC_LOG_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    }
  }
}
