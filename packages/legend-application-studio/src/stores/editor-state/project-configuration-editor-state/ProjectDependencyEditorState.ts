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
  type PlainObject,
  type GeneratorFn,
  ActionState,
  assertErrorThrown,
  LogEvent,
} from '@finos/legend-shared';
import {
  type ProjectDependencyGraphReport,
  type ProjectDependencyVersionNode,
  buildConflictsPaths,
  buildDependencyReport,
  ProjectDependencyCoordinates,
  RawProjectDependencyReport,
} from '@finos/legend-server-depot';
import type { TreeData, TreeNodeData } from '@finos/legend-art';
import { LEGEND_STUDIO_APP_EVENT } from '../../LegendStudioAppEvent.js';
import type { ProjectConfiguration } from '@finos/legend-server-sdlc';

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

export class ProjectDependencyEditorState {
  configState: ProjectConfigurationEditorState;
  editorStore: EditorStore;
  isReadOnly: boolean;

  dependencyTreeReportModal = false;
  dependencyConflictModal = false;
  fetchingDependencyInfoState = ActionState.create();
  dependencyReport: ProjectDependencyGraphReport | undefined;
  dependencyTreeData: TreeData<DependencyTreeNodeData> | undefined;
  flattenDependencyTreeData: TreeData<DependencyTreeNodeData> | undefined;

  constructor(
    configState: ProjectConfigurationEditorState,
    editorStore: EditorStore,
  ) {
    makeObservable(this, {
      dependencyReport: observable,
      dependencyTreeReportModal: observable,
      fetchingDependencyInfoState: observable,
      dependencyConflictModal: observable,
      dependencyTreeData: observable.ref,
      flattenDependencyTreeData: observable.ref,
      setDependencyConflictModal: action,
      clearTrees: action,
      setDependencyTreeReportModal: action,
      setDependencyTreeData: action,
      fetchDependencyReport: flow,
    });
    this.configState = configState;
    this.editorStore = editorStore;
    this.isReadOnly = editorStore.isInViewerMode;
  }

  setDependencyTreeData(
    tree: TreeData<DependencyTreeNodeData> | undefined,
  ): void {
    this.dependencyTreeData = tree;
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

  get projectConfiguration(): ProjectConfiguration | undefined {
    return this.configState.projectConfiguration;
  }

  *fetchDependencyReport(): GeneratorFn<void> {
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

  clearTrees(): void {
    this.flattenDependencyTreeData = undefined;
    this.dependencyTreeData = undefined;
  }
}
