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
  QUERY_ID = 'queryId',
  SOURCE_DATA = 'sourceData',
}

export const LEGEND_DATA_CUBE_ROUTE_PATTERN = Object.freeze({
  QUERY_BUILDER: `/:${LEGEND_DATA_CUBE_ROUTE_PATTERN_TOKEN.QUERY_ID}?`,
});

export type LegendDataCubeQueryBuilderQueryPathParams = {
  [LEGEND_DATA_CUBE_ROUTE_PATTERN_TOKEN.QUERY_ID]: string;
};

export const generateQueryBuilderRoute = (queryId: string | null): string => {
  return generatePath(LEGEND_DATA_CUBE_ROUTE_PATTERN.QUERY_BUILDER, {
    [LEGEND_DATA_CUBE_ROUTE_PATTERN_TOKEN.QUERY_ID]: queryId,
  });
};
