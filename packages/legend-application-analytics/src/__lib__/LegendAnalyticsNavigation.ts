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

export enum LEGEND_ANALYTICS_ROUTE_PATTERN_TOKEN {
  CUBE_ID = 'cubeId',
}

export enum LEGEND_ANALYTICS_ROUTE_PATTERN {
  /** The Cube page, at the application's root (PLAN §11.18) */
  CUBE = '/',
  /**
   * The Cube page on a saved cube (PLAN §11.13). It renders the same page as
   * the root, which stays mounted as the address follows the cube shown
   */
  SAVED_CUBE = `/cube/:${LEGEND_ANALYTICS_ROUTE_PATTERN_TOKEN.CUBE_ID}`,
}

export type LegendAnalyticsCubePathParams = {
  [LEGEND_ANALYTICS_ROUTE_PATTERN_TOKEN.CUBE_ID]?: string;
};

/** The address of the Cube page showing a saved cube, or a new one */
export const generateLegendAnalyticsCubeRoute = (cubeId?: string): string =>
  cubeId === undefined ? '/' : `/cube/${encodeURIComponent(cubeId)}`;
