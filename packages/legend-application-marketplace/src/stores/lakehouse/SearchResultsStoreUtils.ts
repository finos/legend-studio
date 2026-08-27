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

import { type GeneratorFn, type PlainObject } from '@finos/legend-shared';
import {
  DataProductSearchResponse,
  ErrorDataProductSearchResultDetails,
  LakehouseDataProductSearchResultDetails,
} from '@finos/legend-server-marketplace';
import { DEFAULT_TAB_SIZE } from '@finos/legend-application';
import { V1_PureGraphManager } from '@finos/legend-graph';
import type { LegendMarketplaceBaseStore } from '../LegendMarketplaceBaseStore.js';
import { ProductCardState } from './dataProducts/ProductCardState.js';

/**
 * Lazily builds a {@link V1_PureGraphManager} and caches it in `cache.current`, so a
 * search store that calls this on every search only pays graph-manager
 * construction + initialization once per store instance instead of once per search.
 *
 * `cache` is a mutable holder (rather than a return value the caller assigns) so this
 * can be called from inside a store's own `flow` generator via `yield*` delegation
 * and still mutate the store's cached field as a side effect.
 */
export function* getOrCreateGraphManager(
  marketplaceBaseStore: LegendMarketplaceBaseStore,
  cache: { current: V1_PureGraphManager | undefined },
): GeneratorFn<V1_PureGraphManager> {
  if (cache.current) {
    return cache.current;
  }

  const graphManager = new V1_PureGraphManager(
    marketplaceBaseStore.applicationStore.pluginManager,
    marketplaceBaseStore.applicationStore.logService,
    marketplaceBaseStore.remoteEngine,
  );
  yield graphManager.initialize(
    {
      env: marketplaceBaseStore.applicationStore.config.env,
      tabSize: DEFAULT_TAB_SIZE,
      clientConfig: {
        baseUrl: marketplaceBaseStore.applicationStore.config.engineServerUrl,
      },
    },
    { engine: marketplaceBaseStore.remoteEngine },
  );

  cache.current = graphManager;
  return graphManager;
}

/**
 * Deserializes a raw search response and builds the product cards for it. Shared by
 * every search-results store (DataSpaces, Lakehouse Access) — the shape of "parse
 * the response, drop error/originless results, build one `ProductCardState` per
 * result" doesn't vary per search experience.
 */
export function processRawSearchResults(
  marketplaceBaseStore: LegendMarketplaceBaseStore,
  rawResults: PlainObject<DataProductSearchResponse>,
  graphManager: V1_PureGraphManager,
  token: string | undefined,
): {
  productCardStates: ProductCardState[];
  response: DataProductSearchResponse;
} {
  const response = DataProductSearchResponse.serialization.fromJson(rawResults);

  const validResults = response.results.filter(
    (result) =>
      !(
        result.dataProductDetails instanceof ErrorDataProductSearchResultDetails
      ) &&
      !(
        result.dataProductDetails instanceof
          LakehouseDataProductSearchResultDetails &&
        result.dataProductDetails.origin === null
      ),
  );

  const usedImages = new Set<string>();
  const productCardStates: ProductCardState[] = validResults.map(
    (result) =>
      new ProductCardState(
        marketplaceBaseStore,
        result,
        graphManager,
        new Map(),
        usedImages,
      ),
  );
  productCardStates.forEach((dataProductState) => dataProductState.init(token));

  return { productCardStates, response };
}
