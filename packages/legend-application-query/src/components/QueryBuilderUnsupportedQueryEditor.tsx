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
import { QueryTextEditorMode } from '../stores/QueryTextEditorState.js';
import {
  BlankPanelContent,
  ResizablePanelGroup,
  ResizablePanel,
  ResizablePanelSplitter,
} from '@finos/legend-art';
import { QueryBuilderSetupPanel } from './QueryBuilderSetupPanel.js';
import { QueryBuilderParameterPanel } from './QueryBuilderParameterPanel.js';

const QueryBuilderUnsupportedQueryExplorer = observer(() => (
  <div className="panel query-builder__explorer">
    <div className="panel__header">
      <div className="panel__header__title">
        <div className="panel__header__title__label">unsupported</div>
      </div>
    </div>
    <div className="panel__content">
      <BlankPanelContent>
        <div className="query-builder__unsupported-view__main">
          <div className="query-builder__unsupported-view__summary">{`Can't display query in form mode`}</div>
        </div>
      </BlankPanelContent>
    </div>
  </div>
));

const QueryBuilderUnsupportedQueryEditPanel = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const queryUnsupportedState = queryBuilderState.queryUnsupportedState;
    const lambdaError = queryUnsupportedState.lambdaError;
    const errorMessage = lambdaError?.message
      ? ` due to: ${lambdaError.message}`
      : '';
    const openLambdaModal = (): void =>
      queryBuilderState.textEditorState.openModal(QueryTextEditorMode.TEXT);
    return (
      <div className="panel">
        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label">unsupported</div>
          </div>
        </div>
        <div className="panel__content">
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
        </div>
      </div>
    );
  },
);

export const QueryBuilderUnsupportedQueryEditor = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;

    return (
      <ResizablePanelGroup orientation="vertical">
        <ResizablePanel size={450}>
          <ResizablePanelGroup orientation="horizontal">
            <ResizablePanel>
              <QueryBuilderSetupPanel queryBuilderState={queryBuilderState} />
              <QueryBuilderUnsupportedQueryExplorer />
            </ResizablePanel>
            <ResizablePanelSplitter />
            <ResizablePanel minSize={40} direction={-1}>
              <QueryBuilderParameterPanel
                queryBuilderState={queryBuilderState}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
        <ResizablePanelSplitter />
        <ResizablePanel>
          <QueryBuilderUnsupportedQueryEditPanel
            queryBuilderState={queryBuilderState}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    );
  },
);
