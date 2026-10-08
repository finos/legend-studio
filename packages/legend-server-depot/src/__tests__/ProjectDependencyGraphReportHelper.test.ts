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
import { unitTest, createSpy } from '@finos/legend-shared/test';
import type { PlainObject } from '@finos/legend-shared';
import {
  RawProjectDependencyReport,
  type RawProjectDependencyVersionNode,
} from '../models/RawProjectDependencyReport.js';
import {
  buildConflictsPaths,
  buildDependencyReport,
} from '../ProjectDependencyGraphReportHelper.js';

const node = (
  artifactId: string,
  versionId: string,
  forwardEdges: string[] = [],
  backEdges: string[] = [],
): PlainObject<RawProjectDependencyVersionNode> => ({
  projectId: `PROD-${artifactId}`,
  groupId: 'test.group',
  artifactId,
  versionId,
  id: `test.group:${artifactId}:${versionId}`,
  forwardEdges,
  backEdges,
});

const buildRawReport = (
  nodes: PlainObject<RawProjectDependencyVersionNode>[],
  rootNodes: string[],
  conflicts: { groupId: string; artifactId: string; versions: string[] }[] = [],
): RawProjectDependencyReport =>
  RawProjectDependencyReport.serialization.fromJson({
    graph: {
      rootNodes,
      nodes: Object.fromEntries(nodes.map((n) => [n.id as string, n])),
    },
    conflicts,
  });

const ROOT_ID = 'test.group:root:1.0.0';
const MIDDLE_ID = 'test.group:middle:1.0.0';
const LEAF_ID = 'test.group:leaf:1.0.0';

test(unitTest('Build dependency report graph'), () => {
  const report = buildDependencyReport(
    buildRawReport(
      [
        node('root', '1.0.0', [MIDDLE_ID]),
        node('middle', '1.0.0', [LEAF_ID], [ROOT_ID]),
        node('leaf', '1.0.0', [], [MIDDLE_ID]),
      ],
      [ROOT_ID],
    ),
  );

  expect(report.graph.nodes.size).toBe(3);
  expect(report.graph.rootNodes).toHaveLength(1);
  expect(report.graph.rootNodes[0]?.id).toEqual(ROOT_ID);

  const middle = report.graph.nodes.get(MIDDLE_ID);
  // edges are resolved to the very same node instances held in the map
  expect(middle?.dependencies[0]).toBe(report.graph.nodes.get(LEAF_ID));
  expect(middle?.dependants[0]).toBe(report.graph.nodes.get(ROOT_ID));
  expect(report.graph.nodes.get(LEAF_ID)?.dependencies).toEqual([]);
});

test(unitTest('Build dependency report drops unknown root node ids'), () => {
  const report = buildDependencyReport(
    buildRawReport(
      [node('root', '1.0.0')],
      [ROOT_ID, 'test.group:ghost:1.0.0'],
    ),
  );

  // unknown root ids are filtered out silently rather than throwing
  expect(report.graph.rootNodes).toHaveLength(1);
  expect(report.graph.rootNodes[0]?.id).toEqual(ROOT_ID);
});

test(unitTest('Build dependency report drops dangling edges'), () => {
  const report = buildDependencyReport(
    buildRawReport(
      [
        node(
          'root',
          '1.0.0',
          ['test.group:ghost:1.0.0'],
          ['test.group:ghost:2.0.0'],
        ),
      ],
      [ROOT_ID],
    ),
  );

  // forward/back edges pointing at ids absent from the node map are also
  // filtered out silently
  expect(report.graph.nodes.get(ROOT_ID)?.dependencies).toEqual([]);
  expect(report.graph.nodes.get(ROOT_ID)?.dependants).toEqual([]);
});

test(
  unitTest('Build dependency report throws on an unknown conflict version'),
  () => {
    // NOTE: conflicts are resolved with `guaranteeNonNullable`, unlike root
    // nodes and edges which are silently filtered. An unknown id here throws.
    expect(() =>
      buildDependencyReport(
        buildRawReport(
          [node('root', '1.0.0')],
          [ROOT_ID],
          [
            {
              groupId: 'test.group',
              artifactId: 'ghost',
              versions: ['test.group:ghost:1.0.0'],
            },
          ],
        ),
      ),
    ).toThrow();
  },
);

test(
  unitTest('Build dependency report dedupes and sorts conflict versions'),
  () => {
    const report = buildDependencyReport(
      buildRawReport(
        [
          node('root', '1.0.0'),
          node('dep', '1.9.0'),
          node('dep', '1.10.0'),
          node('dep', '2.0.0'),
        ],
        [ROOT_ID],
        [
          {
            groupId: 'test.group',
            artifactId: 'dep',
            versions: [
              'test.group:dep:2.0.0',
              'test.group:dep:1.9.0',
              'test.group:dep:1.10.0',
              // duplicate, should be collapsed
              'test.group:dep:2.0.0',
            ],
          },
        ],
      ),
    );

    const versions = report.conflicts[0]?.versions.map((v) => v.id);
    // NOTE: this is a plain `Array.prototype.sort()`, i.e. lexicographic on the
    // full node id -- not semver. So `1.10.0` sorts before `1.9.0`.
    expect(versions).toEqual([
      'test.group:dep:1.10.0',
      'test.group:dep:1.9.0',
      'test.group:dep:2.0.0',
    ]);
  },
);

