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

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { unitTest, createSpy } from '@finos/legend-shared/test';
import { EntitiesWithOrigin } from '@finos/legend-storage';
import { DepotServerClient } from '../DepotServerClient.js';
import { StoreProjectData } from '../models/StoreProjectData.js';
import { StoredSummaryEntity } from '../models/StoredEntity.js';
import {
  extractDepotEntityInfo,
  projectIdHandlerFunc,
  retrieveProjectEntitiesWithClassifier,
  retrieveProjectEntitiesWithDependencies,
} from '../DepotEntityHelper.js';

const TEST_DATA__project = {
  artifactId: 'test-artifact',
  groupId: 'test.group',
  projectId: 'PROD-1234',
};

const buildProject = (): StoreProjectData =>
  StoreProjectData.serialization.fromJson(TEST_DATA__project);

describe('DepotEntityHelper', () => {
  let client: DepotServerClient;

  beforeEach(() => {
    client = new DepotServerClient({ serverUrl: 'https://depot.test' });
  });

  describe(unitTest('retrieveProjectEntitiesWithDependencies'), () => {
    test(
      unitTest('returns dependency entities ahead of project entities'),
      async () => {
        const projectEntity = { path: 'model::Own', classifierPath: 'c' };
        const dependencyEntity = {
          path: 'model::Dep',
          classifierPath: 'c',
          content: {},
        };

        createSpy(client, 'getEntities').mockResolvedValue([projectEntity]);
        createSpy(client, 'getIndexedDependencyEntities').mockResolvedValue(
          new Map([
            [
              'test.group:dep',
              new EntitiesWithOrigin('test.group', 'dep', '1.0.0', [
                dependencyEntity,
              ]),
            ],
          ]),
        );

        const entities = await retrieveProjectEntitiesWithDependencies(
          buildProject(),
          '1.0.0',
          client,
        );

        // dependency entities are concatenated first, the project's own
        // entities last
        expect(entities).toEqual([dependencyEntity, projectEntity]);
      },
    );

    test(
      unitTest('flattens entities across several dependencies'),
      async () => {
        createSpy(client, 'getEntities').mockResolvedValue([]);
        createSpy(client, 'getIndexedDependencyEntities').mockResolvedValue(
          new Map([
            [
              'test.group:a',
              new EntitiesWithOrigin('test.group', 'a', '1.0.0', [
                { path: 'model::A', classifierPath: 'c', content: {} },
              ]),
            ],
            [
              'test.group:b',
              new EntitiesWithOrigin('test.group', 'b', '1.0.0', [
                { path: 'model::B', classifierPath: 'c', content: {} },
                { path: 'model::C', classifierPath: 'c', content: {} },
              ]),
            ],
          ]),
        );

        const entities = await retrieveProjectEntitiesWithDependencies(
          buildProject(),
          '1.0.0',
          client,
        );

        expect(entities.map((e) => e.path)).toEqual([
          'model::A',
          'model::B',
          'model::C',
        ]);
      },
    );
  });

  describe(unitTest('retrieveProjectEntitiesWithClassifier'), () => {
    test(
      unitTest('requests non-transitive dependencies and flattens them'),
      async () => {
        const getEntitiesSpy = createSpy(client, 'getEntities');
        getEntitiesSpy.mockResolvedValue([{ path: 'model::Own' }]);
        const getDependencyEntitiesSpy = createSpy(
          client,
          'getDependencyEntities',
        );
        getDependencyEntitiesSpy.mockResolvedValue([
          { entities: [{ path: 'model::Dep1' }, { path: 'model::Dep2' }] },
        ]);

        const [entities, dependencyEntities] =
          await retrieveProjectEntitiesWithClassifier(
            buildProject(),
            '1.0.0',
            'meta::pure::metamodel::type::Class',
            client,
          );

        expect(entities).toEqual([{ path: 'model::Own' }]);
        expect(dependencyEntities).toEqual([
          { path: 'model::Dep1' },
          { path: 'model::Dep2' },
        ]);
        expect(getEntitiesSpy).toHaveBeenCalledWith(
          expect.anything(),
          '1.0.0',
          'meta::pure::metamodel::type::Class',
        );
        // both `transitive` and `includeOrigin` are hard-coded to false here
        expect(getDependencyEntitiesSpy).toHaveBeenCalledWith(
          'test.group',
          'test-artifact',
          '1.0.0',
          false,
          false,
          'meta::pure::metamodel::type::Class',
        );
      },
    );
  });

  describe(unitTest('projectIdHandlerFunc'), () => {
    test(
      unitTest('resolves the concrete version behind the latest alias'),
      async () => {
        createSpy(client, 'getProject').mockResolvedValue(TEST_DATA__project);
        const getLatestVersionSpy = createSpy(client, 'getLatestVersion');
        getLatestVersionSpy.mockResolvedValue({
          groupId: 'test.group',
          artifactId: 'test-artifact',
          versionId: '3.4.5',
        });
        const handler = jest.fn();

        await projectIdHandlerFunc(
          'test.group',
          'test-artifact',
          'latest',
          client,
          handler,
        );

        expect(getLatestVersionSpy).toHaveBeenCalledWith(
          'test.group',
          'test-artifact',
        );
        expect(handler).toHaveBeenCalledWith('PROD-1234', '3.4.5');
      },
    );

    test(unitTest('passes a concrete version straight through'), async () => {
      createSpy(client, 'getProject').mockResolvedValue(TEST_DATA__project);
      const getLatestVersionSpy = createSpy(client, 'getLatestVersion');
      const handler = jest.fn();

      await projectIdHandlerFunc(
        'test.group',
        'test-artifact',
        '1.0.0',
        client,
        handler,
      );

      expect(getLatestVersionSpy).not.toHaveBeenCalled();
      expect(handler).toHaveBeenCalledWith('PROD-1234', '1.0.0');
    });

    test(unitTest('does not resolve the HEAD alias'), async () => {
      createSpy(client, 'getProject').mockResolvedValue(TEST_DATA__project);
      const getLatestVersionSpy = createSpy(client, 'getLatestVersion');
      const handler = jest.fn();

      await projectIdHandlerFunc(
        'test.group',
        'test-artifact',
        'HEAD',
        client,
        handler,
      );

      // only `latest` triggers a lookup -- `HEAD` is forwarded verbatim and
      // resolved later, at the point of the actual depot request
      expect(getLatestVersionSpy).not.toHaveBeenCalled();
      expect(handler).toHaveBeenCalledWith('PROD-1234', 'HEAD');
    });
  });
});

