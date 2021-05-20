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
import { action, computed, flow, observable, makeObservable } from 'mobx';
import type { ProjectConfiguration } from '../../models/sdlc/models/configuration/ProjectConfiguration';
import type { PlainObject } from '@finos/legend-studio-shared';
import {
  assertErrorThrown,
  guaranteeNonNullable,
  compareLabelFn,
} from '@finos/legend-studio-shared';
import { CORE_LOG_EVENT } from '../../utils/Logger';
import { UpdateProjectConfigurationCommand } from '../../models/sdlc/models/configuration/UpdateProjectConfigurationCommand';
import type { ProjectSelectOption } from '../../models/sdlc/models/project/Project';
import { Project, ProjectType } from '../../models/sdlc/models/project/Project';
import { Version } from '../../models/sdlc/models/version/Version';
import { ProjectStructureVersion } from '../../models/sdlc/models/configuration/ProjectStructureVersion';
import type { EditorSdlcState } from '../EditorSdlcState';

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
      setOriginalProjectConfiguration: action,
      setProjectConfiguration: action,
      setSelectedTab: action,
      originalConfig: computed,
      projectOptions: computed,
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

  fectchAssociatedProjectsAndVersions = flow(function* (
    this: ProjectConfigurationEditorState,
    projectConfig: ProjectConfiguration,
  ) {
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
              this.editorStore.applicationStore.logger.error(
                CORE_LOG_EVENT.SDLC_PROBLEM,
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
              this.editorStore.applicationStore.logger.error(
                CORE_LOG_EVENT.SDLC_PROBLEM,
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
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.SDLC_PROBLEM,
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isFetchingAssociatedProjectsAndVersions = false;
    }
  });

  updateProjectConfiguration = flow(function* (
    this: ProjectConfigurationEditorState,
    updateConfigurationCommand: UpdateProjectConfigurationCommand,
  ) {
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
      yield this.editorStore.sdlcState.fetchCurrentWorkspace(
        this.editorStore.sdlcState.currentProjectId,
        this.editorStore.sdlcState.currentWorkspaceId,
      );
      yield this.sdlcState.fetchCurrentRevision(
        this.editorStore.sdlcState.currentProjectId,
        this.editorStore.sdlcState.currentWorkspaceId,
      );
      yield this.editorStore.initMode();
      this.editorStore.openSingletonEditorState(
        this.editorStore.projectConfigurationEditorState,
      );
    } catch (error: unknown) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.SDLC_PROBLEM,
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isUpdatingConfiguration = false;
    }
  });

  // FIXME: as of now we do caching on the query, we might want to rethink this strategy although it makes sense
  // but UX-wise, it's awkward that user have to refresh the browser in order to refresh this cache.
  queryProjects = flow(function* (
    this: ProjectConfigurationEditorState,
    query: string,
  ) {
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
        this.editorStore.applicationStore.logger.error(
          CORE_LOG_EVENT.SDLC_PROBLEM,
          error,
        );
        this.editorStore.applicationStore.notifyError(error);
      } finally {
        this.isQueryingProjects = false;
      }
    }
  });

  getProjectVersions = flow(function* (
    this: ProjectConfigurationEditorState,
    projectId: string,
  ) {
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
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.SDLC_PROBLEM,
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    }
  });

  updateToLatestStructure = flow(function* (
    this: ProjectConfigurationEditorState,
  ) {
    if (this.latestProjectStructureVersion) {
      try {
        const updateCommand = new UpdateProjectConfigurationCommand(
          this.currentProjectConfiguration.groupId,
          this.currentProjectConfiguration.artifactId,
          this.latestProjectStructureVersion,
          `update project configuration from ${this.editorStore.applicationStore.config.appName}`,
        );
        yield this.updateProjectConfiguration(updateCommand);
      } catch (error: unknown) {
        this.editorStore.applicationStore.logger.error(
          CORE_LOG_EVENT.SDLC_PROBLEM,
          error,
        );
        this.editorStore.applicationStore.notifyError(error);
      }
    }
  });

  // TODO: we will need to remove this in the future when we have a better strategy for change detection and persistence of project config
  updateConfigs = flow(function* (this: ProjectConfigurationEditorState) {
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
      yield this.updateProjectConfiguration(updateProjectConfigurationCommand);
    } catch (error: unknown) {
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.SDLC_PROBLEM,
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isUpdatingConfiguration = false;
    }
  });

  fetchLatestProjectStructureVersion = flow(function* (
    this: ProjectConfigurationEditorState,
  ) {
    if (
      !this.editorStore.applicationStore.config.options
        .TEMPORARY__disableSDLCProjectStructureSupport
    ) {
      try {
        this.latestProjectStructureVersion =
          ProjectStructureVersion.serialization.fromJson(
            yield this.sdlcState.sdlcClient.getLatestProjectStructureVersion(),
          );
      } catch (error: unknown) {
        this.editorStore.applicationStore.logger.error(
          CORE_LOG_EVENT.SDLC_PROBLEM,
          error,
        );
        this.editorStore.applicationStore.notifyError(error);
      }
    }
  });
}
