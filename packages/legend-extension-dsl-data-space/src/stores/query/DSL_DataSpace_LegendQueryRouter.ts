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
} from '@finos/legend-application';
import { LEGEND_QUERY_PATH_PARAM_TOKEN } from '@finos/legend-application-query';
import {
  addQueryParamsStringToUrl,
  stringifyQueryParams,
} from '@finos/legend-shared';
import { generateGAVCoordinates } from '@finos/legend-storage';

export enum DATA_SPACE_QUERY_CREATOR_PATH_PARAM_TOKEN {
  DATA_SPACE_PATH = 'dataSpacePath',
  EXECUTION_CONTEXT = 'executionContext',
}

export enum DATA_SPACE_QUERY_CREATOR_QUERY_PARAM_TOKEN {
  CLASS_PATH = 'class',
}

export interface DataSpaceQueryCreatorPathParams {
  [LEGEND_QUERY_PATH_PARAM_TOKEN.GAV]: string;
  [DATA_SPACE_QUERY_CREATOR_PATH_PARAM_TOKEN.DATA_SPACE_PATH]: string;
  [DATA_SPACE_QUERY_CREATOR_PATH_PARAM_TOKEN.EXECUTION_CONTEXT]: string;
  [LEGEND_QUERY_PATH_PARAM_TOKEN.RUNTIME_PATH]?: string;
}

export interface DataSpaceQueryEditorQueryParams {
  [DATA_SPACE_QUERY_CREATOR_QUERY_PARAM_TOKEN.CLASS_PATH]?: string;
}

export const DATA_SPACE_QUERY_ROUTE_PATTERN = Object.freeze({
  SETUP: `/dataspace`,
  CREATE: `/dataspace/:${LEGEND_QUERY_PATH_PARAM_TOKEN.GAV}/:${DATA_SPACE_QUERY_CREATOR_PATH_PARAM_TOKEN.DATA_SPACE_PATH}/:${DATA_SPACE_QUERY_CREATOR_PATH_PARAM_TOKEN.EXECUTION_CONTEXT}/:${LEGEND_QUERY_PATH_PARAM_TOKEN.RUNTIME_PATH}?`,
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
  addQueryParamsStringToUrl(
    generatePath(
      generateExtensionUrlPattern(DATA_SPACE_QUERY_ROUTE_PATTERN.CREATE),
      {
        [LEGEND_QUERY_PATH_PARAM_TOKEN.GAV]: generateGAVCoordinates(
          groupId,
          artifactId,
          versionId,
        ),
        [DATA_SPACE_QUERY_CREATOR_PATH_PARAM_TOKEN.DATA_SPACE_PATH]:
          dataSpacePath,
        [DATA_SPACE_QUERY_CREATOR_PATH_PARAM_TOKEN.EXECUTION_CONTEXT]:
          executionContextKey,
        [LEGEND_QUERY_PATH_PARAM_TOKEN.RUNTIME_PATH]: runtimePath,
      },
    ),
    stringifyQueryParams({
      [DATA_SPACE_QUERY_CREATOR_QUERY_PARAM_TOKEN.CLASS_PATH]: classPath,
    }),
  );
