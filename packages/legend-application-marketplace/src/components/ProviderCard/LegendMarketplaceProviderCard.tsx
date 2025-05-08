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
import { Button, Chip } from '@mui/material';
import type { ProviderResult } from '@finos/legend-server-marketplace';
import { CheckCircleIcon, ShoppingCartIcon } from '@finos/legend-art';
import { LegendMarketplaceCard } from '../MarketplaceCard/LegendMarketplaceCard.js';

export const LegendMarketplaceProviderCard = (props: {
  providerResult: ProviderResult;
  onAddToCartClick: (providerResult: ProviderResult) => void;
}): JSX.Element => {
  const { providerResult, onAddToCartClick } = props;

  const content = (
    <>
      <div className="legend-marketplace-vendor-data-card__vendor-name">
        {providerResult.providerName}
      </div>
      <div className="legend-marketplace-vendor-data-card__product-name">
        {providerResult.productName || 'N/A'}
      </div>
      <div className="legend-marketplace-vendor-data-card__vendor-name__description">
        {providerResult.description}
      </div>
    </>
  );

  const actions = providerResult.isOwned ? (
    <div className="legend-marketplace-vendor-data-card__vendor-name__owned">
      Already have access &nbsp; <CheckCircleIcon />
    </div>
  ) : (
    <>
      <Button
        variant="outlined"
        className="legend-marketplace-vendor-data-card__add-to-cart-button"
        onClick={() => onAddToCartClick(providerResult)}
      >
        Add to cart &nbsp;
        <ShoppingCartIcon />
      </Button>
      {typeof providerResult.price === 'number' && (
        <Chip
          label={`$${providerResult.price.toFixed(2)} per month`}
          className="legend-marketplace-vendor-data-card__price"
          sx={{ color: 'white', backgroundColor: '#077d55' }}
        />
      )}
    </>
  );

  return (
    <LegendMarketplaceCard
      size="large"
      content={content}
      actions={actions}
      className="legend-marketplace-vendor-data-card"
    />
  );
};
