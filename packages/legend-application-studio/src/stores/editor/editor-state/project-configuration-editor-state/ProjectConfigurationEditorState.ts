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
  prettyCONSTName,
} from '@finos/legend-shared';
import type { EditorSDLCState } from '../../EditorSDLCState.js';
import {
  type ProjectConfiguration,
  ProjectStructureVersion,
  UpdateProjectConfigurationCommand,
  UpdatePlatformConfigurationsCommand,
  ProjectType,
} from '@finos/legend-server-sdlc';
import { LEGEND_STUDIO_APP_EVENT } from '../../../../__lib__/LegendStudioEvent.js';
import { SNAPSHOT_ALIAS, StoreProjectData } from '@finos/legend-server-depot';
import { ProjectDependencyEditorState } from './ProjectDependencyEditorState.js';

export enum CONFIGURATION_EDITOR_TAB {
  PROJECT_STRUCTURE = 'PROJECT_STRUCTURE',
  PROJECT_DEPENDENCIES = 'PROJECT_DEPENDENCIES',
  PLATFORM_CONFIGURATIONS = 'PLATFORM_CONFIGURATIONS',
  ADVANCED = 'ADVANCED',
}

export const projectTypeTabFilter = (
  mode: ProjectType,
  tab: CONFIGURATION_EDITOR_TAB,
): boolean => {
  if (
    mode === ProjectType.EMBEDDED &&
    tab === CONFIGURATION_EDITOR_TAB.PLATFORM_CONFIGURATIONS
  ) {
    return false;
  }
  return true;
};

export class ProjectConfigurationEditorState extends EditorState {
  readonly sdlcState: EditorSDLCState;
  readonly updatingConfigurationState = ActionState.create();
  readonly fetchingProjectVersionsState = ActionState.create();

  projectDependencyEditorState: ProjectDependencyEditorState;
  originalProjectConfiguration?: ProjectConfiguration | undefined; // TODO: we might want to remove this when we do change detection for project configuration
  projectConfiguration?: ProjectConfiguration | undefined;
  selectedTab: CONFIGURATION_EDITOR_TAB;
  isReadOnly = false;
  projects = new Map<string, StoreProjectData>();
  versions = new Map<string, string[]>();
  latestProjectStructureVersion: ProjectStructureVersion | undefined;
  manualOverwrite = false;
  associatedProjectsAndVersionsFetched = false;

  constructor(editorStore: EditorStore, sdlcState: EditorSDLCState) {
    super(editorStore);

    makeObservable(this, {
      originalProjectConfiguration: observable,
      updatingConfigurationState: observable,
      projectConfiguration: observable,
      selectedTab: observable,
      isReadOnly: observable,
      manualOverwrite: observable,
      projects: observable,
      versions: observable,
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
      setManualOverwrite: action,
      syncExclusionsToProjectDependencies: action,
      loadExclusionsFromProjectDependencies: action,
      fectchAssociatedProjectsAndVersions: flow,
      updateProjectConfiguration: flow,
      updateToLatestStructure: flow,
      updateConfigs: flow,
      fetchLatestProjectStructureVersion: flow,
      changeProjectType: flow,
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
    this.loadExclusionsFromProjectDependencies();
  }

  setSelectedTab(tab: CONFIGURATION_EDITOR_TAB): void {
    this.selectedTab = tab;
  }

  setManualOverwrite(value: boolean): void {
    this.manualOverwrite = value;
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
        (dependency) => dependency.versionId.endsWith(SNAPSHOT_ALIAS),
      ),
    );
  }

  get isInEmbeddedMode(): boolean {
    return (
      this.originalProjectConfiguration?.projectType === ProjectType.EMBEDDED
    );
  }

  syncExclusionsToProjectDependencies(): void {
    this.currentProjectConfiguration.projectDependencies.forEach((dep) => {
      const exclusions = this.projectDependencyEditorState.getExclusions(
        dep.projectId,
      );
      dep.setExclusions(exclusions);
    });
  }

  loadExclusionsFromProjectDependencies(): void {
    this.projectConfiguration?.projectDependencies.forEach((dep) => {
      if (dep.exclusions && dep.exclusions.length > 0) {
        this.projectDependencyEditorState.dependencyExclusions[dep.projectId] =
          [...dep.exclusions];
        // Debug: Log loaded exclusions
        this.editorStore.applicationStore.logService.info(
          LogEvent.create('LOADING_EXCLUSIONS'),
          `Loaded ${dep.exclusions.length} exclusions for dependency ${dep.projectId}:`,
          dep.exclusions.map((ex) => `${ex.groupId}:${ex.artifactId}`),
        );
      }
    });
  }

  *fectchAssociatedProjectsAndVersions(): GeneratorFn<void> {
    this.fetchingProjectVersionsState.inProgress();
    try {
      (
        (yield this.editorStore.depotServerClient.getProjects()) as PlainObject<StoreProjectData>[]
      )
        .map((v) => StoreProjectData.serialization.fromJson(v))
        .forEach((project) => this.projects.set(project.coordinates, project));

      // fetch the versions for the dependency projects
      for (const dep of this.projectConfiguration?.projectDependencies ?? []) {
        const project = this.projects.get(dep.projectId);
        if (project) {
          const _versions =
            (yield this.editorStore.depotServerClient.getVersions(
              guaranteeNonNullable(dep.groupId),
              guaranteeNonNullable(dep.artifactId),
              true,
            )) as string[];
          this.versions.set(project.coordinates, _versions);
        }
      }

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

      this.syncExclusionsToProjectDependencies();

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
          this.editorStore.sdlcState.activePatch?.patchReleaseVersionId.id,
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
        let latestStructure = this.latestProjectStructureVersion;
        if (this.isInEmbeddedMode) {
          const projectStructureVersion = new ProjectStructureVersion();
          projectStructureVersion.version =
            this.latestProjectStructureVersion.version;
          // extension version does not exists in embedded mode
          projectStructureVersion.extensionVersion = undefined;
          latestStructure = projectStructureVersion;
        }
        const updateCommand = new UpdateProjectConfigurationCommand(
          this.currentProjectConfiguration.groupId,
          this.currentProjectConfiguration.artifactId,
          latestStructure,
          `update project configuration from ${this.editorStore.applicationStore.config.appName}: update to latest project structure`,
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

  *changeProjectType(): GeneratorFn<void> {
    try {
      const newProjectType = this.isInEmbeddedMode
        ? ProjectType.MANAGED
        : ProjectType.EMBEDDED;
      const updateCommand = new UpdateProjectConfigurationCommand(
        this.currentProjectConfiguration.groupId,
        this.currentProjectConfiguration.artifactId,
        undefined,
        `update project configuration from ${
          this.editorStore.applicationStore.config.appName
        }: changed project type to ${prettyCONSTName(newProjectType)}`,
      );
      updateCommand.projectType = newProjectType;
      yield flowResult(this.updateProjectConfiguration(updateCommand));
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
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
      this.syncExclusionsToProjectDependencies();

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
      if (
        this.originalConfig.runDependencyTests !==
        this.currentProjectConfiguration.runDependencyTests
      ) {
        updateProjectConfigurationCommand.runDependencyTests =
          this.currentProjectConfiguration.runDependencyTests;
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
