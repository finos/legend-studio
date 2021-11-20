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

import { generatePath, matchPath } from 'react-router-dom';
import type { TaxonomyServerOption } from '../application/LegendTaxonomyConfig';

export enum LEGEND_TAXONOMY_PARAM_TOKEN {
  TAXONOMY_SERVER_KEY = 'taxonomyServerKey',
  TAXONOMY_PATH = 'taxonomyPath',
  GAV = 'gav',
  DATA_SPACE_PATH = 'dataSpacePath',
}

export const URL_PATH_PLACEHOLDER = '-';

export const generateRoutePatternWithTaxonomyServerKey = (
  pattern: string,
): [string, string] => [
  `/:${LEGEND_TAXONOMY_PARAM_TOKEN.TAXONOMY_SERVER_KEY}(-)${pattern}`,
  `/taxonomy-:${LEGEND_TAXONOMY_PARAM_TOKEN.TAXONOMY_SERVER_KEY}${pattern}`,
];

export const LEGEND_TAXONOMY_ROUTE_PATTERN = Object.freeze({
  VIEW: generateRoutePatternWithTaxonomyServerKey(`/`),
  VIEW_BY_TAXONOMY_NODE: generateRoutePatternWithTaxonomyServerKey(
    `/:${LEGEND_TAXONOMY_PARAM_TOKEN.TAXONOMY_PATH}`,
  ),
  VIEW_BY_DATA_SPACE: generateRoutePatternWithTaxonomyServerKey(
    `/:${LEGEND_TAXONOMY_PARAM_TOKEN.TAXONOMY_PATH}/:${LEGEND_TAXONOMY_PARAM_TOKEN.GAV}/:${LEGEND_TAXONOMY_PARAM_TOKEN.DATA_SPACE_PATH}`,
  ),
});

export interface LegendTaxonomyPathParams {
  [LEGEND_TAXONOMY_PARAM_TOKEN.TAXONOMY_PATH]?: string;
  [LEGEND_TAXONOMY_PARAM_TOKEN.GAV]?: string;
  [LEGEND_TAXONOMY_PARAM_TOKEN.DATA_SPACE_PATH]?: string;
}

export const generateViewTaxonomyRoute = (
  taxonomyServerOption: TaxonomyServerOption,
): string =>
  generatePath(
    taxonomyServerOption.default
      ? LEGEND_TAXONOMY_ROUTE_PATTERN.VIEW_BY_TAXONOMY_NODE[0]
      : LEGEND_TAXONOMY_ROUTE_PATTERN.VIEW_BY_TAXONOMY_NODE[1],
    {},
  );

export const generateViewTaxonomyNodeRoute = (
  taxonomyServerOption: TaxonomyServerOption,
  taxonomyNodePath: string,
): string =>
  generatePath(
    taxonomyServerOption.default
      ? LEGEND_TAXONOMY_ROUTE_PATTERN.VIEW_BY_TAXONOMY_NODE[0]
      : LEGEND_TAXONOMY_ROUTE_PATTERN.VIEW_BY_TAXONOMY_NODE[1],
    {
      [LEGEND_TAXONOMY_PARAM_TOKEN.TAXONOMY_SERVER_KEY]:
        taxonomyServerOption.default
          ? URL_PATH_PLACEHOLDER
          : taxonomyServerOption.key,
      [LEGEND_TAXONOMY_PARAM_TOKEN.TAXONOMY_PATH]: taxonomyNodePath,
    },
  );

export const generateViewTaxonomyByDataSpaceRoute = (
  taxonomyServerOption: TaxonomyServerOption,
  taxonomyNodePath: string,
  GAVCoordinates: string,
  dataSpacePath: string,
): string =>
  generatePath(
    taxonomyServerOption.default
      ? LEGEND_TAXONOMY_ROUTE_PATTERN.VIEW_BY_DATA_SPACE[0]
      : LEGEND_TAXONOMY_ROUTE_PATTERN.VIEW_BY_DATA_SPACE[1],
    {
      [LEGEND_TAXONOMY_PARAM_TOKEN.TAXONOMY_SERVER_KEY]:
        taxonomyServerOption.default
          ? URL_PATH_PLACEHOLDER
          : taxonomyServerOption.key,
      [LEGEND_TAXONOMY_PARAM_TOKEN.TAXONOMY_PATH]: taxonomyNodePath,
      [LEGEND_TAXONOMY_PARAM_TOKEN.GAV]: GAVCoordinates,
      [LEGEND_TAXONOMY_PARAM_TOKEN.DATA_SPACE_PATH]: dataSpacePath,
    },
  );

/**
 * This will check if the provided path matches the taxonomy server pattern
 * then accordingly update the path to use the new taxonomy server key
 *
 * NOTE: this method returns `undefined` when no update is needed due to various reasons:
 * 1. The path doesn't match the taxonomy server pattern
 * 2. The new taxonomy server key matches the current one in the provided path
 */
export const updateRouteWithNewTaxonomyServerOption = (
  currentPath: string,
  newOption: TaxonomyServerOption,
): string | undefined => {
  const patterns = generateRoutePatternWithTaxonomyServerKey('/:pattern(.*)');
  const match = matchPath<
    {
      [LEGEND_TAXONOMY_PARAM_TOKEN.TAXONOMY_SERVER_KEY]: string;
    } & { pattern: string }
  >(currentPath, patterns);
  if (match) {
    const matchedTaxonomyServerKey =
      match.params[LEGEND_TAXONOMY_PARAM_TOKEN.TAXONOMY_SERVER_KEY];
    if (
      matchedTaxonomyServerKey === newOption.key ||
      (matchedTaxonomyServerKey === URL_PATH_PLACEHOLDER && newOption.default)
    ) {
      return undefined;
    }
    return `${generatePath(newOption.default ? patterns[0] : patterns[1], {
      pattern: '',
      [LEGEND_TAXONOMY_PARAM_TOKEN.TAXONOMY_SERVER_KEY]: newOption.default
        ? URL_PATH_PLACEHOLDER
        : newOption.key,
    })}${match.params.pattern}`;
  }
  return undefined;
};
