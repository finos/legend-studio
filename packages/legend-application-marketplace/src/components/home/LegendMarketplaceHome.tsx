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
import { LegendMarketplaceHeader } from '../header/LegendMarketplaceHeader.js';

export const LegendMarketplaceHome = observer(() => {
  return (
    <div className="app__page">
      <div className="legend-marketplace-home">
        <div className="legend-marketplace-home__body">
          <LegendMarketplaceHeader />
          <div className="legend-marketplace-home__content">
            <div className="legend-marketplace-home__content__title">
              Welcome to Legend Marketplace
            </div>
            <div className="legend-marketplace-home__content__description">
              <p>
                Legend Marketplace is a WIP. Please check back in the future for
                updates.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
