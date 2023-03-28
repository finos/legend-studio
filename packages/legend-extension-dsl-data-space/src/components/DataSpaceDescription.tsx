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

import { MarkdownTextViewer } from '@finos/legend-art';
import type { DataSpaceViewerState } from '../stores/DataSpaceViewerState.js';
import { observer } from 'mobx-react-lite';
import { DataSpaceWikiPlaceholder } from './DataSpacePlaceholder.js';

export const DataSpaceDescription = observer(
  (props: { dataSpaceViewerState: DataSpaceViewerState }) => {
    const { dataSpaceViewerState } = props;
    const analysisResult = dataSpaceViewerState.dataSpaceAnalysisResult;

    return (
      <div className="data-space__viewer__wiki__section">
        <div className="data-space__viewer__wiki__section__header">
          Description
        </div>
        <div className="data-space__viewer__wiki__section__content">
          {analysisResult.description !== undefined && (
            <div className="data-space__viewer__description">
              <div className="data-space__viewer__description__content">
                <MarkdownTextViewer
                  className="data-space__viewer__description__content__markdown-content"
                  value={{
                    value: analysisResult.description,
                  }}
                  components={{
                    h1: 'h2',
                    h2: 'h3',
                    h3: 'h4',
                  }}
                />
              </div>
            </div>
          )}
          {analysisResult.description === undefined && (
            <DataSpaceWikiPlaceholder message="No description provided" />
          )}
        </div>
      </div>
    );
  },
);
