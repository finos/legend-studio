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

import { LakehouseDataProductSearchResultDetails } from '@finos/legend-server-marketplace';
import {
  type LEGEND_MARKETPLACE_PAGE,
  DATAPRODUCT_TYPE,
  LegendMarketplaceTelemetryHelper,
} from '../__lib__/LegendMarketplaceTelemetryHelper.js';
import type { ProductCardState } from '../stores/lakehouse/dataProducts/ProductCardState.js';
import { getSearchResultProjectGAV } from './SearchUtils.js';
import type { GenericLegendApplicationStore } from '@finos/legend-application';

export const logClickingDataProductCard = (
  productCardState: ProductCardState,
  applicationStore: GenericLegendApplicationStore,
  source: LEGEND_MARKETPLACE_PAGE,
): void => {
  const searchResult = productCardState.searchResult;
  const projectGAV = getSearchResultProjectGAV(searchResult);
  const origin =
    projectGAV !== undefined
      ? {
          type: DATAPRODUCT_TYPE.SDLC,
          groupId: projectGAV.groupId,
          artifactId: projectGAV.artifactId,
          versionId: projectGAV.versionId,
        }
      : {
          type: DATAPRODUCT_TYPE.ADHOC,
        };
  const deploymentId =
    searchResult.dataProductDetails instanceof
    LakehouseDataProductSearchResultDetails
      ? searchResult.dataProductDetails.deploymentId
      : undefined;
  LegendMarketplaceTelemetryHelper.logEvent_ClickingDataProductCard(
    applicationStore.telemetryService,
    {
      origin: origin,
      dataProductId: productCardState.dataProductId,
      name: productCardState.title,
      deploymentId,
    },
    source,
  );
};
