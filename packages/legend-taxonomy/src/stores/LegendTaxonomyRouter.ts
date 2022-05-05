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

import { generatePath } from 'react-router-dom';

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
  VIEW_DATA_SPACE: `/dataspace/:${LEGEND_TAXONOMY_PARAM_TOKEN.GAV}/:${LEGEND_TAXONOMY_PARAM_TOKEN.DATA_SPACE_PATH}`,
});

export interface LegendTaxonomyPathParams {
  [LEGEND_TAXONOMY_PARAM_TOKEN.TAXONOMY_TREE_KEY]: string;
  [LEGEND_TAXONOMY_PARAM_TOKEN.TAXONOMY_PATH]?: string;
  [LEGEND_TAXONOMY_PARAM_TOKEN.GAV]?: string;
  [LEGEND_TAXONOMY_PARAM_TOKEN.DATA_SPACE_PATH]?: string;
}

export interface LegendTaxonomyStandaloneDataSpaceViewerParams {
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
  generatePath(LEGEND_TAXONOMY_ROUTE_PATTERN.VIEW_DATA_SPACE, {
    [LEGEND_TAXONOMY_PARAM_TOKEN.GAV]: GAVCoordinates,
    [LEGEND_TAXONOMY_PARAM_TOKEN.DATA_SPACE_PATH]: dataSpacePath,
  });
