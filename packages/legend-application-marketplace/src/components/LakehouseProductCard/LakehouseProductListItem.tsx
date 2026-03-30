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

import { MarkdownTextViewer, clsx, InfoCircleIcon } from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { IconButton } from '@mui/material';
import { useState } from 'react';
import type { ProductCardState } from '../../stores/lakehouse/dataProducts/ProductCardState.js';
import {
  LakehouseProductTags,
  DATA_PRODUCT_MARKDOWN_COMPONENTS,
} from './LakehouseProductCardSharedUtils.js';
import { LakehouseDataProductCardInfoPopover } from './LakehouseProductCard.js';
import { LegendMarketplaceListItem } from '../MarketplaceCard/LegendMarketplaceListItem.js';

export const LakehouseProductListItem = observer(
  (props: {
    productCardState: ProductCardState;
    onClick: (productCardState: ProductCardState) => void;
  }): React.ReactNode => {
    const { productCardState, onClick } = props;
    const [popoverAnchorEl, setPopoverAnchorEl] =
      useState<HTMLButtonElement | null>(null);

    const content = (
      <>
        <div className="marketplace-lakehouse-list-item__header">
          <div className="marketplace-lakehouse-list-item__title">
            {productCardState.title}
          </div>
          <div className="marketplace-lakehouse-list-item__tags">
            <LakehouseProductTags productCardState={productCardState} />
          </div>
        </div>
        <div className="marketplace-lakehouse-list-item__description">
          <MarkdownTextViewer
            className="marketplace-lakehouse-list-item__description__markdown"
            value={{ value: productCardState.description }}
            components={DATA_PRODUCT_MARKDOWN_COMPONENTS}
          />
        </div>
      </>
    );

    const actions = (
      <>
        <IconButton
          onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
            event.preventDefault();
            event.stopPropagation();
            setPopoverAnchorEl(event.currentTarget);
          }}
          className={clsx('marketplace-lakehouse-list-item__info-btn', {
            'marketplace-lakehouse-list-item__info-btn--selected':
              Boolean(popoverAnchorEl),
          })}
          title="More Info"
          size="small"
        >
          <InfoCircleIcon />
        </IconButton>
        <LakehouseDataProductCardInfoPopover
          dataProductCardState={productCardState}
          popoverAnchorEl={popoverAnchorEl}
          setPopoverAnchorEl={setPopoverAnchorEl}
          applicationStore={
            productCardState.marketplaceBaseStore.applicationStore
          }
        />
      </>
    );

    return (
      <LegendMarketplaceListItem
        content={content}
        actions={actions}
        onClick={() => onClick(productCardState)}
        className="marketplace-lakehouse-list-item"
        cardMedia={productCardState.icon ?? productCardState.displayImage}
        loadingMedia={productCardState.initState.isInProgress}
      />
    );
  },
);
