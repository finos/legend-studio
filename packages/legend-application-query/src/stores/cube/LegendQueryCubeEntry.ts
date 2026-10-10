/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import type { NavigationService } from '@finos/legend-application';
import type { CubeEntrySource } from '@finos/legend-cube-builder';

/** The Cube page's address parameters (spec §17.15) */
export enum LEGEND_QUERY_CUBE_PARAMETER {
  SOURCE_TYPE = 'sourceType',
  SOURCE_ID = 'sourceId',
  QUERY_ID = 'queryId',
}

/** The page's address parameters, each decoded once, as a link writes them */
const readParameters = (
  navigator: NavigationService['navigator'],
): URLSearchParams => new URL(navigator.getCurrentAddress()).searchParams;

/**
 * The source a link asks the Cube page to start with (spec §17.15,
 * QUESTIONS.md U9): `?sourceType=…&sourceId=…`. A saved query (`?queryId=`)
 * wins; it opens once Cube saves queries (M8). Reads only: the page takes
 * the parameters out of the address once it is shown
 * (`stripLegendQueryCubeEntry`).
 */
export const readLegendQueryCubeEntry = (
  navigator: NavigationService['navigator'],
): CubeEntrySource | undefined => {
  const parameters = readParameters(navigator);
  const sourceType = parameters.get(LEGEND_QUERY_CUBE_PARAMETER.SOURCE_TYPE);
  const sourceId = parameters.get(LEGEND_QUERY_CUBE_PARAMETER.SOURCE_ID);
  return !parameters.has(LEGEND_QUERY_CUBE_PARAMETER.QUERY_ID) &&
    sourceType &&
    sourceId
    ? { sourceType, sourceId }
    : undefined;
};

/**
 * Takes a link's source out of the address, whether or not it resolves, and
 * keeps a saved query's id (U9: the address then names the cube shown)
 */
export const stripLegendQueryCubeEntry = (
  navigator: NavigationService['navigator'],
): void => {
  const parameters = readParameters(navigator);
  if (
    !parameters.has(LEGEND_QUERY_CUBE_PARAMETER.SOURCE_TYPE) &&
    !parameters.has(LEGEND_QUERY_CUBE_PARAMETER.SOURCE_ID)
  ) {
    return;
  }
  const queryId = parameters.get(LEGEND_QUERY_CUBE_PARAMETER.QUERY_ID);
  const location = navigator.getCurrentLocation();
  navigator.updateCurrentLocation(
    queryId === null
      ? location
      : `${location}?${LEGEND_QUERY_CUBE_PARAMETER.QUERY_ID}=${encodeURIComponent(queryId)}`,
  );
};
