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

import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Skeleton,
} from '@mui/material';
import { observer } from 'mobx-react-lite';
import type { BaseProductCardState } from '../../stores/lakehouse/dataProducts/BaseProductCardState.js';

const MAX_DESCRIPTION_LENGTH = 350;

export const LakehouseHighlightedProductCard = observer(
  (props: {
    productCardState: BaseProductCardState;
    onClick: (productCardState: BaseProductCardState) => void;
  }): React.ReactNode => {
    const { productCardState, onClick } = props;

    const truncatedDescription =
      productCardState.description &&
      productCardState.description.length > MAX_DESCRIPTION_LENGTH
        ? `${productCardState.description.substring(
            0,
            MAX_DESCRIPTION_LENGTH,
          )}...`
        : productCardState.description;

    const loading = productCardState.initState.isInProgress;

    const skeletonLoader = (
      <>
        <Skeleton variant="rectangular" width="100%" height={200} />
        <Skeleton variant="text" sx={{ fontSize: '2rem' }} />
        <Skeleton variant="text" sx={{ fontSize: '1rem' }} />
        <Skeleton variant="text" sx={{ fontSize: '1rem' }} />
        <Skeleton variant="text" sx={{ fontSize: '1rem' }} />
      </>
    );

    return (
      <Card className="lakehouse-highlighted-data-product-card">
        <CardActionArea
          onClick={() => onClick(productCardState)}
          className="lakehouse-highlighted-data-product-card__action"
        >
          {loading ? (
            skeletonLoader
          ) : (
            <>
              <Box className="lakehouse-highlighted-data-product-card__image__container">
                <img
                  src="/assets/LegendLogo.png"
                  title={productCardState.title}
                  className="lakehouse-highlighted-data-product-card__image"
                />
              </Box>
              <CardContent className="lakehouse-highlighted-data-product-card__content">
                <Box className="lakehouse-highlighted-data-product-card__title">
                  {productCardState.title}
                </Box>
                <Box className="lakehouse-highlighted-data-product-card__description">
                  {truncatedDescription}
                </Box>
              </CardContent>
            </>
          )}
        </CardActionArea>
      </Card>
    );
  },
);
