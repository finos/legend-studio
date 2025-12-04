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
import { flow, observable, makeObservable, flowResult, action } from 'mobx';
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
} from '@finos/legend-server-depot';
import type { TreeData, TreeNodeData } from '@finos/legend-art';
import { LEGEND_STUDIO_APP_EVENT } from '../../../../__lib__/LegendStudioEvent.js';
import {
  ProjectDependencyExclusion,
  type ProjectConfiguration,
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

  // Exclusions management
  selectedDependencyForExclusions: ProjectDependencyVersionNode | undefined;
  dependencyExclusions: {
    [dependencyId: string]: ProjectDependencyExclusion[];
  } = {};

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
      selectedDependencyForExclusions: observable,
      dependencyExclusions: observable,
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
      syncExclusionsToProjectDependency: action,
      fetchDependencyReport: flow,
      validateExclusion: flow,
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

  addExclusion(
    dependencyId: string,
    exclusion: ProjectDependencyExclusion,
  ): void {
    if (!this.dependencyExclusions[dependencyId]) {
      this.dependencyExclusions[dependencyId] = [];
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
      this.dependencyExclusions[dependencyId].push(exclusion);
      this.syncExclusionsToProjectDependency(dependencyId);
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
    if (this.dependencyExclusions[dependencyId]) {
      const coordinate = generateGAVCoordinates(
        guaranteeNonNullable(exclusion.groupId),
        guaranteeNonNullable(exclusion.artifactId),
        undefined,
      );
      const index = this.findExclusionIndex(dependencyId, coordinate);
      if (index > -1) {
        this.dependencyExclusions[dependencyId].splice(index, 1);
      }
      if (this.dependencyExclusions[dependencyId].length === 0) {
        delete this.dependencyExclusions[dependencyId];
      }
      this.syncExclusionsToProjectDependency(dependencyId);
    }
  }

  removeExclusionByCoordinate(
    dependencyId: string,
    exclusionCoordinate: string,
  ): void {
    if (this.dependencyExclusions[dependencyId]) {
      const index = this.findExclusionIndex(dependencyId, exclusionCoordinate);
      if (index > -1) {
        this.dependencyExclusions[dependencyId].splice(index, 1);
      }
      if (this.dependencyExclusions[dependencyId].length === 0) {
        delete this.dependencyExclusions[dependencyId];
      }
      this.syncExclusionsToProjectDependency(dependencyId);
    }
  }

  clearExclusions(dependencyId?: string): void {
    if (dependencyId) {
      delete this.dependencyExclusions[dependencyId];
      this.syncExclusionsToProjectDependency(dependencyId);
    } else {
      this.dependencyExclusions = {};
      this.projectConfiguration?.projectDependencies.forEach((dep) => {
        this.syncExclusionsToProjectDependency(dep.projectId);
      });
    }
  }

  getExclusions(dependencyId: string): ProjectDependencyExclusion[] {
    return this.dependencyExclusions[dependencyId] ?? [];
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
    if (!this.dependencyExclusions[dependencyId]) {
      return undefined;
    }
    for (let i = 0; i < this.dependencyExclusions[dependencyId].length; i++) {
      const exclusion = guaranteeNonNullable(
        this.dependencyExclusions[dependencyId][i],
      );
      const exclusionCoordinate = generateGAVCoordinates(
        guaranteeNonNullable(exclusion.groupId),
        guaranteeNonNullable(exclusion.artifactId),
        undefined,
      );
      if (exclusionCoordinate === coordinate) {
        return this.dependencyExclusions[dependencyId][i];
      }
    }
    return undefined;
  }

  private findExclusionIndex(dependencyId: string, coordinate: string): number {
    if (!this.dependencyExclusions[dependencyId]) {
      return -1;
    }
    for (let i = 0; i < this.dependencyExclusions[dependencyId].length; i++) {
      const exclusion = guaranteeNonNullable(
        this.dependencyExclusions[dependencyId][i],
      );
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

  syncAllExclusionsToProjectDependencies(): void {
    Object.keys(this.dependencyExclusions).forEach((dependencyId) => {
      this.syncExclusionsToProjectDependency(dependencyId);
    });
  }

  syncExclusionsToProjectDependency(dependencyId: string): void {
    const projectDependency =
      this.projectConfiguration?.projectDependencies.find(
        (dep) => dep.projectId === dependencyId,
      );
    if (projectDependency) {
      const exclusions = this.getExclusions(dependencyId);
      projectDependency.setExclusions(exclusions);
    }
  }

  /**
   * Validates if excluding a dependency would break the graph by compiling with the engine.
   * Returns compilation errors if the exclusion causes issues.
   */
  *validateExclusion(
    exclusionCoordinate: string,
  ): GeneratorFn<{ isValid: boolean; compilationErrors: string[] }> {
    try {
      const currentConfig = this.projectConfiguration;
      if (!currentConfig) {
        return { isValid: true, compilationErrors: [] };
      }

      // Parse the exclusion coordinate
      const parts = exclusionCoordinate.split(':');
      if (parts.length < 2) {
        return { isValid: true, compilationErrors: [] };
      }

      const originalExclusions = new Map<
        string,
        ProjectDependencyExclusion[] | undefined
      >();

      currentConfig.projectDependencies.forEach((dep) => {
        originalExclusions.set(dep.projectId, dep.exclusions);
        const newExclusions = [
          ...(dep.exclusions ?? []),
          new ProjectDependencyExclusion(exclusionCoordinate),
        ];
        dep.setExclusions(newExclusions);
      });

      try {
        const dependencyEntitiesIndex =
          (yield this.editorStore.graphState.getIndexedDependencyEntities()) as Map<
            string,
            EntitiesWithOrigin
          >;

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

        try {
          yield this.editorStore.graphManagerState.graphManager.compileEntities(
            allEntities,
          );
          return { isValid: true, compilationErrors: [] };
        } catch (error) {
          assertErrorThrown(error);
          if (error instanceof EngineError) {
            const errors = error.message
              .split('\n')
              .filter((line) => line.trim().length > 0)
              .slice(0, 10);
            return { isValid: false, compilationErrors: errors };
          }
          return {
            isValid: false,
            compilationErrors: [error.message || 'Compilation failed'],
          };
        }
      } finally {
        // Restore original exclusions
        currentConfig.projectDependencies.forEach((dep) => {
          const original = originalExclusions.get(dep.projectId);
          dep.setExclusions(original ?? []);
        });
      }
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.DEPOT_MANAGER_FAILURE),
        error,
      );
      return { isValid: true, compilationErrors: [] };
    }
  }
}
