import { type JSX } from 'react';
import { Card, CardActionArea, CardContent, Chip } from '@mui/material';
import { clsx } from '@finos/legend-art';
import type { DataAsset } from '@finos/legend-server-marketplace';

export const LegendMarketplaceVendorCard = (props: {
  dataAsset: DataAsset;
  onClick: (dataAsset: DataAsset) => void;
}): JSX.Element => {
  const { dataAsset, onClick } = props;
  return (
    <Card variant="outlined" className="legend-marketplace-vendor-card">
      <CardActionArea
        onClick={() => onClick(dataAsset)}
        sx={{ height: '100%' }}
      >
        <CardContent className="legend-marketplace-vendor-card__content">
          <Chip
            label={dataAsset.type}
            className={clsx('legend-marketplace-vendor-card__type', {
              'legend-marketplace-vendor-card__type--vendor':
                dataAsset.type === 'vendor',
              'legend-marketplace-vendor-card__type--curated':
                dataAsset.type === 'curated',
            })}
          />
          <div className="legend-marketplace-vendor-card__name">
            {dataAsset.provider}
          </div>
          <div className="legend-marketplace-vendor-card__description">
            {dataAsset.description}
          </div>
        </CardContent>
        {dataAsset.moreInfo.length > 0 && (
          <CardContent className="legend-marketplace-vendor-card__more-info">
            <div>{dataAsset.moreInfo}</div>
          </CardContent>
        )}
      </CardActionArea>
    </Card>
  );
};
