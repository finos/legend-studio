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
import {
  createSimpleSchema,
  deserialize,
  list,
  primitive,
  raw,
} from 'serializr';
import {
  createVisitedDataspaceFromInfo,
  createIdFromDataSpaceInfo,
  createVisitedDataSpaceId,
  createVisitedDataProductId,
  type VisitedLegacyDataProduct,
  type VisitedDataProduct,
} from './LegendQueryUserDataSpaceHelper.js';
import type { ResolvedDataSpaceEntityWithOrigin } from '@finos/legend-extension-dsl-data-space/application';

export enum LEGEND_QUERY_USER_DATA_KEY {
  RECENTLY_VIEWED_QUERIES = 'query-editor.recent-queries',
  RECENTLY_VIEWED_LEGACY_DATAPRODUCTS = 'query-editor.recent-dataSpaces',
  RECENTLY_VIEWED_DATAPRODUCTS = 'query-editor.recent-dataProducts',
  USER_LAKEHOUSE_INFO = 'query-editor.lakehouse-info',
}

export interface LakehouseUserInfo {
  env: string | undefined;
  snowflakeWarehouse: string | undefined;
}

export const USER_DATA_RECENTLY_VIEWED_QUERIES_LIMIT = 10;
export const USER_DATA_QUERY_DATASPACE_LIMIT = 10;
export const USER_DATA_QUERY_DATAPRODUCT_LIMIT = 50;

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
    LegendQueryUserDataHelper.persistValue(service, queryId, queries, {
      limit: USER_DATA_RECENTLY_VIEWED_QUERIES_LIMIT,
      key: LEGEND_QUERY_USER_DATA_KEY.RECENTLY_VIEWED_QUERIES,
    });
  }

  // DataSpaces
  static getRecentlyVisitedDataSpaces(
    service: UserDataService,
  ): VisitedLegacyDataProduct[] {
    const data = service.getObjectValue(
      LEGEND_QUERY_USER_DATA_KEY.RECENTLY_VIEWED_LEGACY_DATAPRODUCTS,
    );
    return (
      // TODO: think of a better way to deserialize this data, maybe like settings, use JSON schema
      // See https://github.com/finos/legend-studio/issues/407
      returnUndefOnError(
        () =>
          (
            deserialize(
              createSimpleSchema({
                data: raw(),
              }),
              {
                data,
              },
            ) as { data: VisitedLegacyDataProduct[] }
          ).data,
      ) ?? []
    );
  }

  static findRecentlyVisitedDataSpace(
    service: UserDataService,
    id: string,
  ): VisitedLegacyDataProduct | undefined {
    return LegendQueryUserDataHelper.getRecentlyVisitedDataSpaces(service).find(
      (v) => v.id === id,
    );
  }

  static getRecentlyVisitedDataSpace(
    service: UserDataService,
  ): VisitedLegacyDataProduct | undefined {
    return LegendQueryUserDataHelper.getRecentlyVisitedDataSpaces(service)[0];
  }

  static persistVisitedDataspace(
    service: UserDataService,
    value: VisitedLegacyDataProduct,
    persistedData: VisitedLegacyDataProduct[],
    limit = USER_DATA_QUERY_DATASPACE_LIMIT,
  ): void {
    const key = LEGEND_QUERY_USER_DATA_KEY.RECENTLY_VIEWED_LEGACY_DATAPRODUCTS;
    value.lastViewedAt = Date.now();
    const idx = persistedData.findIndex((data) => data.id === value.id);
    if (idx === -1) {
      if (persistedData.length >= limit) {
        persistedData.pop();
      }
      persistedData.unshift(value);
    } else {
      persistedData.splice(idx, 1);
      persistedData.unshift(value);
    }
    service.persistValue(key, persistedData);
  }

  static removeRecentlyViewedDataSpaces(service: UserDataService): void {
    service.persistValue(
      LEGEND_QUERY_USER_DATA_KEY.RECENTLY_VIEWED_LEGACY_DATAPRODUCTS,
      [],
    );
  }

  static removeRecentlyViewedDataSpace(
    service: UserDataService,
    id: string,
  ): void {
    const dataSpaces =
      LegendQueryUserDataHelper.getRecentlyVisitedDataSpaces(service);
    const idx = dataSpaces.findIndex(
      (visitedDataspace) => visitedDataspace.id === id,
    );
    if (idx === -1) {
      return;
    }
    dataSpaces.splice(idx, 1);
    service.persistValue(
      LEGEND_QUERY_USER_DATA_KEY.RECENTLY_VIEWED_LEGACY_DATAPRODUCTS,
      dataSpaces,
    );
  }

  static removeDataSpace(
    service: UserDataService,
    info: ResolvedDataSpaceEntityWithOrigin,
  ): void {
    const id = createIdFromDataSpaceInfo(info);
    if (id) {
      LegendQueryUserDataHelper.removeRecentlyViewedDataSpace(service, id);
    }
  }

  static addRecentlyVistedDatspace(
    service: UserDataService,
    info: ResolvedDataSpaceEntityWithOrigin,
    execContext: string | undefined,
  ): void {
    const visited = createVisitedDataspaceFromInfo(info, execContext);
    if (visited) {
      const dataspaces =
        LegendQueryUserDataHelper.getRecentlyVisitedDataSpaces(service);
      LegendQueryUserDataHelper.persistVisitedDataspace(
        service,
        visited,
        dataspaces,
      );
    }
  }
  static addVisitedDatspace(
    service: UserDataService,
    visited: VisitedLegacyDataProduct,
  ): void {
    const dataspaces =
      LegendQueryUserDataHelper.getRecentlyVisitedDataSpaces(service);
    LegendQueryUserDataHelper.persistVisitedDataspace(
      service,
      visited,
      dataspaces,
    );
  }

  static updateVisitedDataSpaceExecContext(
    service: UserDataService,
    groupId: string,
    artifactId: string,
    dataspace: string,
    exec: string,
  ): boolean {
    const visited = LegendQueryUserDataHelper.findRecentlyVisitedDataSpace(
      service,
      createVisitedDataSpaceId(groupId, artifactId, dataspace),
    );
    if (visited) {
      visited.execContext = exec;
      LegendQueryUserDataHelper.addVisitedDatspace(service, visited);
      return true;
    }
    return false;
  }

  // DataProducts
  static getRecentlyVisitedDataProducts(
    service: UserDataService,
  ): VisitedDataProduct[] {
    const data = service.getObjectValue(
      LEGEND_QUERY_USER_DATA_KEY.RECENTLY_VIEWED_DATAPRODUCTS,
    );
    return (
      returnUndefOnError(
        () =>
          (
            deserialize(
              createSimpleSchema({
                data: raw(),
              }),
              {
                data,
              },
            ) as { data: VisitedDataProduct[] }
          ).data,
      ) ?? []
    );
  }

  static findRecentlyVisitedDataProduct(
    service: UserDataService,
    id: string,
  ): VisitedDataProduct | undefined {
    return LegendQueryUserDataHelper.getRecentlyVisitedDataProducts(
      service,
    ).find((v) => v.id === id);
  }

  static getRecentlyVisitedDataProduct(
    service: UserDataService,
  ): VisitedDataProduct | undefined {
    return LegendQueryUserDataHelper.getRecentlyVisitedDataProducts(service)[0];
  }

  static persistVisitedDataProduct(
    service: UserDataService,
    value: VisitedDataProduct,
    persistedData: VisitedDataProduct[],
    limit = USER_DATA_QUERY_DATAPRODUCT_LIMIT,
  ): void {
    const key = LEGEND_QUERY_USER_DATA_KEY.RECENTLY_VIEWED_DATAPRODUCTS;
    value.lastViewedAt = Date.now();
    const idx = persistedData.findIndex((data) => data.id === value.id);
    if (idx === -1) {
      if (persistedData.length >= limit) {
        persistedData.pop();
      }
      persistedData.unshift(value);
    } else {
      persistedData.splice(idx, 1);
      persistedData.unshift(value);
    }
    service.persistValue(key, persistedData);
  }

  static removeRecentlyViewedDataProducts(service: UserDataService): void {
    service.persistValue(
      LEGEND_QUERY_USER_DATA_KEY.RECENTLY_VIEWED_DATAPRODUCTS,
      [],
    );
  }

  static removeRecentlyViewedDataProduct(
    service: UserDataService,
    id: string,
  ): void {
    const dataProducts =
      LegendQueryUserDataHelper.getRecentlyVisitedDataProducts(service);
    const idx = dataProducts.findIndex(
      (visitedDataProduct) => visitedDataProduct.id === id,
    );
    if (idx === -1) {
      return;
    }
    dataProducts.splice(idx, 1);
    service.persistValue(
      LEGEND_QUERY_USER_DATA_KEY.RECENTLY_VIEWED_DATAPRODUCTS,
      dataProducts,
    );
  }

  static addVisitedDataProduct(
    service: UserDataService,
    visited: VisitedDataProduct,
  ): void {
    const dataProducts =
      LegendQueryUserDataHelper.getRecentlyVisitedDataProducts(service);
    LegendQueryUserDataHelper.persistVisitedDataProduct(
      service,
      visited,
      dataProducts,
    );
  }

  static updateVisitedDataProductExecContext(
    service: UserDataService,
    groupId: string,
    artifactId: string,
    dataProductPath: string,
    exec: string,
  ): boolean {
    const visited = LegendQueryUserDataHelper.findRecentlyVisitedDataProduct(
      service,
      createVisitedDataProductId(groupId, artifactId, dataProductPath),
    );
    if (visited) {
      visited.accessId = exec;
      LegendQueryUserDataHelper.addVisitedDataProduct(service, visited);
      return true;
    }
    return false;
  }

  // Lakehouse User Info
  static getLakehouseUserInfo(
    service: UserDataService,
  ): LakehouseUserInfo | undefined {
    const data = service.getObjectValue(
      LEGEND_QUERY_USER_DATA_KEY.USER_LAKEHOUSE_INFO,
    );
    return returnUndefOnError(
      () =>
        (
          deserialize(
            createSimpleSchema({
              data: raw(),
            }),
            {
              data,
            },
          ) as { data: LakehouseUserInfo }
        ).data,
    );
  }

  static persistLakehouseUserInfo(
    service: UserDataService,
    info: LakehouseUserInfo,
  ): void {
    service.persistValue(LEGEND_QUERY_USER_DATA_KEY.USER_LAKEHOUSE_INFO, info);
  }

  static removeLakehouseUserInfo(service: UserDataService): void {
    service.persistValue(
      LEGEND_QUERY_USER_DATA_KEY.USER_LAKEHOUSE_INFO,
      undefined,
    );
  }
}
