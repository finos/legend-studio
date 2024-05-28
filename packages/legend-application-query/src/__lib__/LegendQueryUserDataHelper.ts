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

import type { UserDataService } from '@finos/legend-application';
import { returnUndefOnError } from '@finos/legend-shared';
import { createSimpleSchema, deserialize, list, primitive } from 'serializr';

export enum LEGEND_QUERY_USER_DATA_KEY {
  RECENTLY_VIEWED_QUERIES = 'query-editor.recent-queries',
  LAST_QUERY_DATASPACE = 'query-editor.last_query_dataspace',
}

export const USER_DATA_RECENTLY_VIEWED_QUERIES_LIMIT = 10;
export const USER_DATA_QUERY_DATASPACE_LIMIT = 10;

type SavedData = string[];

export class LegendQueryUserDataHelper {
  static getPersistedData(
    service: UserDataService,
    key: LEGEND_QUERY_USER_DATA_KEY,
  ): SavedData {
    const data = service.getObjectValue(key);
    return (
      // TODO: think of a better way to deserialize this data, maybe like settings, use JSON schema
      // See https://github.com/finos/legend-studio/issues/407
      returnUndefOnError(
        () =>
          (
            deserialize(
              createSimpleSchema({
                data: list(primitive()),
              }),
              {
                data,
              },
            ) as { data: SavedData }
          ).data,
      ) ?? []
    );
  }

  static persistValue(
    service: UserDataService,
    value: string,
    persistedData: SavedData,
    opts: {
      key: LEGEND_QUERY_USER_DATA_KEY;
      limit: number;
    },
  ): void {
    const idx = persistedData.findIndex((data) => data === value);
    if (idx === -1) {
      if (persistedData.length >= opts.limit) {
        persistedData.pop();
      }
      persistedData.unshift(value);
    } else {
      persistedData.splice(idx, 1);
      persistedData.unshift(value);
    }
    service.persistValue(opts.key, persistedData);
  }

  static getRecentlyViewedQueries(service: UserDataService): SavedData {
    return LegendQueryUserDataHelper.getPersistedData(
      service,
      LEGEND_QUERY_USER_DATA_KEY.RECENTLY_VIEWED_QUERIES,
    );
  }

  static removeRecentlyViewedQueries(service: UserDataService): void {
    service.persistValue(
      LEGEND_QUERY_USER_DATA_KEY.RECENTLY_VIEWED_QUERIES,
      [],
    );
  }

  static removeRecentlyViewedQuery(
    service: UserDataService,
    queryId: string,
  ): void {
    const queries = LegendQueryUserDataHelper.getRecentlyViewedQueries(service);
    const idx = queries.findIndex((query) => query === queryId);
    const notFound = idx === -1;

    if (notFound) {
      return;
    }

    queries.splice(idx, 1);
    service.persistValue(
      LEGEND_QUERY_USER_DATA_KEY.RECENTLY_VIEWED_QUERIES,
      queries,
    );
  }

  static addRecentlyViewedQuery(
    service: UserDataService,
    queryId: string,
  ): void {
    const queries = LegendQueryUserDataHelper.getRecentlyViewedQueries(service);
    LegendQueryUserDataHelper.persistValue(service, queryId, queries, {
      limit: USER_DATA_RECENTLY_VIEWED_QUERIES_LIMIT,
      key: LEGEND_QUERY_USER_DATA_KEY.RECENTLY_VIEWED_QUERIES,
    });
  }

  static getRecentlyQueriedDataspaceList(service: UserDataService): SavedData {
    return LegendQueryUserDataHelper.getPersistedData(
      service,
      LEGEND_QUERY_USER_DATA_KEY.LAST_QUERY_DATASPACE,
    );
  }

  static getRecentlyQueriedDataspace(service: UserDataService): string {
    const dataspaceList =
      LegendQueryUserDataHelper.getRecentlyQueriedDataspaceList(service);
    return dataspaceList?.[0] ?? '';
  }

  static saveRecentlyQueriedDataspace(
    service: UserDataService,
    dataspace: string,
  ): void {
    const dataspaceList =
      LegendQueryUserDataHelper.getRecentlyQueriedDataspaceList(service);
    LegendQueryUserDataHelper.persistValue(service, dataspace, dataspaceList, {
      limit: USER_DATA_QUERY_DATASPACE_LIMIT,
      key: LEGEND_QUERY_USER_DATA_KEY.LAST_QUERY_DATASPACE,
    });
  }
}
