/**
 * Copyright (c) 2025-present, Goldman Sachs
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
import { LegendMarketplacePage } from '../LegendMarketplacePage.js';
import { ComingSoonDisplay } from '../../components/ComingSoon/ComingSoonDisplay.js';
import {
  AnalyticsIcon,
  DashboardIcon,
  InsightsIcon,
  TrendingUpIcon,
} from '@finos/legend-art';

export const LegendMarketplaceDataAPIs = observer(() => {
  const featuresPreviewItems = [
    {
      icon: <DashboardIcon />,
      title: 'Interactive Dashboard',
    },
    {
      icon: <TrendingUpIcon />,
      title: 'Trend Analysis',
    },
    {
      icon: <InsightsIcon />,
      title: 'AI Insights',
    },
  ];

  return (
    <LegendMarketplacePage className="data-api-coming-soon">
      <ComingSoonDisplay
        loadingIcon={<AnalyticsIcon />}
        title={`Data API's`}
        description="Unlock powerful insights with our advanced analytics platform. Get
                        comprehensive data visualization, and intelligent reporting to drive
                        data-driven decision making."
        featuresPreviewItems={featuresPreviewItems}
      />
    </LegendMarketplacePage>
  );
});
