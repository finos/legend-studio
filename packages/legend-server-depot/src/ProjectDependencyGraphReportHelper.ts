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

import {
  guaranteeNonNullable,
  isNonNullable,
  uniq,
} from '@finos/legend-shared';
import {
  ProjectDependencyConflict,
  ProjectDependencyVersionConflictInfo,
  ProjectDependencyGraph,
  ProjectDependencyGraphReport,
  ProjectDependencyVersionNode,
} from './models/ProjectDependencyGraph.js';
import type { RawProjectDependencyReport } from './models/RawProjectDependencyReport.js';

// max depth is to prevent cycles from breaking tree
const MAX_DEPTH = 100;
// Limit total paths to prevent memory exhaustion
const MAX_PATHS_PER_VERSION = 50;

const isRootNode = (
  node: ProjectDependencyVersionNode,
  graph: ProjectDependencyGraph,
): boolean => graph.rootNodes.includes(node);

const walkBackWardEdges = (
  node: ProjectDependencyVersionNode,
  graph: ProjectDependencyGraph,
  paths: ProjectDependencyVersionNode[][],
  depth: number,
  maxDepth: number,
): ProjectDependencyVersionNode[][] => {
  if (isRootNode(node, graph) || depth > maxDepth || !node.dependants.length) {
    return [[node]];
  }
  const dependantPaths = node.dependants
    .map((dependant) =>
      walkBackWardEdges(dependant, graph, paths, depth + 1, maxDepth),
    )
    .flat();
  let limitedPaths: ProjectDependencyVersionNode[][];
  if (dependantPaths.length <= MAX_PATHS_PER_VERSION) {
    limitedPaths = dependantPaths;
  } else {
    for (let i = dependantPaths.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = dependantPaths[i];
      const swapValue = dependantPaths[j];
      if (temp !== undefined && swapValue !== undefined) {
        dependantPaths[i] = swapValue;
        dependantPaths[j] = temp;
      }
    }
    // each subset of size MAX_PATHS_PER_VERSION is equally likely to be picked up now
    limitedPaths = dependantPaths.slice(0, MAX_PATHS_PER_VERSION);
  }
  limitedPaths.forEach((r) => r.push(node));
  return limitedPaths;
};

// Here we are rebuilding all the paths to said project dependency version which are causing conflicts
export const buildConflictsPaths = (
  report: ProjectDependencyGraphReport,
): Map<ProjectDependencyConflict, ProjectDependencyVersionConflictInfo[]> => {
  const result: Map<
    ProjectDependencyConflict,
    ProjectDependencyVersionConflictInfo[]
  > = new Map();
  report.conflicts.forEach((conflict) => {
    const versionReportPath: ProjectDependencyVersionConflictInfo[] = [];
    conflict.versions.forEach((conflictNode) => {
      const conflictVersionPath = new ProjectDependencyVersionConflictInfo(
        conflict,
        conflictNode,
      );
      conflictVersionPath.pathsToVersion = walkBackWardEdges(
        conflictNode,
        report.graph,
        [],
        0,
        MAX_DEPTH,
      );
      versionReportPath.push(conflictVersionPath);
    });
    result.set(conflict, versionReportPath);
  });
  return result;
};

export const buildDependencyReport = (
  rawReport: RawProjectDependencyReport,
): ProjectDependencyGraphReport => {
  // process graph
  const graph = new ProjectDependencyGraph();
  const allNodes = Array.from(rawReport.graph.nodes.values());
  allNodes.forEach((node) => {
    graph.nodes.set(
      node.id,
      new ProjectDependencyVersionNode(
        node.projectId,
        node.groupId,
        node.artifactId,
        node.versionId,
        node.id,
      ),
    );
  });
  graph.rootNodes = rawReport.graph.rootNodes
    .map((rootNodeId) => graph.nodes.get(rootNodeId))
    .filter(isNonNullable);
  // process forward/back
  allNodes.forEach((n) => {
    const node = guaranteeNonNullable(graph.nodes.get(n.id));
    node.dependencies = n.forwardEdges
      .map((nodeId) => graph.nodes.get(nodeId))
      .filter(isNonNullable);
    node.dependants = n.backEdges
      .map((nodeId) => graph.nodes.get(nodeId))
      .filter(isNonNullable);
  });
  const _report = new ProjectDependencyGraphReport(graph);
  // conflicts
  _report.conflicts = rawReport.conflicts.map((_conflict) => {
    const conflict = new ProjectDependencyConflict(
      _conflict.groupId,
      _conflict.artifactId,
    );
    conflict.versions = uniq(_conflict.versions)
      .sort()
      .map((v) => guaranteeNonNullable(graph.nodes.get(v)));
    return conflict;
  });
  return _report;
};
