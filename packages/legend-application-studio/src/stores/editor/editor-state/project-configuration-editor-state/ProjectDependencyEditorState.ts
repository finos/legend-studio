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
import type { ProjectConfigurationEditorState } from './ProjectConfigurationEditorState.js';
import {
  flow,
  observable,
  makeObservable,
  flowResult,
  action,
  computed,
} from 'mobx';
import {
  type GeneratorFn,
  type PlainObject,
  ActionState,
  assertErrorThrown,
  LogEvent,
  isNonNullable,
  guaranteeNonNullable,
  uuid,
} from '@finos/legend-shared';
import { EngineError } from '@finos/legend-graph';
import {
  type ProjectDependencyGraphReport,
  type ProjectDependencyVersionNode,
  ProjectDependencyCoordinates,
  type ProjectDependencyGraph,
  type ProjectDependencyConflict,
  type ProjectDependencyVersionConflictInfo,
  buildConflictsPaths,
  buildDependencyReport,
  RawProjectDependencyReport,
  type DependencyResolutionResponse,
  type DependencyConflictDetail,
} from '@finos/legend-server-depot';
import type { TreeData, TreeNodeData } from '@finos/legend-art';
import { LEGEND_STUDIO_APP_EVENT } from '../../../../__lib__/LegendStudioEvent.js';
import {
  ProjectDependencyExclusion,
  type ProjectConfiguration,
  type ProjectDependency,
} from '@finos/legend-server-sdlc';
import {
  generateGAVCoordinates,
  type EntitiesWithOrigin,
} from '@finos/legend-storage';

export abstract class ProjectDependencyConflictTreeNodeData
  implements TreeNodeData
{
  id: string;
  label: string;
  childrenIds?: string[] | undefined;
  isSelected?: boolean | undefined;
  isOpen?: boolean | undefined;

  constructor(id: string) {
    this.id = id;
    this.label = id;
  }

  abstract get description(): string;
}

export class ConflictTreeNodeData extends ProjectDependencyConflictTreeNodeData {
  conflict: ProjectDependencyConflict;

  constructor(conflict: ProjectDependencyConflict) {
    super(`${conflict.groupId}:${conflict.artifactId}`);
    this.conflict = conflict;
  }

  get description(): string {
    return this.id;
  }
}

export class ConflictVersionNodeData extends ProjectDependencyConflictTreeNodeData {
  versionConflict: ProjectDependencyVersionConflictInfo;

  constructor(conflict: ProjectDependencyVersionConflictInfo) {
    super(
      `${conflict.version.groupId}:${conflict.version.artifactId}.${conflict.version.versionId}`,
    );
    this.versionConflict = conflict;
    this.label = this.versionConflict.version.versionId;
  }

  get description(): string {
    return this.id;
  }
}

export class ProjectDependencyTreeNodeData
  extends ProjectDependencyConflictTreeNodeData
  implements TreeNodeData
{
  value: ProjectDependencyVersionNode;

  constructor(id: string, value: ProjectDependencyVersionNode) {
    super(id);
    this.value = value;
    this.label = value.artifactId;
  }

  get description(): string {
    return `${this.value.groupId}:${this.value.artifactId}:${this.value.versionId}`;
  }
}

export const buildDependencyNodeChildren = (
  parentNode: ProjectDependencyTreeNodeData,
  treeNodes: Map<string, ProjectDependencyTreeNodeData>,
): void => {
  if (!parentNode.childrenIds) {
    const value = parentNode.value;
    const childrenNodes = value.dependencies.map((projectVersion) => {
      const childId = `${parentNode.id}.${projectVersion.id}`;
      const childNode = new ProjectDependencyTreeNodeData(
        childId,
        projectVersion,
      );
      treeNodes.set(childId, childNode);
      return childNode;
    });
    parentNode.childrenIds = childrenNodes.map((c) => c.id);
  }
};

