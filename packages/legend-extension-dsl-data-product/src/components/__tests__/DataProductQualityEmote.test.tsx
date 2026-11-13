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

import { describe, test, expect, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  QUALITY_LEVEL,
  type DataProductQualityBreakdown,
  type DataProductQualityResponse,
} from '@finos/legend-server-marketplace';
import { QualityEmote } from '../QualityEmote.js';
import { DataProductQualityEmote } from '../DataProductQualityEmote.js';
import {
  DataProductQualityState,
  type DataProductQualityHost,
} from '../../stores/DataProduct/DataProductQualityState.js';

const BADGE_TEXT = /AI Readiness Badge:/;

const openRoadmap = async (): Promise<void> => {
  fireEvent.mouseOver(await screen.findByText(BADGE_TEXT));
};

describe('QualityEmote', () => {
  const renderEmote = (
    props: Partial<Parameters<typeof QualityEmote<object>>[0]> = {},
  ): ReturnType<typeof render> =>
    render(
      <QualityEmote
        classNamePrefix="data-product"
        isLoading={false}
        qualityLevel={QUALITY_LEVEL.GOLD}
        breakdown={{}}
        getMilestoneRequirement={() => ''}
        {...props}
      />,
    );

  test('shows a spinner, and no badge, while loading', () => {
    renderEmote({ isLoading: true });

    expect(screen.getByRole('progressbar')).toBeDefined();
    expect(screen.queryByText(BADGE_TEXT)).toBeNull();
  });

  test.each([
    ['no level', { qualityLevel: undefined }],
    ['no breakdown', { breakdown: undefined }],
  ])('renders nothing when there is %s', (_label, props) => {
    const { container } = renderEmote(props);

    expect(container.innerHTML).toBe('');
  });

  test.each([
    [QUALITY_LEVEL.BRONZE, 'Bronze quality', '🥉', false],
    [QUALITY_LEVEL.SILVER, 'Silver quality', '🥈', false],
    [QUALITY_LEVEL.GOLD, 'Gold quality', '🥇', false],
    [QUALITY_LEVEL.PLATINUM, 'Platinum quality', '🏆', true],
    [QUALITY_LEVEL.DIAMOND, 'Diamond quality', '💎', true],
  ])(
    'shows the %s badge, with the AI-Ready stamp only from Platinum',
    (qualityLevel, label, emoji, isAiReady) => {
      renderEmote({ qualityLevel });

      expect(screen.getByLabelText(label).textContent).toBe(emoji);
      expect(screen.queryByText('AI-Ready') !== null).toBe(isAiReady);
    },
  );

  test.each<Parameters<typeof QualityEmote<object>>[0]['classNamePrefix']>([
    'data-product',
    'data-space',
  ])('takes the header classes of the %s viewer', (classNamePrefix) => {
    const { container } = renderEmote({ classNamePrefix });

    const badge = container.firstElementChild;
    expect(badge?.classList.contains('quality-emote')).toBe(true);
    expect(
      badge?.classList.contains(`${classNamePrefix}__viewer__header__actions`),
    ).toBe(true);
    expect(
      badge?.classList.contains(
        `${classNamePrefix}__viewer__header__quality-emote`,
      ),
    ).toBe(true);
  });

  describe('roadmap', () => {
    test('marks achieved, next and locked tiers, and asks only for what is not achieved yet', async () => {
      const getMilestoneRequirement = jest.fn(
        (level: QUALITY_LEVEL) => `Reach ${level}.`,
      );
      renderEmote({
        qualityLevel: QUALITY_LEVEL.SILVER,
        getMilestoneRequirement,
      });
      await openRoadmap();

      expect(
        await screen.findByText('Current: Silver quality', { exact: false }),
      ).toBeDefined();
      expect(screen.getByText('✅ 🥈 Silver quality')).toBeDefined();
      expect(screen.getByText('➡️ 🥇 Gold quality: Reach GOLD.')).toBeDefined();
      expect(
        screen.getByText('🔒 🏆 Platinum quality (AI-Ready): Reach PLATINUM.'),
      ).toBeDefined();
      expect(
        screen.getByText('🔒 💎 Diamond quality (AI-Ready): Reach DIAMOND.'),
      ).toBeDefined();
      expect(
        getMilestoneRequirement.mock.calls.map(([level]) => level),
      ).toEqual([
        QUALITY_LEVEL.GOLD,
        QUALITY_LEVEL.PLATINUM,
        QUALITY_LEVEL.DIAMOND,
      ]);
    });

    test('hands the breakdown to the requirement of each tier', async () => {
      const getMilestoneRequirement = jest.fn(() => '');
      const breakdown = { attributeCoverage: 0.4 };
      renderEmote({
        qualityLevel: QUALITY_LEVEL.BRONZE,
        breakdown,
        getMilestoneRequirement,
      });
      await openRoadmap();

      await screen.findByText('➡️ 🥈 Silver quality');
      expect(getMilestoneRequirement).toHaveBeenCalledWith(
        QUALITY_LEVEL.SILVER,
        breakdown,
      );
    });

    test('shows a tier without a colon when there is nothing to require', async () => {
      renderEmote({ qualityLevel: QUALITY_LEVEL.BRONZE });
      await openRoadmap();

      expect(await screen.findByText('➡️ 🥈 Silver quality')).toBeDefined();
    });

    test('has every tier achieved at Diamond', async () => {
      const getMilestoneRequirement = jest.fn(() => 'Never shown.');
      renderEmote({
        qualityLevel: QUALITY_LEVEL.DIAMOND,
        getMilestoneRequirement,
      });
      await openRoadmap();

      expect(
        await screen.findByText('✅ 💎 Diamond quality (AI-Ready)'),
      ).toBeDefined();
      expect(getMilestoneRequirement).not.toHaveBeenCalled();
    });
  });
});

