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

import { generatePath } from '@finos/legend-application/browser';

export enum LEGEND_DATA_CUBE_ROUTE_PATTERN_TOKEN {
  DATA_CUBE_ID = 'dataCubeId',
  SOURCE_DATA = 'sourceData',
}

export const LEGEND_DATA_CUBE_ROUTE_PATTERN = Object.freeze({
  BUILDER: `/:${LEGEND_DATA_CUBE_ROUTE_PATTERN_TOKEN.DATA_CUBE_ID}?`,
});

export type LegendDataCubeBuilderPathParams = {
  [LEGEND_DATA_CUBE_ROUTE_PATTERN_TOKEN.DATA_CUBE_ID]: string;
};

export const generateBuilderRoute = (dataCubeId: string | null): string => {
  return generatePath(LEGEND_DATA_CUBE_ROUTE_PATTERN.BUILDER, {
    [LEGEND_DATA_CUBE_ROUTE_PATTERN_TOKEN.DATA_CUBE_ID]: dataCubeId,
  });
};
