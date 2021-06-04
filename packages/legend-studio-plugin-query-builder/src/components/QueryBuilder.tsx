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
import { FaUserSecret, FaRobot, FaSave } from 'react-icons/fa';
import { ReflexContainer, ReflexElement, ReflexSplitter } from 'react-reflex';
import { clsx } from '@finos/legend-studio-components';
import { QueryBuilderFilterPanel } from './QueryBuilderFilterPanel';
import { QueryBuilderExplorerPanel } from './QueryBuilderExplorerPanel';
import { QueryBuilderSetupPanel } from './QueryBuilderSetupPanel';
import { QueryBuilderResultPanel } from './QueryBuilderResultPanel';
import { QueryBuilderLambdaEditor } from './QueryBuilderLambdaEditor';
import type { QueryBuilderState } from '../stores/QueryBuilderState';
import { QueryTextEditorMode } from '../stores/QueryTextEditorState';
import {
  QueryBuilderUnsupportedExplorerPanel,
  QueryBuilderUnsupportedPanel,
} from './QueryBuilderUnsupportedPanel';
import { QueryBuilderFetchStructurePanel } from './QueryBuilderFetchStructurePanel';
import { QUERY_BUILDER_TEST_ID } from '../QueryBuilder_Constants';
import { useApplicationStore } from '@finos/legend-studio';

const QueryBuilderStatusBar = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const openLambdaEditor = (mode: QueryTextEditorMode): void =>
      queryBuilderState.queryTextEditorState.openModal(mode);

    return (
      <div className="query-builder__status-bar">
        <div className="query-builder__status-bar__left"></div>
        <div className="query-builder__status-bar__right">
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
            <FaUserSecret />
          </button>
        </div>
      </div>
    );
  },
);
const QueryBuilderHeader = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const applicationStore = useApplicationStore();
    const promoteToService = (): void =>
      queryBuilderState.resultState.setShowServicePathModal(true);
    const saveQuery = (): Promise<void> =>
      queryBuilderState
        .saveQuery()
        .catch(applicationStore.alertIllegalUnhandledError);
    const disablePromoteToService = !queryBuilderState.querySetupState.mapping;

    return (
      <div className="query-builder__header">
        <div className="query-builder__header__content">
          <div className="query-builder__header__title"></div>
          <div className="query-builder__header__actions">
            <div className="query-builder__header__action">
              <button
                className="panel__header__action"
                onClick={promoteToService}
                disabled={disablePromoteToService}
                tabIndex={-1}
                title="Promote to Service"
              >
                <FaRobot />
              </button>
              <button
                className="panel__header__action"
                onClick={saveQuery}
                disabled={!queryBuilderState.querySetupState.onSave}
                tabIndex={-1}
                title="Save Query"
              >
                <FaSave />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

const QueryBuilderUnsupported = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;

    return (
      <ReflexContainer orientation="vertical">
        <ReflexElement size={450} minSize={0}>
          <QueryBuilderSetupPanel queryBuilderState={queryBuilderState} />
          <QueryBuilderUnsupportedExplorerPanel />
        </ReflexElement>
        <ReflexSplitter />
        <ReflexElement minSize={0}>
          <QueryBuilderUnsupportedPanel queryBuilderState={queryBuilderState} />
        </ReflexElement>
      </ReflexContainer>
    );
  },
);

export const QueryBuilder = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const isQuerySupported = queryBuilderState.isQuerySupported();

    return (
      <div
        data-testid={QUERY_BUILDER_TEST_ID.QUERY_BUILDER}
        className="query-builder"
      >
        <QueryBuilderHeader queryBuilderState={queryBuilderState} />
        <div className="query-builder__content">
          <ReflexContainer orientation="horizontal">
            <ReflexElement minSize={132}>
              {isQuerySupported ? (
                <ReflexContainer orientation="vertical">
                  <ReflexElement size={450} minSize={0}>
                    <QueryBuilderSetupPanel
                      queryBuilderState={queryBuilderState}
                    />
                    <QueryBuilderExplorerPanel
                      queryBuilderState={queryBuilderState}
                    />
                  </ReflexElement>
                  <ReflexSplitter />
                  <ReflexElement minSize={0}>
                    <QueryBuilderFetchStructurePanel
                      queryBuilderState={queryBuilderState}
                    />
                  </ReflexElement>
                  <ReflexSplitter />
                  <ReflexElement minSize={0}>
                    <QueryBuilderFilterPanel
                      queryBuilderState={queryBuilderState}
                    />
                  </ReflexElement>
                </ReflexContainer>
              ) : (
                <QueryBuilderUnsupported
                  queryBuilderState={queryBuilderState}
                />
              )}
            </ReflexElement>
            <ReflexSplitter />
            <ReflexElement size={300} minSize={28}>
              <QueryBuilderResultPanel queryBuilderState={queryBuilderState} />
            </ReflexElement>
          </ReflexContainer>
        </div>
        <QueryBuilderStatusBar queryBuilderState={queryBuilderState} />
        {queryBuilderState.queryTextEditorState.mode && (
          <QueryBuilderLambdaEditor queryBuilderState={queryBuilderState} />
        )}
      </div>
    );
  },
);
