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
  ProjectDependencyInfo,
  ProjectVersionConflict,
  ProjectVersionDependencies,
} from '../ProjectDependencyInfo.js';

const TEST_DATA__dependencyInfo = {
  tree: [
    {
      groupId: 'test.group',
      artifactId: 'root',
      versionId: '1.0.0',
      path: 'test.group:root:1.0.0',
      dependencies: [
        {
          groupId: 'test.group',
          artifactId: 'middle',
          versionId: '1.0.0',
          path: 'test.group:middle:1.0.0',
          dependencies: [
            {
              groupId: 'test.group',
              artifactId: 'leaf',
              versionId: '1.0.0',
              path: 'test.group:leaf:1.0.0',
              dependencies: [],
            },
          ],
        },
      ],
    },
  ],
  conflicts: [
    {
      groupId: 'test.group',
      artifactId: 'leaf',
      conflictPaths: ['test.group:root:1.0.0/test.group:leaf:1.0.0'],
      versions: ['1.0.0', '2.0.0'],
    },
  ],
};

test(unitTest('ProjectVersionConflict serialization'), () => {
  const json = TEST_DATA__dependencyInfo.conflicts[0] as Record<
    string,
    unknown
  >;
  const conflict = ProjectVersionConflict.serialization.fromJson(json);

  expect(conflict).toBeInstanceOf(ProjectVersionConflict);
  expect(conflict.versions).toEqual(['1.0.0', '2.0.0']);
  expect(conflict.conflictPaths).toHaveLength(1);
  expect(ProjectVersionConflict.serialization.toJson(conflict)).toEqual(json);
});

test(unitTest('ProjectVersionDependencies serialization is recursive'), () => {
  const json = TEST_DATA__dependencyInfo.tree[0] as Record<string, unknown>;
  const root = ProjectVersionDependencies.serialization.fromJson(json);

  expect(root).toBeInstanceOf(ProjectVersionDependencies);
  // the schema refers to itself, so nesting must hydrate all the way down
  const middle = root.dependencies[0];
  expect(middle).toBeInstanceOf(ProjectVersionDependencies);
  expect(middle?.artifactId).toEqual('middle');

  const leaf = middle?.dependencies[0];
  expect(leaf).toBeInstanceOf(ProjectVersionDependencies);
  expect(leaf?.artifactId).toEqual('leaf');
  expect(leaf?.dependencies).toEqual([]);

  expect(ProjectVersionDependencies.serialization.toJson(root)).toEqual(json);
});

test(unitTest('ProjectDependencyInfo serialization'), () => {
  const info = ProjectDependencyInfo.serialization.fromJson(
    TEST_DATA__dependencyInfo,
  );

  expect(info).toBeInstanceOf(ProjectDependencyInfo);
  expect(info.tree).toHaveLength(1);
  expect(info.tree[0]).toBeInstanceOf(ProjectVersionDependencies);
  expect(info.conflicts).toHaveLength(1);
  expect(info.conflicts[0]).toBeInstanceOf(ProjectVersionConflict);

  expect(ProjectDependencyInfo.serialization.toJson(info)).toEqual(
    TEST_DATA__dependencyInfo,
  );
});

test(unitTest('ProjectDependencyInfo tolerates empty collections'), () => {
  const info = ProjectDependencyInfo.serialization.fromJson({
    tree: [],
    conflicts: [],
  });
  expect(info.tree).toEqual([]);
  expect(info.conflicts).toEqual([]);
});
