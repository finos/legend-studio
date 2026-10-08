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

import { describe, test, expect, beforeEach, type jest } from '@jest/globals';
import { unitTest, createSpy } from '@finos/legend-shared/test';
import { ContentType, HttpHeader } from '@finos/legend-shared';
import { DepotServerClient } from '../DepotServerClient.js';
import { StoreProjectData } from '../models/StoreProjectData.js';
import { DepotScope } from '../models/DepotScope.js';

const TEST_SERVER_URL = 'https://depot.test';

const TEST_DATA__project = {
  artifactId: 'test-artifact',
  groupId: 'test.group',
  projectId: 'PROD-1234',
};

describe('DepotServerClient', () => {
  let client: DepotServerClient;
  let project: StoreProjectData;
  // Captured once so assertions never re-read `client.get` as a bare property
  // access (which trips `@typescript-eslint/unbound-method` on a prototype
  // method).
  let getSpy: jest.SpiedFunction<DepotServerClient['get']>;

  beforeEach(() => {
    client = new DepotServerClient({ serverUrl: TEST_SERVER_URL });
    project = StoreProjectData.serialization.fromJson(TEST_DATA__project);
    getSpy = createSpy(client, 'get');
    getSpy.mockResolvedValue([]);
  });

  test(unitTest('maps the configured server url onto the base url'), () => {
    expect(client.baseUrl).toEqual(TEST_SERVER_URL);
  });

  describe(unitTest('projects'), () => {
    test(unitTest('getProjects reads the project configurations'), async () => {
      await client.getProjects();
      expect(getSpy).toHaveBeenCalledWith(
        `${TEST_SERVER_URL}/project-configurations`,
      );
    });

    test(unitTest('getProject encodes its coordinates'), async () => {
      await client.getProject('my group', 'my/artifact');
      expect(getSpy).toHaveBeenCalledWith(
        `${TEST_SERVER_URL}/project-configurations/my%20group/my%2Fartifact`,
      );
    });
  });

  describe(unitTest('entities'), () => {
    test(unitTest('getAllVersions builds the versions url'), async () => {
      await client.getAllVersions('test.group', 'test-artifact');
      expect(getSpy).toHaveBeenCalledWith(
        `${TEST_SERVER_URL}/projects/test.group/test-artifact/versions`,
      );
    });

    test(unitTest('getVersionEntities appends the classifier'), async () => {
      await client.getVersionEntities(
        'test.group',
        'test-artifact',
        '1.0.0',
        'meta::pure::metamodel::type::Class',
      );
      expect(getSpy).toHaveBeenCalledWith(
        `${TEST_SERVER_URL}/projects/test.group/test-artifact/versions/1.0.0/classifiers/meta::pure::metamodel::type::Class`,
      );
    });

    test(unitTest('getEntities resolves the HEAD alias'), async () => {
      await client.getEntities(project, 'HEAD');
      expect(getSpy).toHaveBeenCalledWith(
        `${TEST_SERVER_URL}/projects/test.group/test-artifact/versions/master-SNAPSHOT`,
      );
    });

    test(
      unitTest('getEntities passes a concrete version through'),
      async () => {
        await client.getEntities(project, '1.0.0');
        expect(getSpy).toHaveBeenCalledWith(
          `${TEST_SERVER_URL}/projects/test.group/test-artifact/versions/1.0.0`,
        );
      },
    );

    test(
      unitTest('getEntity resolves the HEAD alias and encodes the path'),
      async () => {
        await client.getEntity(project, 'HEAD', 'model::sub::MyClass');
        expect(getSpy).toHaveBeenCalledWith(
          `${TEST_SERVER_URL}/projects/test.group/test-artifact/versions/master-SNAPSHOT/entities/model%3A%3Asub%3A%3AMyClass`,
        );
      },
    );

    test(
      unitTest('DEPRECATED_getEntitiesByClassifierPath forwards its options'),
      async () => {
        await client.DEPRECATED_getEntitiesByClassifierPath('model::Thing', {
          search: 'abc',
          scope: DepotScope.RELEASES,
          limit: 10,
        });
        expect(getSpy).toHaveBeenCalledWith(
          `${TEST_SERVER_URL}/entitiesByClassifierPath/model%3A%3AThing`,
          undefined,
          undefined,
          { search: 'abc', scope: DepotScope.RELEASES, limit: 10 },
        );
      },
    );

    test(
      unitTest('getEntitiesByClassifier builds the classifier url'),
      async () => {
        await client.getEntitiesByClassifier('model::Thing', {
          scope: DepotScope.SNAPSHOT,
        });
        expect(getSpy).toHaveBeenCalledWith(
          `${TEST_SERVER_URL}/classifiers/model%3A%3AThing/entities`,
          undefined,
          undefined,
          { scope: DepotScope.SNAPSHOT },
        );
      },
    );

    test(
      unitTest('getEntitiesSummaryByClassifier forwards summary and latest'),
      async () => {
        await client.getEntitiesSummaryByClassifier('model::Thing', {
          scope: DepotScope.RELEASES,
          summary: true,
          latest: true,
        });
        expect(getSpy).toHaveBeenCalledWith(
          `${TEST_SERVER_URL}/classifiers/model%3A%3AThing`,
          undefined,
          undefined,
          { scope: DepotScope.RELEASES, summary: true, latest: true },
        );
      },
    );
  });

  describe(unitTest('dependants'), () => {
    test(
      unitTest('getIndexedDependantProjects scopes to a version'),
      async () => {
        await client.getIndexedDependantProjects(
          'test.group',
          'test-artifact',
          '1.0.0',
        );
        expect(getSpy).toHaveBeenCalledWith(
          `${TEST_SERVER_URL}/projects/test.group/test-artifact/versions/1.0.0/dependantProjects`,
          undefined,
          undefined,
        );
      },
    );

    test(
      unitTest('getIndexedDependantProjects falls back to all versions'),
      async () => {
        await client.getIndexedDependantProjects('test.group', 'test-artifact');
        expect(getSpy).toHaveBeenCalledWith(
          `${TEST_SERVER_URL}/projects/test.group/test-artifact/versions/all/dependantProjects`,
          undefined,
          undefined,
        );
      },
    );
  });

  describe(unitTest('dependencies'), () => {
    test(unitTest('getDependencyEntities builds url and params'), async () => {
      await client.getDependencyEntities(
        'test.group',
        'test-artifact',
        '1.0.0',
        true,
        false,
      );
      expect(getSpy).toHaveBeenCalledWith(
        `${TEST_SERVER_URL}/projects/test.group/test-artifact/versions/1.0.0/dependencies`,
        undefined,
        undefined,
        { transitive: true, includeOrigin: false, versioned: false },
      );
    });

    test(
      unitTest(
        'getDependencyEntities inserts the classifier before the suffix',
      ),
      async () => {
        await client.getDependencyEntities(
          'test.group',
          'test-artifact',
          '1.0.0',
          false,
          true,
          'model::Thing',
        );
        expect(getSpy).toHaveBeenCalledWith(
          `${TEST_SERVER_URL}/projects/test.group/test-artifact/versions/1.0.0/classifiers/model::Thing/dependencies`,
          undefined,
          undefined,
          { transitive: false, includeOrigin: true, versioned: false },
        );
      },
    );

    test(
      unitTest('getProjectDependencyPointers builds url and params'),
      async () => {
        await client.getProjectDependencyPointers(
          'test.group',
          'test-artifact',
          '1.0.0',
          true,
        );
        expect(getSpy).toHaveBeenCalledWith(
          `${TEST_SERVER_URL}/projects/test.group/test-artifact/versions/1.0.0/projectDependencies`,
          undefined,
          undefined,
          { transitive: true },
        );
      },
    );

    test(
      unitTest('getPureModelContextData does not encode its coordinates'),
      async () => {
        await client.getPureModelContextData(
          'my group',
          'my/artifact',
          '1.0.0',
          true,
        );
        // NOTE: unlike every other url builder in this client, this one
        // interpolates its arguments without `encodeURIComponent`. Pinned
        // as-is so the current behavior is not changed by accident.
        expect(getSpy).toHaveBeenCalledWith(
          `${TEST_SERVER_URL}/projects/my group/my/artifact/versions/1.0.0/pureModelContextData`,
          undefined,
          undefined,
          { getDependencies: true },
        );
      },
    );

    test(
      unitTest('getIndexedDependencyEntities resolves HEAD and indexes by GA'),
      async () => {
        getSpy.mockResolvedValue([
          {
            groupId: 'dep.group',
            artifactId: 'dep-artifact',
            versionId: '1.0.0',
            entities: [{ path: 'model::A' }],
          },
        ]);

        const index = await client.getIndexedDependencyEntities(
          project,
          'HEAD',
        );

        expect(getSpy).toHaveBeenCalledWith(
          `${TEST_SERVER_URL}/projects/test.group/test-artifact/versions/master-SNAPSHOT/dependencies`,
          undefined,
          undefined,
          { transitive: true, includeOrigin: false, versioned: false },
        );
        expect(Array.from(index.keys())).toEqual(['dep.group:dep-artifact']);
        expect(index.get('dep.group:dep-artifact')?.versionId).toEqual('1.0.0');
      },
    );

    test(
      unitTest('getIndexedDependencyEntities collides on same group/artifact'),
      async () => {
        getSpy.mockResolvedValue([
          {
            groupId: 'dep.group',
            artifactId: 'dep-artifact',
            versionId: '1.0.0',
            entities: [{ path: 'model::A' }],
          },
          {
            groupId: 'dep.group',
            artifactId: 'dep-artifact',
            versionId: '2.0.0',
            entities: [{ path: 'model::B' }],
          },
        ]);

        const index = await client.getIndexedDependencyEntities(
          project,
          '1.0.0',
        );

        // NOTE: the map is keyed by `ProjectVersionEntities.id`, which is
        // group/artifact only. Two versions of the same artifact therefore
        // overwrite one another and the last one wins. Pinned as-is.
        expect(index.size).toBe(1);
        expect(index.get('dep.group:dep-artifact')?.versionId).toEqual('2.0.0');
      },
    );
  });

  describe(unitTest('posts'), () => {
    let postSpy: jest.SpiedFunction<DepotServerClient['post']>;
    const dependencies = [
      {
        groupId: 'test.group',
        artifactId: 'test-artifact',
        versionId: '1.0.0',
      },
    ];

    beforeEach(() => {
      postSpy = createSpy(client, 'post');
      postSpy.mockResolvedValue([]);
    });

    test(
      unitTest('collectDependencyEntities posts to the projects url'),
      async () => {
        await client.collectDependencyEntities(dependencies, true, false);
        expect(postSpy).toHaveBeenCalledWith(
          `${TEST_SERVER_URL}/projects/dependenciesFromArtifactDependencies`,
          dependencies,
          undefined,
          undefined,
          { transitive: true, includeOrigin: false, versioned: false },
        );
      },
    );

    test(
      unitTest('collectDependencyEntitiesAsPureModelContextData posts'),
      async () => {
        await client.collectDependencyEntitiesAsPureModelContextData(
          dependencies,
          false,
          true,
        );
        expect(postSpy).toHaveBeenCalledWith(
          `${TEST_SERVER_URL}/projects/dependencies/pureModelContextData`,
          dependencies,
          undefined,
          undefined,
          { transitive: false, includeOrigin: true, versioned: false },
        );
      },
    );

    test(
      unitTest('analyzeDependencyTree posts without parameters'),
      async () => {
        await client.analyzeDependencyTree(dependencies);
        expect(postSpy).toHaveBeenCalledWith(
          `${TEST_SERVER_URL}/projects/analyzeDependencyTreeFromArtifactDependencies`,
          dependencies,
        );
      },
    );

    test(
      unitTest('resolveCompatibleDependencies forwards backtrackVersions'),
      async () => {
        await client.resolveCompatibleDependencies(dependencies, 5);
        expect(postSpy).toHaveBeenCalledWith(
          `${TEST_SERVER_URL}/projects/resolveCompatibleDependencies`,
          dependencies,
          undefined,
          undefined,
          { backtrackVersions: 5 },
        );
      },
    );
  });

  describe(unitTest('file generation'), () => {
    test(
      unitTest('getGenerationContentByPath asks for plain text'),
      async () => {
        await client.getGenerationContentByPath(
          project,
          'HEAD',
          'dir/file.txt',
        );
        // this builder keeps a `/versions/` segment before the version
        expect(getSpy).toHaveBeenCalledWith(
          `${TEST_SERVER_URL}/generationFileContent/test.group/test-artifact/versions/master-SNAPSHOT/file/dir%2Ffile.txt`,
          {},
          { [HttpHeader.ACCEPT]: ContentType.TEXT_PLAIN },
        );
      },
    );

    test(
      unitTest('getGenerationFilesByType omits the versions segment'),
      async () => {
        await client.getGenerationFilesByType(project, 'HEAD', 'my/type');
        // unlike `generationFileContent`, this one puts the version directly
        // after the artifact with no `/versions/` segment
        expect(getSpy).toHaveBeenCalledWith(
          `${TEST_SERVER_URL}/generations/test.group/test-artifact/master-SNAPSHOT/types/my%2Ftype`,
          undefined,
          undefined,
          undefined,
        );
      },
    );

    test(
      unitTest('getGenerationFilesByType forwards an element path'),
      async () => {
        await client.getGenerationFilesByType(
          project,
          '1.0.0',
          'my-type',
          'model::Thing',
        );
        expect(getSpy).toHaveBeenCalledWith(
          `${TEST_SERVER_URL}/generations/test.group/test-artifact/1.0.0/types/my-type`,
          undefined,
          undefined,
          { elementPath: 'model::Thing' },
        );
      },
    );
  });

  describe(unitTest('versions'), () => {
    test(unitTest('getVersions forwards the snapshots flag'), async () => {
      await client.getVersions('test.group', 'test-artifact', true);
      expect(getSpy).toHaveBeenCalledWith(
        `${TEST_SERVER_URL}/projects/test.group/test-artifact/versions`,
        undefined,
        undefined,
        { snapshots: true },
      );
    });

    test(unitTest('getLatestVersion builds the latest url'), async () => {
      await client.getLatestVersion('test.group', 'test-artifact');
      expect(getSpy).toHaveBeenCalledWith(
        `${TEST_SERVER_URL}/versions/test.group/test-artifact/latest`,
      );
    });

    test(
      unitTest('getVersionedProjectData does not resolve the HEAD alias'),
      async () => {
        await client.getVersionedProjectData(
          'test.group',
          'test-artifact',
          'HEAD',
        );
        // unlike the entity reads, this endpoint is given the raw version
        expect(getSpy).toHaveBeenCalledWith(
          `${TEST_SERVER_URL}/versions/test.group/test-artifact/HEAD`,
        );
      },
    );
  });
});
