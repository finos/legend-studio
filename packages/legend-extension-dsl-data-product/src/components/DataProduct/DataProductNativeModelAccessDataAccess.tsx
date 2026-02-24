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
import { useRef, useEffect } from 'react';
import { AnchorLinkIcon } from '@finos/legend-art';
import type { DataProductViewerState } from '../../stores/DataProduct/DataProductViewerState.js';
import { generateAnchorForSection } from '../../stores/ProductViewerNavigation.js';
import { DataAccessOverview } from '@finos/legend-query-builder';

export const DataProductNativeModelAccessDataAccess = observer(
  (props: { dataProductViewerState: DataProductViewerState }) => {
    const { dataProductViewerState } = props;
    const sectionRef = useRef<HTMLDivElement>(null);
    const anchor = generateAnchorForSection('NATIVE_MODEL_ACCESS_DATA_ACCESS');

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

    const dataAccessState =
      dataProductViewerState.nativeModelAccessDataAccessState;

    if (!dataAccessState) {
      return null;
    }

    return (
      <div ref={sectionRef} className="data-product__viewer__wiki__section">
        <div className="data-product__viewer__wiki__section__header">
          <div className="data-product__viewer__wiki__section__header__label">
            Native Model Access Data Access
            <button
              className="data-product__viewer__wiki__section__header__anchor"
              tabIndex={-1}
              onClick={() => dataProductViewerState.changeZone(anchor, true)}
            >
              <AnchorLinkIcon />
            </button>
          </div>
        </div>
        <div className="data-product__viewer__wiki__section__content">
          <div className="data-product__viewer__data-access">
            <DataAccessOverview dataAccessState={dataAccessState} />
          </div>
        </div>
      </div>
    );
  },
);