const findRootNode = (
  versionNode: ProjectDependencyVersionNode,
  treeData: TreeData<ProjectDependencyTreeNodeData>,
): ProjectDependencyTreeNodeData | undefined => {
  if (!treeData.rootIds.includes(versionNode.id)) {
    return undefined;
  }
  return Array.from(treeData.nodes.values()).find(
    (node) => node.id === versionNode.id && node.value === versionNode,
  );
};

const walkNode = (
  node: ProjectDependencyTreeNodeData,
  visited: Set<ProjectDependencyVersionNode>,
  treeData: TreeData<ProjectDependencyTreeNodeData>,
): void => {
  if (!visited.has(node.value)) {
    node.isOpen = true;
    buildDependencyNodeChildren(node, treeData.nodes);
    visited.add(node.value);
    node.childrenIds
      ?.map((nodeId) => treeData.nodes.get(nodeId))
      .filter(isNonNullable)
      .forEach((n) => walkNode(n, visited, treeData));
  } else {
    buildDependencyNodeChildren(node, treeData.nodes);
  }
};

export const openAllDependencyNodesInTree = (
  treeData: TreeData<ProjectDependencyTreeNodeData>,
  graph: ProjectDependencyGraph,
): void => {
  const visited = new Set<ProjectDependencyVersionNode>();
  graph.rootNodes
    .map((node) => findRootNode(node, treeData))
    .filter(isNonNullable)
    .forEach((node) => walkNode(node, visited, treeData));
};

const buildDependencyTreeData = (
  report: ProjectDependencyGraphReport,
): TreeData<ProjectDependencyTreeNodeData> => {
  const nodes = new Map<string, ProjectDependencyTreeNodeData>();
  const rootNodes = report.graph.rootNodes.map((versionNode) => {
    const node = new ProjectDependencyTreeNodeData(versionNode.id, versionNode);
    nodes.set(node.id, node);
    buildDependencyNodeChildren(node, nodes);
    return node;
  });
  const rootIds = rootNodes.map((node) => node.id);
  return { rootIds, nodes };
};

const buildFlattenDependencyTreeData = (
  report: ProjectDependencyGraphReport,
): TreeData<ProjectDependencyTreeNodeData> => {
  const nodes = new Map<string, ProjectDependencyTreeNodeData>();
  const rootIds: string[] = [];
  Array.from(report.graph.nodes.entries()).forEach(([key, value]) => {
    const id = value.id;
    const node = new ProjectDependencyTreeNodeData(id, value);
    nodes.set(id, node);
    rootIds.push(id);
    buildDependencyNodeChildren(node, nodes);
  });
  return { rootIds, nodes };
};

export enum DEPENDENCY_REPORT_TAB {
  EXPLORER = 'EXPLORER',
  CONFLICTS = 'CONFLICTS',
  RESOLUTION = 'RESOLUTION',
}

const buildTreeDataFromConflictVersion = (
  conflictVersionNode: ConflictVersionNodeData,
  nodes: Map<string, ProjectDependencyConflictTreeNodeData>,
): ProjectDependencyTreeNodeData[] =>
  conflictVersionNode.versionConflict.pathsToVersion
    .map((path, idx) => {
      if (!path.length) {
        return undefined;
      }
      const pathIterator = path.values();
      let rootNode: ProjectDependencyTreeNodeData | undefined;
      let parentNode: ProjectDependencyTreeNodeData | undefined;
      let currentVersion: ProjectDependencyVersionNode | undefined;
      while ((currentVersion = pathIterator.next().value)) {
        const id: string = parentNode
          ? `${parentNode.id}.${currentVersion.id}`
          : `path${idx}_${currentVersion.id}`;
        const node = new ProjectDependencyTreeNodeData(id, currentVersion);
        node.childrenIds = [];
        nodes.set(id, node);
        if (parentNode) {
          parentNode.childrenIds = [node.id];
        } else {
          rootNode = node;
        }
        parentNode = node;
      }
      return rootNode;
    })
    .filter(isNonNullable);

