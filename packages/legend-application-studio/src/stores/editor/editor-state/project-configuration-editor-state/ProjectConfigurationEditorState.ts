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

import type { EditorStore } from '../../EditorStore.js';
import { EditorState } from '../EditorState.js';
import {
  action,
  computed,
  flow,
  observable,
  makeObservable,
  flowResult,
} from 'mobx';
import {
  type GeneratorFn,
  type PlainObject,
  LogEvent,
  assertErrorThrown,
  guaranteeNonNullable,
  hashArray,
  ActionState,
} from '@finos/legend-shared';
import type { EditorSDLCState } from '../../EditorSDLCState.js';
import {
  type ProjectConfiguration,
  ProjectStructureVersion,
  UpdateProjectConfigurationCommand,
  UpdatePlatformConfigurationsCommand,
} from '@finos/legend-server-sdlc';
import { LEGEND_STUDIO_APP_EVENT } from '../../../../application/LegendStudioEvent.js';
import { MASTER_SNAPSHOT_ALIAS, ProjectData } from '@finos/legend-server-depot';
import { ProjectDependencyEditorState } from './ProjectDependencyEditorState.js';

export enum CONFIGURATION_EDITOR_TAB {
  PROJECT_STRUCTURE = 'PROJECT_STRUCTURE',
  PROJECT_DEPENDENCIES = 'PROJECT_DEPENDENCIES',
  PLATFORM_CONFIGURATIONS = 'PLATFORM_CONFIGURATIONS',
}

export class ProjectConfigurationEditorState extends EditorState {
  sdlcState: EditorSDLCState;
  projectDependencyEditorState: ProjectDependencyEditorState;
  originalProjectConfiguration?: ProjectConfiguration | undefined; // TODO: we might want to remove this when we do change detection for project configuration
  projectConfiguration?: ProjectConfiguration | undefined;
  selectedTab: CONFIGURATION_EDITOR_TAB;
  isReadOnly = false;
  projects = new Map<string, ProjectData>();
  queryHistory = new Set<string>();
  latestProjectStructureVersion: ProjectStructureVersion | undefined;

  updatingConfigurationState = ActionState.create();
  fetchingProjectVersionsState = ActionState.create();
  associatedProjectsAndVersionsFetched = false;

