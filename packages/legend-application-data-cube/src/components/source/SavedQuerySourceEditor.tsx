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
import { QueryLoader } from '@finos/legend-query-builder';
import type { SavedQueryInputSourceState } from '../../stores/source/SavedQueryInputSourceState.js';
import { generateGAVCoordinates } from '@finos/legend-storage';

export const SavedQuerySourceEditor = observer(
  (props: { savedQueryInputSourceState: SavedQueryInputSourceState }) => {
    const { savedQueryInputSourceState } = props;
    const savedQuery = savedQueryInputSourceState.query;

    return (
      <div>
        {savedQuery ? (
          <div className="p-3">
            <div className="text-l font-bold">Saved Query</div>
            <div>
              <div className="flex pt-px">
                <div className="font-bold">Name:</div>
                <div>{savedQuery.name}</div>
              </div>
              <div className="flex pt-px">
                <div className="font-bold">Project:</div>
                <div>
                  {generateGAVCoordinates(
                    savedQuery.groupId,
                    savedQuery.artifactId,
                    savedQuery.versionId,
                  )}
                </div>
              </div>
              <div className="flex pt-px">
                <div className="font-bold">Owner:</div>
                <div>{savedQuery.owner}</div>
              </div>
            </div>
          </div>
        ) : (
          <QueryLoader
            queryLoaderState={savedQueryInputSourceState.queryLoaderState}
            loadActionLabel={'Open'}
          />
        )}
      </div>
    );
  },
);
