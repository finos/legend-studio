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
import {
  AnchorLinkIcon,
  ExpandMoreIcon,
  QuestionCircleIcon,
  clsx,
} from '@finos/legend-art';
import { type DataSpaceViewerState } from '../stores/DataSpaceViewerState.js';
import { useApplicationStore } from '@finos/legend-application';
import { useEffect, useRef } from 'react';
import {
  DATA_SPACE_VIEWER_ACTIVITY_MODE,
  generateAnchorForActivity,
} from '../stores/DataSpaceViewerNavigation.js';
import { DataAccessOverview } from '@finos/legend-query-builder';
import { DataSpaceWikiPlaceholder } from './DataSpacePlaceholder.js';

export const DataSpaceDataAccess = observer(
  (props: { dataSpaceViewerState: DataSpaceViewerState }) => {
    const { dataSpaceViewerState } = props;
    const applicationStore = useApplicationStore();
    const analysisResult = dataSpaceViewerState.dataSpaceAnalysisResult;
    const documentationUrl = analysisResult.supportInfo?.documentationUrl;
    const sectionRef = useRef<HTMLDivElement>(null);
    const anchor = generateAnchorForActivity(
      DATA_SPACE_VIEWER_ACTIVITY_MODE.DATA_ACCESS,
    );
    const isCollapsed =
      dataSpaceViewerState.layoutState.sectionCollapseState.isSectionCollapsed(
        anchor,
      );
    const toggleCollapse = (): void =>
      dataSpaceViewerState.layoutState.sectionCollapseState.toggleSectionCollapse(
        anchor,
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

    const seeDocumentation = (): void => {
      if (documentationUrl) {
        applicationStore.navigationService.navigator.visitAddress(
          documentationUrl,
        );
      }
    };

    return (
      <div ref={sectionRef} className="data-space__viewer__wiki__section">
        <div className="data-space__viewer__wiki__section__header">
          <div className="data-space__viewer__wiki__section__header__label">
            <button
              className="data-space__viewer__wiki__section__header__caret-btn"
              tabIndex={-1}
              onClick={toggleCollapse}
              title={isCollapsed ? 'Expand' : 'Collapse'}
            >
              <ExpandMoreIcon
                className={clsx(
                  'data-space__viewer__wiki__section__header__caret',
                  {
                    'data-space__viewer__wiki__section__header__caret--collapsed':
                      isCollapsed,
                  },
                )}
              />
            </button>
            Data Access
            <button
              className="data-space__viewer__wiki__section__header__anchor"
              tabIndex={-1}
              onClick={() => dataSpaceViewerState.changeZone(anchor, true)}
            >
              <AnchorLinkIcon />
            </button>
          </div>
          {Boolean(documentationUrl) && (
            <button
              className="data-space__viewer__wiki__section__header__documentation"
              tabIndex={-1}
              onClick={seeDocumentation}
              title="See Documentation"
            >
              <QuestionCircleIcon />
            </button>
          )}
        </div>
        {!isCollapsed && (
          <div className="data-space__viewer__wiki__section__content">
            <div className="data-space__viewer__data-access">
              {dataSpaceViewerState.currentDataAccessState ? (
                <DataAccessOverview
                  dataAccessState={dataSpaceViewerState.currentDataAccessState}
                />
              ) : (
                <DataSpaceWikiPlaceholder message="(not specified)" />
              )}
            </div>
          </div>
        )}
      </div>
    );
  },
);
