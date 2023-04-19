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
  BlankPanelContent,
  CaretUpIcon,
  VerifiedIcon,
  clsx,
} from '@finos/legend-art';
import {
  type DataSpaceViewerState,
  DATA_SPACE_VIEWER_ACTIVITY_MODE,
} from '../stores/DataSpaceViewerState.js';
import { DataSpaceExecutionContextViewer } from './DataSpaceExecutionContextViewer.js';
import { DataSpaceInfoPanel } from './DataSpaceInfoPanel.js';
import { DataSpaceSupportPanel } from './DataSpaceSupportPanel.js';
import { DataSpaceWiki } from './DataSpaceWiki.js';
import { DataSpaceViewerActivityBar } from './DataSpaceViewerActivityBar.js';
import { useEffect, useRef, useState } from 'react';

const DataSpaceHeader = observer(
  (props: {
    dataSpaceViewerState: DataSpaceViewerState;
    showFullHeader: boolean;
  }) => {
    const { dataSpaceViewerState, showFullHeader } = props;
    const analysisResult = dataSpaceViewerState.dataSpaceAnalysisResult;

    return (
      <div
        className={clsx('data-space__viewer__header', {
          'data-space__viewer__header--floating': showFullHeader,
        })}
      >
        <div
          className={clsx('data-space__viewer__header__content', {
            'data-space__viewer__header__content--expanded':
              dataSpaceViewerState.layoutState.isExpandedModeEnabled,
          })}
        >
          <div
            className="data-space__viewer__header__title"
            title={`${analysisResult.displayName} - ${analysisResult.path}`}
          >
            <div className="data-space__viewer__header__title__label">
              {analysisResult.displayName}
            </div>
            {dataSpaceViewerState.isVerified && (
              <VerifiedIcon
                className="data-space__viewer__header__title__verified-badge"
                title="Verified Data Space"
              />
            )}
          </div>
        </div>
      </div>
    );
  },
);

const DataSpacePlaceholderPanel: React.FC<{ message: string }> = (props) => {
  const { message } = props;

  return (
    <div className="data-space__viewer__panel">
      <BlankPanelContent>{message}</BlankPanelContent>
    </div>
  );
};

export const DataSpaceViewer = observer(
  (props: { dataSpaceViewerState: DataSpaceViewerState }) => {
    const { dataSpaceViewerState } = props;
    const frame = useRef<HTMLDivElement>(null);
    const [showFullHeader, setShowFullHeader] = useState(false);

    const onScroll: React.UIEventHandler<HTMLDivElement> = (event) => {
      const scrollTop = event.currentTarget.scrollTop;
      setShowFullHeader(scrollTop > 0);
      dataSpaceViewerState.layoutState.setTopScrollerVisible(scrollTop > 0);
    };

    const scrollToTop = (): void => {
      if (dataSpaceViewerState.layoutState.frame) {
        dataSpaceViewerState.layoutState.frame.scrollTop = 0;
      }
    };

    const isShowingWiki = [
      DATA_SPACE_VIEWER_ACTIVITY_MODE.DESCRIPTION,
      DATA_SPACE_VIEWER_ACTIVITY_MODE.DIAGRAM_VIEWER,
      DATA_SPACE_VIEWER_ACTIVITY_MODE.MODELS_DOCUMENTATION,
      DATA_SPACE_VIEWER_ACTIVITY_MODE.QUICK_START,
      DATA_SPACE_VIEWER_ACTIVITY_MODE.DATA_ACCESS,
    ].includes(dataSpaceViewerState.currentActivity);

    useEffect(() => {
      if (frame.current) {
        dataSpaceViewerState.layoutState.setFrame(frame.current);
      }
    }, [dataSpaceViewerState]);

    return (
      <div className="data-space__viewer">
        <DataSpaceViewerActivityBar
          dataSpaceViewerState={dataSpaceViewerState}
        />
        <div
          ref={frame}
          className="data-space__viewer__body"
          onScroll={onScroll}
        >
          <DataSpaceHeader
            dataSpaceViewerState={dataSpaceViewerState}
            showFullHeader={showFullHeader}
          />
          {dataSpaceViewerState.layoutState.isTopScrollerVisible && (
            <button
              className="data-space__viewer__scroller btn--dark"
              tabIndex={-1}
              title="Scroll to top"
              disabled={!dataSpaceViewerState.layoutState.frame}
              onClick={scrollToTop}
            >
              <CaretUpIcon />
            </button>
          )}
          <div
            className={clsx('data-space__viewer__frame', {
              'data-space__viewer__frame--boundless': isShowingWiki,
              'data-space__viewer__frame--expanded':
                dataSpaceViewerState.layoutState.isExpandedModeEnabled,
            })}
          >
            <div className="data-space__viewer__content">
              {isShowingWiki && (
                <DataSpaceWiki dataSpaceViewerState={dataSpaceViewerState} />
              )}
              {dataSpaceViewerState.currentActivity ===
                DATA_SPACE_VIEWER_ACTIVITY_MODE.EXECUTION_CONTEXT && (
                <DataSpaceExecutionContextViewer
                  dataSpaceViewerState={dataSpaceViewerState}
                />
              )}
              {dataSpaceViewerState.currentActivity ===
                DATA_SPACE_VIEWER_ACTIVITY_MODE.DATA_STORES && (
                <DataSpacePlaceholderPanel message="View all data stores (Work in Progress)" />
              )}
              {dataSpaceViewerState.currentActivity ===
                DATA_SPACE_VIEWER_ACTIVITY_MODE.DATA_AVAILABILITY && (
                <DataSpacePlaceholderPanel message="View data availability (Work in Progress)" />
              )}
              {dataSpaceViewerState.currentActivity ===
                DATA_SPACE_VIEWER_ACTIVITY_MODE.DATA_READINESS && (
                <DataSpacePlaceholderPanel message="View data readiness (Work in Progress)" />
              )}
              {dataSpaceViewerState.currentActivity ===
                DATA_SPACE_VIEWER_ACTIVITY_MODE.DATA_COST && (
                <DataSpacePlaceholderPanel message="View data cost (Work in Progress)" />
              )}
              {dataSpaceViewerState.currentActivity ===
                DATA_SPACE_VIEWER_ACTIVITY_MODE.DATA_GOVERNANCE && (
                <DataSpacePlaceholderPanel message="View data ownership and governance (Work in Progress)" />
              )}
              {dataSpaceViewerState.currentActivity ===
                DATA_SPACE_VIEWER_ACTIVITY_MODE.INFO && (
                <DataSpaceInfoPanel
                  dataSpaceViewerState={dataSpaceViewerState}
                />
              )}
              {dataSpaceViewerState.currentActivity ===
                DATA_SPACE_VIEWER_ACTIVITY_MODE.SUPPORT && (
                <DataSpaceSupportPanel
                  dataSpaceViewerState={dataSpaceViewerState}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  },
);
