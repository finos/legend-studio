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
  CaretDownIcon,
  CaretUpIcon,
  ControlledDropdownMenu,
  MenuContent,
  MenuContentDivider,
  MenuContentItem,
  MoreVerticalIcon,
  PlayIcon,
  VerifiedIcon,
  SparkleStarsIcon,
  clsx,
} from '@finos/legend-art';
import { type DataSpaceViewerState } from '../stores/DataSpaceViewerState.js';
import { DataSpaceExecutionContextViewer } from './DataSpaceExecutionContextViewer.js';
import { DataSpaceInfoPanel } from './DataSpaceInfoPanel.js';
import { DataSpaceSupportPanel } from './DataSpaceSupportPanel.js';
import { DataSpaceWiki } from './DataSpaceWiki.js';
import { DataSpaceViewerActivityBar } from './DataSpaceViewerActivityBar.js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { DATA_SPACE_WIKI_PAGE_SECTIONS } from '../stores/DataSpaceLayoutState.js';
import {
  DATA_SPACE_VIEWER_ACTIVITY_MODE,
  generateAnchorForActivity,
} from '../stores/DataSpaceViewerNavigation.js';
import { DataSpacePlaceholderPanel } from './DataSpacePlaceholder.js';
import { useApplicationStore } from '@finos/legend-application';
import { DataSpaceLegendAIIntegration } from './DataSpaceLegendAIIntegration.js';
import { DSL_DATASPACE_EVENT } from '../__lib__/DSL_DataSpace_Event.js';

const DataSpaceHeader = observer(
  (props: {
    dataSpaceViewerState: DataSpaceViewerState;
    showFullHeader: boolean;
  }) => {
    const { dataSpaceViewerState, showFullHeader } = props;
    const applicationStore = useApplicationStore();
    const headerRef = useRef<HTMLDivElement>(null);
    const analysisResult = dataSpaceViewerState.dataSpaceAnalysisResult;

    useEffect(() => {
      if (headerRef.current) {
        dataSpaceViewerState.layoutState.header = headerRef.current;
      }
    }, [dataSpaceViewerState]);

    return (
      <div
        ref={headerRef}
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
              <div
                className="data-space__viewer__header__title__verified-badge"
                title="Verified Data Product"
              >
                <VerifiedIcon />
              </div>
            )}
          </div>
          <div className="data-space__viewer__header__actions">
            <ControlledDropdownMenu
              className="data-space__viewer__header__execution-context-selector"
              menuProps={{
                anchorOrigin: { vertical: 'bottom', horizontal: 'center' },
                transformOrigin: { vertical: 'top', horizontal: 'center' },
                elevation: 7,
              }}
              title={`Current Execution Context: ${dataSpaceViewerState.currentExecutionContext.name}\nClick to switch`}
              content={
                <MenuContent>
                  {Array.from(
                    dataSpaceViewerState.dataSpaceAnalysisResult.executionContextsIndex.values(),
                  ).map((context) => (
                    <MenuContentItem
                      key={context.name}
                      className={clsx(
                        'data-space__viewer__header__execution-context-selector__option',
                        {
                          'data-space__viewer__header__execution-context-selector__option--active':
                            context ===
                            dataSpaceViewerState.currentExecutionContext,
                        },
                      )}
                      onClick={() =>
                        dataSpaceViewerState.setCurrentExecutionContext(context)
                      }
                    >
                      {context.name}
                    </MenuContentItem>
                  ))}
                </MenuContent>
              }
            >
              <div className="data-space__viewer__header__execution-context-selector__trigger">
                <div className="data-space__viewer__header__execution-context-selector__trigger__icon">
                  <PlayIcon />
                </div>
                <div className="data-space__viewer__header__execution-context-selector__trigger__label">
                  {dataSpaceViewerState.currentExecutionContext.name}
                </div>
                <div className="data-space__viewer__header__execution-context-selector__trigger__dropdown-icon">
                  <CaretDownIcon />
                </div>
              </div>
            </ControlledDropdownMenu>
            <ControlledDropdownMenu
              className="data-space__viewer__header__actions-selector"
              menuProps={{
                anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
                transformOrigin: { vertical: 'top', horizontal: 'right' },
                elevation: 7,
              }}
              title="More Actions..."
              content={
                <MenuContent>
                  <MenuContentItem
                    onClick={() =>
                      dataSpaceViewerState.queryDataSpace(
                        dataSpaceViewerState.currentExecutionContext.name,
                      )
                    }
                  >
                    Query Data Product
                  </MenuContentItem>
                  <MenuContentDivider />
                  <MenuContentItem
                    onClick={() =>
                      dataSpaceViewerState.viewProject(analysisResult.path)
                    }
                  >
                    View Project
                  </MenuContentItem>
                  <MenuContentItem
                    onClick={() => {
                      dataSpaceViewerState
                        .viewSDLCProject(analysisResult.path)
                        .catch(applicationStore.alertUnhandledError);
                    }}
                  >
                    View SDLC Project
                  </MenuContentItem>
                  <MenuContentDivider />
                  <MenuContentItem
                    onClick={() => {
                      const documentationUrl =
                        analysisResult.supportInfo?.documentationUrl;
                      if (documentationUrl) {
                        applicationStore.navigationService.navigator.visitAddress(
                          documentationUrl,
                        );
                      }
                    }}
                  >
                    Read Documentation
                  </MenuContentItem>
                  <MenuContentItem
                    onClick={() =>
                      dataSpaceViewerState.changeZone(
                        generateAnchorForActivity(
                          DATA_SPACE_VIEWER_ACTIVITY_MODE.SUPPORT,
                        ),
                      )
                    }
                  >
                    Get Help
                  </MenuContentItem>
                </MenuContent>
              }
            >
              <MoreVerticalIcon />
            </ControlledDropdownMenu>
          </div>
        </div>
      </div>
    );
  },
);

