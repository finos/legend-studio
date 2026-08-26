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
import { LegendMarketplaceCatalogCard } from './LegendMarketplaceCatalogCard.js';
import { useLegendMarketplaceBaseStore } from '../../application/providers/LegendMarketplaceFrameworkProvider.js';
import {
  CATALOG_LIVE_TAG,
  LEGEND_MARKETPLACE_AI_AGENT,
  LEGEND_MARKETPLACE_AI_AGENT_LOGO,
} from '../../stores/intelligence/IntelligenceCatalogUtils.js';

export const LegendMarketplaceAgentCard = observer(
  (props: { onClick: () => void }): React.ReactNode => {
    const { onClick } = props;
    const applicationStore = useLegendMarketplaceBaseStore().applicationStore;
    const isLightTheme =
      applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled;

    return (
      <LegendMarketplaceCatalogCard
        title={LEGEND_MARKETPLACE_AI_AGENT.displayName}
        vendor={LEGEND_MARKETPLACE_AI_AGENT.vendor}
        description={LEGEND_MARKETPLACE_AI_AGENT.description}
        tags={[{ label: CATALOG_LIVE_TAG, isLive: true }]}
        imageUrl={
          isLightTheme
            ? LEGEND_MARKETPLACE_AI_AGENT_LOGO.light
            : LEGEND_MARKETPLACE_AI_AGENT_LOGO.dark
        }
        onClick={onClick}
        isLastViewed={false}
      />
    );
  },
);
