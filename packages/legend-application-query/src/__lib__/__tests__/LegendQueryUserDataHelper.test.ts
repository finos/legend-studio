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

      expect(expected).toEqual(
        LegendQueryUserDataHelper.getRecentlyViewedQueries(userDataService),
      );
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

      expect([queryId2, queryId]).toEqual(
        LegendQueryUserDataHelper.getRecentlyViewedQueries(userDataService),
      );

      LegendQueryUserDataHelper.removeRecentlyViewedQuery(
        userDataService,
        queryId,
      );

      const expected = [queryId2];

      expect(expected).toEqual(
        LegendQueryUserDataHelper.getRecentlyViewedQueries(userDataService),
      );
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

      expect([]).toEqual(
        LegendQueryUserDataHelper.getRecentlyViewedQueries(userDataService),
      );
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
      const dataspace = 'extensions/dataspace/some-dataspace:test-demo:latest';
      const dataspace2 =
        'extensions/dataspace/some-dataspace:test-demo-2:latest';
      const dataspace3 =
        'extensions/dataspace/some-dataspace:test-demo-3:latest';

      const userDataService = getService();
      LegendQueryUserDataHelper.saveRecentlyQueriedDataspace(
        userDataService,
        dataspace,
      );
      LegendQueryUserDataHelper.saveRecentlyQueriedDataspace(
        userDataService,
        dataspace2,
      );
      LegendQueryUserDataHelper.saveRecentlyQueriedDataspace(
        userDataService,
        dataspace3,
      );

      const expected = [dataspace3, dataspace2, dataspace];

      expect(expected).toEqual(
        LegendQueryUserDataHelper.getRecentlyQueriedDataspaceList(
          userDataService,
        ),
      );
    });

    it('should retrieve the most recent queried dataspace', () => {
      const dataspace = 'extensions/dataspace/some-dataspace:test-demo:latest';
      const dataspace2 =
        'extensions/dataspace/some-dataspace:test-demo-2:latest';
      const dataspace3 =
        'extensions/dataspace/some-dataspace:test-demo-3:latest';

      const userDataService = getService();
      LegendQueryUserDataHelper.saveRecentlyQueriedDataspace(
        userDataService,
        dataspace,
      );
      LegendQueryUserDataHelper.saveRecentlyQueriedDataspace(
        userDataService,
        dataspace2,
      );
      LegendQueryUserDataHelper.saveRecentlyQueriedDataspace(
        userDataService,
        dataspace3,
      );

      const expected = dataspace3;

      expect(expected).toEqual(
        LegendQueryUserDataHelper.getRecentlyQueriedDataspace(userDataService),
      );
    });

    it(`should maintain a list of ${USER_DATA_QUERY_DATASPACE_LIMIT} saved dataspace`, () => {
      const userDataService = getService();

      for (let i = 0; i < USER_DATA_QUERY_DATASPACE_LIMIT + 2; i++) {
        const dataspace = `extensions/dataspace/some-dataspace-${i}:test-demo:latest`;

        LegendQueryUserDataHelper.saveRecentlyQueriedDataspace(
          userDataService,
          dataspace,
        );
      }

      expect(
        LegendQueryUserDataHelper.getRecentlyQueriedDataspaceList(
          userDataService,
        ).length,
      ).toBe(USER_DATA_QUERY_DATASPACE_LIMIT);
    });
  });
});
