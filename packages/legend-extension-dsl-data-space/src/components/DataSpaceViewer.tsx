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
import { BlankPanelContent, clsx } from '@finos/legend-art';
import {
  type DataSpaceViewerState,
  DATA_SPACE_VIEWER_ACTIVITY_MODE,
} from '../stores/DataSpaceViewerState.js';
import { DataSpaceExecutionContextViewer } from './DataSpaceExecutionContextViewer.js';
import { DataSpaceInfoPanel } from './DataSpaceInfoPanel.js';
import { DataSpaceSupportPanel } from './DataSpaceSupportPanel.js';
import { DataSpaceWiki } from './DataSpaceWiki.js';
import { DataSpaceViewerActivityBar } from './DataSpaceViewerActivityBar.js';

const DataSpaceTitle = observer(
  (props: { dataSpaceViewerState: DataSpaceViewerState }) =>
    // const { dataSpaceViewerState } = props;

    null,
  /* <div className="data-space__viewer__header">
            <div className="data-space__viewer__title">
              <button
                className="data-space__viewer__title__btn"
                tabIndex={-1}
                title={`View Project (${generateGAVCoordinates(
                  dataSpaceViewerState.groupId,
                  dataSpaceViewerState.artifactId,
                  dataSpaceViewerState.versionId,
                )})`}
                onClick={viewProject}
              >
                <div
                  className="data-space__viewer__title__label"
                  title={`${analysisResult.title ?? analysisResult.name} - ${
                    analysisResult.path
                  }`}
                >
                  {analysisResult.title ?? analysisResult.name}
                </div>
                <div className="data-space__viewer__title__link">
                  <ExternalLinkSquareIcon />
                </div>
              </button>
            </div>
          </div> */
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
    const isShowingWiki = [
      DATA_SPACE_VIEWER_ACTIVITY_MODE.DESCRIPTION,
      DATA_SPACE_VIEWER_ACTIVITY_MODE.DIAGRAM_VIEWER,
      DATA_SPACE_VIEWER_ACTIVITY_MODE.MODELS_DOCUMENTATION,
      DATA_SPACE_VIEWER_ACTIVITY_MODE.QUICK_START,
      DATA_SPACE_VIEWER_ACTIVITY_MODE.DATA_ACCESS,
    ].includes(dataSpaceViewerState.currentActivity);

    return (
      <div className="data-space__viewer">
        <DataSpaceViewerActivityBar
          dataSpaceViewerState={dataSpaceViewerState}
        />
        <div className="data-space__viewer__body">
          <div
            className={clsx('data-space__viewer__frame', {
              'data-space__viewer__frame--boundless': isShowingWiki,
            })}
          >
            <DataSpaceTitle dataSpaceViewerState={dataSpaceViewerState} />
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
