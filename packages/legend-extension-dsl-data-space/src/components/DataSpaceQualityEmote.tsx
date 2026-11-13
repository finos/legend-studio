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

import { observer } from 'mobx-react-lite';
import { flowResult } from 'mobx';
import { useEffect } from 'react';
import {
  QUALITY_LEVEL,
  QualityEmote,
  formatAttributeCoverageSuffix,
} from '@finos/legend-extension-dsl-data-product';
import type {
  DataSpaceQualityBreakdown,
  DataSpaceQualityState,
} from '../stores/DataSpaceQualityState.js';

const getMilestoneRequirement = (
  level: QUALITY_LEVEL,
  breakdown: DataSpaceQualityBreakdown,
): string => {
  switch (level) {
    case QUALITY_LEVEL.SILVER: {
      const missing: string[] = [];
      if (!breakdown.isDescriptionDocumented) {
        missing.push('write a description (2+ sentences)');
      }
      if (!breakdown.isExecutablesPresent) {
        missing.push('add Executables');
      }
      if (!breakdown.isModelsDocumentationPresent) {
        missing.push('add Models Documentation');
      }
      if (missing.length > 0) {
        const joined = missing.join(', ');
        return `${joined.charAt(0).toUpperCase()}${joined.slice(1)}.`;
      }
      return 'Write a description (2+ sentences), and make sure Executables and Models Documentation are present.';
    }
    case QUALITY_LEVEL.GOLD:
      return breakdown.isEveryServiceDocumented
        ? 'Describe at least 50% of attributes.'
        : 'Describe every executable, and describe at least 50% of attributes.';
    case QUALITY_LEVEL.PLATINUM:
      return `Describe 90%-95% of attributes${formatAttributeCoverageSuffix(breakdown)}.`;
    case QUALITY_LEVEL.DIAMOND:
      return `Describe 95%+ of attributes${formatAttributeCoverageSuffix(breakdown)}. Coming soon: will also require MCPs + Verified NLQs ground truth.`;
    case QUALITY_LEVEL.BRONZE:
    default:
      return '';
  }
};

export const DataSpaceQualityEmote = observer(
  (props: { qualityState: DataSpaceQualityState }) => {
    const { qualityState } = props;

    useEffect(() => {
      flowResult(qualityState.computeQuality()).catch(() => undefined);
    }, [qualityState]);

    if (!qualityState.isSupported) {
      return null;
    }

    return (
      <QualityEmote
        classNamePrefix="data-space"
        isLoading={
          qualityState.computingQualityState.isInInitialState ||
          qualityState.computingQualityState.isInProgress
        }
        qualityLevel={qualityState.qualityLevel}
        breakdown={qualityState.qualityBreakdown}
        getMilestoneRequirement={getMilestoneRequirement}
      />
    );
  },
);
