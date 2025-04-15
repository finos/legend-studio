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
import {
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
} from '@mui/material';
import type { ProductSearchResult } from '@finos/legend-server-marketplace';

const MAX_DESCRIPTION_LENGTH = 250;

export const LegendMarketplaceProductSearchCard = (props: {
  productSearchResult: ProductSearchResult;
  onPreviewClick: (productSearchResult: ProductSearchResult) => void;
  onLearnMoreClick: (productSearchResult: ProductSearchResult) => void;
}): JSX.Element => {
  const { productSearchResult, onPreviewClick, onLearnMoreClick } = props;

  const descriptionSnippet =
    productSearchResult.data_product_description.substring(
      MAX_DESCRIPTION_LENGTH,
    );
  const truncatedDescriptionSnippet = `${descriptionSnippet.substring(0, descriptionSnippet.lastIndexOf(' '))}...`;

  return (
    <Card
      variant="outlined"
      className="legend-marketplace-product-search-result-card"
    >
      <CardHeader title={productSearchResult.vendor_name} />
      <CardContent className="legend-marketplace-product-search-result-card__content">
        <div className="legend-marketplace-product-search-result-card__data-product-name">
          {productSearchResult.data_product_name}
        </div>
        <div className="legend-marketplace-product-search-result-card__data-product-description">
          {productSearchResult.data_product_description.length > 0 && (
            <p>
              {productSearchResult.data_product_description.length > 250
                ? truncatedDescriptionSnippet
                : productSearchResult.data_product_description}
            </p>
          )}
        </div>
        <CardActions className="legend-marketplace-product-search-result-card__actions">
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
        </CardActions>
      </CardContent>
    </Card>
  );
};
