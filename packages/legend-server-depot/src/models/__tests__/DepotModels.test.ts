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
import { StoreProjectData } from '../StoreProjectData.js';
import { VersionedProjectData } from '../VersionedProjectData.js';
import { StoredEntity, StoredSummaryEntity } from '../StoredEntity.js';
import {
  ProjectDependencyCoordinates,
  ProjectVersionEntities,
} from '../ProjectVersionEntities.js';
import { ProjectVersionPlatformDependency } from '../ProjectVersionPlatformDependency.js';

const TEST_DATA__storeProjectData = {
  artifactId: 'test-artifact',
  groupId: 'test.group',
  projectId: 'PROD-1234',
};

const TEST_DATA__versionedProjectData = {
  artifactId: 'test-artifact',
  groupId: 'test.group',
  versionId: '1.0.0',
};

test(unitTest('StoreProjectData serialization'), () => {
  const project = StoreProjectData.serialization.fromJson(
    TEST_DATA__storeProjectData,
  );
  expect(project).toBeInstanceOf(StoreProjectData);
  expect(project.projectId).toEqual('PROD-1234');
  expect(project.groupId).toEqual('test.group');
  expect(project.artifactId).toEqual('test-artifact');
  expect(StoreProjectData.serialization.toJson(project)).toEqual(
    TEST_DATA__storeProjectData,
  );
});

test(unitTest('StoreProjectData coordinates omit the version'), () => {
  const project = StoreProjectData.serialization.fromJson(
    TEST_DATA__storeProjectData,
  );
  // NOTE: `coordinates` are GA, not GAV -- `generateGAVCoordinates` is called
  // with an `undefined` version, which is then filtered out
  expect(project.coordinates).toEqual('test.group:test-artifact');
});

test(unitTest('VersionedProjectData serialization'), () => {
  const version = VersionedProjectData.serialization.fromJson(
    TEST_DATA__versionedProjectData,
  );
  expect(version).toBeInstanceOf(VersionedProjectData);
  expect(version.versionId).toEqual('1.0.0');
  expect(VersionedProjectData.serialization.toJson(version)).toEqual(
    TEST_DATA__versionedProjectData,
  );
});

test(unitTest('StoredEntity serialization keeps the entity raw'), () => {
  const json = {
    ...TEST_DATA__versionedProjectData,
    entity: {
      path: 'model::MyClass',
      classifierPath: 'meta::pure::metamodel::type::Class',
      content: { _type: 'class', name: 'MyClass', package: 'model' },
    },
  };
  const stored = StoredEntity.serialization.fromJson(json);
  expect(stored).toBeInstanceOf(StoredEntity);
  expect(stored.versionId).toEqual('1.0.0');
  // `raw()` passes the nested entity through untouched rather than hydrating it
  expect(stored.entity).toEqual(json.entity);
  expect(StoredEntity.serialization.toJson(stored)).toEqual(json);
});

test(unitTest('StoredSummaryEntity serialization'), () => {
  const json = {
    ...TEST_DATA__versionedProjectData,
    path: 'model::sub::MyDataProduct',
    classifierPath: 'meta::external::catalog::dataProduct::DataProduct',
  };
  const stored = StoredSummaryEntity.serialization.fromJson(json);
  expect(stored).toBeInstanceOf(StoredSummaryEntity);
  expect(stored.path).toEqual('model::sub::MyDataProduct');
  expect(stored.classifierPath).toEqual(
    'meta::external::catalog::dataProduct::DataProduct',
  );
  expect(StoredSummaryEntity.serialization.toJson(stored)).toEqual(json);
});

