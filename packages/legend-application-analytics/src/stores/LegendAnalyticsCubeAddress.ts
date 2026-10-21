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
import { generateLegendAnalyticsCubeRoute } from '../__lib__/LegendAnalyticsNavigation.js';

// The Cube page's address follows the saved cube shown (PLAN §11.13,
// QUESTIONS.md U9): `/cube/<id>`, or the root for a cube never saved.

/** The spec's parameter naming a saved query to open (spec §17.15) */
export const LEGEND_ANALYTICS_QUERY_ID_PARAMETER = 'queryId';

/** The page's address parameters, each decoded once, as a link writes them */
const readParameters = (
  navigator: NavigationService['navigator'],
): URLSearchParams => new URL(navigator.getCurrentAddress()).searchParams;

/** The saved cube the address names: the path's `/cube/:cubeId`, else `?queryId=` */
export const readLegendAnalyticsCubeId = (
  navigator: NavigationService['navigator'],
  pathCubeId: string | undefined,
): string | undefined => {
  if (pathCubeId?.trim()) {
    return pathCubeId;
  }
  const queryId = readParameters(navigator)
    .get(LEGEND_ANALYTICS_QUERY_ID_PARAMETER)
    ?.trim();
  return queryId ? queryId : undefined;
};

/**
 * Shows the cube in the address: `/cube/<id>`, or the root for a cube never
 * saved, replacing the history entry, so Back doesn't step through saves.
 * `?queryId=` goes, as the path holds the cube now; other parameters stay.
 * An address already showing the cube is left alone.
 */
export const showLegendAnalyticsCubeInAddress = (
  navigator: NavigationService['navigator'],
  cubeId: string | undefined,
): void => {
  const address = new URL(navigator.getCurrentAddress());
  const parameters = new URLSearchParams(address.search);
  parameters.delete(LEGEND_ANALYTICS_QUERY_ID_PARAMETER);
  const rest = parameters.toString();
  const location = `${generateLegendAnalyticsCubeRoute(cubeId)}${rest ? `?${rest}` : ''}${address.hash}`;
  // the application's root reads as '' without its trailing slash
  const current = navigator.getCurrentLocation() || '/';
  if (location !== `${current}${address.search}${address.hash}`) {
    navigator.updateCurrentLocation(location, { replace: true });
  }
};
