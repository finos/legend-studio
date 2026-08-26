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

import { Box, Chip } from '@mui/material';
import { clsx } from '@finos/legend-art';
import { LegendMarketplaceCard } from '../MarketplaceCard/LegendMarketplaceCard.js';

export interface CatalogCardTag {
  label: string;
  isLive?: boolean;
}

/**
 * Shared card for every entry in the intelligence catalog, so agents and MCP
 * servers read identically; each caller maps its own registry model onto it.
 */
export const LegendMarketplaceCatalogCard = (props: {
  title: string;
  vendor: string;
  description: string;
  tags: CatalogCardTag[];
  imageUrl: string;
  onClick: () => void;
  isLastViewed: boolean;
}): React.ReactNode => {
  const { title, vendor, description, tags, imageUrl, onClick, isLastViewed } =
    props;

  // the preview panel rests over the lower half of the card, so the title is only
  // rendered in `moreInfo` — repeating it here would never be visible
  const content = (
    <Box className="marketplace-catalog-card__container">
      <Box className="marketplace-catalog-card__content">
        <Box className="marketplace-catalog-card__tags">
          {tags.map((tag) => (
            <Chip
              key={tag.label}
              size="small"
              label={tag.label}
              className={clsx('marketplace-catalog-card__tag', {
                'marketplace-catalog-card__tag--live': tag.isLive === true,
              })}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );

  const moreInfoContent = (
    <>
      <Box className="marketplace-catalog-card__vendor">{vendor}</Box>
      <Box className="marketplace-catalog-card__name">{title}</Box>
      <Box className="marketplace-catalog-card__description">{description}</Box>
    </>
  );

  return (
    <LegendMarketplaceCard
      size="large"
      content={content}
      moreInfo={moreInfoContent}
      moreInfoPreview="large"
      cardMedia={imageUrl}
      onClick={(): void => onClick()}
      className={clsx('marketplace-catalog-card', {
        'marketplace-catalog-card--last-viewed': isLastViewed,
      })}
    />
  );
};
