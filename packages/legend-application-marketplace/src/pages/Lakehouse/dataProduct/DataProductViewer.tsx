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
import { CaretUpIcon, clsx, OpenIcon, VerifiedIcon } from '@finos/legend-art';
import { useApplicationStore } from '@finos/legend-application';
import { DataProductWiki } from './DataProductWiki.js';
import { Button } from '@mui/material';
import { isSnapshotVersion } from '@finos/legend-server-depot';
import {
  V1_AdHocDeploymentDataProductOrigin,
  V1_EntitlementsLakehouseEnvironmentType,
  V1_SdlcDeploymentDataProductOrigin,
} from '@finos/legend-graph';

const DataProductHeader = observer(
  (props: {
    dataProductViewerState: DataProductViewerState;
    showFullHeader: boolean;
  }) => {
    const { dataProductViewerState, showFullHeader } = props;
    const applicationStore = useApplicationStore();
    const headerRef = useRef<HTMLDivElement>(null);
    const dataProduct = dataProductViewerState.product;
    const environmentClassification =
      dataProductViewerState.entitlementsDataProductDetails.lakehouseEnvironment
        ?.type;
    const origin = dataProductViewerState.entitlementsDataProductDetails.origin;

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
            title={`${dataProduct.name} - ${dataProduct.path}`}
          >
            <div className="data-space__viewer__header__title__label">
              {dataProduct.title ? dataProduct.title : dataProduct.name}
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
            {origin instanceof V1_AdHocDeploymentDataProductOrigin && (
              <Button
                className={clsx('data-space__viewer__header__type__sandbox', {
                  'data-space__viewer__header__type__sandbox--dev':
                    environmentClassification ===
                    V1_EntitlementsLakehouseEnvironmentType.DEVELOPMENT,
                  'data-space__viewer__header__type__sandbox--prod-parallel':
                    environmentClassification ===
                    V1_EntitlementsLakehouseEnvironmentType.PRODUCTION_PARALLEL,
                  'data-space__viewer__header__type__sandbox--prod':
                    environmentClassification ===
                    V1_EntitlementsLakehouseEnvironmentType.PRODUCTION,
                })}
              >
                {environmentClassification
                  ? `${environmentClassification} `
                  : ''}
                Sandbox Data Product
              </Button>
            )}
            {origin instanceof V1_SdlcDeploymentDataProductOrigin && (
              <Button
                onClick={() => {
                  dataProductViewerState
                    .viewDataProductSource()
                    ?.catch(applicationStore.alertUnhandledError);
                }}
                title="View SDLC Project"
                className={clsx('data-space__viewer__header__type__version', {
                  'data-space__viewer__header__type__version--snapshot':
                    isSnapshotVersion(origin.version),
                  'data-space__viewer__header__type__version--release':
                    !isSnapshotVersion(origin.version),
                })}
              >
                Version: {origin.version}
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

    useEffect(() => {
      if (frame.current) {
        dataSpaceViewerState.layoutState.setFrame(frame.current);
      }
    }, [dataSpaceViewerState]);

    return (
      <div className="data-space__viewer">
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
            className={clsx(
              'data-space__viewer__frame data-space__viewer__frame--boundless',
              {
                'data-space__viewer__frame--expanded':
                  dataSpaceViewerState.layoutState.isExpandedModeEnabled,
              },
            )}
          >
            <div className="data-space__viewer__content">
              <DataProductWiki dataProductViewerState={dataSpaceViewerState} />
            </div>
          </div>
        </div>
      </div>
    );
  },
);
