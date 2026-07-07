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
import { useEffect, useRef, useState } from 'react';
import { AnchorLinkIcon } from '@finos/legend-art';
import type { V1_DataProductArtifact } from '@finos/legend-graph';
import type { DataProductViewerState } from '../../stores/DataProduct/DataProductViewerState.js';
import type { DataProductDataAccessState } from '../../stores/DataProduct/DataProductDataAccessState.js';
import {
  DATA_PRODUCT_VIEWER_SECTION,
  generateAnchorForSection,
} from '../../stores/ProductViewerNavigation.js';
import {
  ApgIngestionDataSetsScreen,
  artifactHasDependencyDatasets,
} from './DataProductDataAccess.js';

export const DataProductProducerInfo = observer(
  (props: {
    dataProductViewerState: DataProductViewerState;
    dataProductDataAccessState: DataProductDataAccessState | undefined;
  }) => {
    const { dataProductViewerState, dataProductDataAccessState } = props;

    const [dataProductArtifact, setDataProductArtifact] = useState<
      V1_DataProductArtifact | undefined
    >(undefined);

    useEffect(() => {
      let cancelled = false;
      dataProductViewerState.dataProductArtifactPromise
        ?.then((artifact) => {
          if (!cancelled) {
            setDataProductArtifact(artifact);
          }
        })
        .catch(() => {
          // artifact is optional for this section; silently ignore
        });
      return () => {
        cancelled = true;
      };
    }, [dataProductViewerState.dataProductArtifactPromise]);

    const sectionRef = useRef<HTMLDivElement>(null);
    const anchor = generateAnchorForSection(
      DATA_PRODUCT_VIEWER_SECTION.PRODUCER_INFO,
    );

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

    // Only render the Producer Info section when the artifact declares at
    // least one dependency dataset; otherwise there is nothing meaningful to
    // show and we hide the section entirely (matching prior behavior).
    if (!artifactHasDependencyDatasets(dataProductArtifact)) {
      return null;
    }

    // Show the Owner badge when the current user appears in the data product's
    // owners list (fetched into DataProductDataAccessState.dataProductOwners).
    const currentUser =
      dataProductViewerState.applicationStore.identityService.currentUser;
    const isOwner = Boolean(
      currentUser &&
        dataProductDataAccessState?.dataProductOwners.includes(currentUser),
    );

    return (
      <div ref={sectionRef} className="data-product__viewer__wiki__section">
        <div className="data-product__viewer__wiki__section__header">
          <div className="data-product__viewer__wiki__section__header__label">
            Producer Info
            {isOwner && (
              <span
                className="data-product__viewer__producer-info__owner-badge"
                title="You are an owner of this data product"
              >
                Owner
              </span>
            )}
            <button
              className="data-product__viewer__wiki__section__header__anchor"
              tabIndex={-1}
              onClick={() => {
                dataProductViewerState.changeZone(anchor, true);
                dataProductViewerState.copyLinkToClipboard(anchor);
              }}
            >
              <AnchorLinkIcon />
            </button>
          </div>
        </div>
        <div className="data-product__viewer__wiki__section__content">
          <div className="data-product__viewer__producer-info">
            {dataProductViewerState.apgStates.map((apgState) => (
              <div
                key={apgState.apg.id}
                className="data-product__viewer__producer-info__group"
              >
                <div className="data-product__viewer__producer-info__group__header">
                  {apgState.apg.title ?? apgState.apg.id}
                </div>
                <ApgIngestionDataSetsScreen
                  apgState={apgState}
                  artifact={dataProductArtifact}
                  dataAccessState={dataProductDataAccessState}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  },
);
