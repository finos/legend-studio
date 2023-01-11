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

export class ProjectDependencyVersionNode {
  projectId: string;
  groupId: string;
  artifactId: string;
  versionId: string;
  id: string;

  constructor(
    projectId: string,
    groupId: string,
    artifactId: string,
    versionId: string,
    id: string,
  ) {
    this.projectId = projectId;
    this.groupId = groupId;
    this.artifactId = artifactId;
    this.versionId = versionId;
    this.id = id;
  }

  dependencies: ProjectDependencyVersionNode[] = [];
  dependants: ProjectDependencyVersionNode[] = [];
}

export class ProjectDependencyGraph {
  nodes: Map<string, ProjectDependencyVersionNode> = new Map();
  rootNodes: ProjectDependencyVersionNode[] = [];
}

export class ProjectDependencyConflict {
  groupId: string;
  artifactId: string;
  versions: ProjectDependencyVersionNode[] = [];

  constructor(groupId: string, artifact: string) {
    this.groupId = groupId;
    this.artifactId = artifact;
  }
}

export class ProjectDependencyGraphReport {
  graph: ProjectDependencyGraph;
  conflicts: ProjectDependencyConflict[] = [];
  conflictInfo: Map<
    ProjectDependencyConflict,
    ProjectDependencyVersionConflictInfo[]
  > = new Map();

  constructor(graph: ProjectDependencyGraph) {
    this.graph = graph;
  }
}

export class ProjectDependencyVersionConflictInfo {
  conflict: ProjectDependencyConflict;
  version: ProjectDependencyVersionNode;
  pathsToVersion: ProjectDependencyVersionNode[][] = [];

  constructor(
    conflict: ProjectDependencyConflict,
    versionNode: ProjectDependencyVersionNode,
  ) {
    this.conflict = conflict;
    this.version = versionNode;
  }
}
