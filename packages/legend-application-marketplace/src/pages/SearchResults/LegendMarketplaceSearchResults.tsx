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
import { useApplicationStore } from '@finos/legend-application';
import { generateSearchResultsRoute } from '../../__lib__/LegendMarketplaceNavigation.js';
import { DataProductSearchResult } from '@finos/legend-server-marketplace';
import { useEffect, useState } from 'react';
import {
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
} from '@finos/legend-art';
import { useLegendMarketplaceBaseStore } from '../../application/LegendMarketplaceFrameworkProvider.js';
import { assertErrorThrown } from '@finos/legend-shared';
import { LegendMarketplaceSearchResultDrawerContent } from './LegendMarketplaceSearchResultDrawerContent.js';
import { Drawer, Grid2 as Grid } from '@mui/material';
import { LegendMarketplaceProductSearchCard } from '../../components/DataProductCard/LegendMarketplaceDataProductSearchCard.js';
import { LegendMarketplacePage } from '../LegendMarketplacePage.js';

export const LegendMarketplaceSearchResults = observer(() => {
  const applicationStore = useApplicationStore();
  const store = useLegendMarketplaceBaseStore();
  const marketplaceServerClient = store.marketplaceServerClient;

  const params =
    applicationStore.navigationService.navigator.getCurrentLocationParameters<{
      vendorName: string | undefined;
      query: string | undefined;
    }>();

  const [results, setResults] = useState<DataProductSearchResult[]>([]);
  const [isError, setIsError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [selectedPreviewResult, setSelectedPreviewResult] =
    useState<DataProductSearchResult>();

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
            DataProductSearchResult.serialization.fromJson(result),
          ),
        );
      } catch (error) {
        assertErrorThrown(error);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };
    // eslint-disable-next-line no-void
    void fetchResults();
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
    <LegendMarketplacePage className="legend-marketplace-search-results">
      <div className="legend-marketplace-search-results__search-bar">
        <LegendMarketplaceSearchBar
          onSearch={onSearch}
          initialValue={params.query?.trim() ?? ''}
        />
      </div>
      <div className="legend-marketplace-search-results__results">
        <CubesLoadingIndicator isLoading={isLoading}>
          <CubesLoadingIndicatorIcon />
        </CubesLoadingIndicator>
        {isError ? (
          <div>Error loading results</div>
        ) : (
          <Grid
            container={true}
            spacing={{ xs: 4 }}
            columns={{ xs: 1, sm: 2, lg: 3, xxl: 4, xxxl: 5, xxxxl: 6 }}
            className="legend-marketplace-search-results__results__cards"
          >
            {results.map((result) => (
              <Grid
                key={`${result.vendor_name}-${result.data_product_name}`}
                size={1}
              >
                <LegendMarketplaceProductSearchCard
                  productSearchResult={result}
                  onPreviewClick={() => {
                    setSelectedPreviewResult(result);
                  }}
                  onLearnMoreClick={() => {
                    applicationStore.navigationService.navigator.visitAddress(
                      result.data_product_link,
                    );
                  }}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </div>
      <Drawer
        anchor="right"
        open={selectedPreviewResult !== undefined}
        onClose={() => setSelectedPreviewResult(undefined)}
        slotProps={{
          paper: {
            sx: {
              width: '40%',
              maxWidth: '100rem',
            },
          },
        }}
      >
        <LegendMarketplaceSearchResultDrawerContent
          productSearchResult={selectedPreviewResult}
        />
      </Drawer>
    </LegendMarketplacePage>
  );
});
