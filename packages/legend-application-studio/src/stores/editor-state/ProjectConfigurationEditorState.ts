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

import type { EditorStore } from '../EditorStore.js';
import { EditorState } from '../editor-state/EditorState.js';
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
} from '@finos/legend-shared';
import type { EditorSDLCState } from '../EditorSDLCState.js';
import {
  type ProjectConfiguration,
  ProjectStructureVersion,
  UpdateProjectConfigurationCommand,
} from '@finos/legend-server-sdlc';
import { LEGEND_STUDIO_APP_EVENT } from '../LegendStudioAppEvent.js';
import {
  type ProjectVersionDependencies,
  generateGAVCoordinates,
  MASTER_SNAPSHOT_ALIAS,
  ProjectData,
  ProjectDependencyInfo,
  ProjectDependencyCoordinates,
} from '@finos/legend-server-depot';
import { TAB_SIZE } from '@finos/legend-application';

export enum CONFIGURATION_EDITOR_TAB {
  PROJECT_STRUCTURE = 'PROJECT_STRUCTURE',
  PROJECT_DEPENDENCIES = 'PROJECT_DEPENDENCIES',
}

export enum DEPENDENCY_INFO_TYPE {
  TREE = 'tree',
  CONFLICTS = 'conflicts',
}

const getDependencyTreeString = (
  dependant: ProjectVersionDependencies,
  tab: string,
): string => {
  const prefix = tab + (dependant.dependencies.length ? '+-' : '\\-');
  const gav = generateGAVCoordinates(
    dependant.groupId,
    dependant.artifactId,
    dependant.versionId,
  );
  return `${prefix + gav}\n${dependant.dependencies
    .map((e) => getDependencyTreeString(e, tab + ' '.repeat(TAB_SIZE)))
    .join('')}`;
};

export const getDependencyTreeStringFromInfo = (
  info: ProjectDependencyInfo,
): string => info.tree.map((e) => getDependencyTreeString(e, '')).join('\n');

const getConflictPathString = (path: string): string => {
  const seperator = '>';
  const projects = path.split(seperator);
  let result = '';
  let currentTab = ' '.repeat(TAB_SIZE);
  projects.forEach((p) => {
    result += `${currentTab + p}\n`;
    currentTab = currentTab + ' '.repeat(TAB_SIZE);
  });
  return result;
};

export const getConflictsString = (info: ProjectDependencyInfo): string =>
  info.conflicts
    .map((c) => {
      const base = `project:\n${
        ' '.repeat(TAB_SIZE) +
        generateGAVCoordinates(c.groupId, c.artifactId, undefined)
      }`;
      const versions = `versions:\n${c.versions
        .map((v) => ' '.repeat(TAB_SIZE) + v)
        .join('\n')}`;
      const paths = `paths:\n${c.conflictPaths
        .map(
          (p, idx) =>
            `${' '.repeat(TAB_SIZE) + (idx + 1)}:\n${getConflictPathString(p)}`,
        )
        .join('')}`;
      return `${base}\n${versions}\n${paths}`;
    })
    .join('\n\n');

export class ProjectConfigurationEditorState extends EditorState {
  sdlcState: EditorSDLCState;
  originalProjectConfiguration?: ProjectConfiguration | undefined; // TODO: we might want to remove this when we do change detection for project configuration
  projectConfiguration?: ProjectConfiguration | undefined;
  selectedTab: CONFIGURATION_EDITOR_TAB;
  isReadOnly = false;
  projects = new Map<string, ProjectData>();
  queryHistory = new Set<string>();
  latestProjectStructureVersion: ProjectStructureVersion | undefined;
  dependencyInfo: ProjectDependencyInfo | undefined;
  dependencyInfoModalType: DEPENDENCY_INFO_TYPE | undefined;
  isUpdatingConfiguration = false;
  isQueryingProjects = false;
  associatedProjectsAndVersionsFetched = false;
  isFetchingAssociatedProjectsAndVersions = false;

