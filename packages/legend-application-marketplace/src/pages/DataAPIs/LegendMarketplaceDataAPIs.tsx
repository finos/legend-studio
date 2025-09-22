/**
 * Copyright (c) 2025-present, Goldman Sachs
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
import { LegendMarketplacePage } from '../LegendMarketplacePage.js';
import { Container } from '@mui/material';
import { LegendMarketplaceSearchBar } from '../../components/SearchBar/LegendMarketplaceSearchBar.js';
import { useLegendMarketplaceBaseStore } from '../../application/providers/LegendMarketplaceFrameworkProvider.js';
import { isNonEmptyString } from '@finos/legend-shared';
import { generateLakehouseSearchResultsRoute } from '../../__lib__/LegendMarketplaceNavigation.js';
import { ComingSoonDisplay } from '../../components/ComingSoon/ComingSoonDisplay.js';
import {
  AnalyticsIcon,
  DashboardIcon,
  InsightsIcon,
  TrendingUpIcon,
} from '@finos/legend-art';

export const LegendMarketplaceDataAPIs = observer(() => {
  const legendMarketplaceBaseStore = useLegendMarketplaceBaseStore();
  const applicationStore = legendMarketplaceBaseStore.applicationStore;

  const handleSearch = (query: string | undefined): void => {
    if (isNonEmptyString(query)) {
      applicationStore.navigationService.navigator.goToLocation(
        generateLakehouseSearchResultsRoute(query),
      );
    }
  };

  const featuresPreviewItems = [
    {
      icon: <DashboardIcon />,
      title: 'Interactive Dashboard',
    },
    {
      icon: <TrendingUpIcon />,
      title: 'Trend Analysis',
    },
    {
      icon: <InsightsIcon />,
      title: 'AI Insights',
    },
  ];

  return (
    <LegendMarketplacePage className="data-api-coming-soon">
      <Container className="marketplace-lakehouse-search-results__search-container">
        <LegendMarketplaceSearchBar
          onSearch={handleSearch}
          placeholder="Search Legend Marketplace"
          className="marketplace-lakehouse-search-results__search-bar"
        />
      </Container>
      <ComingSoonDisplay
        loadingIcon={<AnalyticsIcon />}
        title={`Data API's`}
        description="Unlock powerful insights with our advanced analytics platform. Get
                        comprehensive data visualization, and intelligent reporting to drive
                        data-driven decision making."
        featuresPreviewItems={featuresPreviewItems}
      />
    </LegendMarketplacePage>
  );
});
