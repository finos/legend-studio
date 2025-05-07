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
import { Card, CardActionArea, CardActions, CardContent } from '@mui/material';
import { clsx } from '@finos/legend-art';

export const LegendMarketplaceCard = (props: {
  content: JSX.Element;
  size: 'small' | 'large';
  actions?: JSX.Element;
  onClick?: () => void;
  moreInfo?: JSX.Element;
  className?: string;
}): JSX.Element => {
  const { content, size, actions, onClick, moreInfo, className } = props;

  const CardContentComponent = (
    <>
      <CardContent className="legend-marketplace-card__content">
        {content}
      </CardContent>
      {moreInfo && (
        <CardContent className="legend-marketplace-card__more-info">
          {moreInfo}
        </CardContent>
      )}
      {actions && (
        <CardActions className="legend-marketplace-card__actions">
          {actions}
        </CardActions>
      )}
    </>
  );

  return (
    <Card
      variant="outlined"
      className={clsx(
        'legend-marketplace-card',
        {
          'legend-marketplace-card--small': size === 'small',
          'legend-marketplace-card--large': size === 'large',
        },
        className,
      )}
    >
      {onClick ? (
        <CardActionArea onClick={onClick} sx={{ height: '100%' }}>
          {CardContentComponent}
        </CardActionArea>
      ) : (
        CardContentComponent
      )}
    </Card>
  );
};
