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
import { CircularProgress, Tooltip } from '@mui/material';
import { clsx } from '@finos/legend-art';
import {
  DATA_SPACE_QUALITY_LEVEL,
  type DataSpaceQualityBreakdown,
  type DataSpaceQualityState,
} from '../stores/DataSpaceQualityState.js';

const QUALITY_EMOTE_CLASS_NAME = clsx(
  'data-space__viewer__header__actions',
  'data-space__viewer__header__quality-emote',
);

const TIER_STATUS_ICON = {
  ACHIEVED: '✅',
  NEXT: '➡️',
  LOCKED: '🔒',
};

const QUALITY_EMOTE_CONFIG: Record<
  DATA_SPACE_QUALITY_LEVEL,
  { emoji: string; label: string }
> = {
  [DATA_SPACE_QUALITY_LEVEL.DIAMOND]: {
    emoji: '💎',
    label: 'Diamond quality',
  },
  [DATA_SPACE_QUALITY_LEVEL.PLATINUM]: {
    emoji: '🏆',
    label: 'Platinum quality',
  },
  [DATA_SPACE_QUALITY_LEVEL.GOLD]: { emoji: '🥇', label: 'Gold quality' },
  [DATA_SPACE_QUALITY_LEVEL.SILVER]: { emoji: '🥈', label: 'Silver quality' },
  [DATA_SPACE_QUALITY_LEVEL.BRONZE]: { emoji: '🥉', label: 'Bronze quality' },
};

const AI_READY_QUALITY_LEVELS: DATA_SPACE_QUALITY_LEVEL[] = [
  DATA_SPACE_QUALITY_LEVEL.DIAMOND,
  DATA_SPACE_QUALITY_LEVEL.PLATINUM,
];

// The full tier ladder, in order. Milestones are cumulative — reaching one implies every
// requirement of the milestones before it is already satisfied — so a user's current tier
// is exactly the last milestone they've achieved.
const TIER_LADDER = [
  DATA_SPACE_QUALITY_LEVEL.BRONZE,
  DATA_SPACE_QUALITY_LEVEL.SILVER,
  DATA_SPACE_QUALITY_LEVEL.GOLD,
  DATA_SPACE_QUALITY_LEVEL.PLATINUM,
  DATA_SPACE_QUALITY_LEVEL.DIAMOND,
];

const formatAttributeCoverageSuffix = (
  breakdown: DataSpaceQualityBreakdown,
): string =>
  breakdown.attributeCoverage !== undefined
    ? ` (currently ${Math.round(breakdown.attributeCoverage * 100)}%)`
    : '';

const getMilestoneRequirement = (
  level: DATA_SPACE_QUALITY_LEVEL,
  breakdown: DataSpaceQualityBreakdown,
): string => {
  switch (level) {
    case DATA_SPACE_QUALITY_LEVEL.SILVER: {
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
    case DATA_SPACE_QUALITY_LEVEL.GOLD:
      return breakdown.isEveryServiceDocumented
        ? 'Describe at least 50% of attributes.'
        : 'Describe every executable, and describe at least 50% of attributes.';
    case DATA_SPACE_QUALITY_LEVEL.PLATINUM:
      return `Describe 90%-95% of attributes${formatAttributeCoverageSuffix(breakdown)}.`;
    case DATA_SPACE_QUALITY_LEVEL.DIAMOND:
      return `Describe 95%+ of attributes${formatAttributeCoverageSuffix(breakdown)}. Coming soon: will also require MCPs + Verified NLQs ground truth.`;
    case DATA_SPACE_QUALITY_LEVEL.BRONZE:
    default:
      return '';
  }
};

// Renders the full tier ladder up to Diamond, not just the next milestone, and marks which
// tiers unlock the AI-Ready stamp.
const QualityRoadmap = observer(
  (props: {
    qualityLevel: DATA_SPACE_QUALITY_LEVEL;
    breakdown: DataSpaceQualityBreakdown;
  }): React.ReactNode => {
    const { qualityLevel, breakdown } = props;
    const config = QUALITY_EMOTE_CONFIG[qualityLevel];
    const currentIndex = TIER_LADDER.indexOf(qualityLevel);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <div style={{ fontWeight: 700 }}>
          {config.emoji} Current: {config.label}
        </div>
        {TIER_LADDER.slice(1).map((level, index) => {
          const levelIndex = index + 1;
          const isAchieved = currentIndex >= levelIndex;
          const isNext = currentIndex === levelIndex - 1;
          const levelConfig = QUALITY_EMOTE_CONFIG[level];
          const isAiReadyMilestone = AI_READY_QUALITY_LEVELS.includes(level);
          const statusIcon = isAchieved
            ? TIER_STATUS_ICON.ACHIEVED
            : isNext
              ? TIER_STATUS_ICON.NEXT
              : TIER_STATUS_ICON.LOCKED;
          return (
            <div
              key={level}
              style={{
                fontWeight: isNext ? 700 : 400,
                opacity: isNext ? 1 : 0.85,
              }}
            >
              {statusIcon} {levelConfig.emoji} {levelConfig.label}
              {isAiReadyMilestone ? ' (AI-Ready)' : ''}
              {!isAchieved
                ? `: ${getMilestoneRequirement(level, breakdown)}`
                : ''}
            </div>
          );
        })}
      </div>
    );
  },
);

export const DataSpaceQualityEmote = observer(
  (props: { qualityState: DataSpaceQualityState }) => {
    const { qualityState } = props;

    useEffect(() => {
      flowResult(qualityState.computeQuality()).catch(() => undefined);
    }, [qualityState]);

    if (!qualityState.isSupported) {
      return null;
    }

    if (
      qualityState.computingQualityState.isInInitialState ||
      qualityState.computingQualityState.isInProgress
    ) {
      return (
        <div className={QUALITY_EMOTE_CLASS_NAME}>
          <CircularProgress size={12} />
        </div>
      );
    }

    if (!qualityState.qualityLevel || !qualityState.qualityBreakdown) {
      return null;
    }

    const config = QUALITY_EMOTE_CONFIG[qualityState.qualityLevel];
    const isAIReady = AI_READY_QUALITY_LEVELS.includes(
      qualityState.qualityLevel,
    );

    return (
      <Tooltip
        title={
          <QualityRoadmap
            qualityLevel={qualityState.qualityLevel}
            breakdown={qualityState.qualityBreakdown}
          />
        }
        placement="bottom"
      >
        <div className={QUALITY_EMOTE_CLASS_NAME}>
          AI Readiness Badge:{' '}
          <span
            className="data-space__viewer__header__quality-emote__icon"
            aria-label={config.label}
          >
            {config.emoji}
          </span>
          {isAIReady && (
            <span
              className="data-space__viewer__header__quality-emote__ai-ready-stamp"
              title="Documentation quality is high enough for reliable AI consumption"
            >
              AI-Ready
            </span>
          )}
        </div>
      </Tooltip>
    );
  },
);
