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

import { describe, expect, test } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import type { Entity } from '@finos/legend-storage';
import type { PlainObject } from '@finos/legend-shared';
import {
  EntityChangeType,
  ProjectConfiguration,
} from '@finos/legend-server-sdlc';
import {
  buildWorkspaceCopyEntityChanges,
  countWorkspaceElementChanges,
  getOtherProjectWorkspaceCopyChanges,
  getPathsAlsoChangedOnLine,
  getWorkspaceCopyDependencyDiff,
  getWorkspaceElementChanges,
} from '../WorkspaceCopyUtils.js';

const CLASS = 'meta::pure::metamodel::type::Class';

const buildClass = (path: string, doc = 'v1'): Entity => {
  const index = path.lastIndexOf('::');
  return {
    path,
    classifierPath: CLASS,
    content: {
      _type: 'class',
      name: path.substring(index + 2),
      package: path.substring(0, index),
      taggedValues: [{ value: doc }],
    },
  };
};

describe('getWorkspaceElementChanges', () => {
  test(
    unitTest('lists new, then modified, then deleted elements, each by path'),
    () => {
      const base = [
        buildClass('model::Kept'),
        buildClass('model::Zebra'),
        buildClass('model::Apple'),
        buildClass('model::Removed'),
      ];
      const current = [
        buildClass('model::Kept'),
        buildClass('model::Zebra', 'v2'),
        buildClass('model::Apple', 'v2'),
        buildClass('model::New'),
      ];
      const changes = getWorkspaceElementChanges(base, current);

      expect(changes.map((change) => [change.type, change.entityPath])).toEqual(
        [
          [EntityChangeType.CREATE, 'model::New'],
          [EntityChangeType.MODIFY, 'model::Apple'],
          [EntityChangeType.MODIFY, 'model::Zebra'],
          [EntityChangeType.DELETE, 'model::Removed'],
        ],
      );
      expect(changes[0]?.baseContent).toBeUndefined();
      expect(changes[0]?.content).toEqual(buildClass('model::New').content);
      expect(changes[1]?.baseContent).toEqual(
        buildClass('model::Apple').content,
      );
      expect(changes[3]?.content).toBeUndefined();
      expect(countWorkspaceElementChanges(changes)).toEqual({
        created: 1,
        modified: 2,
        deleted: 1,
      });
    },
  );

  test(
    unitTest("doesn't count content whose keys are only in another order"),
    () => {
      const entity = buildClass('model::Kept');
      const reordered: Entity = {
        ...entity,
        content: Object.fromEntries(Object.entries(entity.content).reverse()),
      };

      expect(getWorkspaceElementChanges([entity], [reordered])).toEqual([]);
    },
  );
});

describe('buildWorkspaceCopyEntityChanges', () => {
  // the source created Both and New, modified DeletedOnLine, Edited and Same,
  // and deleted AlreadyGone and Gone
  const base = [
    buildClass('model::Edited'),
    buildClass('model::Same'),
    buildClass('model::Gone'),
    buildClass('model::AlreadyGone'),
    buildClass('model::DeletedOnLine'),
  ];
  const current = [
    buildClass('model::New'),
    buildClass('model::Both'),
    buildClass('model::Edited', 'v2'),
    buildClass('model::Same', 'v2'),
    buildClass('model::DeletedOnLine', 'v2'),
  ];
  const changes = getWorkspaceElementChanges(base, current);

  test(
    unitTest(
      'creates what the line lacks, modifies and deletes what it has, and skips the rest',
    ),
    () => {
      const line = [
        // also created on the line, to something else
        buildClass('model::Both', 'line'),
        buildClass('model::Edited', 'line'),
        // the line already made the same change
        buildClass('model::Same', 'v2'),
        buildClass('model::Gone'),
      ];

      expect(buildWorkspaceCopyEntityChanges(changes, line)).toEqual([
        {
          type: EntityChangeType.MODIFY,
          entityPath: 'model::Both',
          classifierPath: CLASS,
          content: buildClass('model::Both').content,
        },
        {
          type: EntityChangeType.CREATE,
          entityPath: 'model::New',
          classifierPath: CLASS,
          content: buildClass('model::New').content,
        },
        {
          type: EntityChangeType.CREATE,
          entityPath: 'model::DeletedOnLine',
          classifierPath: CLASS,
          content: buildClass('model::DeletedOnLine', 'v2').content,
        },
        {
          type: EntityChangeType.MODIFY,
          entityPath: 'model::Edited',
          classifierPath: CLASS,
          content: buildClass('model::Edited', 'v2').content,
        },
        { type: EntityChangeType.DELETE, entityPath: 'model::Gone' },
      ]);
    },
  );

  test(
    unitTest('has nothing to commit once the line holds the changes'),
    () => {
      expect(buildWorkspaceCopyEntityChanges(changes, current)).toEqual([]);
    },
  );

  test(
    unitTest(
      'marks the elements the line changed too, to something else than the source',
    ),
    () => {
      const line = [
        buildClass('model::Both', 'line'),
        buildClass('model::Edited', 'line'),
        buildClass('model::Same', 'v2'),
        buildClass('model::Gone', 'line'),
      ];

      expect(
        Array.from(getPathsAlsoChangedOnLine(changes, line)).sort(),
      ).toEqual([
        'model::Both',
        'model::DeletedOnLine',
        'model::Edited',
        'model::Gone',
      ]);
      // a line still at the source's BASE revision changed nothing
      expect(getPathsAlsoChangedOnLine(changes, base).size).toBe(0);
    },
  );
});

