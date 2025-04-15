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

import { observer } from 'mobx-react-lite';
import { LegendMarketplaceSearchBar } from '../../components/SearchBar/LegendMarketplaceSearchBar.js';
import { LegendMarketplaceHeader } from '../../components/Header/LegendMarketplaceHeader.js';
import { useApplicationStore } from '@finos/legend-application';
import { generateSearchResultsRoute } from '../../__lib__/LegendMarketplaceNavigation.js';
import { ProductSearchResult } from '@finos/legend-server-marketplace';
import { useEffect, useState } from 'react';
import {
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
} from '@finos/legend-art';
import { useLegendMarketplaceBaseStore } from '../../application/LegendMarketplaceFrameworkProvider.js';
import { LegendMarketplaceProductSearchCard } from '../../components/ProductSearchResultCard/LegendMarketplaceProductSearchCard.js';
import { assertErrorThrown } from '@finos/legend-shared';

export const LegendMarketplaceHome = observer(() => {
  const applicationStore = useApplicationStore();
  const store = useLegendMarketplaceBaseStore();
  const marketplaceServerClient = store.marketplaceServerClient;

  const params =
    applicationStore.navigationService.navigator.getCurrentLocationParameters<{
      vendorName: string | undefined;
      query: string | undefined;
    }>();

  const [results, setResults] = useState<ProductSearchResult[]>([]);
  const [isError, setIsError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [infoPage, setInfoPage] = useState<number>();
  const [showDrawer, setShowDrawer] = useState<boolean>(false);

  useEffect(() => {
    const fetchResults = async () => {
      setIsLoading(true);
      try {
        const vendorName = params.vendorName?.trim() ?? '';
        const query = params.query?.trim() ?? '';

        const _results = await marketplaceServerClient.semanticSearch(
          query,
          vendorName,
          30,
        );
        setResults(
          _results.map((result) =>
            ProductSearchResult.serialization.fromJson(result),
          ),
        );
      } catch (error) {
        assertErrorThrown(error);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };
    fetchResults();
  }, [marketplaceServerClient, params.query, params.vendorName]);

  const onSearch = (
    provider: string | undefined,
    query: string | undefined,
  ): void => {
    applicationStore.navigationService.navigator.goToLocation(
      generateSearchResultsRoute(provider, query),
    );
  };

  return (
    <div className="app__page">
      <div className="legend-marketplace-search-results">
        <div className="legend-marketplace-search-results__body">
          <LegendMarketplaceHeader />
          <div className="legend-marketplace-search-results__content">
            <div className="legend-marketplace-search-results__search-bar">
              <LegendMarketplaceSearchBar onSearch={onSearch} />
            </div>
            <div className="legend-marketplace-search-results__results">
              <CubesLoadingIndicator isLoading={isLoading}>
                <CubesLoadingIndicatorIcon />
              </CubesLoadingIndicator>
              {isError ? (
                <div>Error loading results</div>
              ) : (
                results?.map((result) => (
                  <LegendMarketplaceProductSearchCard
                    key={result.data_product_name}
                    productSearchResult={result}
                    onPreviewClick={() => {}}
                    onLearnMoreClick={() => {}}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