describe('DataProductQualityEmote', () => {
  const buildBreakdown = (
    overrides: Partial<DataProductQualityBreakdown> = {},
  ): DataProductQualityBreakdown => ({
    isDescriptionDocumented: true,
    isAccessPointsPresent: true,
    isAccessPointGroupDescriptionsDocumented: true,
    isEveryAccessPointDocumented: true,
    attributeCoverage: 0.6,
    documentedAttributeCount: 3,
    totalAttributeCount: 5,
    ...overrides,
  });

  const renderWithResponse = (
    response: DataProductQualityResponse,
  ): DataProductQualityState => {
    const host: DataProductQualityHost = {
      fetchDataProductQuality: () => Promise.resolve(response),
      dataProductArtifactPromise: undefined,
      applicationStore: { logService: { warn: jest.fn() } },
    };
    const qualityState = new DataProductQualityState(host);
    render(<DataProductQualityEmote qualityState={qualityState} />);
    return qualityState;
  };

  test('computes the quality when it renders, then shows the badge', async () => {
    const qualityState = renderWithResponse({
      qualityLevel: QUALITY_LEVEL.GOLD,
      qualityBreakdown: buildBreakdown(),
    });

    expect(screen.getByRole('progressbar')).toBeDefined();
    expect(await screen.findByText(BADGE_TEXT)).toBeDefined();
    expect(screen.getByLabelText('Gold quality')).toBeDefined();
    expect(qualityState.computingQualityState.hasSucceeded).toBe(true);
  });

  test('renders nothing when the host has no quality action', () => {
    const qualityState = new DataProductQualityState({
      dataProductArtifactPromise: undefined,
      applicationStore: { logService: { warn: jest.fn() } },
    });
    const { container } = render(
      <DataProductQualityEmote qualityState={qualityState} />,
    );

    expect(container.innerHTML).toBe('');
    expect(qualityState.computingQualityState.isInProgress).toBe(false);
  });

  test('renders nothing when the quality request fails', async () => {
    const warn = jest.fn();
    const qualityState = new DataProductQualityState({
      fetchDataProductQuality: () => Promise.reject(new Error('unavailable')),
      dataProductArtifactPromise: undefined,
      applicationStore: { logService: { warn } },
    });
    const { container } = render(
      <DataProductQualityEmote qualityState={qualityState} />,
    );

    await waitFor(() => {
      expect(qualityState.computingQualityState.hasFailed).toBe(true);
    });
    expect(container.innerHTML).toBe('');
    expect(warn).toHaveBeenCalledTimes(1);
  });

  describe('roadmap wording', () => {
    test('lists everything a BRONZE product is missing for Silver', async () => {
      renderWithResponse({
        qualityLevel: QUALITY_LEVEL.BRONZE,
        qualityBreakdown: buildBreakdown({
          isDescriptionDocumented: false,
          isAccessPointsPresent: false,
          isAccessPointGroupDescriptionsDocumented: false,
        }),
      });
      await openRoadmap();

      expect(
        await screen.findByText(
          '➡️ 🥈 Silver quality: Write a description (2+ sentences), add Access Points, describe every Access Point Group.',
        ),
      ).toBeDefined();
    });

    test('asks a SILVER product to describe every Access Point only when some are not', async () => {
      renderWithResponse({
        qualityLevel: QUALITY_LEVEL.SILVER,
        qualityBreakdown: buildBreakdown({
          isEveryAccessPointDocumented: false,
        }),
      });
      await openRoadmap();

      expect(
        await screen.findByText(
          '➡️ 🥇 Gold quality: Describe every Access Point, and describe at least 50% of fields.',
        ),
      ).toBeDefined();
    });

    test('asks a SILVER product with documented Access Points only for 50% of fields', async () => {
      renderWithResponse({
        qualityLevel: QUALITY_LEVEL.SILVER,
        qualityBreakdown: buildBreakdown(),
      });
      await openRoadmap();

      expect(
        await screen.findByText(
          '➡️ 🥇 Gold quality: Describe at least 50% of fields.',
        ),
      ).toBeDefined();
    });

    test('shows the current coverage next to the Platinum and Diamond milestones', async () => {
      renderWithResponse({
        qualityLevel: QUALITY_LEVEL.GOLD,
        qualityBreakdown: buildBreakdown({ attributeCoverage: 0.6 }),
      });
      await openRoadmap();

      expect(
        await screen.findByText(
          '➡️ 🏆 Platinum quality (AI-Ready): Describe 90%-95% of fields (currently 60%).',
        ),
      ).toBeDefined();
      expect(
        screen.getByText(
          '🔒 💎 Diamond quality (AI-Ready): Describe 95%+ of fields (currently 60%).',
        ),
      ).toBeDefined();
    });

    test.each([
      [0.9496, 94],
      [0.899, 89],
      [0.29, 29],
      [0.6, 60],
      [1, 100],
      [0, 0],
    ])(
      'never shows a coverage of %f above the real one (%i%%)',
      async (attributeCoverage, percent) => {
        renderWithResponse({
          qualityLevel: QUALITY_LEVEL.GOLD,
          qualityBreakdown: buildBreakdown({ attributeCoverage }),
        });
        await openRoadmap();

        expect(
          await screen.findByText(
            `➡️ 🏆 Platinum quality (AI-Ready): Describe 90%-95% of fields (currently ${percent}%).`,
          ),
        ).toBeDefined();
      },
    );

    test('leaves the coverage out when the breakdown has none', async () => {
      renderWithResponse({
        qualityLevel: QUALITY_LEVEL.GOLD,
        qualityBreakdown: buildBreakdown({ attributeCoverage: undefined }),
      });
      await openRoadmap();

      expect(
        await screen.findByText(
          '➡️ 🏆 Platinum quality (AI-Ready): Describe 90%-95% of fields.',
        ),
      ).toBeDefined();
    });
  });
});
