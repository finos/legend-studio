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

import {
  generateExtensionUrlPattern,
  generatePath,
} from '@finos/legend-application/browser';
import {
  addQueryParametersToUrl,
  stringifyQueryParams,
} from '@finos/legend-shared';
import { generateGAVCoordinates } from '@finos/legend-storage';

export enum DATA_SPACE_QUERY_CREATOR_ROUTE_PATTERN_TOKEN {
  GAV = 'gav',
  DATA_SPACE_PATH = 'dataSpacePath',
  EXECUTION_CONTEXT = 'executionContext',
}

export enum DATA_SPACE_QUERY_CREATOR_QUERY_PARAM_TOKEN {
  RUNTIME_PATH = 'runtimePath',
  CLASS_PATH = 'class',
}

export enum DATA_SPACE_TEMPLATE_QUERY_CREATOR_ROUTE_PATTERN_TOKEN {
  GAV = 'gav',
  DATA_SPACE_PATH = 'dataSpacePath',
  TEMPLATE = 'template',
  TEMPLATE_QUERY_ID = 'templateQueryId',
}

const DATA_SPACE_QUERY_ROUTE_PATTERN = Object.freeze({
  SETUP: `/dataspace`,
  CREATE: `/dataspace/:${DATA_SPACE_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.GAV}/:${DATA_SPACE_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.DATA_SPACE_PATH}/:${DATA_SPACE_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.EXECUTION_CONTEXT}?`,
  TEMPLATE_QUERY: `/dataspace/:${DATA_SPACE_TEMPLATE_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.GAV}/:${DATA_SPACE_TEMPLATE_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.DATA_SPACE_PATH}/:${DATA_SPACE_TEMPLATE_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.TEMPLATE}/:${DATA_SPACE_TEMPLATE_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.TEMPLATE_QUERY_ID}`,
});

export const generateDataSpaceQuerySetupRoute = (): string =>
  generatePath(
    generateExtensionUrlPattern(DATA_SPACE_QUERY_ROUTE_PATTERN.SETUP),
    {},
  );

export const generateDataSpaceQueryCreatorRoute = (
  groupId: string,
  artifactId: string,
  versionId: string,
  dataSpacePath: string,
  executionContextKey: string,
  runtimePath?: string | undefined,
  classPath?: string | undefined,
): string =>
  addQueryParametersToUrl(
    generatePath(
      generateExtensionUrlPattern(DATA_SPACE_QUERY_ROUTE_PATTERN.CREATE),
      {
        [DATA_SPACE_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.GAV]:
          generateGAVCoordinates(groupId, artifactId, versionId),
        [DATA_SPACE_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.DATA_SPACE_PATH]:
          dataSpacePath,
        [DATA_SPACE_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.EXECUTION_CONTEXT]:
          executionContextKey,
      },
    ),
    stringifyQueryParams({
      [DATA_SPACE_QUERY_CREATOR_QUERY_PARAM_TOKEN.RUNTIME_PATH]: runtimePath
        ? encodeURIComponent(runtimePath)
        : undefined,
      [DATA_SPACE_QUERY_CREATOR_QUERY_PARAM_TOKEN.CLASS_PATH]: classPath
        ? encodeURIComponent(classPath)
        : undefined,
    }),
  );

export const generateDataSpaceTemplateQueryCreatorRoute = (
  groupId: string,
  artifactId: string,
  versionId: string,
  dataSpacePath: string,
  templateQueryId: string,
): string =>
  generatePath(
    generateExtensionUrlPattern(DATA_SPACE_QUERY_ROUTE_PATTERN.TEMPLATE_QUERY),
    {
      [DATA_SPACE_TEMPLATE_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.GAV]:
        generateGAVCoordinates(groupId, artifactId, versionId),
      [DATA_SPACE_TEMPLATE_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.DATA_SPACE_PATH]:
        dataSpacePath,
      [DATA_SPACE_TEMPLATE_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.TEMPLATE]:
        DATA_SPACE_TEMPLATE_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.TEMPLATE,
      [DATA_SPACE_TEMPLATE_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.TEMPLATE_QUERY_ID]:
        templateQueryId,
    },
  );

enum LEGEND_QUERY_ROUTE_PATTERN_TOKEN {
  GAV = 'gav',
  QUERY_ID = 'queryId',
  MAPPING_PATH = 'mappingPath',
  RUNTIME_PATH = 'runtimePath',
  SERVICE_PATH = 'servicePath',
}

const LEGEND_QUERY_ROUTE_PATTERN = Object.freeze({
  SETUP: '/setup',
  EDIT_EXISTING_QUERY_SETUP: '/setup/existing-query',
  CREATE_MAPPING_QUERY_SETUP: '/setup/manual',
  CLONE_SERVICE_QUERY_SETUP: '/setup/clone-service-query',
  QUERY_PRODUCTIONIZER_SETUP: '/setup/productionize-query',
  UPDATE_EXISTING_SERVICE_QUERY_SETUP: '/setup/update-existing-service-query',
  LOAD_PROJECT_SERVICE_QUERY_SETUP: '/setup/load-project-service-query',
  CREATE_FROM_MAPPING_QUERY: `/create/manual/:${LEGEND_QUERY_ROUTE_PATTERN_TOKEN.GAV}/:${LEGEND_QUERY_ROUTE_PATTERN_TOKEN.MAPPING_PATH}/:${LEGEND_QUERY_ROUTE_PATTERN_TOKEN.RUNTIME_PATH}`,
  CREATE_FROM_SERVICE_QUERY: `/create-from-service/:${LEGEND_QUERY_ROUTE_PATTERN_TOKEN.GAV}/:${LEGEND_QUERY_ROUTE_PATTERN_TOKEN.SERVICE_PATH}`,
  EDIT_EXISTING_QUERY: `/edit/:${LEGEND_QUERY_ROUTE_PATTERN_TOKEN.QUERY_ID}`,
});

export enum LEGEND_QUERY_QUERY_PARAM_TOKEN {
  SERVICE_EXECUTION_KEY = 'executionKey',
}
export const generateServiceQueryCreatorRoute = (
  groupId: string,
  artifactId: string,
  versionId: string,
  servicePath: string,
  executionKey?: string | undefined,
): string =>
  addQueryParametersToUrl(
    generatePath(LEGEND_QUERY_ROUTE_PATTERN.CREATE_FROM_SERVICE_QUERY, {
      [LEGEND_QUERY_ROUTE_PATTERN_TOKEN.GAV]: generateGAVCoordinates(
        groupId,
        artifactId,
        versionId,
      ),
      [LEGEND_QUERY_ROUTE_PATTERN_TOKEN.SERVICE_PATH]: servicePath,
    }),
    stringifyQueryParams({
      [LEGEND_QUERY_QUERY_PARAM_TOKEN.SERVICE_EXECUTION_KEY]: executionKey
        ? encodeURIComponent(executionKey)
        : executionKey,
    }),
  );
