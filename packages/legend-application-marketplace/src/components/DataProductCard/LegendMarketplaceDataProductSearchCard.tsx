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
import { Button } from '@mui/material';
import type { DataProductSearchResult } from '@finos/legend-server-marketplace';
import DOMPurify from 'dompurify';
import { LegendMarketplaceCard } from '../MarketplaceCard/LegendMarketplaceCard.js';

const MAX_DESCRIPTION_LENGTH = 250;

export const LegendMarketplaceProductSearchCard = (props: {
  productSearchResult: DataProductSearchResult;
  onPreviewClick: (productSearchResult: DataProductSearchResult) => void;
  onLearnMoreClick: (productSearchResult: DataProductSearchResult) => void;
}): JSX.Element => {
  const { productSearchResult, onPreviewClick, onLearnMoreClick } = props;

  const descriptionSnippet =
    productSearchResult.data_product_description.substring(
      0,
      MAX_DESCRIPTION_LENGTH,
    );
  const truncatedDescriptionSnippet = `${descriptionSnippet.substring(0, descriptionSnippet.lastIndexOf(' '))}...`;
  const descriptionHTML = {
    __html:
      productSearchResult.data_product_description.length >
      MAX_DESCRIPTION_LENGTH
        ? DOMPurify.sanitize(truncatedDescriptionSnippet)
        : DOMPurify.sanitize(productSearchResult.data_product_description),
  };

  const content = (
    <>
      <div className="legend-marketplace-product-search-result-card__vendor-name">
        {productSearchResult.vendor_name}
      </div>
      <div className="legend-marketplace-product-search-result-card__data-product-name">
        {productSearchResult.data_product_name}
      </div>
      <div className="legend-marketplace-product-search-result-card__data-product-description">
        {productSearchResult.data_product_description.length > 0 && (
          <div dangerouslySetInnerHTML={descriptionHTML} />
        )}
      </div>
    </>
  );

  const actions = (
    <>
      <Button
        variant="outlined"
        onClick={() => onPreviewClick(productSearchResult)}
      >
        Preview
      </Button>
      {productSearchResult.data_product_link && (
        <Button
          variant="contained"
          onClick={() => onLearnMoreClick(productSearchResult)}
        >
          Learn More
        </Button>
      )}
    </>
  );

  return (
    <LegendMarketplaceCard size="large" content={content} actions={actions} />
  );
};