const buildTreeDataFromConflict = (
  conflict: ProjectDependencyConflict,
  paths: ProjectDependencyVersionConflictInfo[],
): TreeData<ProjectDependencyConflictTreeNodeData> => {
  const rootNode = new ConflictTreeNodeData(conflict);
  const rootIds = [rootNode.id];
  const nodes = new Map<string, ProjectDependencyConflictTreeNodeData>();
  nodes.set(rootNode.id, rootNode);
  const versionConflictNodes = paths.map((versionConflict) => {
    const projectVersionNode = new ConflictVersionNodeData(versionConflict);
    nodes.set(projectVersionNode.id, projectVersionNode);
    const pathNodes = buildTreeDataFromConflictVersion(
      projectVersionNode,
      nodes,
    );
    projectVersionNode.childrenIds = pathNodes.map((n) => n.id);
    return projectVersionNode;
  });
  rootNode.childrenIds = versionConflictNodes.map((n) => n.id);
  return { rootIds, nodes };
};

export class ProjectDependencyConflictState {
  readonly uuid = uuid();
  readonly report: ProjectDependencyGraphReport;
  readonly conflict: ProjectDependencyConflict;
  paths: ProjectDependencyVersionConflictInfo[];
  treeData: TreeData<ProjectDependencyConflictTreeNodeData>;

  constructor(
    report: ProjectDependencyGraphReport,
    conflict: ProjectDependencyConflict,
    paths: ProjectDependencyVersionConflictInfo[],
  ) {
    makeObservable(this, {
      treeData: observable.ref,
      setTreeData: action,
    });

    this.report = report;
    this.conflict = conflict;
    this.paths = paths;
    this.treeData = buildTreeDataFromConflict(conflict, paths);
  }

  setTreeData(treeData: TreeData<ProjectDependencyConflictTreeNodeData>): void {
    this.treeData = treeData;
  }

  get versionNodes(): ProjectDependencyVersionNode[] {
    return this.paths.map((e) => e.version);
  }
}

export class ProjectDependencyEditorState {
  configState: ProjectConfigurationEditorState;
  editorStore: EditorStore;
  isReadOnly: boolean;

  reportTab: DEPENDENCY_REPORT_TAB | undefined;
  fetchingDependencyInfoState = ActionState.create();
  dependencyReport: ProjectDependencyGraphReport | undefined;
  dependencyTreeData: TreeData<ProjectDependencyTreeNodeData> | undefined;
  flattenDependencyTreeData:
    | TreeData<ProjectDependencyTreeNodeData>
    | undefined;
  conflictStates: ProjectDependencyConflictState[] | undefined;
  expandConflictsState = ActionState.create();
  buildConflictPathState = ActionState.create();
  validatingDependenciesState = ActionState.create();
  resolvingCompatibleDependenciesState = ActionState.create();

  resolutionResult: DependencyResolutionResponse | undefined;

  // Exclusions management
  selectedDependencyForExclusions: ProjectDependencyVersionNode | undefined;

  constructor(
    configState: ProjectConfigurationEditorState,
    editorStore: EditorStore,
  ) {
    makeObservable(this, {
      dependencyReport: observable,
      fetchingDependencyInfoState: observable,
      dependencyTreeData: observable.ref,
      flattenDependencyTreeData: observable.ref,
      conflictStates: observable,
      reportTab: observable,
      expandConflictsState: observable,
      buildConflictPathState: observable,
      validatingDependenciesState: observable,
      resolvingCompatibleDependenciesState: observable,
      resolutionResult: observable,
      selectedDependencyForExclusions: observable,
      hasAnyExclusions: computed,
      hasDependencyChanges: computed,
      setReportTab: action,
      expandAllConflicts: action,
      setFlattenDependencyTreeData: action,
      clearTrees: action,
      setTreeData: action,
      setDependencyTreeData: action,
      buildConflictPaths: action,
      setConflictStates: action,
      setSelectedDependencyForExclusions: action,
      addExclusion: action,
      addExclusionByCoordinate: action,
      removeExclusion: action,
      removeExclusionByCoordinate: action,
      clearExclusions: action,
      getExclusions: action,
      getExclusionCoordinates: action,
      clearResolutionResult: action,
      applyResolvedDependencies: flow,
      fetchDependencyReport: flow,
      validateAndFetchDependencyReport: flow,
      resolveCompatibleDependencies: flow,
    });
    this.configState = configState;
    this.editorStore = editorStore;
    this.isReadOnly = editorStore.isInViewerMode;
  }

