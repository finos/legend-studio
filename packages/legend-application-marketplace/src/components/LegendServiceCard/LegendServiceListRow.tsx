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
import { useState } from 'react';
import { Chip } from '@mui/material';
import { MarkdownTextViewer } from '@finos/legend-art';
import type { LegendServiceCardState } from '../../stores/dataAPIs/LegendMarketplaceDataAPIsStore.js';
import { ServiceOwnershipType } from '@finos/legend-graph';
import { LegendMarketplaceListItem } from '../MarketplaceCard/LegendMarketplaceListItem.js';

const MAX_DESCRIPTION_LENGTH = 250;

export const LegendServiceListRow = observer(
  (props: {
    serviceCardState: LegendServiceCardState;
    onClick: () => void;
  }): React.ReactNode => {
    const { serviceCardState, onClick } = props;
    const [expanded, setExpanded] = useState(false);
    const description = serviceCardState.description;
    const isTruncatable = description.length > MAX_DESCRIPTION_LENGTH;
    const displayDescription =
      !expanded && isTruncatable
        ? `${description.substring(0, MAX_DESCRIPTION_LENGTH)}...`
        : description;

    return (
      <LegendMarketplaceListItem
        className="marketplace-legend-service-list-row"
        onClick={onClick}
        cardMedia={serviceCardState.displayImage}
        content={
          <div className="marketplace-legend-service-list-row__body">
            <div className="marketplace-legend-service-list-row__header">
              <div className="marketplace-legend-service-list-row__title-block">
                <div className="marketplace-legend-service-list-row__name">
                  {serviceCardState.title}
                </div>
                <div className="marketplace-legend-service-list-row__pattern">
                  {serviceCardState.service.pattern}
                </div>
              </div>
              <div className="marketplace-legend-service-list-row__tags">
                {serviceCardState.owners.map((owner) => (
                  <Chip
                    key={owner}
                    size="small"
                    label={owner}
                    className={`marketplace-legend-service-list-row__chip marketplace-legend-service-list-row__chip--${
                      serviceCardState.ownershipType ===
                      ServiceOwnershipType.DEPLOYMENT_OWNERSHIP
                        ? 'did'
                        : 'owner'
                    }`}
                  />
                ))}
              </div>
            </div>
            {description && (
              <div className="marketplace-legend-service-list-row__description">
                <MarkdownTextViewer
                  className="marketplace-legend-service-list-row__description__markdown"
                  value={{ value: displayDescription }}
                  components={{ h1: 'h2', h2: 'h3', h3: 'h4' }}
                />
                {isTruncatable && (
                  <button
                    className="marketplace-legend-service-list-row__description__toggle"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpanded(!expanded);
                    }}
                  >
                    {expanded ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>
            )}
          </div>
        }
      />
    );
  },
);
