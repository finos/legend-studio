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
import type { DataProductViewerState } from '../../../stores/lakehouse/DataProductViewerState.js';
import { useEffect, useRef, useState } from 'react';
import { DATA_PRODUCT_WIKI_PAGE_SECTIONS } from '../../../stores/lakehouse/DataProductLayoutState.js';
import { CaretUpIcon, clsx, OpenIcon, VerifiedIcon } from '@finos/legend-art';
import { DATA_PRODUCT_VIEWER_ACTIVITY_MODE } from '../../../stores/lakehouse/DataProductViewerNavigation.js';
import { DataProductPlaceholderPanel } from './DataProductHolder.js';
import { DataProductViewerActivityBar } from './DataProductViewerActivityBar.js';
import { useApplicationStore } from '@finos/legend-application';
import { DataProductWiki } from './DataProductWiki.js';
import { Button } from '@mui/material';
import { isSnapshotVersion } from '@finos/legend-server-depot';

const DataProductHeader = observer(
  (props: {
    dataProductViewerState: DataProductViewerState;
    showFullHeader: boolean;
  }) => {
    const { dataProductViewerState, showFullHeader } = props;
    const applicationStore = useApplicationStore();
    const headerRef = useRef<HTMLDivElement>(null);
    const dataProudct = dataProductViewerState.product;
    useEffect(() => {
      if (headerRef.current) {
        dataProductViewerState.layoutState.header = headerRef.current;
      }
    }, [dataProductViewerState]);

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
              dataProductViewerState.layoutState.isExpandedModeEnabled,
          })}
        >
          <div
            className="data-space__viewer__header__title"
            title={`${dataProudct.name} - ${dataProudct.path}`}
          >
            <div className="data-space__viewer__header__title__label">
              {dataProudct.title ? dataProudct.title : dataProudct.name}
            </div>
            {dataProductViewerState.isVerified && (
              <div
                className="data-space__viewer__header__title__verified-badge"
                title="Verified Data Product"
              >
                <VerifiedIcon />
              </div>
            )}
          </div>
          <div className="data-space__viewer__header__type">
            {dataProductViewerState.isSandboxProduct ? (
              <Button
                onClick={() => {
                  dataProductViewerState.viewIngestEnvironment?.();
                }}
                title="View Ingest Environment"
                className="data-space__viewer__header__type__sandbox"
              >
                Sandbox Data Product
                <OpenIcon />
              </Button>
            ) : (
              <Button
                onClick={() => {
                  dataProductViewerState
                    .viewSDLCProject(dataProudct.path)
                    .catch(applicationStore.alertUnhandledError);
                }}
                title="View SDLC Project"
                className={clsx('data-space__viewer__header__type__version', {
                  'data-space__viewer__header__type__version--snapshot':
                    isSnapshotVersion(dataProductViewerState.project.versionId),
                  'data-space__viewer__header__type__version--release':
                    !isSnapshotVersion(
                      dataProductViewerState.project.versionId,
                    ),
                })}
              >
                Version: {dataProductViewerState.project.versionId}
                <OpenIcon />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  },
);

export const DataProductViewer = observer(
  (props: { dataSpaceViewerState: DataProductViewerState }) => {
    const { dataSpaceViewerState } = props;
    const frame = useRef<HTMLDivElement>(null);
    const [showFullHeader, setShowFullHeader] = useState(false);
    const [scrollPercentage, setScrollPercentage] = useState(0);

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

    const isShowingWiki = DATA_PRODUCT_WIKI_PAGE_SECTIONS.includes(
      dataSpaceViewerState.currentActivity,
    );

    useEffect(() => {
      if (frame.current) {
        dataSpaceViewerState.layoutState.setFrame(frame.current);
      }
    }, [dataSpaceViewerState]);

    return (
      <div className="data-space__viewer">
        <DataProductViewerActivityBar
          dataSpaceViewerState={dataSpaceViewerState}
        />
        <div
          ref={frame}
          className="data-space__viewer__body"
          onScroll={onScroll}
        >
          <DataProductHeader
            dataProductViewerState={dataSpaceViewerState}
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
                <DataProductWiki
                  dataProductViewerState={dataSpaceViewerState}
                />
              )}
              {dataSpaceViewerState.currentActivity ===
                DATA_PRODUCT_VIEWER_ACTIVITY_MODE.EXECUTION_CONTEXT && (
                <DataProductPlaceholderPanel
                  header="EXECUTION_CONTEXT"
                  message="No EXECUTION_CONTEXT"
                />
              )}
              {dataSpaceViewerState.currentActivity ===
                DATA_PRODUCT_VIEWER_ACTIVITY_MODE.DATA_STORES && (
                <DataProductPlaceholderPanel
                  header="Data Stores"
                  message="This panel will provide details about the available datasets' schema and test data"
                />
              )}
              {dataSpaceViewerState.currentActivity ===
                DATA_PRODUCT_VIEWER_ACTIVITY_MODE.DATA_AVAILABILITY && (
                <DataProductPlaceholderPanel
                  header="Data Availability"
                  message="This panel will provide details about the status of data being made available to end-users and applications"
                />
              )}
              {dataSpaceViewerState.currentActivity ===
                DATA_PRODUCT_VIEWER_ACTIVITY_MODE.DATA_READINESS && (
                <DataProductPlaceholderPanel
                  header="Data Readiness"
                  message="This will provide details about the status of data being prepared to collect, process, and analyze"
                />
              )}
              {dataSpaceViewerState.currentActivity ===
                DATA_PRODUCT_VIEWER_ACTIVITY_MODE.DATA_COST && (
                <DataProductPlaceholderPanel
                  header="Data Cost"
                  message="This will provide details about the cost of data usage"
                />
              )}
              {dataSpaceViewerState.currentActivity ===
                DATA_PRODUCT_VIEWER_ACTIVITY_MODE.DATA_GOVERNANCE && (
                <DataProductPlaceholderPanel
                  header="Data Governance"
                  message="This will provide details about data policy, data contract, and dataset lineage information"
                />
              )}
              {dataSpaceViewerState.currentActivity ===
                DATA_PRODUCT_VIEWER_ACTIVITY_MODE.INFO && (
                <DataProductPlaceholderPanel
                  header="Info"
                  message="This will provide details about info"
                />
              )}
              {dataSpaceViewerState.currentActivity ===
                DATA_PRODUCT_VIEWER_ACTIVITY_MODE.SUPPORT && (
                <DataProductPlaceholderPanel
                  header="Support"
                  message="This will provide details about support"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  },
);
