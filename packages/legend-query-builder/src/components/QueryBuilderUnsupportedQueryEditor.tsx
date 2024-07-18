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
import type { QueryBuilderState } from '../stores/QueryBuilderState.js';
import { QueryBuilderTextEditorMode } from '../stores/QueryBuilderTextEditorState.js';
import {
  BlankPanelContent,
  ResizablePanelGroup,
  ResizablePanel,
  ResizablePanelSplitter,
  Panel,
  PanelContent,
  PanelHeader,
} from '@finos/legend-art';
import { QueryBuilderSidebar } from './QueryBuilderSideBar.js';
import { QueryBuilderParametersPanel } from './QueryBuilderParametersPanel.js';
import { QueryChat } from './QueryChat.js';

const QueryBuilderUnsupportedQueryViewer = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const queryUnsupportedState = queryBuilderState.unsupportedQueryState;
    const lambdaError = queryUnsupportedState.lambdaError;
    const errorMessage = lambdaError?.message
      ? ` due to: ${lambdaError.message}`
      : '';
    const openLambdaModal = (): void =>
      queryBuilderState.textEditorState.openModal(
        QueryBuilderTextEditorMode.TEXT,
      );
    return (
      <Panel>
        <PanelHeader title="content" />
        <PanelContent>
          <BlankPanelContent>
            <div className="query-builder__unsupported-view__main">
              <div className="query-builder__unsupported-view__summary">{`Can't display query in form mode${errorMessage}`}</div>
              <button
                className="btn--dark query-builder__unsupported-view__to-text-mode__btn"
                onClick={openLambdaModal}
              >
                Edit in text mode
              </button>
            </div>
          </BlankPanelContent>
        </PanelContent>
      </Panel>
    );
  },
);

export const QueryBuilderUnsupportedQueryEditor = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;

    return (
      <ResizablePanelGroup orientation="vertical">
        <ResizablePanel size={450}>
          <QueryBuilderSidebar queryBuilderState={queryBuilderState}>
            <QueryBuilderParametersPanel
              queryBuilderState={queryBuilderState}
            />
          </QueryBuilderSidebar>
        </ResizablePanel>
        <ResizablePanelSplitter />
        <ResizablePanel>
          <QueryBuilderUnsupportedQueryViewer
            queryBuilderState={queryBuilderState}
          />
        </ResizablePanel>
        {queryBuilderState.isQueryChatOpened && <ResizablePanelSplitter />}
        {queryBuilderState.isQueryChatOpened && (
          <ResizablePanel size={450}>
            <QueryChat queryBuilderState={queryBuilderState} />
          </ResizablePanel>
        )}
      </ResizablePanelGroup>
    );
  },
);
