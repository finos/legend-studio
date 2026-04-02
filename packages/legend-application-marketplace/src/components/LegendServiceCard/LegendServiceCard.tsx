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

import { observer } from 'mobx-react-lite';
import { Box, Chip } from '@mui/material';
import { clsx, MarkdownTextViewer } from '@finos/legend-art';
import { LegendMarketplaceCard } from '../MarketplaceCard/LegendMarketplaceCard.js';
import { type LegendServiceCardState } from '../../stores/dataAPIs/LegendMarketplaceDataAPIsStore.js';
import { ServiceOwnershipType } from '@finos/legend-graph';

const MAX_DESCRIPTION_LENGTH = 250;

export const LegendServiceCard = observer(
  (props: {
    serviceCardState: LegendServiceCardState;
    onClick: () => void;
  }): React.ReactNode => {
    const { serviceCardState, onClick } = props;

    const truncatedDescription =
      serviceCardState.description &&
      serviceCardState.description.length > MAX_DESCRIPTION_LENGTH
        ? `${serviceCardState.description.substring(
            0,
            MAX_DESCRIPTION_LENGTH,
          )}...`
        : serviceCardState.description;

    const content = (
      <Box className="marketplace-legend-service-card__container">
        <Box className="marketplace-legend-service-card__content">
          <Box className="marketplace-legend-service-card__tags">
            {serviceCardState.ownershipType && (
              <Chip
                size="small"
                label={serviceCardState.ownershipType}
                className={clsx(
                  'marketplace-legend-service-card__owner-chip',
                  serviceCardState.ownershipType ===
                    ServiceOwnershipType.DEPLOYMENT_OWNERSHIP
                    ? 'marketplace-legend-service-card__owner-chip--did'
                    : 'marketplace-legend-service-card__owner-chip--owner',
                )}
              />
            )}
          </Box>
        </Box>
      </Box>
    );

    const moreInfoContent = (
      <>
        <Box className="marketplace-legend-service-card__name">
          {serviceCardState.title}
        </Box>
        <Box className="marketplace-legend-service-card__pattern">
          {serviceCardState.service.pattern}
        </Box>
        {truncatedDescription && (
          <Box className="marketplace-legend-service-card__description">
            <MarkdownTextViewer
              className="marketplace-legend-service-card__description__markdown"
              value={{
                value: truncatedDescription,
              }}
              components={{
                h1: 'h2',
                h2: 'h3',
                h3: 'h4',
              }}
            />
          </Box>
        )}
        <Box sx={{ flex: 1 }} />
        {serviceCardState.owners.length > 0 && (
          <Box className="marketplace-legend-service-card__owners">
            {serviceCardState.owners.map((owner) => (
              <Chip
                key={owner}
                size="small"
                label={owner}
                className={clsx(
                  'marketplace-legend-service-card__owner-chip',
                  serviceCardState.ownershipType ===
                    ServiceOwnershipType.DEPLOYMENT_OWNERSHIP
                    ? 'marketplace-legend-service-card__owner-chip--did'
                    : 'marketplace-legend-service-card__owner-chip--owner',
                )}
              />
            ))}
          </Box>
        )}
      </>
    );

    return (
      <LegendMarketplaceCard
        size="large"
        content={content}
        onClick={onClick}
        className="marketplace-legend-service-card"
        moreInfo={moreInfoContent}
        moreInfoPreview="small"
        cardMedia={serviceCardState.displayImage}
      />
    );
  },
);