test(unitTest('ProjectDependencyCoordinates serialization'), () => {
  const withExclusions = ProjectDependencyCoordinates.serialization.fromJson({
    ...TEST_DATA__versionedProjectData,
    exclusions: [
      { groupId: 'excluded.group', artifactId: 'excluded-artifact' },
    ],
  });
  expect(withExclusions).toBeInstanceOf(ProjectDependencyCoordinates);
  expect(withExclusions.exclusions).toEqual([
    { groupId: 'excluded.group', artifactId: 'excluded-artifact' },
  ]);

  // `exclusions` is optional and absent round-trips as absent rather than as
  // an empty list
  const withoutExclusions = ProjectDependencyCoordinates.serialization.fromJson(
    TEST_DATA__versionedProjectData,
  );
  expect(withoutExclusions.exclusions).toBeUndefined();
  expect(
    ProjectDependencyCoordinates.serialization.toJson(withoutExclusions),
  ).toEqual(TEST_DATA__versionedProjectData);

  const constructed = new ProjectDependencyCoordinates(
    'test.group',
    'test-artifact',
    '1.0.0',
  );
  expect(
    ProjectDependencyCoordinates.serialization.toJson(constructed),
  ).toEqual(TEST_DATA__versionedProjectData);
});

test(unitTest('ProjectVersionEntities serialization'), () => {
  const json = {
    ...TEST_DATA__versionedProjectData,
    entities: [
      { path: 'model::A', classifierPath: 'c', content: {} },
      { path: 'model::B', classifierPath: 'c', content: {} },
    ],
  };
  const projectVersionEntities =
    ProjectVersionEntities.serialization.fromJson(json);
  expect(projectVersionEntities).toBeInstanceOf(ProjectVersionEntities);
  expect(projectVersionEntities.entities).toHaveLength(2);
  expect(
    ProjectVersionEntities.serialization.toJson(projectVersionEntities),
  ).toEqual(json);
});

test(unitTest('ProjectVersionEntities id omits the version'), () => {
  const v1 = ProjectVersionEntities.serialization.fromJson({
    ...TEST_DATA__versionedProjectData,
    versionId: '1.0.0',
    entities: [],
  });
  const v2 = ProjectVersionEntities.serialization.fromJson({
    ...TEST_DATA__versionedProjectData,
    versionId: '2.0.0',
    entities: [],
  });

  expect(v1.id).toEqual('test.group:test-artifact');
  // NOTE: `id` is GA-only, so two versions of the same group/artifact share
  // an id. `DepotServerClient.getIndexedDependencyEntities` keys its result
  // map by this value, which means such a pair silently collides. Pinned
  // as-is -- see the matching note in `DepotServerClient.test.ts`.
  expect(v1.id).toEqual(v2.id);
});

test(unitTest('ProjectVersionPlatformDependency serialization'), () => {
  const json = {
    ...TEST_DATA__versionedProjectData,
    platformsVersion: [
      {
        propertyName: 'platform-version',
        value: '3.2.1',
        projectVersionId: 'platform:core:3.2.1',
      },
    ],
    dependency: {
      groupId: 'dep.group',
      artifactId: 'dep-artifact',
      versionId: '2.0.0',
    },
    projectId: 'PROD-9999',
  };
  const dependency =
    ProjectVersionPlatformDependency.serialization.fromJson(json);

  expect(dependency).toBeInstanceOf(ProjectVersionPlatformDependency);
  // the nested dependency is hydrated into a real class instance, not a plain
  // object
  expect(dependency.dependency).toBeInstanceOf(ProjectDependencyCoordinates);
  expect(dependency.dependency.versionId).toEqual('2.0.0');
  expect(dependency.platformsVersion).toHaveLength(1);
  expect(dependency.platformsVersion?.[0]?.value).toEqual('3.2.1');
  expect(dependency.projectId).toEqual('PROD-9999');

  expect(
    ProjectVersionPlatformDependency.serialization.toJson(dependency),
  ).toEqual(json);
});

test(
  unitTest('ProjectVersionPlatformDependency tolerates missing optionals'),
  () => {
    const json = {
      ...TEST_DATA__versionedProjectData,
      dependency: {
        groupId: 'dep.group',
        artifactId: 'dep-artifact',
        versionId: '2.0.0',
      },
    };
    const dependency =
      ProjectVersionPlatformDependency.serialization.fromJson(json);

    expect(dependency.platformsVersion).toBeUndefined();
    expect(dependency.projectId).toBeUndefined();
    expect(dependency.dependency).toBeInstanceOf(ProjectDependencyCoordinates);
  },
);
