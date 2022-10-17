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

import { generatePath } from '@finos/legend-application';
import { generateGAVCoordinates } from '@finos/legend-storage';

export enum LEGEND_TAXONOMY_PARAM_TOKEN {
  TAXONOMY_TREE_KEY = 'taxonomyTreeKey',
  TAXONOMY_PATH = 'taxonomyPath',
  GAV = 'gav',
  DATA_SPACE_PATH = 'dataSpacePath',
}

export const LEGEND_TAXONOMY_ROUTE_PATTERN = Object.freeze({
  EXPLORE_TAXONOMY_TREE: `/tree/:${LEGEND_TAXONOMY_PARAM_TOKEN.TAXONOMY_TREE_KEY}`,
  EXPLORE_TAXONOMY_TREE_NODE: `/tree/:${LEGEND_TAXONOMY_PARAM_TOKEN.TAXONOMY_TREE_KEY}/:${LEGEND_TAXONOMY_PARAM_TOKEN.TAXONOMY_PATH}`,
  EXPLORE_TAXONOMY_TREE_NODE_DATA_SPACE: `/tree/:${LEGEND_TAXONOMY_PARAM_TOKEN.TAXONOMY_TREE_KEY}/:${LEGEND_TAXONOMY_PARAM_TOKEN.TAXONOMY_PATH}/:${LEGEND_TAXONOMY_PARAM_TOKEN.GAV}/:${LEGEND_TAXONOMY_PARAM_TOKEN.DATA_SPACE_PATH}`,
  STANDALONE_DATA_SPACE_VIEWER: `/dataspace/:${LEGEND_TAXONOMY_PARAM_TOKEN.GAV}/:${LEGEND_TAXONOMY_PARAM_TOKEN.DATA_SPACE_PATH}`,
});

export interface LegendTaxonomyPathParams {
  [LEGEND_TAXONOMY_PARAM_TOKEN.TAXONOMY_TREE_KEY]: string;
  [LEGEND_TAXONOMY_PARAM_TOKEN.TAXONOMY_PATH]?: string;
  [LEGEND_TAXONOMY_PARAM_TOKEN.GAV]?: string;
  [LEGEND_TAXONOMY_PARAM_TOKEN.DATA_SPACE_PATH]?: string;
}

export interface LegendTaxonomyStandaloneDataSpaceViewerPathParams {
  [LEGEND_TAXONOMY_PARAM_TOKEN.GAV]: string;
  [LEGEND_TAXONOMY_PARAM_TOKEN.DATA_SPACE_PATH]: string;
}

export const generateExploreTaxonomyTreeRoute = (
  taxonomyTreeKey: string,
): string =>
  generatePath(LEGEND_TAXONOMY_ROUTE_PATTERN.EXPLORE_TAXONOMY_TREE, {
    [LEGEND_TAXONOMY_PARAM_TOKEN.TAXONOMY_TREE_KEY]: taxonomyTreeKey,
  });

export const generateExploreTaxonomyTreeNodeRoute = (
  taxonomyTreeKey: string,
  taxonomyNodePath: string,
): string =>
  generatePath(LEGEND_TAXONOMY_ROUTE_PATTERN.EXPLORE_TAXONOMY_TREE_NODE, {
    [LEGEND_TAXONOMY_PARAM_TOKEN.TAXONOMY_TREE_KEY]: taxonomyTreeKey,
    [LEGEND_TAXONOMY_PARAM_TOKEN.TAXONOMY_PATH]: taxonomyNodePath,
  });

export const generateExploreTaxonomyTreeNodeDataSpaceRoute = (
  taxonomyTreeKey: string,
  taxonomyNodePath: string,
  GAVCoordinates: string,
  dataSpacePath: string,
): string =>
  generatePath(
    LEGEND_TAXONOMY_ROUTE_PATTERN.EXPLORE_TAXONOMY_TREE_NODE_DATA_SPACE,
    {
      [LEGEND_TAXONOMY_PARAM_TOKEN.TAXONOMY_TREE_KEY]: taxonomyTreeKey,
      [LEGEND_TAXONOMY_PARAM_TOKEN.TAXONOMY_PATH]: taxonomyNodePath,
      [LEGEND_TAXONOMY_PARAM_TOKEN.GAV]: GAVCoordinates,
      [LEGEND_TAXONOMY_PARAM_TOKEN.DATA_SPACE_PATH]: dataSpacePath,
    },
  );

export const generateStandaloneDataSpaceViewerRoute = (
  GAVCoordinates: string,
  dataSpacePath: string,
): string =>
  generatePath(LEGEND_TAXONOMY_ROUTE_PATTERN.STANDALONE_DATA_SPACE_VIEWER, {
    [LEGEND_TAXONOMY_PARAM_TOKEN.GAV]: GAVCoordinates,
    [LEGEND_TAXONOMY_PARAM_TOKEN.DATA_SPACE_PATH]: dataSpacePath,
  });

/**
 * @external_application_navigation This depends on Legend Studio routing and is hardcoded so it's potentially brittle
 */
export const EXTERNAL_APPLICATION_NAVIGATION__generateStudioProjectViewUrl = (
  studioUrl: string,
  groupId: string,
  artifactId: string,
  versionId: string,
  entityPath: string | undefined,
): string =>
  `${studioUrl}/view/archive/${generateGAVCoordinates(
    groupId,
    artifactId,
    versionId,
  )}${entityPath ? `/entity/${entityPath}` : ''}`;

/**
 * @external_application_navigation This depends on Legend Studio routing and is hardcoded so it's potentially brittle
 */
export const EXTERNAL_APPLICATION_NAVIGATION__generateStudioSDLCProjectViewUrl =
  (
    studioUrl: string,
    projectId: string,
    entityPath: string | undefined,
  ): string =>
    `${studioUrl}/view/${projectId}${
      entityPath ? `/entity/${entityPath}` : ''
    }`;

/**
 * @external_application_navigation This depends on Legend Query routing and is hardcoded so it's potentially brittle
 */
export const EXTERNAL_APPLICATION_NAVIGATION__generateDataSpaceQueryEditorUrl =
  (
    queryUrl: string,
    groupId: string,
    artifactId: string,
    versionId: string,
    dataSpacePath: string,
    executionContext: string,
    runtimePath: string | undefined,
    classPath: string | undefined,
  ): string =>
    `${queryUrl}/extensions/create-from-dataspace/${generateGAVCoordinates(
      groupId,
      artifactId,
      versionId,
    )}/${dataSpacePath}/${executionContext}/${
      runtimePath ? `/${runtimePath}` : ''
    }${classPath ? `?class=${classPath}` : ''}`;
