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
  PsychologyIcon,
  RobotOutlineIcon,
  SparkleStarsIcon,
} from '@finos/legend-art';

export const LegendMarketplaceAgents = observer(() => {
  const featuresPreviewItems = [
    {
      icon: <SparkleStarsIcon />,
      title: 'Smart Recommendations',
    },
    {
      icon: <AnalyticsIcon />,
      title: 'Data Analysis',
    },
    {
      icon: <PsychologyIcon />,
      title: 'Intelligent Insights',
    },
  ];

  return (
    <LegendMarketplacePage className="agents-coming-soon">
      <ComingSoonDisplay
        loadingIcon={<RobotOutlineIcon />}
        title="Legend Intelligence"
        description="Transform your data operations with intelligent AI agents that learn, adapt, and deliver autonomous insights. Experience the future of data-driven automation and decision-making excellence."
        featuresPreviewItems={featuresPreviewItems}
      />
    </LegendMarketplacePage>
  );
});
