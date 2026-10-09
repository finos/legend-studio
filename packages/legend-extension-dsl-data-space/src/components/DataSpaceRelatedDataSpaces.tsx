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
import { CollapsibleWikiSection } from '@finos/legend-extension-dsl-data-product';
import { type DataSpaceViewerState } from '../stores/DataSpaceViewerState.js';
import { useEffect, useRef } from 'react';
import { flowResult } from 'mobx';
import { Tooltip } from '@mui/material';
import {
  type DataSpaceWikiRelatedDataSpace,
  DATA_SPACE_VIEWER_ACTIVITY_MODE,
  generateAnchorForActivity,
  generateRelatedDataSpaceRedirectPath,
} from '../stores/DataSpaceViewerNavigation.js';
import { DataSpaceWikiPlaceholder } from './DataSpacePlaceholder.js';

const RelatedDataSpaceButton = observer(
  (props: {
    dataSpaceViewerState: DataSpaceViewerState;
    relatedDataSpace: DataSpaceWikiRelatedDataSpace;
  }) => {
    const { dataSpaceViewerState, relatedDataSpace } = props;
    const redirectPath = generateRelatedDataSpaceRedirectPath(relatedDataSpace);
    const isInvalid = relatedDataSpace.isInvalid ?? false;

    const relatedDataspaceButton = (
      <button
        type="button"
        className="data-space__viewer__wiki__related-data-spaces__item"
        disabled={isInvalid || !dataSpaceViewerState.viewDataSpace}
        onClick={() => dataSpaceViewerState.viewDataSpace?.(redirectPath)}
      >
        <span className="data-space__viewer__wiki__related-data-spaces__item__label">
          {relatedDataSpace.name}
        </span>
      </button>
    );

    if (isInvalid) {
      return (
        <Tooltip
          title="Data Space path of related Data Space is invalid"
          placement="bottom"
        >
          <span>{relatedDataspaceButton}</span>
        </Tooltip>
      );
    }
    return relatedDataspaceButton;
  },
);

export const RelatedDataSpaces = observer(
  (props: { dataSpaceViewerState: DataSpaceViewerState }) => {
    const { dataSpaceViewerState } = props;
    const sectionRef = useRef<HTMLDivElement>(null);
    const anchor = generateAnchorForActivity(
      DATA_SPACE_VIEWER_ACTIVITY_MODE.RELATED_DATA_SPACES,
    );
    const relatedDataSpaces = dataSpaceViewerState.relatedDataSpaces;
    const hasResolved =
      dataSpaceViewerState.fetchRelatedDataSpaceTitlesState.hasCompleted;

    useEffect(() => {
      if (sectionRef.current) {
        dataSpaceViewerState.layoutState.setWikiPageAnchor(
          anchor,
          sectionRef.current,
        );
      }
      return () => dataSpaceViewerState.layoutState.unsetWikiPageAnchor(anchor);
    }, [dataSpaceViewerState, anchor]);

    useEffect(() => {
      if (!dataSpaceViewerState.fetchRelatedDataSpaceTitlesState.hasCompleted) {
        flowResult(dataSpaceViewerState.fetchRelatedDataSpaceTitles()).catch(
          dataSpaceViewerState.applicationStore.alertUnhandledError,
        );
      }
    }, [dataSpaceViewerState]);

    return (
      <div ref={sectionRef} className="viewer__wiki__section">
        <CollapsibleWikiSection
          viewerState={dataSpaceViewerState}
          section={DATA_SPACE_VIEWER_ACTIVITY_MODE.RELATED_DATA_SPACES}
        >
          <div className="viewer__wiki__section__content">
            {relatedDataSpaces.length > 0 ? (
              <div className="data-space__viewer__wiki__related-data-spaces">
                {relatedDataSpaces.map((relatedDataSpace) => (
                  <RelatedDataSpaceButton
                    key={relatedDataSpace.path}
                    dataSpaceViewerState={dataSpaceViewerState}
                    relatedDataSpace={relatedDataSpace}
                  />
                ))}
              </div>
            ) : (
              hasResolved && (
                <DataSpaceWikiPlaceholder message="(not specified)" />
              )
            )}
          </div>
        </CollapsibleWikiSection>
      </div>
    );
  },
);
