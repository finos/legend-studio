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
  CardMedia,
  CardActionArea,
  CardContent,
  Skeleton,
} from '@mui/material';
import { observer } from 'mobx-react-lite';
import { type DataProductState } from '../../stores/lakehouse/dataProducts/DataProducts.js';

const MAX_DESCRIPTION_LENGTH = 350;

export const LakehouseHighlightedDataProductCard = observer(
  (props: {
    dataProductState: DataProductState;
    onClick: (dataProductState: DataProductState) => void;
  }): React.ReactNode => {
    const { dataProductState, onClick } = props;

    const truncatedDescription =
      dataProductState.description &&
      dataProductState.description.length > MAX_DESCRIPTION_LENGTH
        ? `${dataProductState.description.substring(
            0,
            MAX_DESCRIPTION_LENGTH,
          )}...`
        : dataProductState.description;

    const loading = dataProductState.initState.isInProgress;

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
        <CardActionArea onClick={() => onClick(dataProductState)}>
          {loading ? (
            skeletonLoader
          ) : (
            <>
              <CardMedia
                image="/assets/LegendLogo.png"
                title={dataProductState.title}
                className="lakehouse-highlighted-data-product-card__image"
              />
              <CardContent className="lakehouse-highlighted-data-product-card__content">
                <Box className="lakehouse-highlighted-data-product-card__title">
                  {dataProductState.title}
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
