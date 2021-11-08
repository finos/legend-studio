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
import type {
  RawDataSpace,
  TaxonomyViewerState,
} from '../../stores/studio/EnterpriseModelExplorerStore';
import { useEnterpriseModelExplorerStore } from './EnterpriseModelExplorerStoreProvider';
import { BlankPanelContent, clsx, SquareIcon } from '@finos/legend-art';
import {
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
} from '@finos/legend-art';

const TaxonomyViewerExplorer = observer(
  (props: { taxonomyViewerState: TaxonomyViewerState }) => {
    const { taxonomyViewerState } = props;
    const taxonomyNode = taxonomyViewerState.taxonomyNode;
    const selectDataSpace =
      (rawDataSpace: RawDataSpace): (() => void) =>
      (): void => {
        // do nothing
      };

    return (
      <div className="panel taxonomy-viewer__explorer">
        <div className="panel__header taxonomy-viewer__explorer__header">
          <div className="panel__header__title taxonomy-viewer__explorer__header__title">
            Dataspaces
          </div>
        </div>
        <div className="panel__content taxonomy-viewer__explorer__content">
          {taxonomyNode.rawDataSpaces.length === 0 && (
            <BlankPanelContent>No data space available</BlankPanelContent>
          )}
          {taxonomyNode.rawDataSpaces.length !== 0 &&
            taxonomyNode.rawDataSpaces.map((rawDataSpace) => (
              <button
                key={rawDataSpace.id}
                className={clsx('taxonomy-viewer__explorer__entry')}
                tabIndex={-1}
                onClick={selectDataSpace(rawDataSpace)}
                title={rawDataSpace.id}
              >
                <div className="taxonomy-viewer__explorer__entry__icon">
                  <SquareIcon />
                </div>
                <div className="taxonomy-viewer__explorer__entry__path">
                  {rawDataSpace.path}
                </div>
              </button>
            ))}
        </div>
      </div>
    );
  },
);

export const TaxonomyViewer = observer(
  (props: { taxonomyViewerState: TaxonomyViewerState }) => {
    const { taxonomyViewerState } = props;
    const enterpriseModelExplorerStore = useEnterpriseModelExplorerStore();

    return (
      <div className="taxonomy-viewer">
        <ResizablePanelGroup orientation="vertical">
          <ResizablePanel minSize={300}>
            <TaxonomyViewerExplorer taxonomyViewerState={taxonomyViewerState} />
          </ResizablePanel>
          <ResizablePanelSplitter />
          <ResizablePanel minSize={300}>
            <div>TODO</div>
            {/* {taxonomyViewerState.currentDataSpace ? (
              <TaxonomyViewer
                taxonomyNode={taxonomyViewerState.currentDataSpace}
              />
            ) : (
              <div />
            )} */}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    );
  },
);
