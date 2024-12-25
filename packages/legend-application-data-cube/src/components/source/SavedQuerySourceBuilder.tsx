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
import type { LegendQueryDataCubeSourceBuilderState } from '../../stores/source/LegendQueryDataCubeSourceBuilderState.js';
import { generateGAVCoordinates } from '@finos/legend-storage';

export const SavedQuerySourceEditor = observer(
  (props: { sourceBuilder: LegendQueryDataCubeSourceBuilderState }) => {
    const { sourceBuilder } = props;
    const query = sourceBuilder.query;

    return (
      <div>
        {query ? (
          <div className="p-3">
            <div className="text-l font-bold">Saved Query</div>
            <div>
              <div className="flex pt-px">
                <div className="font-bold">Name:</div>
                <div>{query.name}</div>
              </div>
              <div className="flex pt-px">
                <div className="font-bold">Project:</div>
                <div>
                  {generateGAVCoordinates(
                    query.groupId,
                    query.artifactId,
                    query.versionId,
                  )}
                </div>
              </div>
              <div className="flex pt-px">
                <div className="font-bold">Owner:</div>
                <div>{query.owner}</div>
              </div>
            </div>
          </div>
        ) : (
          // TODO: we could customize this loader to have a different styling
          <QueryLoader
            queryLoaderState={sourceBuilder.queryLoaderState}
            loadActionLabel={'Open'}
          />
        )}
      </div>
    );
  },
);
