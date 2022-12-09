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
  hashArray,
  ActionState,
} from '@finos/legend-shared';
import type { EditorSDLCState } from '../EditorSDLCState.js';
import {
  type ProjectConfiguration,
  ProjectStructureVersion,
  UpdateProjectConfigurationCommand,
  UpdatePlatformConfigurationsCommand,
} from '@finos/legend-server-sdlc';
import { LEGEND_STUDIO_APP_EVENT } from '../LegendStudioAppEvent.js';
import {
  type ProjectDependencyGraphReport,
  type ProjectDependencyVersionNode,
  MASTER_SNAPSHOT_ALIAS,
  ProjectData,
  ProjectDependencyCoordinates,
  RawProjectDependencyReport,
  buildDependencyReport,
  buildConflictsPaths,
} from '@finos/legend-server-depot';
import type { TreeData, TreeNodeData } from '@finos/legend-art';

export enum CONFIGURATION_EDITOR_TAB {
  PROJECT_STRUCTURE = 'PROJECT_STRUCTURE',
  PROJECT_DEPENDENCIES = 'PROJECT_DEPENDENCIES',
  PLATFORM_CONFIGURATIONS = 'PLATFORM_CONFIGURATIONS',
}

export class DependencyTreeNodeData implements TreeNodeData {
  value: ProjectDependencyVersionNode;
  id: string;
  label: string;
  childrenIds?: string[] | undefined;

  constructor(id: string, value: ProjectDependencyVersionNode) {
    this.id = id;
    this.value = value;
    this.label = value.id;
  }
  isSelected?: boolean | undefined;
  isOpen?: boolean | undefined;
}

export const buildDependencyNodeChildren = (
  parentNode: DependencyTreeNodeData,
  treeNodes: Map<string, DependencyTreeNodeData>,
): void => {
  if (!parentNode.childrenIds) {
    const value = parentNode.value;
    const childrenNodes = value.dependencies.map((projectVersion) => {
      const childId = `${parentNode.id}.${projectVersion.id}`;
      const childNode = new DependencyTreeNodeData(childId, projectVersion);
      treeNodes.set(childId, childNode);
      return childNode;
    });
    parentNode.childrenIds = childrenNodes.map((c) => c.id);
  }
};

const buildDependencyTreeData = (
  report: ProjectDependencyGraphReport,
): TreeData<DependencyTreeNodeData> => {
  const nodes = new Map<string, DependencyTreeNodeData>();
  const rootNodes = report.graph.rootNodes.map((versionNode) => {
    const node = new DependencyTreeNodeData(versionNode.id, versionNode);
    nodes.set(node.id, node);
    buildDependencyNodeChildren(node, nodes);
    return node;
  });
  const rootIds = rootNodes.map((node) => node.id);
  return { rootIds, nodes };
};

const buildFlattenDependencyTreeData = (
  report: ProjectDependencyGraphReport,
): TreeData<DependencyTreeNodeData> => {
  const nodes = new Map<string, DependencyTreeNodeData>();
  const rootIds: string[] = [];
  Array.from(report.graph.nodes.entries()).forEach(([key, value]) => {
    const id = value.id;
    const node = new DependencyTreeNodeData(id, value);
    nodes.set(id, node);
    rootIds.push(id);
    buildDependencyNodeChildren(node, nodes);
  });
  return { rootIds, nodes };
};

export class ProjectConfigurationEditorState extends EditorState {
  sdlcState: EditorSDLCState;
  originalProjectConfiguration?: ProjectConfiguration | undefined; // TODO: we might want to remove this when we do change detection for project configuration
  projectConfiguration?: ProjectConfiguration | undefined;
  selectedTab: CONFIGURATION_EDITOR_TAB;
  isReadOnly = false;
  projects = new Map<string, ProjectData>();
  queryHistory = new Set<string>();
  latestProjectStructureVersion: ProjectStructureVersion | undefined;
  dependencyReport: ProjectDependencyGraphReport | undefined;
  dependencyTreeData: TreeData<DependencyTreeNodeData> | undefined;
  flattenDependencyTreeData: TreeData<DependencyTreeNodeData> | undefined;
  dependencyTreeReportModal = false;
  dependencyConflictModal = false;
  fetchingDependencyInfoState = ActionState.create();
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
      dependencyReport: observable,
      dependencyTreeReportModal: observable,
      fetchingDependencyInfoState: observable,
      dependencyConflictModal: observable,
      dependencyTreeData: observable.ref,
      flattenDependencyTreeData: observable.ref,
      originalConfig: computed,
      setOriginalProjectConfiguration: action,
      setDependencyConflictModal: action,
      clearTrees: action,
      setProjectConfiguration: action,
      setDependencyTreeReportModal: action,
      setSelectedTab: action,
      setDependencyTreeData: action,
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

  setDependencyConflictModal(showModal: boolean): void {
    this.dependencyConflictModal = showModal;
  }

  setDependencyTreeReportModal(showModal: boolean): void {
    this.dependencyTreeReportModal = showModal;
  }

  setFlattenDependencyTreeData(
    tree: TreeData<DependencyTreeNodeData> | undefined,
  ): void {
    this.flattenDependencyTreeData = tree;
  }

  clearTrees(): void {
    this.flattenDependencyTreeData = undefined;
    this.dependencyTreeData = undefined;
  }

  setDependencyTreeData(
    tree: TreeData<DependencyTreeNodeData> | undefined,
  ): void {
    this.dependencyTreeData = tree;
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
      this.editorStore.applicationStore.log.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(
        `Can't get project dependencies data. Error:\n${error.message}`,
      );
    } finally {
      this.fetchingProjectVersionsState.complete();
    }
  }

  *fetchDependencyInfo(): GeneratorFn<void> {
    try {
      this.fetchingDependencyInfoState.inProgress();
      this.dependencyReport = undefined;
      this.clearTrees();
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
          )) as PlainObject<RawProjectDependencyReport>;
        const rawdependencyReport =
          RawProjectDependencyReport.serialization.fromJson(dependencyInfoRaw);
        const report = buildDependencyReport(rawdependencyReport);
        this.dependencyReport = report;
        this.processReport(report);
      }
      this.fetchingDependencyInfoState.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.fetchingDependencyInfoState.fail();
      this.dependencyReport = undefined;
      this.editorStore.applicationStore.log.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.DEPOT_MANAGER_FAILURE),
        error,
      );
    }
  }

  processReport(report: ProjectDependencyGraphReport): void {
    this.setDependencyTreeData(buildDependencyTreeData(report));
    this.setFlattenDependencyTreeData(buildFlattenDependencyTreeData(report));
    try {
      report.conflictPaths = buildConflictsPaths(report);
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notifyError(
        `Unable to build conflict paths ${error.message}`,
      );
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
      this.editorStore.applicationStore.log.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
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
    this.updatingConfigurationState.inProgress();
    this.editorStore.applicationStore.setBlockingAlert({
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
      this.editorStore.applicationStore.log.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.updatingConfigurationState.complete();
      this.editorStore.applicationStore.setBlockingAlert(undefined);
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
