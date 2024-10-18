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
import type {
  FunctionAnalysisInfo,
  QuerySearchSpecification,
  RawLambda,
} from '@finos/legend-graph';
import type {
  DataAccessState,
  DatasetAccessInfo,
} from './data-access/DataAccessState.js';

export type CuratedTemplateQuery = {
  id: string;
  title: string;
  description: string | undefined;
  query: RawLambda;
  executionContextKey: string;
};

export type CuratedTemplateQuerySpecification = {
  getCuratedTemplateQueries(
    queryBuilderState: QueryBuilderState,
  ): CuratedTemplateQuery[];
  loadCuratedTemplateQuery(
    templateQuery: CuratedTemplateQuery,
    queryBuilderState: QueryBuilderState,
  ): Promise<void>;
};

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
  renderer: (dataAccessState: DataAccessState) => React.ReactNode;
};

export type QueryChatRenderer = (
  queryBuilderState: QueryBuilderState,
) => React.ReactNode;

export type TemplateQueryPanelContentRenderer = (
  queryBuilderState: QueryBuilderState,
) => React.ReactNode;

export type QueryBuilderHeaderActionConfiguration = {
  key: string;
  category: number;
  renderer: (
    queryBuilderState: QueryBuilderState,
  ) => React.ReactNode | undefined;
};

export type QueryBuilderMenuActionConfiguration = {
  key: string;
  title?: string;
  disableFunc?: (queryBuilderState: QueryBuilderState) => boolean;
  label: string;
  onClick: (queryBuilderState: QueryBuilderState) => void;
  icon?: React.ReactNode;
  renderExtraComponent?: (
    queryBuilderState: QueryBuilderState,
  ) => React.ReactNode;
};

export type QueryBuilderPropagateExecutionContextChangeHelper = (
  queryBuilderState: QueryBuilderState,
  isGraphBuildingNotRequired?: boolean,
) => (() => Promise<void>) | undefined;

export type QueryBuilderExtraFunctionHelper = {
  functionInfoMap: Map<string, FunctionAnalysisInfo>;
  dependencyFunctionInfoMap: Map<string, FunctionAnalysisInfo>;
};

export interface QueryBuilder_LegendApplicationPlugin_Extension
  extends LegendApplicationPlugin {
  /**
   * Get the list of template query specifications
   */
  getCuratedTemplateQuerySpecifications?(): CuratedTemplateQuerySpecification[];

  /**
   * Get the list of filter options for query loader.
   */
  getExtraLoadQueryFilterOptions?(): LoadQueryFilterOption[];

  /**
   * Get the list of filter options related to template query
   */
  getQueryFilterOptionsRelatedToTemplateQuery?(): (
    queryBuilderState: QueryBuilderState,
  ) => string[];

  /**
   * Get the list of warehouse entitlement configurations
   */
  getWarehouseEntitlementRenders?(): WarehouseEntitlementRender[];

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

  /**
   * Get the list of template query panel content render
   */
  getExtraTemplateQueryPanelContentRenderer?(): TemplateQueryPanelContentRenderer[];

  /**
   * Get the list of action configurations
   */
  getExtraQueryBuilderHeaderActionConfigurations?(): QueryBuilderHeaderActionConfiguration[];

  /**
   * Get the list of action configurations
   */
  getExtraQueryBuilderHeaderTitleConfigurations?(): QueryBuilderHeaderActionConfiguration[];

  /**
   * Get the list of help menu action configurations
   */
  getExtraQueryBuilderHelpMenuActionConfigurations?(): QueryBuilderMenuActionConfiguration[];

  /**
   * Get the list of export menu action configurations
   */
  getExtraQueryBuilderExportMenuActionConfigurations?(): QueryBuilderMenuActionConfiguration[];

  /**
   * Get the list of Query Builder Propagate Execution Context Change Helper
   */
  getExtraQueryBuilderPropagateExecutionContextChangeHelper?(): QueryBuilderPropagateExecutionContextChangeHelper[];

  /**
   * Get the list of extra functions rendered in query builder function explorer
   */
  getExtraQueryBuilderFunctionHelper?(
    queryBuilderState: QueryBuilderState,
  ): QueryBuilderExtraFunctionHelper[];
}
