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

import type { LegendSourceInfo } from '@finos/legend-storage';

/**
 * The entry point a query creator was started from.
 */
export enum LegendQuerySourceType {
  MAPPING = 'mapping',
  SERVICE = 'service',
  DATA_SPACE = 'data-space',
  DATA_SPACE_TEMPLATE = 'data-space.template',
  DATA_PRODUCT = 'data-product',
  DATA_PRODUCT_SAMPLE = 'data-product.sample',
  INGEST = 'ingest',
  /**
   * The default route, when no data product or data space has been selected yet
   */
  UNSELECTED = 'unselected',
}

/**
 * Coordinates of the project the query is started from
 */
interface LegendQueryProjectSourceInfo extends LegendSourceInfo {
  groupId: string;
  artifactId: string;
  versionId: string;
}

/**
 * Query created on a mapping and runtime
 * `/create/manual/:gav/:mappingPath/:runtimePath`
 */
export interface LegendQueryMappingSourceInfo
  extends LegendQueryProjectSourceInfo {
  sourceType: LegendQuerySourceType.MAPPING;
  mapping: string;
  runtime: string;
}

/**
 * Query created from a service
 * `/create-from-service/:gav/:servicePath`
 */
export interface LegendQueryServiceSourceInfo
  extends LegendQueryProjectSourceInfo {
  sourceType: LegendQuerySourceType.SERVICE;
  service: string;
}

/**
 * Query created on a data space
 * `/dataspace/:gav/:dataSpacePath/:executionContext?`
 */
export interface LegendQueryDataSpaceSourceInfo
  extends LegendQueryProjectSourceInfo {
  sourceType: LegendQuerySourceType.DATA_SPACE;
  dataSpace: string;
  /**
   * The key of the execution context the query was started with, when known
   */
  executionContext?: string | undefined;
}

/**
 * Query created from a data space template query
 * `/dataspace/:gav/:dataSpacePath/template/:templateQueryId`
 */
export interface LegendQueryDataSpaceTemplateSourceInfo
  extends LegendQueryProjectSourceInfo {
  sourceType: LegendQuerySourceType.DATA_SPACE_TEMPLATE;
  dataSpace: string;
  templateQueryId: string;
}

/**
 * Query created on a data product
 * `/data-product/:accessType/:gav/:dataProductPath/:accessId`
 */
export interface LegendQueryDataProductSourceInfo
  extends LegendQueryProjectSourceInfo {
  sourceType: LegendQuerySourceType.DATA_PRODUCT;
  dataProduct: string;
  /**
   * The access type (e.g. native, model, lakehouse) the query was started
   * with, when known
   */
  accessType?: string | undefined;
  /**
   * The ID of the access point (group) or execution context the query was
   * started with, when known
   */
  accessId?: string | undefined;
}

/**
 * Query created from a data product sample query
 * `/data-product/native/sample-query/:gav/:dataProductPath/:sampleQueryId`
 */
export interface LegendQueryDataProductSampleSourceInfo
  extends LegendQueryProjectSourceInfo {
  sourceType: LegendQuerySourceType.DATA_PRODUCT_SAMPLE;
  dataProduct: string;
  sampleQueryId: string;
}

/**
 * Query created on an ingest data set
 * `/ingest/:gav/:ingestDefinitionPath/:dataSet`
 */
export interface LegendQueryIngestSourceInfo
  extends LegendQueryProjectSourceInfo {
  sourceType: LegendQuerySourceType.INGEST;
  ingestDefinitionPath: string;
  dataSet: string;
}

/**
 * The default route `/`, when no data product or data space has been
 * selected yet
 */
export interface LegendQueryUnselectedSourceInfo extends LegendSourceInfo {
  sourceType: LegendQuerySourceType.UNSELECTED;
}

/**
 * Where a query creator was started from, used as the query builder state
 * source info (see `QueryBuilderState.sourceInfo`) and reported in telemetry
 */
export type LegendQuerySourceInfo =
  | LegendQueryMappingSourceInfo
  | LegendQueryServiceSourceInfo
  | LegendQueryDataSpaceSourceInfo
  | LegendQueryDataSpaceTemplateSourceInfo
  | LegendQueryDataProductSourceInfo
  | LegendQueryDataProductSampleSourceInfo
  | LegendQueryIngestSourceInfo
  | LegendQueryUnselectedSourceInfo;