export const DataSpaceViewer = observer(
  (props: { dataSpaceViewerState: DataSpaceViewerState }) => {
    const { dataSpaceViewerState } = props;
    const frame = useRef<HTMLDivElement>(null);
    const [showFullHeader, setShowFullHeader] = useState(false);
    const [scrollPercentage, setScrollPercentage] = useState(0);
    const [isAIChatOpen, setIsAIChatOpen] = useState(false);
    const [panelWidth, setPanelWidth] = useState(500);
    const isResizing = useRef(false);

    const handleOpenAIChat = useCallback((): void => {
      setIsAIChatOpen(true);
      dataSpaceViewerState.applicationStore.telemetryService.logEvent(
        DSL_DATASPACE_EVENT.LEGEND_AI_ASSISTANT_OPENED,
        {
          context: 'data-space',
          data_product: dataSpaceViewerState.dataSpaceAnalysisResult.path,
        },
      );
    }, [dataSpaceViewerState]);

    const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
      e.preventDefault();
      isResizing.current = true;
      const onMouseMove = (ev: MouseEvent): void => {
        if (!isResizing.current) {
          return;
        }
        const newWidth = window.innerWidth - ev.clientX;
        setPanelWidth(
          Math.max(320, Math.min(newWidth, window.innerWidth * 0.6)),
        );
      };
      const onMouseUp = (): void => {
        isResizing.current = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    }, []);

    const onScroll: React.UIEventHandler<HTMLDivElement> = (event) => {
      const scrollTop = event.currentTarget.scrollTop;
      setShowFullHeader(scrollTop > 0);
      dataSpaceViewerState.layoutState.setTopScrollerVisible(scrollTop > 0);
      setScrollPercentage(
        event.currentTarget.scrollHeight <= 0
          ? 100
          : Math.round(
              ((event.currentTarget.scrollTop +
                event.currentTarget.clientHeight) /
                event.currentTarget.scrollHeight) *
                100,
            ),
      );
    };

    const scrollToTop = (): void => {
      if (dataSpaceViewerState.layoutState.frame) {
        dataSpaceViewerState.layoutState.frame.scrollTo({
          top: 0,
          behavior: 'smooth',
        });
      }
    };

    const isShowingWiki = DATA_SPACE_WIKI_PAGE_SECTIONS.includes(
      dataSpaceViewerState.currentActivity,
    );

    const isAIEnabled =
      dataSpaceViewerState.legendAIConfig.enabled && isShowingWiki;

    const dsTitle =
      dataSpaceViewerState.dataSpaceAnalysisResult.title ??
      dataSpaceViewerState.dataSpaceAnalysisResult.name;

    useEffect(() => {
      if (frame.current) {
        dataSpaceViewerState.layoutState.setFrame(frame.current);
      }
    }, [dataSpaceViewerState]);

    return (
      <div
        className={clsx('data-space__viewer', {
          'data-space__viewer--chat-open': isAIChatOpen,
        })}
        style={
          isAIChatOpen
            ? ({ '--ai-panel-width': `${panelWidth}px` } as React.CSSProperties)
            : undefined
        }
      >
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
            <div className="data-space__viewer__scroller">
              <button
                className="data-space__viewer__scroller__btn btn--dark"
                tabIndex={-1}
                title="Scroll to top"
                disabled={!dataSpaceViewerState.layoutState.frame}
                onClick={scrollToTop}
              >
                <CaretUpIcon />
              </button>
              <div className="data-space__viewer__scroller__percentage">
                {scrollPercentage}%
              </div>
            </div>
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
                <DataSpacePlaceholderPanel
                  header="Data Stores"
                  message="This panel will provide details about the available datasets' schema and test data"
                />
              )}
              {dataSpaceViewerState.currentActivity ===
                DATA_SPACE_VIEWER_ACTIVITY_MODE.DATA_AVAILABILITY && (
                <DataSpacePlaceholderPanel
                  header="Data Availability"
                  message="This panel will provide details about the status of data being made available to end-users and applications"
                />
              )}
              {dataSpaceViewerState.currentActivity ===
                DATA_SPACE_VIEWER_ACTIVITY_MODE.DATA_READINESS && (
                <DataSpacePlaceholderPanel
                  header="Data Readiness"
                  message="This will provide details about the status of data being prepared to collect, process, and analyze"
                />
              )}
              {dataSpaceViewerState.currentActivity ===
                DATA_SPACE_VIEWER_ACTIVITY_MODE.DATA_COST && (
                <DataSpacePlaceholderPanel
                  header="Data Cost"
                  message="This will provide details about the cost of data usage"
                />
              )}
              {dataSpaceViewerState.currentActivity ===
                DATA_SPACE_VIEWER_ACTIVITY_MODE.DATA_GOVERNANCE && (
                <DataSpacePlaceholderPanel
                  header="Data Governance"
                  message="This will provide details about data policy, data contract, and dataset lineage information"
                />
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
        {isAIEnabled && (
          <>
            <div
              className="data-space__viewer__ai-panel"
              style={{
                width: panelWidth,
                display: isAIChatOpen ? undefined : 'none',
              }}
            >
              <button
                type="button"
                className="data-space__viewer__ai-panel__resize-handle"
                aria-label="Resize AI panel"
                onMouseDown={handleResizeMouseDown}
                onKeyDown={(e): void => {
                  const step = 20;
                  if (e.key === 'ArrowLeft') {
                    setPanelWidth((w) =>
                      Math.min(w + step, window.innerWidth * 0.6),
                    );
                  } else if (e.key === 'ArrowRight') {
                    setPanelWidth((w) => Math.max(w - step, 320));
                  }
                }}
              />
              <DataSpaceLegendAIIntegration
                dataSpaceViewerState={dataSpaceViewerState}
                config={dataSpaceViewerState.legendAIConfig}
                onClose={(): void => setIsAIChatOpen(false)}
                onMinimize={(): void => setIsAIChatOpen(false)}
              />
            </div>
            {!isAIChatOpen && (
              <button
                className="legend-ai-chat-toggle"
                onClick={handleOpenAIChat}
                title={`Ask ${dsTitle}`}
              >
                <span className="legend-ai-chat-toggle__icon">
                  <SparkleStarsIcon />
                </span>
                <span className="legend-ai-chat-toggle__label">
                  Ask {dsTitle}
                </span>
              </button>
            )}
          </>
        )}
      </div>
    );
  },
);