  expandAllConflicts(): void {
    if (this.conflictStates) {
      this.expandConflictsState.inProgress();
      this.conflictStates.forEach((c) => {
        const treeData = c.treeData;
        Array.from(treeData.nodes.values()).forEach((n) => (n.isOpen = true));
      });
      this.conflictStates.forEach((c) => {
        c.setTreeData({ ...c.treeData });
      });
      this.expandConflictsState.complete();
    }
  }

  setTreeData(
    treeData: TreeData<ProjectDependencyTreeNodeData>,
    flattenView?: boolean,
  ): void {
    if (flattenView) {
      this.setFlattenDependencyTreeData(treeData);
    } else {
      this.setDependencyTreeData(treeData);
    }
  }

  setReportTab(tab: DEPENDENCY_REPORT_TAB | undefined): void {
    this.reportTab = tab;
  }

  setDependencyTreeData(
    tree: TreeData<ProjectDependencyTreeNodeData> | undefined,
  ): void {
    this.dependencyTreeData = tree;
  }

  setConflictStates(val: ProjectDependencyConflictState[] | undefined): void {
    this.conflictStates = val;
  }

  setFlattenDependencyTreeData(
    tree: TreeData<ProjectDependencyTreeNodeData> | undefined,
  ): void {
    this.flattenDependencyTreeData = tree;
  }

  get projectConfiguration(): ProjectConfiguration | undefined {
    return this.configState.projectConfiguration;
  }

  setSelectedDependencyForExclusions(
    dependency: ProjectDependencyVersionNode | undefined,
  ): void {
    this.selectedDependencyForExclusions = dependency;
  }

  private findProjectDependency(
    dependencyId: string,
  ): ProjectDependency | undefined {
    return this.projectConfiguration?.projectDependencies.find(
      (dep) => dep.projectId === dependencyId,
    );
  }

  addExclusion(
    dependencyId: string,
    exclusion: ProjectDependencyExclusion,
  ): void {
    const projectDependency = this.findProjectDependency(dependencyId);
    if (!projectDependency) {
      return;
    }

    const existingExclusion = this.findExistingExclusion(
      dependencyId,
      generateGAVCoordinates(
        guaranteeNonNullable(exclusion.groupId),
        guaranteeNonNullable(exclusion.artifactId),
        undefined,
      ),
    );
    if (!existingExclusion) {
      const currentExclusions = projectDependency.exclusions ?? [];
      projectDependency.setExclusions([...currentExclusions, exclusion]);
    }
  }

  addExclusionByCoordinate(
    dependencyId: string,
    exclusionCoordinate: string,
  ): void {
    const exclusion =
      ProjectDependencyExclusion.fromCoordinate(exclusionCoordinate);
    this.addExclusion(dependencyId, exclusion);
  }

  removeExclusion(
    dependencyId: string,
    exclusion: ProjectDependencyExclusion,
  ): void {
    const projectDependency = this.findProjectDependency(dependencyId);
    if (!projectDependency?.exclusions) {
      return;
    }

    const coordinate = generateGAVCoordinates(
      guaranteeNonNullable(exclusion.groupId),
      guaranteeNonNullable(exclusion.artifactId),
      undefined,
    );
    const index = this.findExclusionIndex(dependencyId, coordinate);
    if (index > -1) {
      const updatedExclusions = [...projectDependency.exclusions];
      updatedExclusions.splice(index, 1);
      projectDependency.setExclusions(updatedExclusions);
    }
  }

