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
}

const USER_DATA_RECENTLY_VIEWED_QUERIES_LIMIT = 10;
type RecentlyViewedQueriesData = string[];

export class LegendQueryUserDataHelper {
  static getRecentlyViewedQueries(
    service: UserDataService,
  ): RecentlyViewedQueriesData {
    const data = service.getObjectValue(
      LEGEND_QUERY_USER_DATA_KEY.RECENTLY_VIEWED_QUERIES,
    );
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
            ) as { data: RecentlyViewedQueriesData }
          ).data,
      ) ?? []
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
    if (idx === -1) {
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
    const idx = queries.findIndex((query) => query === queryId);
    if (idx === -1) {
      if (queries.length < USER_DATA_RECENTLY_VIEWED_QUERIES_LIMIT) {
        queries.unshift(queryId);
      } else {
        queries.pop();
        queries.unshift(queryId);
      }
    } else {
      queries.splice(idx, 1);
      queries.unshift(queryId);
    }
    service.persistValue(
      LEGEND_QUERY_USER_DATA_KEY.RECENTLY_VIEWED_QUERIES,
      queries,
    );
  }
}
