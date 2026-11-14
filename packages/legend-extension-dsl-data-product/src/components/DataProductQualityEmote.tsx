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
import { flowResult } from 'mobx';
import { useEffect } from 'react';
import {
  QUALITY_LEVEL,
  type DataProductQualityBreakdown,
} from '@finos/legend-server-marketplace';
import type { DataProductQualityState } from '../stores/DataProduct/DataProductQualityState.js';
import { formatAttributeCoverageSuffix, QualityEmote } from './QualityEmote.js';

const getMilestoneRequirement = (
  level: QUALITY_LEVEL,
  breakdown: DataProductQualityBreakdown,
): string => {
  switch (level) {
    case QUALITY_LEVEL.SILVER: {
      const missing: string[] = [];
      if (!breakdown.isDescriptionDocumented) {
        missing.push('write a description (2+ sentences)');
      }
      if (!breakdown.isAccessPointsPresent) {
        missing.push('add Access Points');
      }
      if (!breakdown.isAccessPointGroupDescriptionsDocumented) {
        missing.push('describe every Access Point Group');
      }
      if (missing.length > 0) {
        const joined = missing.join(', ');
        return `${joined.charAt(0).toUpperCase()}${joined.slice(1)}.`;
      }
      return '';
    }
    case QUALITY_LEVEL.GOLD:
      return breakdown.isEveryAccessPointDocumented
        ? 'Describe at least 50% of fields.'
        : 'Describe every Access Point, and describe at least 50% of fields.';
    case QUALITY_LEVEL.PLATINUM:
      return `Describe 90%-95% of fields${formatAttributeCoverageSuffix(breakdown)}.`;
    case QUALITY_LEVEL.DIAMOND:
      return `Describe 95%+ of fields${formatAttributeCoverageSuffix(breakdown)}.`;
    case QUALITY_LEVEL.BRONZE:
    default:
      return '';
  }
};

export const DataProductQualityEmote = observer(
  (props: { qualityState: DataProductQualityState }) => {
    const { qualityState } = props;

    useEffect(() => {
      flowResult(qualityState.computeQuality()).catch(() => undefined);
    }, [qualityState]);

    if (!qualityState.isSupported) {
      return null;
    }

    return (
      <QualityEmote
        classNamePrefix="data-product"
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
