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

import { type JSX } from 'react';
import { Chip } from '@mui/material';
import { clsx } from '@finos/legend-art';
import type { LightDataProduct } from '@finos/legend-server-marketplace';
import { LegendMarketplaceCard } from '../MarketplaceCard/LegendMarketplaceCard.js';

export const LegendMarketplaceLightDataProductCard = (props: {
  dataAsset: LightDataProduct;
  onClick: (dataAsset: LightDataProduct) => void;
}): JSX.Element => {
  const { dataAsset, onClick } = props;

  const content = (
    <div className="legend-marketplace-light-data-product-card__content">
      <Chip
        label={dataAsset.type}
        className={clsx('legend-marketplace-light-data-product-card__type', {
          'legend-marketplace-light-data-product-card__type--vendor':
            dataAsset.type === 'vendor',
          'legend-marketplace-light-data-product-card__type--curated':
            dataAsset.type === 'curated',
        })}
      />
      <div className="legend-marketplace-light-data-product-card__name-container">
        <div className="legend-marketplace-light-data-product-card__name">
          {dataAsset.provider}
        </div>
      </div>
    </div>
  );

  const moreInfo = dataAsset.description ? (
    <div className="legend-marketplace-light-data-product-card__description">
      {dataAsset.description.length > 200
        ? `${dataAsset.description.slice(0, 200)}...`
        : dataAsset.description}
    </div>
  ) : undefined;

  return (
    <LegendMarketplaceCard
      size="small"
      content={content}
      onClick={() => onClick(dataAsset)}
      moreInfo={moreInfo}
    />
  );
};
