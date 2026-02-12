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

import { it, expect, describe } from '@jest/globals';
import type { UserDataService } from '@finos/legend-application';
import {
  LegendQueryUserDataHelper,
  USER_DATA_QUERY_DATASPACE_LIMIT,
  USER_DATA_RECENTLY_VIEWED_QUERIES_LIMIT,
} from '../LegendQueryUserDataHelper.js';
import { ResolvedDataSpaceEntityWithOrigin } from '@finos/legend-extension-dsl-data-space/application';
import {
  createIdFromDataSpaceInfo,
  hasDataSpaceInfoBeenVisited,
} from '../LegendQueryUserDataSpaceHelper.js';
import { guaranteeNonNullable } from '@finos/legend-shared';

type MockUserDataStoreValue = object | undefined;

class MockUserDataService {
  private store: Record<string, MockUserDataStoreValue> = {};

  getObjectValue(key: string): MockUserDataStoreValue {
    return this.store[key];
  }

  persistValue(key: string, data: MockUserDataStoreValue): void {
    this.store[key] = data;
  }
}

const getService = (): UserDataService =>
  new MockUserDataService() as unknown as UserDataService;

describe('LegendQueryUserDataHelper', () => {
  describe('Recently used query functionality', () => {
    it('should save and retrieve a recently viewed query', () => {
      const queryId = 'some-query-id-1234';

      const userDataService = getService();
      LegendQueryUserDataHelper.addRecentlyViewedQuery(
        userDataService,
        queryId,
      );

      const expected = [queryId];

      expect(
        LegendQueryUserDataHelper.getRecentlyViewedQueries(userDataService),
      ).toEqual(expected);
    });

    it('should delete a saved query', () => {
      const queryId = 'some-query-id-1234';
      const queryId2 = 'some-query-id2-5678';

      const userDataService = getService();
      LegendQueryUserDataHelper.addRecentlyViewedQuery(
        userDataService,
        queryId,
      );
      LegendQueryUserDataHelper.addRecentlyViewedQuery(
        userDataService,
        queryId2,
      );

      expect(
        LegendQueryUserDataHelper.getRecentlyViewedQueries(userDataService),
      ).toEqual([queryId2, queryId]);

      LegendQueryUserDataHelper.removeRecentlyViewedQuery(
        userDataService,
        queryId,
      );

      const expected = [queryId2];

      expect(
        LegendQueryUserDataHelper.getRecentlyViewedQueries(userDataService),
      ).toEqual(expected);
    });

    it('should delete all saved queries', () => {
      const queryId = 'some-query-id-1234';
      const queryId2 = 'some-query-id2-5678';

      const userDataService = getService();
      LegendQueryUserDataHelper.addRecentlyViewedQuery(
        userDataService,
        queryId,
      );
      LegendQueryUserDataHelper.addRecentlyViewedQuery(
        userDataService,
        queryId2,
      );

      LegendQueryUserDataHelper.removeRecentlyViewedQueries(userDataService);

      expect(
        LegendQueryUserDataHelper.getRecentlyViewedQueries(userDataService),
      ).toEqual([]);
    });

    it(`should maintain a list of ${USER_DATA_RECENTLY_VIEWED_QUERIES_LIMIT} saved queries`, () => {
      const userDataService = getService();

      for (let i = 0; i < USER_DATA_RECENTLY_VIEWED_QUERIES_LIMIT + 2; i++) {
        const queryId = `some-query-id-${i}`;

        LegendQueryUserDataHelper.addRecentlyViewedQuery(
          userDataService,
          queryId,
        );
      }

      expect(
        LegendQueryUserDataHelper.getRecentlyViewedQueries(userDataService)
          .length,
      ).toBe(USER_DATA_RECENTLY_VIEWED_QUERIES_LIMIT);
    });
  });

  describe('Recently queried dataspaces', () => {
    it('should save and retrieve a recently queried dataspace', () => {
      const dataspace = {
        id: 'my-group:myartifact:model::MyDataSpace',
        groupId: 'my-group',
        artifactId: 'myartifact',
        path: 'model::MyDataSpace',
        versionId: 'latest',
      };
      const dataspace2 = {
        id: 'my-group:myartifact:model::MyDataSpace2',
        groupId: 'my-group',
        artifactId: 'myartifact',
        path: 'model::MyDataSpace2',
        execContext: 'key',
        versionId: 'latest',
      };
      const dataspace3 = {
        id: 'my-group:different:model::MyDataSpace',
        groupId: 'my-group',
        artifactId: 'different',
        path: 'model::MyDataSpace2',
        execContext: 'key',
        versionId: 'latest',
      };

      const userDataService = getService();
      LegendQueryUserDataHelper.addVisitedDatspace(userDataService, dataspace);
      LegendQueryUserDataHelper.addVisitedDatspace(userDataService, dataspace2);
      LegendQueryUserDataHelper.addVisitedDatspace(userDataService, dataspace3);

      const expected = [dataspace3.id, dataspace2.id, dataspace.id];

      expect(
        LegendQueryUserDataHelper.getRecentlyVisitedDataSpaces(
          userDataService,
        ).map((e) => e.id),
      ).toEqual(expected);
    });

    it('should retrieve the most recent queried dataspace and disregard version when replacing', () => {
      const dataspace = {
        id: 'my-group:myartifact:model::MyDataSpace',
        groupId: 'my-group',
        artifactId: 'myartifact',
        path: 'model::MyDataSpace',
        versionId: 'latest',
      };
      const dataspace2 = {
        id: 'my-group:myartifact:model::MyDataSpace2',
        groupId: 'my-group',
        artifactId: 'myartifact',
        path: 'model::MyDataSpace2',
        execContext: 'key',
        versionId: 'latest',
      };
      const dataspace3 = {
        id: 'my-group:different:model::MyDataSpace2',
        groupId: 'my-group',
        artifactId: 'different',
        path: 'model::MyDataSpace2',
        execContext: 'key',
        versionId: 'latest',
      };

      const userDataService = getService();
      LegendQueryUserDataHelper.addVisitedDatspace(userDataService, dataspace);
      LegendQueryUserDataHelper.addVisitedDatspace(userDataService, dataspace2);
      LegendQueryUserDataHelper.addVisitedDatspace(userDataService, dataspace3);

      const expected = dataspace3.id;

      expect(
        LegendQueryUserDataHelper.getRecentlyVisitedDataSpace(userDataService)
          ?.id,
      ).toEqual(expected);

      const dataspace4 = {
        id: 'my-group:different:model::MyDataSpace2',
        groupId: 'my-group',
        artifactId: 'different',
        path: 'model::MyDataSpace2',
        execContext: 'key',
        versionId: '4.0.0',
      };
      LegendQueryUserDataHelper.addVisitedDatspace(userDataService, dataspace4);
      expect(
        LegendQueryUserDataHelper.getRecentlyVisitedDataSpaces(userDataService),
      ).toHaveLength(3);
      const visited =
        LegendQueryUserDataHelper.getRecentlyVisitedDataSpace(userDataService);
      expect(visited?.versionId).toEqual(dataspace4.versionId);
    });

    it(`should maintain a list of ${USER_DATA_QUERY_DATASPACE_LIMIT} saved dataspace`, () => {
      const userDataService = getService();

      for (let i = 0; i < USER_DATA_QUERY_DATASPACE_LIMIT + 2; i++) {
        const dataspace = {
          id: `my-group:myartifact:model::MyDataSpace${i}`,
          groupId: 'my-group',
          artifactId: 'myartifact',
          path: `model::MyDataSpace${i}`,
          versionId: 'latest',
        };

        LegendQueryUserDataHelper.addVisitedDatspace(
          userDataService,
          dataspace,
        );
      }
      expect(
        LegendQueryUserDataHelper.getRecentlyVisitedDataSpaces(userDataService),
      ).toHaveLength(USER_DATA_QUERY_DATASPACE_LIMIT);
    });

    it('should retrieve the most recent queried dataspace and disregard version when replacing', () => {
      const dataSpaceInfo1 = new ResolvedDataSpaceEntityWithOrigin(
        {
          groupId: 'my-group',
          artifactId: 'artifact',
          versionId: 'latest',
        },
        undefined,
        'MyDataSpace',
        'model::MyDataSpace',
        undefined,
      );

      const dataSpaceInfo2 = new ResolvedDataSpaceEntityWithOrigin(
        undefined,
        undefined,
        'MyDataSpace',
        'model::MyDataSpace',
        undefined,
      );

      const dataSpaceInfo3 = new ResolvedDataSpaceEntityWithOrigin(
        { groupId: 'my-group', artifactId: 'artifact', versionId: '3.0.0' },
        undefined,
        'MyDataSpace',
        'model::MyDataSpace',
        undefined,
      );

      const dataSpaceInfo4 = new ResolvedDataSpaceEntityWithOrigin(
        { groupId: 'my-group', artifactId: 'artifact', versionId: '3.0.0' },
        undefined,
        'MyDataSpace',
        'model::MyDataSpace2',
        undefined,
      );

      const dataSpaceInfo5 = new ResolvedDataSpaceEntityWithOrigin(
        { groupId: 'my-group', artifactId: 'artifactMore', versionId: '3.0.0' },
        undefined,
        'MyDataSpace',
        'model::MyDataSpace2',
        undefined,
      );

      const userDataService = getService();
      LegendQueryUserDataHelper.addRecentlyVistedDatspace(
        userDataService,
        dataSpaceInfo1,
        undefined,
      );
      expect(
        LegendQueryUserDataHelper.getRecentlyVisitedDataSpaces(userDataService),
      ).toHaveLength(1);
      LegendQueryUserDataHelper.addRecentlyVistedDatspace(
        userDataService,
        dataSpaceInfo2,
        undefined,
      );
      // we do not add an unconfigured dataSpaceInfo
      expect(
        LegendQueryUserDataHelper.getRecentlyVisitedDataSpaces(userDataService),
      ).toHaveLength(1);

      LegendQueryUserDataHelper.addRecentlyVistedDatspace(
        userDataService,
        dataSpaceInfo3,
        undefined,
      );
      expect(
        LegendQueryUserDataHelper.getRecentlyVisitedDataSpaces(userDataService),
      ).toHaveLength(1);
      expect(
        hasDataSpaceInfoBeenVisited(
          dataSpaceInfo3,
          LegendQueryUserDataHelper.getRecentlyVisitedDataSpaces(
            userDataService,
          ),
        ),
      ).toBe(true);
      expect(
        hasDataSpaceInfoBeenVisited(
          dataSpaceInfo1,
          LegendQueryUserDataHelper.getRecentlyVisitedDataSpaces(
            userDataService,
          ),
        ),
      ).toBe(true);
      const mostRecent =
        LegendQueryUserDataHelper.getRecentlyVisitedDataSpace(userDataService);
      expect(mostRecent?.versionId).toBe('3.0.0');
      LegendQueryUserDataHelper.addRecentlyVistedDatspace(
        userDataService,
        dataSpaceInfo4,
        undefined,
      );

      expect(
        LegendQueryUserDataHelper.getRecentlyVisitedDataSpaces(userDataService),
      ).toHaveLength(2);

      LegendQueryUserDataHelper.addRecentlyVistedDatspace(
        userDataService,
        dataSpaceInfo5,
        undefined,
      );
      expect(
        LegendQueryUserDataHelper.getRecentlyVisitedDataSpaces(userDataService),
      ).toHaveLength(3);
      LegendQueryUserDataHelper.addRecentlyVistedDatspace(
        userDataService,
        dataSpaceInfo4,
        'prod-exec',
      );
      expect(
        LegendQueryUserDataHelper.getRecentlyVisitedDataSpaces(userDataService),
      ).toHaveLength(3);
      expect(
        LegendQueryUserDataHelper.getRecentlyVisitedDataSpace(userDataService)
          ?.execContext,
      ).toBe('prod-exec');
      expect(
        LegendQueryUserDataHelper.getRecentlyVisitedDataSpaces(
          userDataService,
        ).map((e) => e.id),
      ).toStrictEqual([
        'my-group:artifact:model::MyDataSpace2',
        'my-group:artifactMore:model::MyDataSpace2',
        'my-group:artifact:model::MyDataSpace',
      ]);
      expect(
        hasDataSpaceInfoBeenVisited(
          dataSpaceInfo4,
          LegendQueryUserDataHelper.getRecentlyVisitedDataSpaces(
            userDataService,
          ),
        ),
      ).toBe(true);
      LegendQueryUserDataHelper.updateVisitedDataSpaceExecContext(
        userDataService,
        'my-group',
        'artifactMore',
        'model::MyDataSpace2',
        'new context',
      );
      const visitedExec =
        LegendQueryUserDataHelper.findRecentlyVisitedDataSpace(
          userDataService,
          guaranteeNonNullable(createIdFromDataSpaceInfo(dataSpaceInfo5)),
        );
      expect(visitedExec?.execContext).toBe('new context');
    });

    it('should handle entities with undefined origin correctly', () => {
      const dataSpaceWithoutOrigin = new ResolvedDataSpaceEntityWithOrigin(
        undefined,
        'Title',
        'MyDataSpace',
        'model::MyDataSpace',
        'default',
      );

      const userDataService = getService();

      // Should not create an ID for entities without origin
      const id = createIdFromDataSpaceInfo(dataSpaceWithoutOrigin);
      expect(id).toBeUndefined();

      // Should not add to visited dataspaces without origin
      LegendQueryUserDataHelper.addRecentlyVistedDatspace(
        userDataService,
        dataSpaceWithoutOrigin,
        undefined,
      );

      expect(
        LegendQueryUserDataHelper.getRecentlyVisitedDataSpaces(userDataService),
      ).toHaveLength(0);
    });

    it('should correctly identify visited dataspaces using origin', () => {
      const origin = {
        groupId: 'my-group',
        artifactId: 'my-artifact',
        versionId: '1.0.0',
      };
      const dataSpaceInfo = new ResolvedDataSpaceEntityWithOrigin(
        origin,
        'Title',
        'MyDataSpace',
        'model::MyDataSpace',
        'default',
      );

      const userDataService = getService();
      LegendQueryUserDataHelper.addRecentlyVistedDatspace(
        userDataService,
        dataSpaceInfo,
        'prod-context',
      );

      expect(
        hasDataSpaceInfoBeenVisited(
          dataSpaceInfo,
          LegendQueryUserDataHelper.getRecentlyVisitedDataSpaces(
            userDataService,
          ),
        ),
      ).toBe(true);

      // Different version should still be considered visited (same groupId/artifactId)
      const differentVersion = new ResolvedDataSpaceEntityWithOrigin(
        { groupId: 'my-group', artifactId: 'my-artifact', versionId: '2.0.0' },
        'Title',
        'MyDataSpace',
        'model::MyDataSpace',
        'default',
      );

      expect(
        hasDataSpaceInfoBeenVisited(
          differentVersion,
          LegendQueryUserDataHelper.getRecentlyVisitedDataSpaces(
            userDataService,
          ),
        ),
      ).toBe(true);
    });

    it('should handle origin property access safely', () => {
      const withOrigin = new ResolvedDataSpaceEntityWithOrigin(
        { groupId: 'group', artifactId: 'artifact', versionId: 'version' },
        undefined,
        'Name',
        'path',
        undefined,
      );

      const withoutOrigin = new ResolvedDataSpaceEntityWithOrigin(
        undefined,
        undefined,
        'Name',
        'path',
        undefined,
      );

      // Should safely access origin properties
      expect(withOrigin.origin?.groupId).toBe('group');
      expect(withOrigin.origin?.artifactId).toBe('artifact');
      expect(withOrigin.origin?.versionId).toBe('version');

      // Should safely handle undefined origin
      expect(withoutOrigin.origin?.groupId).toBeUndefined();
      expect(withoutOrigin.origin?.artifactId).toBeUndefined();
      expect(withoutOrigin.origin?.versionId).toBeUndefined();
    });
  });
});
