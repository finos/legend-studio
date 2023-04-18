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
import { assertTrue, guaranteeNonEmptyString } from '@finos/legend-shared';
import {
  generateGAVCoordinates,
  parseGACoordinates,
} from '@finos/legend-storage';

export enum DSL_SERVICE_ROUTE_PATTERN_TOKEN {
  SERVICE_COORDINATES = 'serviceCoordinates',
  PROJECT_ID = 'projectId',
  GROUP_WORKSPACE_ID = 'groupWorkspaceId',
  SERVICE_PATH = 'servicePath',
  QUERY_ID = 'queryId',
}

export const DSL_SERVICE_LEGEND_STUDIO_ROUTE_PATTERN = Object.freeze({
  UPDATE_SERVICE_QUERY_SETUP: `/update-service-query/:${DSL_SERVICE_ROUTE_PATTERN_TOKEN.SERVICE_COORDINATES}?`,
  UPDATE_SERVICE_QUERY: `/update-service-query/:${DSL_SERVICE_ROUTE_PATTERN_TOKEN.SERVICE_COORDINATES}/:${DSL_SERVICE_ROUTE_PATTERN_TOKEN.GROUP_WORKSPACE_ID}`,
  UPDATE_PROJECT_SERVICE_QUERY_SETUP: `/update-project-service-query/:${DSL_SERVICE_ROUTE_PATTERN_TOKEN.PROJECT_ID}?`,
  UPDATE_PROJECT_SERVICE_QUERY: `/update-project-service-query/:${DSL_SERVICE_ROUTE_PATTERN_TOKEN.PROJECT_ID}/:${DSL_SERVICE_ROUTE_PATTERN_TOKEN.GROUP_WORKSPACE_ID}/:${DSL_SERVICE_ROUTE_PATTERN_TOKEN.SERVICE_PATH}`,
  PRODUCTIONIZE_QUERY: `/productionize-query/:${DSL_SERVICE_ROUTE_PATTERN_TOKEN.QUERY_ID}?`,
});

export type ServiceQueryUpdaterSetupPathParams = {
  [DSL_SERVICE_ROUTE_PATTERN_TOKEN.SERVICE_COORDINATES]?: string;
};

const SERVICE_COORDINATE_DELIMITER = '@';

export const parseServiceCoordinates = (
  val: string,
): {
  servicePath: string;
  groupId: string;
  artifactId: string;
} => {
  const parts = val.split(SERVICE_COORDINATE_DELIMITER);
  assertTrue(
    parts.length === 2,
    `Can't parse service coordinates '${val}': expect the coordinates to follow format {servicePath}${SERVICE_COORDINATE_DELIMITER}{GACoordinates}`,
  );
  const { groupId, artifactId } = parseGACoordinates(
    guaranteeNonEmptyString(
      parts[1]?.trim(),
      `Service coordinates GA coordinates are missing or empty`,
    ),
  );
  return {
    groupId,
    artifactId,
    servicePath: guaranteeNonEmptyString(
      parts[0]?.trim(),
      `Service coordinates service path is missing or empty`,
    ),
  };
};

export const generateServiceCoordinates = (
  groupId: string,
  artifactId: string,
  servicePath: string,
): string =>
  `${servicePath}${SERVICE_COORDINATE_DELIMITER}${generateGAVCoordinates(
    groupId,
    artifactId,
    undefined,
  )}`;

export const generateServiceQueryUpdaterSetupRoute = (
  groupId?: string,
  artifactId?: string,
  servicePath?: string,
): string =>
  generatePath(
    generateExtensionUrlPattern(
      DSL_SERVICE_LEGEND_STUDIO_ROUTE_PATTERN.UPDATE_SERVICE_QUERY_SETUP,
    ),
    {
      [DSL_SERVICE_ROUTE_PATTERN_TOKEN.SERVICE_COORDINATES]:
        groupId && artifactId && servicePath
          ? generateServiceCoordinates(groupId, artifactId, servicePath)
          : undefined,
    },
  );

export type ServiceQueryUpdaterPathParams = {
  [DSL_SERVICE_ROUTE_PATTERN_TOKEN.SERVICE_COORDINATES]: string;
  [DSL_SERVICE_ROUTE_PATTERN_TOKEN.GROUP_WORKSPACE_ID]: string;
};

export const generateServiceQueryUpdaterRoute = (
  groupId: string,
  artifactId: string,
  servicePath: string,
  groupWorkspaceId: string,
): string =>
  generatePath(
    generateExtensionUrlPattern(
      DSL_SERVICE_LEGEND_STUDIO_ROUTE_PATTERN.UPDATE_SERVICE_QUERY,
    ),
    {
      [DSL_SERVICE_ROUTE_PATTERN_TOKEN.SERVICE_COORDINATES]:
        generateServiceCoordinates(groupId, artifactId, servicePath),
      [DSL_SERVICE_ROUTE_PATTERN_TOKEN.GROUP_WORKSPACE_ID]: groupWorkspaceId,
    },
  );

export type ProjectServiceQueryUpdaterSetupPathParams = {
  [DSL_SERVICE_ROUTE_PATTERN_TOKEN.PROJECT_ID]?: string;
};

export const generateProjectServiceQueryUpdaterSetupRoute = (
  projectId?: string,
): string =>
  generatePath(
    generateExtensionUrlPattern(
      DSL_SERVICE_LEGEND_STUDIO_ROUTE_PATTERN.UPDATE_PROJECT_SERVICE_QUERY_SETUP,
    ),
    {
      [DSL_SERVICE_ROUTE_PATTERN_TOKEN.PROJECT_ID]: projectId,
    },
  );

export type ProjectServiceQueryUpdaterPathParams = {
  [DSL_SERVICE_ROUTE_PATTERN_TOKEN.PROJECT_ID]: string;
  [DSL_SERVICE_ROUTE_PATTERN_TOKEN.GROUP_WORKSPACE_ID]: string;
  [DSL_SERVICE_ROUTE_PATTERN_TOKEN.SERVICE_PATH]: string;
};

export const generateProjectServiceQueryUpdaterRoute = (
  projectId: string,
  groupWorkspaceId: string,
  servicePath: string,
): string =>
  generatePath(
    generateExtensionUrlPattern(
      DSL_SERVICE_LEGEND_STUDIO_ROUTE_PATTERN.UPDATE_PROJECT_SERVICE_QUERY,
    ),
    {
      [DSL_SERVICE_ROUTE_PATTERN_TOKEN.PROJECT_ID]: projectId,
      [DSL_SERVICE_ROUTE_PATTERN_TOKEN.GROUP_WORKSPACE_ID]: groupWorkspaceId,
      [DSL_SERVICE_ROUTE_PATTERN_TOKEN.SERVICE_PATH]: servicePath,
    },
  );

export type QueryProductionizerPathParams = {
  [DSL_SERVICE_ROUTE_PATTERN_TOKEN.QUERY_ID]?: string;
};

export const generateQueryProductionizerRoute = (
  queryId: string | undefined,
): string =>
  generatePath(
    generateExtensionUrlPattern(
      DSL_SERVICE_LEGEND_STUDIO_ROUTE_PATTERN.PRODUCTIONIZE_QUERY,
    ),
    {
      [DSL_SERVICE_ROUTE_PATTERN_TOKEN.QUERY_ID]: queryId,
    },
  );