test(unitTest('Extract depot entity info'), () => {
  const storedEntity = StoredSummaryEntity.serialization.fromJson({
    groupId: 'test.group',
    artifactId: 'test-artifact',
    versionId: 'master-SNAPSHOT',
    path: 'model::sub::MyDataProduct',
    classifierPath: 'meta::external::catalog::dataProduct::DataProduct',
  });

  const info = extractDepotEntityInfo(storedEntity, true);

  // the snapshot flag replaces the stored version with our `HEAD` alias
  expect(info.origin).toEqual({
    groupId: 'test.group',
    artifactId: 'test-artifact',
    versionId: 'HEAD',
  });
  expect(info.name).toEqual('MyDataProduct');
  expect(info.path).toEqual('model::sub::MyDataProduct');
  expect(info.classifierPath).toEqual(
    'meta::external::catalog::dataProduct::DataProduct',
  );
});

test(unitTest('Extract depot entity info for a released version'), () => {
  const storedEntity = StoredSummaryEntity.serialization.fromJson({
    groupId: 'test.group',
    artifactId: 'test-artifact',
    versionId: '1.0.0',
    path: 'MyClass',
    classifierPath: 'meta::pure::metamodel::type::Class',
  });

  const info = extractDepotEntityInfo(storedEntity, false);

  expect(info.origin?.versionId).toEqual('1.0.0');
  // a path with no `::` separator yields the whole path as the name
  expect(info.name).toEqual('MyClass');
});
