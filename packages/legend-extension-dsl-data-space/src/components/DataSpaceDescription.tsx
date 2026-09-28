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

import { CollapsibleWikiSection } from '@finos/legend-extension-dsl-data-product';
import { type DataSpaceViewerState } from '../stores/DataSpaceViewerState.js';
import { observer } from 'mobx-react-lite';
import { DataSpaceWikiPlaceholder } from './DataSpacePlaceholder.js';
import { DataSpaceMarkdownTextViewer } from './DataSpaceMarkdownTextViewer.js';
import { useEffect, useRef } from 'react';
import { ExternalLinkIcon, VerifiedIcon, WrenchIcon } from '@finos/legend-art';
import { Tooltip } from '@mui/material';
import {
  DATA_SPACE_VIEWER_ACTIVITY_MODE,
  generateAnchorForActivity,
} from '../stores/DataSpaceViewerNavigation.js';
import type { DataSpaceInfoAnalysisResult } from '../graph-manager/action/analytics/DataSpaceAnalysis.js';

enum DATA_SPACE_WIKI_BADGE {
  VERIFIED = 'VERIFIED',
  IN_DEVELOPMENT = 'IN_DEVELOPMENT',
  EXTERNAL = 'EXTERNAL',
}

interface DataSpaceWikiBadgeDescriptor {
  classModifier: string;
  icon: React.ReactNode;
  label: string;
  tooltipText?: string | undefined;
  isActive: (info: DataSpaceInfoAnalysisResult | undefined) => boolean;
}

const DATA_SPACE_WIKI_BADGE_DESCRIPTORS: Record<
  DATA_SPACE_WIKI_BADGE,
  DataSpaceWikiBadgeDescriptor
> = {
  [DATA_SPACE_WIKI_BADGE.VERIFIED]: {
    classModifier: 'verified',
    icon: <VerifiedIcon />,
    label: 'Verified',
    isActive: (info) => info?.isVerified ?? false,
  },
  [DATA_SPACE_WIKI_BADGE.IN_DEVELOPMENT]: {
    classModifier: 'in-development',
    icon: <WrenchIcon />,
    label: 'In Development',
    tooltipText: 'This data space has not been finalized yet',
    isActive: (info) => info?.isInDevelopment ?? false,
  },
  [DATA_SPACE_WIKI_BADGE.EXTERNAL]: {
    classModifier: 'external',
    icon: <ExternalLinkIcon />,
    label: 'External',
    tooltipText: 'This data originates from a third-party vendor',
    isActive: (info) => info?.isExternal ?? false,
  },
};

export const DataSpaceWikiBadges = observer(
  (props: { dataSpaceViewerState: DataSpaceViewerState }) => {
    const { dataSpaceViewerState } = props;
    const info = dataSpaceViewerState.dataSpaceAnalysisResult.info;
    const activeBadges = Object.values(
      DATA_SPACE_WIKI_BADGE_DESCRIPTORS,
    ).filter((badge) => badge.isActive(info));

    return (
      activeBadges.length > 0 && (
        <div
          className={`data-space__viewer__wiki__badges data-space__viewer__wiki__badges--count-${activeBadges.length}`}
        >
          {activeBadges.map((badge) => {
            const badgeContent = (
              <div
                key={badge.classModifier}
                className={`data-space__viewer__wiki__badge data-space__viewer__wiki__badge--${badge.classModifier}`}
              >
                {badge.icon}
                <span className="data-space__viewer__wiki__badge__label">
                  {badge.label}
                </span>
              </div>
            );
            return badge.tooltipText ? (
              <Tooltip
                key={badge.classModifier}
                title={badge.tooltipText}
                placement="bottom"
              >
                {badgeContent}
              </Tooltip>
            ) : (
              badgeContent
            );
          })}
        </div>
      )
    );
  },
);

export const DataSpaceDescription = observer(
  (props: { dataSpaceViewerState: DataSpaceViewerState }) => {
    const { dataSpaceViewerState } = props;
    const analysisResult = dataSpaceViewerState.dataSpaceAnalysisResult;
    const sectionRef = useRef<HTMLDivElement>(null);
    const anchor = generateAnchorForActivity(
      DATA_SPACE_VIEWER_ACTIVITY_MODE.DESCRIPTION,
    );

    useEffect(() => {
      if (sectionRef.current) {
        dataSpaceViewerState.layoutState.setWikiPageAnchor(
          anchor,
          sectionRef.current,
        );
      }
      return () => dataSpaceViewerState.layoutState.unsetWikiPageAnchor(anchor);
    }, [dataSpaceViewerState, anchor]);

    return (
      <div ref={sectionRef} className="viewer__wiki__section">
        <CollapsibleWikiSection
          viewerState={dataSpaceViewerState}
          section={DATA_SPACE_VIEWER_ACTIVITY_MODE.DESCRIPTION}
        >
          <div className="viewer__wiki__section__content">
            {analysisResult.description !== undefined && (
              <div className="data-space__viewer__description">
                <div className="data-space__viewer__description__content">
                  <DataSpaceMarkdownTextViewer
                    value={analysisResult.description}
                  />
                </div>
              </div>
            )}
            {analysisResult.description === undefined && (
              <DataSpaceWikiPlaceholder message="(not specified)" />
            )}
          </div>
        </CollapsibleWikiSection>
      </div>
    );
  },
);
