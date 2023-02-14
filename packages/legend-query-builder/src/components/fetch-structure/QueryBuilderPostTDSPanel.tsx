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
  ResizablePanelGroup,
  ResizablePanel,
  ResizablePanelSplitter,
} from '@finos/legend-art';
import { QueryBuilderFilterPanel } from '../filter/QueryBuilderFilterPanel.js';
import { QueryBuilderTDSWindowPanel } from './QueryBuilderTDSWindowPanel.js';
import { QueryBuilderPostFilterPanel } from './QueryBuilderPostFilterPanel.js';
import type { QueryBuilderTDSState } from '../../stores/fetch-structure/tds/QueryBuilderTDSState.js';

export const QueryBuilderPostTDSPanel = observer(
  (props: { tdsState: QueryBuilderTDSState }) => {
    const { tdsState } = props;
    const showFilterPanel = tdsState.queryBuilderState.filterState.showPanel;
    const showWindowFuncPanel = tdsState.showWindowFuncPanel;
    const showPostFilterPanel = tdsState.showPostFilterPanel;
    if (!tdsState.TEMPORARY__showPostFetchStructurePanel) {
      return null;
    }
    return (
      <ResizablePanelGroup orientation="horizontal">
        {showFilterPanel && (
          <ResizablePanel minSize={40} direction={1}>
            <QueryBuilderFilterPanel
              queryBuilderState={tdsState.queryBuilderState}
            />
          </ResizablePanel>
        )}
        {showFilterPanel && (showWindowFuncPanel || showPostFilterPanel) && (
          <ResizablePanelSplitter />
        )}
        {showWindowFuncPanel && (
          <ResizablePanel minSize={40}>
            <QueryBuilderTDSWindowPanel tdsWindowState={tdsState.windowState} />
          </ResizablePanel>
        )}
        {showWindowFuncPanel && showPostFilterPanel && (
          <ResizablePanelSplitter />
        )}
        {showPostFilterPanel && (
          <ResizablePanel minSize={40}>
            <QueryBuilderPostFilterPanel
              queryBuilderState={tdsState.queryBuilderState}
            />
          </ResizablePanel>
        )}
      </ResizablePanelGroup>
    );
  },
);
