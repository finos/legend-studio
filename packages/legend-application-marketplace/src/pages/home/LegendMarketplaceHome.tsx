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
import { LegendMarketplaceHeader } from '../../components/header/LegendMarketplaceHeader.js';
import { useApplicationStore } from '@finos/legend-application';
import { generateSearchResultsRoute } from '../../__lib__/LegendMarketplaceNavigation.js';

export const LegendMarketplaceHome = observer(() => {
  const applicationStore = useApplicationStore();

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
      <div className="legend-marketplace-home">
        <div className="legend-marketplace-home__body">
          <LegendMarketplaceHeader />
          <div className="legend-marketplace-home__content">
            <div className="legend-marketplace-home__landing">
              <div className="legend-marketplace-home__landing__title">
                <span style={{ color: '#76A1E3' }}>All data in </span>
                <span style={{ color: 'white' }}>One Place</span>
              </div>
              <div className="legend-marketplace-home__landing__description">
                <h3>
                  Discover the right data and accelerate analytic productivity.
                </h3>
              </div>
              <LegendMarketplaceSearchBar onSearch={onSearch} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
