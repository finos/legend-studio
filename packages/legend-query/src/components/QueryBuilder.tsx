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
import { GlobalHotKeys } from 'react-hotkeys';
import {
  clsx,
  Backdrop,
  HammerIcon,
  ResizablePanelGroup,
  ResizablePanel,
  ResizablePanelSplitter,
  HackerIcon,
} from '@finos/legend-art';
import { QueryBuilderFilterPanel } from './QueryBuilderFilterPanel';
import { QueryBuilderExplorerPanel } from './QueryBuilderExplorerPanel';
import { QueryBuilderSetupPanel } from './QueryBuilderSetupPanel';
import { QueryBuilderResultPanel } from './QueryBuilderResultPanel';
import { QueryBuilderTextEditor } from './QueryBuilderTextEditor';
import type { QueryBuilderState } from '../stores/QueryBuilderState';
import { QueryTextEditorMode } from '../stores/QueryTextEditorState';
import { QueryBuilderFetchStructurePanel } from './QueryBuilderFetchStructurePanel';
import { QUERY_BUILDER_TEST_ID } from './QueryBuilder_TestID';
import { flowResult } from 'mobx';
import { QueryBuilderUnsupportedQueryEditor } from './QueryBuilderUnsupportedQueryEditor';
import { useApplicationStore } from '@finos/legend-application';
import { QueryBuilderParameterPanel } from './QueryBuilderParameterPanel';

enum QUERY_BUILDER_HOTKEY {
  COMPILE = 'COMPILE',
}

const QUERY_BUILDER_HOTKEY_MAP = Object.freeze({
  [QUERY_BUILDER_HOTKEY.COMPILE]: 'f9',
});

const QueryBuilderStatusBar = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const applicationStore = useApplicationStore();
    const openLambdaEditor = (mode: QueryTextEditorMode): void =>
      queryBuilderState.queryTextEditorState.openModal(mode);
    const compile = applicationStore.guardUnhandledError(() =>
      flowResult(queryBuilderState.compileQuery()),
    );

    return (
      <div className="query-builder__status-bar">
        <div className="query-builder__status-bar__left"></div>
        <div className="query-builder__status-bar__right">
          <button
            className={clsx(
              'query-builder__status-bar__action query-builder__status-bar__compile-btn',
              {
                'query-builder__status-bar__compile-btn--wiggling':
                  queryBuilderState.isCompiling,
              },
            )}
            disabled={queryBuilderState.isCompiling}
            onClick={compile}
            tabIndex={-1}
            title="Compile (F9)"
          >
            <HammerIcon />
          </button>
          <button
            className={clsx(
              'query-builder__status-bar__action query-builder__status-bar__action__toggler',
            )}
            onClick={(): void => openLambdaEditor(QueryTextEditorMode.JSON)}
            tabIndex={-1}
            title="View Query JSON"
          >{`{ }`}</button>
          <button
            className={clsx(
              'query-builder__status-bar__action query-builder__status-bar__action__toggler',
            )}
            onClick={(): void => openLambdaEditor(QueryTextEditorMode.TEXT)}
            tabIndex={-1}
            title="View Pure Query"
          >
            <HackerIcon />
          </button>
        </div>
      </div>
    );
  },
);

export const QueryBuilder = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const applicationStore = useApplicationStore();
    const isQuerySupported = queryBuilderState.isQuerySupported();

    // Hotkeys
    const keyMap = {
      [QUERY_BUILDER_HOTKEY.COMPILE]: [QUERY_BUILDER_HOTKEY_MAP.COMPILE],
    };
    const handlers = {
      [QUERY_BUILDER_HOTKEY.COMPILE]: (
        event: KeyboardEvent | undefined,
      ): void => {
        event?.preventDefault();
        flowResult(queryBuilderState.compileQuery()).catch(
          applicationStore.alertUnhandledError,
        );
      },
    };
    return (
      <div
        data-testid={QUERY_BUILDER_TEST_ID.QUERY_BUILDER}
        className="query-builder"
      >
        <GlobalHotKeys keyMap={keyMap} handlers={handlers}>
          <Backdrop className="backdrop" open={queryBuilderState.backdrop} />
          <div className="query-builder__content">
            <ResizablePanelGroup orientation="horizontal">
              <ResizablePanel minSize={120}>
                {isQuerySupported ? (
                  <ResizablePanelGroup orientation="vertical">
                    <ResizablePanel size={450} minSize={300}>
                      <ResizablePanelGroup orientation="horizontal">
                        {queryBuilderState.querySetupState.showSetupPanel && (
                          <ResizablePanel minSize={40} direction={1}>
                            <QueryBuilderSetupPanel
                              queryBuilderState={queryBuilderState}
                            />
                          </ResizablePanel>
                        )}
                        {!queryBuilderState.querySetupState.showSetupPanel && (
                          <ResizablePanel minSize={40} size={40} direction={1}>
                            <QueryBuilderSetupPanel
                              queryBuilderState={queryBuilderState}
                            />
                          </ResizablePanel>
                        )}
                        <ResizablePanelSplitter />
                        <ResizablePanel minSize={40} direction={[1, -1]}>
                          <QueryBuilderExplorerPanel
                            queryBuilderState={queryBuilderState}
                          />
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
                    <ResizablePanel minSize={300}>
                      <QueryBuilderFetchStructurePanel
                        queryBuilderState={queryBuilderState}
                      />
                    </ResizablePanel>
                    <ResizablePanelSplitter />
                    <ResizablePanel minSize={300}>
                      <QueryBuilderFilterPanel
                        queryBuilderState={queryBuilderState}
                      />
                    </ResizablePanel>
                  </ResizablePanelGroup>
                ) : (
                  <QueryBuilderUnsupportedQueryEditor
                    queryBuilderState={queryBuilderState}
                  />
                )}
              </ResizablePanel>
              {queryBuilderState.mode.isResultPanelHidden ? null : (
                <ResizablePanelSplitter />
              )}
              {queryBuilderState.mode.isResultPanelHidden ? null : (
                <ResizablePanel size={300} minSize={40}>
                  <QueryBuilderResultPanel
                    queryBuilderState={queryBuilderState}
                  />
                </ResizablePanel>
              )}
            </ResizablePanelGroup>
          </div>
          <QueryBuilderStatusBar queryBuilderState={queryBuilderState} />
          {queryBuilderState.queryTextEditorState.mode && (
            <QueryBuilderTextEditor queryBuilderState={queryBuilderState} />
          )}
        </GlobalHotKeys>
      </div>
    );
  },
);