  removeExclusionByCoordinate(
    dependencyId: string,
    exclusionCoordinate: string,
  ): void {
    const projectDependency = this.findProjectDependency(dependencyId);
    if (!projectDependency?.exclusions) {
      return;
    }

    const index = this.findExclusionIndex(dependencyId, exclusionCoordinate);
    if (index > -1) {
      const updatedExclusions = [...projectDependency.exclusions];
      updatedExclusions.splice(index, 1);
      projectDependency.setExclusions(updatedExclusions);
    }
  }

  clearExclusions(dependencyId?: string): void {
    if (dependencyId) {
      const projectDependency = this.findProjectDependency(dependencyId);
      if (projectDependency) {
        projectDependency.setExclusions([]);
      }
    } else {
      this.projectConfiguration?.projectDependencies.forEach((dep) => {
        dep.setExclusions([]);
      });
    }
  }

  getExclusions(dependencyId: string): ProjectDependencyExclusion[] {
    const projectDependency = this.findProjectDependency(dependencyId);
    return projectDependency?.exclusions ?? [];
  }

  get hasAnyExclusions(): boolean {
    return (
      this.projectConfiguration?.projectDependencies.some(
        (dep) => dep.exclusions && dep.exclusions.length > 0,
      ) ?? false
    );
  }

  get hasDependencyChanges(): boolean {
    if (!this.configState.originalProjectConfiguration) {
      return false;
    }

    const originalDeps =
      this.configState.originalProjectConfiguration.projectDependencies;
    const currentDeps =
      this.configState.currentProjectConfiguration.projectDependencies;
    return (
      currentDeps.some(
        (currentDep) =>
          !originalDeps.find(
            (origDep) => origDep.hashCode === currentDep.hashCode,
          ),
      ) ||
      originalDeps.some(
        (origDep) =>
          !currentDeps.find(
            (currentDep) => currentDep.hashCode === origDep.hashCode,
          ),
      )
    );
  }

  getExclusionCoordinates(dependencyId: string): string[] {
    const exclusions = this.getExclusions(dependencyId);
    return exclusions.map((e) =>
      generateGAVCoordinates(
        guaranteeNonNullable(e.groupId),
        guaranteeNonNullable(e.artifactId),
        undefined,
      ),
    );
  }

  private findExistingExclusion(
    dependencyId: string,
    coordinate: string,
  ): ProjectDependencyExclusion | undefined {
    const projectDependency = this.findProjectDependency(dependencyId);
    if (!projectDependency?.exclusions) {
      return undefined;
    }

    for (let i = 0; i < projectDependency.exclusions.length; i++) {
      const exclusion = guaranteeNonNullable(projectDependency.exclusions[i]);
      const exclusionCoordinate = generateGAVCoordinates(
        guaranteeNonNullable(exclusion.groupId),
        guaranteeNonNullable(exclusion.artifactId),
        undefined,
      );
      if (exclusionCoordinate === coordinate) {
        return projectDependency.exclusions[i];
      }
    }
    return undefined;
  }

  private findExclusionIndex(dependencyId: string, coordinate: string): number {
    const projectDependency = this.findProjectDependency(dependencyId);
    if (!projectDependency?.exclusions) {
      return -1;
    }

    for (let i = 0; i < projectDependency.exclusions.length; i++) {
      const exclusion = guaranteeNonNullable(projectDependency.exclusions[i]);
      const exclusionCoordinate = generateGAVCoordinates(
        guaranteeNonNullable(exclusion.groupId),
        guaranteeNonNullable(exclusion.artifactId),
        undefined,
      );
      if (exclusionCoordinate === coordinate) {
        return i;
      }
    }
    return -1;
  }

