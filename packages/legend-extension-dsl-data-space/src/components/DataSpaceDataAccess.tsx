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
import { CollapsibleWikiSection } from '@finos/legend-extension-dsl-data-product';
import { type DataSpaceViewerState } from '../stores/DataSpaceViewerState.js';
import { useEffect, useRef } from 'react';
import {
  DATA_SPACE_VIEWER_ACTIVITY_MODE,
  generateAnchorForActivity,
} from '../stores/DataSpaceViewerNavigation.js';
import { DataAccessOverview } from '@finos/legend-query-builder';
import { DataSpaceWikiPlaceholder } from './DataSpacePlaceholder.js';
import { DataSpaceMappingProviderEntry } from './DataSpaceExecutionContextViewer.js';

export const DataSpaceDataAccess = observer(
  (props: { dataSpaceViewerState: DataSpaceViewerState }) => {
    const { dataSpaceViewerState } = props;
    const sectionRef = useRef<HTMLDivElement>(null);
    const anchor = generateAnchorForActivity(
      DATA_SPACE_VIEWER_ACTIVITY_MODE.DATA_ACCESS,
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

    if (!dataSpaceViewerState.isDataAccessAvailable) {
      return null;
    }

    return (
      <div ref={sectionRef} className="viewer__wiki__section">
        <CollapsibleWikiSection
          viewerState={dataSpaceViewerState}
          section={DATA_SPACE_VIEWER_ACTIVITY_MODE.DATA_ACCESS}
          showDocumentation={true}
        >
          <div className="viewer__wiki__section__content">
            <div className="data-space__viewer__data-access">
              {dataSpaceViewerState.currentExecutionContext?.mappingProvider ? (
                <div className="data-space__viewer__execution-context__entry data-space__viewer__execution-context__mapping">
                  <DataSpaceMappingProviderEntry
                    dataSpaceViewerState={dataSpaceViewerState}
                    currentExecutionContext={
                      dataSpaceViewerState.currentExecutionContext
                    }
                    mappingProviderAccessState={
                      dataSpaceViewerState.currentMappingProviderAccessState
                    }
                  />
                </div>
              ) : dataSpaceViewerState.currentDataAccessState ? (
                <DataAccessOverview
                  dataAccessState={dataSpaceViewerState.currentDataAccessState}
                />
              ) : (
                <DataSpaceWikiPlaceholder message="(not specified)" />
              )}
            </div>
          </div>
        </CollapsibleWikiSection>
      </div>
    );
  },
);
