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

import type { LegendApplicationPlugin } from '@finos/legend-application';
import type { QueryBuilderState } from './QueryBuilderState.js';
import type { QuerySearchSpecification } from '@finos/legend-graph';
import type {
  DataAccessState,
  DatasetAccessInfo,
} from './data-access/DataAccessState.js';

export type LoadQueryFilterOption = {
  key: string;
  label: (queryBuilderState: QueryBuilderState) => string | undefined;
  filterFunction: (
    searchSpecification: QuerySearchSpecification,
    queryBuilderState: QueryBuilderState,
  ) => QuerySearchSpecification;
};

export type DatasetEntitlementAccessReportActionConfiguration = {
  renderer: (
    info: DatasetAccessInfo,
    dataAccessState: DataAccessState,
  ) => React.ReactNode;
};

export type QueryExportUsageConfiguration = {
  key: string;
  title: string;
  icon?: React.ReactNode | undefined;
  renderer(): React.ReactNode;
};

export type WarehouseEntitlementRender = {
  renderer: (dataAccessState: DataAccessState) => React.ReactNode | undefined;
};

export type QueryChatRenderer = (
  queryBuilderState: QueryBuilderState,
) => React.ReactNode;

export interface QueryBuilder_LegendApplicationPlugin_Extension
  extends LegendApplicationPlugin {
  /**
   * Get the list of filter options for query loader.
   */
  getExtraLoadQueryFilterOptions?(): LoadQueryFilterOption[];

  /**
   * Get the list of warehouse entitlement configurations
   */
  getWarehouseEntitlementRenders?(): WarehouseEntitlementRender[] | undefined;

  /**
   * Get the list of dataset entitlement access report action configurations.
   */
  getExtraDatasetEntitlementAccessNotGrantedReportActionConfigurations?(): DatasetEntitlementAccessReportActionConfiguration[];

  /**
   * Get the list of query usage configurations
   */
  getExtraQueryUsageConfigurations?(): QueryExportUsageConfiguration[];

  /**
   * Get the list of query chat configurations
   */
  getExtraQueryChatRenderers?(): QueryChatRenderer[];
}
