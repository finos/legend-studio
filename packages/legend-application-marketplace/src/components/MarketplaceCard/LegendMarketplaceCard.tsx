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

import { useRef, useState, type JSX } from 'react';
import {
  Card,
  CardActionArea,
  CardActions,
  CardContent,
  Slide,
} from '@mui/material';
import { clsx } from '@finos/legend-art';

export const LegendMarketplaceCard = (props: {
  content: JSX.Element;
  size: 'small' | 'large';
  actions?: JSX.Element;
  onClick?: () => void;
  moreInfo?: JSX.Element | undefined;
  className?: string;
  cardMedia?: string | undefined;
}): JSX.Element => {
  const { content, size, actions, onClick, moreInfo, className, cardMedia } =
    props;

  const [isMouseOver, setIsMouseOver] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const CardContentComponent = (
    <>
      <CardContent
        className={clsx('legend-marketplace-card__content', {
          'legend-marketplace-card__content--with-actions':
            actions !== undefined,
        })}
      >
        {content}
      </CardContent>
      {actions && (
        <CardActions className="legend-marketplace-card__actions">
          {actions}
        </CardActions>
      )}
      {moreInfo && (
        <Slide direction="up" in={isMouseOver} container={containerRef.current}>
          <CardContent className="legend-marketplace-card__more-info">
            {moreInfo}
          </CardContent>
        </Slide>
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
      ref={containerRef}
      sx={
        cardMedia
          ? {
              background: `url(${cardMedia})`,
            }
          : {}
      }
    >
      {onClick ? (
        <CardActionArea
          onClick={onClick}
          onMouseEnter={() => setIsMouseOver(true)}
          onMouseLeave={() => setIsMouseOver(false)}
          className="legend-marketplace-card__content-container"
          component="div"
        >
          {CardContentComponent}
        </CardActionArea>
      ) : (
        <div
          onMouseEnter={() => setIsMouseOver(true)}
          onMouseLeave={() => setIsMouseOver(false)}
          className="legend-marketplace-card__content-container"
        >
          {CardContentComponent}
        </div>
      )}
    </Card>
  );
};