  *fetchDependencyReport(): GeneratorFn<void> {
    try {
      this.fetchingDependencyInfoState.inProgress();
      this.dependencyReport = undefined;
      this.clearTrees();
      this.setConflictStates(undefined);
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
        this.setDependencyTreeData(buildDependencyTreeData(report));
        this.setFlattenDependencyTreeData(
          buildFlattenDependencyTreeData(report),
        );
      }
      this.fetchingDependencyInfoState.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.fetchingDependencyInfoState.fail();
      this.dependencyReport = undefined;
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.DEPOT_MANAGER_FAILURE),
        error,
      );
    }
  }

  *validateAndFetchDependencyReport(): GeneratorFn<void> {
    try {
      this.validatingDependenciesState.inProgress();

      yield flowResult(this.fetchDependencyReport());

      try {
        const dependencyEntitiesIndex =
          (yield this.editorStore.graphState.getIndexedDependencyEntities(
            this.dependencyReport,
          )) as Map<string, EntitiesWithOrigin>;

        const dependencyEntities = Array.from(
          dependencyEntitiesIndex.values(),
        ).flatMap((entitiesWithOrigin) => entitiesWithOrigin.entities);

        const projectElements =
          this.editorStore.graphManagerState.graph.allOwnElements;
        const projectEntities = projectElements.map((element) =>
          this.editorStore.graphManagerState.graphManager.elementToEntity(
            element,
          ),
        );

        const allEntities = [...dependencyEntities, ...projectEntities];

        yield this.editorStore.graphManagerState.graphManager.compileEntities(
          allEntities,
        );

        this.validatingDependenciesState.complete();
        this.editorStore.applicationStore.notificationService.notifySuccess(
          'Dependencies validated successfully - no compilation errors',
        );
      } catch (error) {
        assertErrorThrown(error);
        this.validatingDependenciesState.fail();

        if (error instanceof EngineError) {
          const errorLines = error.message
            .split('\n')
            .filter((line) => line.trim().length > 0);
          const errorPreview = errorLines.slice(0, 5).join('; ');
          const remainingCount = Math.max(0, errorLines.length - 5);
          const errorMessage =
            remainingCount > 0
              ? `Dependencies cause compilation errors: ${errorPreview} and ${remainingCount} more`
              : `Dependencies cause compilation errors: ${errorPreview}`;
          this.editorStore.applicationStore.notificationService.notifyError(
            errorMessage,
          );
        } else {
          this.editorStore.applicationStore.notificationService.notifyError(
            `Failed to validate dependencies: ${error.message}`,
          );
        }
      }
    } catch (error) {
      assertErrorThrown(error);
      this.validatingDependenciesState.fail();
      this.editorStore.applicationStore.notificationService.notifyError(
        `Failed to validate dependencies: ${error.message}`,
      );
    }
  }

  buildConflictPaths(): void {
    const report = this.dependencyReport;
    if (report) {
      this.setConflictStates(undefined);
      this.buildConflictPathState.inProgress();
      try {
        report.conflictInfo = buildConflictsPaths(report);
        const conflictStates = Array.from(report.conflictInfo.entries()).map(
          ([conflict, paths]) =>
            new ProjectDependencyConflictState(report, conflict, paths),
        );
        this.setConflictStates(conflictStates);
        this.buildConflictPathState.complete();
      } catch (error) {
        assertErrorThrown(error);
        this.setConflictStates([]);
        this.buildConflictPathState.fail();
        this.editorStore.applicationStore.notificationService.notifyError(
          `Unable to build conflict paths ${error.message}`,
        );
      }
    }
  }

  clearTrees(): void {
    this.flattenDependencyTreeData = undefined;
    this.dependencyTreeData = undefined;
    this.selectedDependencyForExclusions = undefined;
  }

  clearResolutionResult(): void {
    this.resolutionResult = undefined;
  }

  *applyResolvedDependencies(): GeneratorFn<void> {
    if (
      this.resolutionResult &&
      this.resolutionResult.success &&
      this.projectConfiguration?.projectDependencies
    ) {
      const resolvedDeps = this.resolutionResult.resolvedVersions;
      // Update the configuration
      this.projectConfiguration.projectDependencies.forEach((dep) => {
        const resolved = resolvedDeps.find(
          (r: ProjectDependencyCoordinates) =>
            r.groupId === dep.groupId && r.artifactId === dep.artifactId,
        );
        if (resolved) {
          dep.setVersionId(resolved.versionId);
        }
      });

      const configState = this.configState;
      for (const dep of this.projectConfiguration.projectDependencies) {
        if (!configState.versions.has(dep.projectId)) {
          try {
            const _versions =
              (yield this.editorStore.depotServerClient.getVersions(
                guaranteeNonNullable(dep.groupId),
                guaranteeNonNullable(dep.artifactId),
                true,
              )) as string[];
            configState.versions.set(dep.projectId, _versions);
          } catch (error) {
            assertErrorThrown(error);
            this.editorStore.applicationStore.logService.error(
              LogEvent.create(LEGEND_STUDIO_APP_EVENT.DEPOT_MANAGER_FAILURE),
              `Failed to fetch versions for ${dep.projectId}: ${error.message}`,
            );
          }
        }
      }

      // Refresh the dependency report
      try {
        yield flowResult(this.fetchDependencyReport());
        this.editorStore.applicationStore.notificationService.notifySuccess(
          `Successfully applied ${resolvedDeps.length} resolved dependencies`,
        );
        this.clearResolutionResult();
      } catch (error) {
        assertErrorThrown(error);
        this.editorStore.applicationStore.notificationService.notifyError(
          `Failed to refresh dependency report: ${error.message}`,
        );
      }
    }
  }

  *resolveCompatibleDependencies(backtrackVersions: number): GeneratorFn<void> {
    this.resolvingCompatibleDependenciesState.inProgress();
    try {
      if (this.projectConfiguration?.projectDependencies) {
        const dependencyCoordinates = (yield flowResult(
          this.editorStore.graphState.buildProjectDependencyCoordinates(
            this.projectConfiguration.projectDependencies,
          ),
        )) as ProjectDependencyCoordinates[];

        const rawResponse =
          (yield this.editorStore.depotServerClient.resolveCompatibleDependencies(
            dependencyCoordinates.map((e) =>
              ProjectDependencyCoordinates.serialization.toJson(e),
            ),
            backtrackVersions,
          )) as PlainObject<DependencyResolutionResponse>;

        const resolvedVersions = (
          rawResponse.resolvedVersions as PlainObject<ProjectDependencyCoordinates>[]
        ).map((coord) =>
          ProjectDependencyCoordinates.serialization.fromJson(coord),
        );

        const conflicts = (
          rawResponse.conflicts as PlainObject<DependencyConflictDetail>[]
        ).map((conflict) => {
          const result: DependencyConflictDetail = {
            groupId: conflict.groupId as string,
            artifactId: conflict.artifactId as string,
            conflictingVersions:
              conflict.conflictingVersions as DependencyConflictDetail['conflictingVersions'],
          };
          if (conflict.suggestedOverride) {
            result.suggestedOverride =
              ProjectDependencyCoordinates.serialization.fromJson(
                conflict.suggestedOverride as PlainObject<ProjectDependencyCoordinates>,
              );
          }
          return result;
        });

        const suggestedOverrides = (
          rawResponse.suggestedOverrides as
            | PlainObject<ProjectDependencyCoordinates>[]
            | undefined
        )?.map((coord) =>
          ProjectDependencyCoordinates.serialization.fromJson(coord),
        );

        this.resolutionResult = {
          success: rawResponse.success as boolean,
          resolvedVersions,
          conflicts,
          failureReason: (rawResponse.failureReason as string | null) ?? null,
          ...(suggestedOverrides ? { suggestedOverrides } : {}),
        };

        this.setReportTab(DEPENDENCY_REPORT_TAB.RESOLUTION);
      }

      this.resolvingCompatibleDependenciesState.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.resolvingCompatibleDependenciesState.fail();
      this.editorStore.applicationStore.notificationService.notifyError(
        `Failed to resolve dependencies: ${error.message}`,
      );
    }
  }
}
