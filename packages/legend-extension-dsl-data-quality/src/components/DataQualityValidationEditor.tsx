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
import {
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
} from '@finos/legend-art';
import { DataQualityTabs } from './DataQualityTabs.js';
import type { DataQualityState } from './states/DataQualityState.js';

export const DataQualityValidationEditor = observer(
  (props: {
    dataQualityState: DataQualityState;
    SideBarBasisComponent: React.ReactNode;
  }) => {
    const { SideBarBasisComponent, dataQualityState } = props;
    return (
      <div className="data-quality-validation">
        <div className="data-quality-validation__body">
          <div className="data-quality-validation__content">
            <div className="data-quality-validation__main">
              <ResizablePanelGroup orientation="vertical">
                <ResizablePanel size={300} minSize={120}>
                  {SideBarBasisComponent}
                </ResizablePanel>
                <ResizablePanelSplitter />
                <ResizablePanel minSize={120}>
                  <DataQualityTabs dataQualityState={dataQualityState} />
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
          </div>
        </div>
      </div>
    );
  },
);
