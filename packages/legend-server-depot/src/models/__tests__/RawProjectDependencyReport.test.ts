/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { test, expect } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import {
  RawProjectDependencyConflict,
  RawProjectDependencyReport,
  RawProjectDependencyVersionNode,
  SerializedGraph,
} from '../RawProjectDependencyReport.js';

const TEST_DATA__rawReport = {
  graph: {
    rootNodes: ['test.group:root:1.0.0'],
    nodes: {
      'test.group:root:1.0.0': {
        projectId: 'PROD-1',
        groupId: 'test.group',
        artifactId: 'root',
        versionId: '1.0.0',
        id: 'test.group:root:1.0.0',
        forwardEdges: ['test.group:child:1.0.0'],
        backEdges: [],
      },
      'test.group:child:1.0.0': {
        projectId: 'PROD-2',
        groupId: 'test.group',
        artifactId: 'child',
        versionId: '1.0.0',
        id: 'test.group:child:1.0.0',
        forwardEdges: [],
        backEdges: ['test.group:root:1.0.0'],
      },
    },
  },
  conflicts: [
    {
      groupId: 'test.group',
      artifactId: 'child',
      versions: ['test.group:child:1.0.0'],
    },
  ],
};

test(unitTest('RawProjectDependencyVersionNode serialization'), () => {
  const json = TEST_DATA__rawReport.graph.nodes['test.group:root:1.0.0'];
  const node = RawProjectDependencyVersionNode.serialization.fromJson(json);

  expect(node).toBeInstanceOf(RawProjectDependencyVersionNode);
  expect(node.id).toEqual('test.group:root:1.0.0');
  expect(node.forwardEdges).toEqual(['test.group:child:1.0.0']);
  expect(node.backEdges).toEqual([]);
  expect(RawProjectDependencyVersionNode.serialization.toJson(node)).toEqual(
    json,
  );
});

test(unitTest('RawProjectDependencyConflict serialization'), () => {
  const json = TEST_DATA__rawReport.conflicts[0] as {
    groupId: string;
    artifactId: string;
    versions: string[];
  };
  const conflict = RawProjectDependencyConflict.serialization.fromJson(json);

  expect(conflict).toBeInstanceOf(RawProjectDependencyConflict);
  expect(conflict.versions).toEqual(['test.group:child:1.0.0']);
  expect(RawProjectDependencyConflict.serialization.toJson(conflict)).toEqual(
    json,
  );
});

test(unitTest('SerializedGraph deserializes nodes into an ES6 Map'), () => {
  const graph = SerializedGraph.serialization.fromJson(
    TEST_DATA__rawReport.graph,
  );

  expect(graph).toBeInstanceOf(SerializedGraph);
  // the custom `serializeMap`/`deserializeMap` pair exists specifically so
  // this ends up as a real `Map` rather than a plain object
  expect(graph.nodes).toBeInstanceOf(Map);
  expect(graph.nodes.size).toBe(2);
  expect(graph.rootNodes).toEqual(['test.group:root:1.0.0']);

  const root = graph.nodes.get('test.group:root:1.0.0');
  expect(root).toBeInstanceOf(RawProjectDependencyVersionNode);
  expect(root?.artifactId).toEqual('root');
  expect(root?.forwardEdges).toEqual(['test.group:child:1.0.0']);
});

test(unitTest('SerializedGraph round-trips back to a plain object'), () => {
  const graph = SerializedGraph.serialization.fromJson(
    TEST_DATA__rawReport.graph,
  );
  expect(SerializedGraph.serialization.toJson(graph)).toEqual(
    TEST_DATA__rawReport.graph,
  );
});

test(unitTest('SerializedGraph handles an empty node map'), () => {
  const graph = SerializedGraph.serialization.fromJson({
    rootNodes: [],
    nodes: {},
  });
  expect(graph.nodes).toBeInstanceOf(Map);
  expect(graph.nodes.size).toBe(0);
});

test(unitTest('RawProjectDependencyReport serialization'), () => {
  const report =
    RawProjectDependencyReport.serialization.fromJson(TEST_DATA__rawReport);

  expect(report).toBeInstanceOf(RawProjectDependencyReport);
  expect(report.graph).toBeInstanceOf(SerializedGraph);
  expect(report.graph.nodes).toBeInstanceOf(Map);
  expect(report.conflicts).toHaveLength(1);
  expect(report.conflicts[0]).toBeInstanceOf(RawProjectDependencyConflict);
  expect(report.conflicts[0]?.artifactId).toEqual('child');

  expect(RawProjectDependencyReport.serialization.toJson(report)).toEqual(
    TEST_DATA__rawReport,
  );
});
