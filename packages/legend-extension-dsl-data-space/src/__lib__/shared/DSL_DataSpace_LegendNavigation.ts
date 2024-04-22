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
import { generateGAVCoordinates } from '@finos/legend-storage';

export enum DATA_SPACE_TEMPLATE_QUERY_PROMOTION_ROUTE_PATTERN_TOKEN {
  GAV = 'gav',
  DATA_SPACE_PATH = 'dataSpacePath',
  QUERY_ID = 'queryId',
}

export type DataSpaceTemplateQueryPromotionReviewerPathParams = {
  [DATA_SPACE_TEMPLATE_QUERY_PROMOTION_ROUTE_PATTERN_TOKEN.GAV]: string;
  [DATA_SPACE_TEMPLATE_QUERY_PROMOTION_ROUTE_PATTERN_TOKEN.DATA_SPACE_PATH]: string;
  [DATA_SPACE_TEMPLATE_QUERY_PROMOTION_ROUTE_PATTERN_TOKEN.QUERY_ID]: string;
};

export const DATA_SPACE_STUDIO_ROUTE_PATTERN = Object.freeze({
  PROMOTE_TEMPLATE_QUERY: `/promote-template-query/:${DATA_SPACE_TEMPLATE_QUERY_PROMOTION_ROUTE_PATTERN_TOKEN.GAV}/:${DATA_SPACE_TEMPLATE_QUERY_PROMOTION_ROUTE_PATTERN_TOKEN.DATA_SPACE_PATH}/:${DATA_SPACE_TEMPLATE_QUERY_PROMOTION_ROUTE_PATTERN_TOKEN.QUERY_ID}?`,
});

export const generateDataSpaceTemplateQueryPromotionRoute = (
  groupId: string,
  artifactId: string,
  versionId: string,
  dataSpacePath: string,
  queryId: string | undefined,
): string =>
  generatePath(
    generateExtensionUrlPattern(
      DATA_SPACE_STUDIO_ROUTE_PATTERN.PROMOTE_TEMPLATE_QUERY,
    ),
    {
      [DATA_SPACE_TEMPLATE_QUERY_PROMOTION_ROUTE_PATTERN_TOKEN.GAV]:
        generateGAVCoordinates(groupId, artifactId, versionId),
      [DATA_SPACE_TEMPLATE_QUERY_PROMOTION_ROUTE_PATTERN_TOKEN.DATA_SPACE_PATH]:
        dataSpacePath,
      [DATA_SPACE_TEMPLATE_QUERY_PROMOTION_ROUTE_PATTERN_TOKEN.QUERY_ID]:
        queryId,
    },
  );