  constructor(editorStore: EditorStore, sdlcState: EditorSDLCState) {
    super(editorStore);

    makeObservable(this, {
      originalProjectConfiguration: observable,
      updatingConfigurationState: observable,
      projectConfiguration: observable,
      selectedTab: observable,
      isReadOnly: observable,
      projects: observable,
      queryHistory: observable,
      associatedProjectsAndVersionsFetched: observable,
      fetchingProjectVersionsState: observable,
      latestProjectStructureVersion: observable,
      projectDependencyEditorState: observable,
      originalConfig: computed,
      isGroupIdChanged: computed,
      isArtifactIdChanged: computed,

      setOriginalProjectConfiguration: action,
      setProjectConfiguration: action,
      setSelectedTab: action,
      fectchAssociatedProjectsAndVersions: flow,
      updateProjectConfiguration: flow,
      updateToLatestStructure: flow,
      updateConfigs: flow,
      fetchLatestProjectStructureVersion: flow,
    });

    this.projectDependencyEditorState = new ProjectDependencyEditorState(
      this,
      this.editorStore,
    );
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

  get label(): string {
    return 'config';
  }

  override match(tab: EditorState): boolean {
    return tab instanceof ProjectConfigurationEditorState;
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

  get isGroupIdChanged(): boolean {
    return (
      this.currentProjectConfiguration.groupId !==
      this.originalProjectConfiguration?.groupId
    );
  }

  get isArtifactIdChanged(): boolean {
    return (
      this.currentProjectConfiguration.artifactId !==
      this.originalProjectConfiguration?.artifactId
    );
  }

  get containsSnapshotDependencies(): boolean {
    return Boolean(
      this.originalProjectConfiguration?.projectDependencies.some(
        (dependency) => dependency.versionId === MASTER_SNAPSHOT_ALIAS,
      ),
    );
  }

  *fectchAssociatedProjectsAndVersions(): GeneratorFn<void> {
    this.fetchingProjectVersionsState.inProgress();
    try {
      (
        (yield this.editorStore.depotServerClient.getProjects()) as PlainObject<ProjectData>[]
      )
        .map((v) => ProjectData.serialization.fromJson(v))
        // filter out non versioned projects
        .filter((p) => Boolean(p.versions.length))
        .forEach((project) => this.projects.set(project.coordinates, project));

      // Update the legacy dependency to newer format (using group ID and artifact ID instead of just project ID)
      this.projectConfiguration?.projectDependencies.forEach(
        (dependency): void => {
          if (!dependency.isLegacyDependency) {
            return;
          }
          const project = Array.from(this.projects.values()).find(
            (e) => e.projectId === dependency.projectId,
          );
          // re-write to new format
          if (project) {
            dependency.setProjectId(project.coordinates);
          }
        },
      );
      this.associatedProjectsAndVersionsFetched = true;
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(
        `Can't get project dependencies data. Error:\n${error.message}`,
      );
    } finally {
      this.fetchingProjectVersionsState.complete();
    }
  }

  *updateProjectConfiguration(
    updateConfigurationCommand: UpdateProjectConfigurationCommand,
  ): GeneratorFn<void> {
    try {
      this.updatingConfigurationState.inProgress();
      yield this.editorStore.sdlcServerClient.updateConfiguration(
        this.editorStore.sdlcState.activeProject.projectId,
        this.editorStore.sdlcState.activeWorkspace,
        UpdateProjectConfigurationCommand.serialization.toJson(
          updateConfigurationCommand,
        ),
      );
      this.editorStore.reset();
      // reset editor
      yield flowResult(
        this.editorStore.sdlcState.fetchCurrentWorkspace(
          this.editorStore.sdlcState.activeProject.projectId,
          this.editorStore.sdlcState.activeWorkspace.workspaceId,
          this.editorStore.sdlcState.activeWorkspace.workspaceType,
        ),
      );
      yield flowResult(
        this.sdlcState.fetchCurrentRevision(
          this.editorStore.sdlcState.activeProject.projectId,
          this.editorStore.sdlcState.activeWorkspace,
        ),
      );
      yield flowResult(this.editorStore.initMode());
      this.editorStore.tabManagerState.openTab(
        this.editorStore.projectConfigurationEditorState,
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.updatingConfigurationState.complete();
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
      } catch (error) {
        assertErrorThrown(error);
        this.editorStore.applicationStore.logService.error(
          LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
          error,
        );
        this.editorStore.applicationStore.notificationService.notifyError(
          error,
        );
      }
    }
  }

  // TODO: we will probably need to remove this in the future when we have a better strategy for change detection and persistence of project config
  // See https://github.com/finos/legend-studio/issues/952
  *updateConfigs(): GeneratorFn<void> {
    this.updatingConfigurationState.inProgress();
    this.editorStore.applicationStore.alertService.setBlockingAlert({
      message: `Updating project configuration...`,
      prompt: `Please do not reload the application`,
      showLoading: true,
    });
    try {
      const updateProjectConfigurationCommand =
        new UpdateProjectConfigurationCommand(
          this.currentProjectConfiguration.groupId,
          this.currentProjectConfiguration.artifactId,
          this.currentProjectConfiguration.projectStructureVersion,
          `update project configuration from ${this.editorStore.applicationStore.config.appName}`,
        );

      if (
        hashArray(this.originalConfig.platformConfigurations ?? []) !==
        hashArray(this.currentProjectConfiguration.platformConfigurations ?? [])
      ) {
        updateProjectConfigurationCommand.platformConfigurations =
          new UpdatePlatformConfigurationsCommand(
            this.currentProjectConfiguration.platformConfigurations,
          );
      }

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
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.updatingConfigurationState.complete();
      this.editorStore.applicationStore.alertService.setBlockingAlert(
        undefined,
      );
    }
  }

  *fetchLatestProjectStructureVersion(): GeneratorFn<void> {
    try {
      this.latestProjectStructureVersion =
        ProjectStructureVersion.serialization.fromJson(
          (yield this.editorStore.sdlcServerClient.getLatestProjectStructureVersion()) as PlainObject<ProjectStructureVersion>,
        );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    }
  }
}