test(unitTest('Build conflicts paths for a root node'), () => {
  const report = buildDependencyReport(
    buildRawReport(
      [node('root', '1.0.0')],
      [ROOT_ID],
      [
        {
          groupId: 'test.group',
          artifactId: 'root',
          versions: [ROOT_ID],
        },
      ],
    ),
  );
  const conflict = report.conflicts[0];
  const paths = buildConflictsPaths(report).get(
    conflict as NonNullable<typeof conflict>,
  );

  expect(paths).toHaveLength(1);
  // a root node terminates the walk immediately
  expect(paths?.[0]?.pathsToVersion).toHaveLength(1);
  expect(paths?.[0]?.pathsToVersion[0]?.map((n) => n.id)).toEqual([ROOT_ID]);
});

test(unitTest('Build conflicts paths walks back to the root'), () => {
  const report = buildDependencyReport(
    buildRawReport(
      [
        node('root', '1.0.0', [MIDDLE_ID]),
        node('middle', '1.0.0', [LEAF_ID], [ROOT_ID]),
        node('leaf', '1.0.0', [], [MIDDLE_ID]),
      ],
      [ROOT_ID],
      [
        {
          groupId: 'test.group',
          artifactId: 'leaf',
          versions: [LEAF_ID],
        },
      ],
    ),
  );
  const conflict = report.conflicts[0];
  const paths = buildConflictsPaths(report).get(
    conflict as NonNullable<typeof conflict>,
  );

  expect(paths).toHaveLength(1);
  expect(paths?.[0]?.version.id).toEqual(LEAF_ID);
  expect(paths?.[0]?.pathsToVersion).toHaveLength(1);
  // the conflicting node is pushed on after the recursion unwinds, so the path
  // reads root-first and ends at the node itself
  expect(paths?.[0]?.pathsToVersion[0]?.map((n) => n.id)).toEqual([
    ROOT_ID,
    MIDDLE_ID,
    LEAF_ID,
  ]);
});

test(unitTest('Build conflicts paths across diverging dependants'), () => {
  const LEFT_ID = 'test.group:left:1.0.0';
  const RIGHT_ID = 'test.group:right:1.0.0';
  const report = buildDependencyReport(
    buildRawReport(
      [
        node('root', '1.0.0', [LEFT_ID, RIGHT_ID]),
        node('left', '1.0.0', [LEAF_ID], [ROOT_ID]),
        node('right', '1.0.0', [LEAF_ID], [ROOT_ID]),
        node('leaf', '1.0.0', [], [LEFT_ID, RIGHT_ID]),
      ],
      [ROOT_ID],
      [{ groupId: 'test.group', artifactId: 'leaf', versions: [LEAF_ID] }],
    ),
  );
  const conflict = report.conflicts[0];
  const paths = buildConflictsPaths(report).get(
    conflict as NonNullable<typeof conflict>,
  );

  expect(paths?.[0]?.pathsToVersion.map((p) => p.map((n) => n.id))).toEqual([
    [ROOT_ID, LEFT_ID, LEAF_ID],
    [ROOT_ID, RIGHT_ID, LEAF_ID],
  ]);
});

test(
  unitTest('Build conflicts paths returns an empty map without conflicts'),
  () => {
    const report = buildDependencyReport(
      buildRawReport([node('root', '1.0.0')], [ROOT_ID]),
    );
    expect(buildConflictsPaths(report).size).toBe(0);
  },
);

test(unitTest('Build conflicts paths caps the number of paths'), () => {
  // `Math.random` only drives which subset survives, so pinning it keeps the
  // shuffle deterministic while still exercising the capping branch
  createSpy(Math, 'random').mockReturnValue(0);

  // 60 distinct dependants of the leaf, each of them a root, produce 60
  // candidate paths -- above the internal limit of 50
  const DEPENDANT_COUNT = 60;
  const dependantIds = Array.from(
    { length: DEPENDANT_COUNT },
    (_, idx) => `test.group:dep${idx}:1.0.0`,
  );
  const report = buildDependencyReport(
    buildRawReport(
      [
        ...dependantIds.map((_id, idx) =>
          node(`dep${idx}`, '1.0.0', [LEAF_ID]),
        ),
        node('leaf', '1.0.0', [], dependantIds),
      ],
      dependantIds,
      [{ groupId: 'test.group', artifactId: 'leaf', versions: [LEAF_ID] }],
    ),
  );
  const conflict = report.conflicts[0];
  const paths = buildConflictsPaths(report).get(
    conflict as NonNullable<typeof conflict>,
  );

  expect(paths?.[0]?.pathsToVersion).toHaveLength(50);
  // every surviving path is still a well-formed dependant -> leaf pair
  paths?.[0]?.pathsToVersion.forEach((path) => {
    expect(path).toHaveLength(2);
    expect(path[1]?.id).toEqual(LEAF_ID);
  });
});

test(unitTest('Build conflicts paths stops at the max depth'), () => {
  // a dependency cycle has no root to terminate on, so only the depth guard
  // stops the walk
  const A_ID = 'test.group:a:1.0.0';
  const B_ID = 'test.group:b:1.0.0';
  const report = buildDependencyReport(
    buildRawReport(
      [node('a', '1.0.0', [B_ID], [B_ID]), node('b', '1.0.0', [A_ID], [A_ID])],
      [],
      [{ groupId: 'test.group', artifactId: 'a', versions: [A_ID] }],
    ),
  );
  const conflict = report.conflicts[0];

  const paths = buildConflictsPaths(report).get(
    conflict as NonNullable<typeof conflict>,
  );

  // the walk terminates rather than recursing forever, bottoming out on the
  // depth guard after 100 levels
  expect(paths?.[0]?.pathsToVersion).toHaveLength(1);
  expect(paths?.[0]?.pathsToVersion[0]?.length).toBeGreaterThan(100);
  expect(paths?.[0]?.pathsToVersion[0]?.at(-1)?.id).toEqual(A_ID);
});
