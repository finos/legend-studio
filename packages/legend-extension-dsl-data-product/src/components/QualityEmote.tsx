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
import { CircularProgress, Tooltip } from '@mui/material';
import { clsx } from '@finos/legend-art';
import { QUALITY_LEVEL } from '@finos/legend-server-marketplace';

// The tiers, lowest to highest. Milestones are cumulative — reaching one implies every
// requirement of the ones before it is already satisfied — so a product's current tier is
// exactly the last milestone it has achieved.
const QUALITY_TIERS: {
  level: QUALITY_LEVEL;
  emoji: string;
  label: string;
  isAiReady: boolean;
}[] = [
  {
    level: QUALITY_LEVEL.BRONZE,
    emoji: '🥉',
    label: 'Bronze quality',
    isAiReady: false,
  },
  {
    level: QUALITY_LEVEL.SILVER,
    emoji: '🥈',
    label: 'Silver quality',
    isAiReady: false,
  },
  {
    level: QUALITY_LEVEL.GOLD,
    emoji: '🥇',
    label: 'Gold quality',
    isAiReady: false,
  },
  {
    level: QUALITY_LEVEL.PLATINUM,
    emoji: '🏆',
    label: 'Platinum quality',
    isAiReady: true,
  },
  {
    level: QUALITY_LEVEL.DIAMOND,
    emoji: '💎',
    label: 'Diamond quality',
    isAiReady: true,
  },
];

// Rounds down: a coverage just under a threshold (0.9496) must not read as the threshold (95%)
// next to a milestone that still says it is unmet. The epsilon keeps a float such as
// 0.29 * 100 = 28.999999999999996 from losing a whole percent.
export const formatAttributeCoverageSuffix = (breakdown: {
  attributeCoverage?: number | undefined;
}): string =>
  breakdown.attributeCoverage !== undefined
    ? ` (currently ${Math.floor(breakdown.attributeCoverage * 100 + 1e-9)}%)`
    : '';

type GetMilestoneRequirement<TBreakdown> = (
  level: QUALITY_LEVEL,
  breakdown: TBreakdown,
) => string;

// The full ladder up to Diamond, not just the next milestone, marking the tiers that unlock
// the AI-Ready stamp.
const QualityRoadmap = <TBreakdown extends object>(props: {
  currentIndex: number;
  breakdown: TBreakdown;
  getMilestoneRequirement: GetMilestoneRequirement<TBreakdown>;
}): React.ReactNode => {
  const { currentIndex, breakdown, getMilestoneRequirement } = props;
  const current = QUALITY_TIERS[currentIndex];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <div style={{ fontWeight: 700 }}>
        {current?.emoji} Current: {current?.label}
      </div>
      {QUALITY_TIERS.slice(1).map((tier, index) => {
        const tierIndex = index + 1;
        const isAchieved = currentIndex >= tierIndex;
        const isNext = currentIndex === tierIndex - 1;
        const requirement = isAchieved
          ? ''
          : getMilestoneRequirement(tier.level, breakdown);
        return (
          <div
            key={tier.level}
            style={{
              fontWeight: isNext ? 700 : 400,
              opacity: isNext ? 1 : 0.85,
            }}
          >
            {isAchieved ? '✅' : isNext ? '➡️' : '🔒'} {tier.emoji} {tier.label}
            {tier.isAiReady ? ' (AI-Ready)' : ''}
            {requirement ? `: ${requirement}` : ''}
          </div>
        );
      })}
    </div>
  );
};

/**
 * The AI-readiness badge of a data product or data space header, with the tier roadmap in its
 * tooltip. It only renders what it is given: the host triggers the computation and passes the
 * level, the breakdown and what each tier still requires.
 */
export const QualityEmote = observer(
  <TBreakdown extends object>(props: {
    /** the CSS block the header's classes come from, for the size it renders at */
    classNamePrefix: 'data-product' | 'data-space';
    isLoading: boolean;
    qualityLevel: QUALITY_LEVEL | undefined;
    breakdown: TBreakdown | undefined;
    getMilestoneRequirement: GetMilestoneRequirement<TBreakdown>;
  }) => {
    const {
      classNamePrefix,
      isLoading,
      qualityLevel,
      breakdown,
      getMilestoneRequirement,
    } = props;
    const emoteClassName = clsx(
      'quality-emote',
      `${classNamePrefix}__viewer__header__actions`,
      `${classNamePrefix}__viewer__header__quality-emote`,
    );

    if (isLoading) {
      return (
        <div className={emoteClassName}>
          <CircularProgress size={12} />
        </div>
      );
    }

    const currentIndex = QUALITY_TIERS.findIndex(
      (tier) => tier.level === qualityLevel,
    );
    const current = QUALITY_TIERS[currentIndex];
    if (!current || !breakdown) {
      return null;
    }

    return (
      <Tooltip
        title={
          <QualityRoadmap
            currentIndex={currentIndex}
            breakdown={breakdown}
            getMilestoneRequirement={getMilestoneRequirement}
          />
        }
        placement="bottom"
      >
        <div className={emoteClassName}>
          AI Readiness Badge:{' '}
          <span className="quality-emote__icon" aria-label={current.label}>
            {current.emoji}
          </span>
          {current.isAiReady && (
            <span
              className="quality-emote__ai-ready-stamp"
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