describe('copying a workspace of another project', () => {
  const line = [
    buildClass('model::Same'),
    buildClass('model::Shared'),
    buildClass('model::OnlyInProject'),
  ];
  const source = [
    buildClass('model::Same'),
    buildClass('model::Shared', 'source'),
    buildClass('model::OnlyInSource'),
  ];

  test(
    unitTest(
      'brings the elements the project lacks as new and replaces those it has, deleting none',
    ),
    () => {
      const changes = getOtherProjectWorkspaceCopyChanges(line, source);

      expect(changes.map((change) => [change.type, change.entityPath])).toEqual(
        [
          [EntityChangeType.CREATE, 'model::OnlyInSource'],
          [EntityChangeType.MODIFY, 'model::Shared'],
        ],
      );
      expect(buildWorkspaceCopyEntityChanges(changes, line)).toEqual([
        {
          type: EntityChangeType.CREATE,
          entityPath: 'model::OnlyInSource',
          classifierPath: CLASS,
          content: buildClass('model::OnlyInSource').content,
        },
        {
          type: EntityChangeType.MODIFY,
          entityPath: 'model::Shared',
          classifierPath: CLASS,
          content: buildClass('model::Shared', 'source').content,
        },
      ]);
    },
  );
});

const buildConfiguration = (
  projectDependencies: { projectId: string; versionId: string }[],
): ProjectConfiguration =>
  ProjectConfiguration.serialization.fromJson({
    projectId: 'PROD-1',
    groupId: 'org.finos.legend',
    artifactId: 'target',
    projectStructureVersion: { version: 13, extensionVersion: 1 },
    projectDependencies,
  } as PlainObject<ProjectConfiguration>);

describe('getWorkspaceCopyDependencyDiff', () => {
  test(
    unitTest(
      'lists the dependencies the target lacks, and those it has at another version',
    ),
    () => {
      const diff = getWorkspaceCopyDependencyDiff(
        buildConfiguration([
          { projectId: 'org.finos.legend:fx-rates', versionId: '1.4.0' },
          { projectId: 'org.finos.legend:shared', versionId: '2.0.0' },
          { projectId: 'org.finos.legend:pinned', versionId: '1.0.0' },
          { projectId: 'org.finos.legend:instruments', versionId: '2.0.1' },
        ]),
        buildConfiguration([
          { projectId: 'org.finos.legend:shared', versionId: '2.0.0' },
          { projectId: 'org.finos.legend:pinned', versionId: '1.1.0' },
        ]),
      );

      expect(
        diff.missing.map((dependency) => [
          dependency.projectId,
          dependency.versionId,
        ]),
      ).toEqual([
        ['org.finos.legend:fx-rates', '1.4.0'],
        ['org.finos.legend:instruments', '2.0.1'],
      ]);
      expect(
        diff.mismatched.map(({ source, target }) => [
          source.projectId,
          source.versionId,
          target.versionId,
        ]),
      ).toEqual([['org.finos.legend:pinned', '1.0.0', '1.1.0']]);
    },
  );

  test(unitTest('leaves out a dependency on the target itself'), () => {
    const diff = getWorkspaceCopyDependencyDiff(
      buildConfiguration([
        { projectId: 'org.finos.legend:target', versionId: '3.0.0' },
        { projectId: 'PROD-1', versionId: '3.0.0' },
      ]),
      buildConfiguration([]),
    );

    expect(diff).toEqual({ missing: [], mismatched: [] });
  });

  test(unitTest('finds nothing when both depend on the same'), () => {
    const dependencies = [
      { projectId: 'org.finos.legend:shared', versionId: '2.0.0' },
    ];

    expect(
      getWorkspaceCopyDependencyDiff(
        buildConfiguration(dependencies),
        buildConfiguration(dependencies),
      ),
    ).toEqual({ missing: [], mismatched: [] });
  });
});
