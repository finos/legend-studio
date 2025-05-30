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
import { useEffect, useRef } from 'react';
import type { DataProductViewerState } from '../../../stores/lakehouse/DataProductViewerState.js';
import {
  DATA_PRODUCT_VIEWER_ACTIVITY_MODE,
  generateAnchorForActivity,
} from '../../../stores/lakehouse/DataProductViewerNavigation.js';
import { AnchorLinkIcon } from '@finos/legend-art';
import { prettyCONSTName } from '@finos/legend-shared';
import { DataProducteDataAccess } from './DataProductDataAccess.js';

export const DataproducteWikiPlaceholder: React.FC<{ message: string }> = (
  props,
) => (
  <div className="data-space__viewer__wiki__placeholder">{props.message}</div>
);

export const DataProductWikiPlaceHolder = observer(
  (props: {
    dataProductViewerState: DataProductViewerState;
    mode: DATA_PRODUCT_VIEWER_ACTIVITY_MODE;
  }) => {
    const { dataProductViewerState, mode } = props;
    const sectionRef = useRef<HTMLDivElement>(null);
    const anchor = generateAnchorForActivity(mode);
    useEffect(() => {
      if (sectionRef.current) {
        dataProductViewerState.layoutState.setWikiPageAnchor(
          anchor,
          sectionRef.current,
        );
      }
      return () =>
        dataProductViewerState.layoutState.unsetWikiPageAnchor(anchor);
    }, [dataProductViewerState, anchor]);

    return (
      <div ref={sectionRef} className="data-space__viewer__wiki__section">
        <div className="data-space__viewer__wiki__section__header">
          <div className="data-space__viewer__wiki__section__header__label">
            {prettyCONSTName(mode)}
            <button
              className="data-space__viewer__wiki__section__header__anchor"
              tabIndex={-1}
              onClick={() => dataProductViewerState.changeZone(anchor, true)}
            >
              <AnchorLinkIcon />
            </button>
          </div>
        </div>
        <div className="data-space__viewer__wiki__section__content">
          <DataproducteWikiPlaceholder message="(not specified)" />
        </div>
      </div>
    );
  },
);

export const DataProductWiki = observer(
  (props: { dataProductViewerState: DataProductViewerState }) => {
    const { dataProductViewerState } = props;

    useEffect(() => {
      if (
        dataProductViewerState.layoutState.wikiPageNavigationCommand &&
        dataProductViewerState.layoutState.isWikiPageFullyRendered
      ) {
        dataProductViewerState.layoutState.navigateWikiPageAnchor();
      }
    }, [
      dataProductViewerState,
      dataProductViewerState.layoutState.wikiPageNavigationCommand,
      dataProductViewerState.layoutState.isWikiPageFullyRendered,
    ]);

    useEffect(() => {
      if (dataProductViewerState.layoutState.isWikiPageFullyRendered) {
        dataProductViewerState.layoutState.registerWikiPageScrollObserver();
      }
      return () =>
        dataProductViewerState.layoutState.unregisterWikiPageScrollObserver();
    }, [
      dataProductViewerState,
      dataProductViewerState.layoutState.isWikiPageFullyRendered,
    ]);

    return (
      <div className="data-space__viewer__wiki">
        <DataProductWikiPlaceHolder
          mode={DATA_PRODUCT_VIEWER_ACTIVITY_MODE.DESCRIPTION}
          dataProductViewerState={dataProductViewerState}
        />
        <DataProducteDataAccess
          dataProductViewerState={dataProductViewerState}
        />
      </div>
    );
  },
);
