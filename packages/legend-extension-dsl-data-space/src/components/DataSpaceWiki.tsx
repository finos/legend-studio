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

import type { DataSpaceViewerState } from '../stores/DataSpaceViewerState.js';
import { observer } from 'mobx-react-lite';
import { DataSpaceDiagramViewer } from './DataSpaceDiagramViewer.js';
import { DataSpaceModelsDocumentation } from './DataSpaceModelsDocumentation.js';
import { DataSpaceQuickStart } from './DataSpaceQuickStart.js';
import { DataSpaceDataAccess } from './DataSpaceDataAccess.js';
import { DataSpaceDescription } from './DataSpaceDescription.js';
import { useEffect } from 'react';

export const DataSpaceWiki = observer(
  (props: { dataSpaceViewerState: DataSpaceViewerState }) => {
    const { dataSpaceViewerState } = props;

    useEffect(() => {
      if (
        dataSpaceViewerState.layoutState.wikiNavigationCommand &&
        dataSpaceViewerState.layoutState.isAllWikiPageFullyRendered
      ) {
        dataSpaceViewerState.layoutState.navigateWikiAnchor();
      }
    }, [
      dataSpaceViewerState,
      dataSpaceViewerState.layoutState.wikiNavigationCommand,
      dataSpaceViewerState.layoutState.isAllWikiPageFullyRendered,
    ]);

    return (
      <div className="data-space__viewer__wiki">
        <DataSpaceDescription dataSpaceViewerState={dataSpaceViewerState} />
        <DataSpaceDiagramViewer dataSpaceViewerState={dataSpaceViewerState} />
        <DataSpaceModelsDocumentation
          dataSpaceViewerState={dataSpaceViewerState}
        />
        <DataSpaceQuickStart dataSpaceViewerState={dataSpaceViewerState} />
        <DataSpaceDataAccess dataSpaceViewerState={dataSpaceViewerState} />
      </div>
    );
  },
);