  constructor(editorStore: EditorStore, sdlcState: EditorSDLCState) {
    super(editorStore);

    makeObservable(this, {
      originalProjectConfiguration: observable,
      isUpdatingConfiguration: observable,
      projectConfiguration: observable,
      selectedTab: observable,
      isReadOnly: observable,
      projects: observable,
      queryHistory: observable,
      isQueryingProjects: observable,
      associatedProjectsAndVersionsFetched: observable,
      isFetchingAssociatedProjectsAndVersions: observable,
      latestProjectStructureVersion: observable,
      dependencyInfo: observable,
      dependencyInfoModalType: observable,
      originalConfig: computed,
      setOriginalProjectConfiguration: action,
      setProjectConfiguration: action,
      setDependencyInfoModal: action,
      setSelectedTab: action,
      fectchAssociatedProjectsAndVersions: flow,
      updateProjectConfiguration: flow,
      updateToLatestStructure: flow,
      updateConfigs: flow,
      fetchLatestProjectStructureVersion: flow,
      fetchDependencyInfo: flow,
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

  setDependencyInfoModal(type: DEPENDENCY_INFO_TYPE | undefined): void {
    this.dependencyInfoModalType = type;
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

  get containsSnapshotDependencies(): boolean {
    return Boolean(
      this.originalProjectConfiguration?.projectDependencies.some(
        (dependency) => dependency.versionId === MASTER_SNAPSHOT_ALIAS,
      ),
    );
  }

  *fectchAssociatedProjectsAndVersions(): GeneratorFn<void> {
    this.isFetchingAssociatedProjectsAndVersions = true;
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
      this.editorStore.applicationStore.log.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(
        `Can't get project dependencies data. Error:\n${error.message}`,
      );
    } finally {
      this.isFetchingAssociatedProjectsAndVersions = false;
    }
  }

  *fetchDependencyInfo(): GeneratorFn<void> {
    try {
      this.dependencyInfo = undefined;
      if (this.projectConfiguration?.projectDependencies) {
        const dependencyCoordinates = (yield flowResult(
          this.editorStore.graphState.buildProjectDependencyCoordinates(
            this.projectConfiguration.projectDependencies,
          ),
        )) as ProjectDependencyCoordinates[];
        const dependencyInfoRaw =
          (yield this.editorStore.depotServerClient.analyzeDependencyTree(
            dependencyCoordinates.map((e) =>
              ProjectDependencyCoordinates.serialization.toJson(e),
            ),
          )) as PlainObject<ProjectDependencyInfo>;
        this.dependencyInfo =
          ProjectDependencyInfo.serialization.fromJson(dependencyInfoRaw);
      } else {
        this.dependencyInfo = new ProjectDependencyInfo();
      }
    } catch (error) {
      assertErrorThrown(error);
      this.dependencyInfo = undefined;
      this.editorStore.applicationStore.log.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.DEPOT_MANAGER_FAILURE),
        error,
      );
    }
  }

  *updateProjectConfiguration(
    updateConfigurationCommand: UpdateProjectConfigurationCommand,
  ): GeneratorFn<void> {
    try {
      this.isUpdatingConfiguration = true;
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
      this.editorStore.openSingletonEditorState(
        this.editorStore.projectConfigurationEditorState,
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isUpdatingConfiguration = false;
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
        this.editorStore.applicationStore.log.error(
          LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
          error,
        );
        this.editorStore.applicationStore.notifyError(error);
      }
    }
  }

  // TODO: we will probably need to remove this in the future when we have a better strategy for change detection and persistence of project config
  // See https://github.com/finos/legend-studio/issues/952
  *updateConfigs(): GeneratorFn<void> {
    this.isUpdatingConfiguration = true;
    this.editorStore.setBlockingAlert({
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
      this.editorStore.applicationStore.log.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isUpdatingConfiguration = false;
      this.editorStore.setBlockingAlert(undefined);
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
      this.editorStore.applicationStore.log.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    }
  }
}
