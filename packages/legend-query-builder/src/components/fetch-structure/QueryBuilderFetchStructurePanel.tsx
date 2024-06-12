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
  clsx,
  BlankPanelContent,
  Panel,
  PanelContent,
  PanelHeader,
  PanelHeaderActions,
} from '@finos/legend-art';
import type { QueryBuilderState } from '../../stores/QueryBuilderState.js';
import { prettyCONSTName } from '@finos/legend-shared';
import { QueryBuilderTDSPanel } from './QueryBuilderTDSPanel.js';
import { QueryBuilderGraphFetchPanel } from './QueryBuilderGraphFetchTreePanel.js';
import { QueryBuilderTDSState } from '../../stores/fetch-structure/tds/QueryBuilderTDSState.js';
import { QueryBuilderGraphFetchTreeState } from '../../stores/fetch-structure/graph-fetch/QueryBuilderGraphFetchTreeState.js';
import { QueryBuilderPanelIssueCountBadge } from '../shared/QueryBuilderPanelIssueCountBadge.js';
import { FETCH_STRUCTURE_IMPLEMENTATION } from '../../stores/fetch-structure/QueryBuilderFetchStructureImplementationState.js';
import { QUERY_BUILDER_TEST_ID } from '../../__lib__/QueryBuilderTesting.js';
import { onChangeFetchStructureImplementation } from '../../stores/fetch-structure/QueryBuilderFetchStructureState.js';

const QueryBuilderFetchStructureEditor = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const fetchStructureState = queryBuilderState.fetchStructureState;
    const fetchStructureImplementation = fetchStructureState.implementation;

    if (fetchStructureImplementation instanceof QueryBuilderTDSState) {
      return <QueryBuilderTDSPanel tdsState={fetchStructureImplementation} />;
    } else if (
      fetchStructureImplementation instanceof QueryBuilderGraphFetchTreeState
    ) {
      return (
        <QueryBuilderGraphFetchPanel
          graphFetchTreeState={fetchStructureImplementation}
        />
      );
    }
    return (
      <PanelContent>
        <BlankPanelContent>
          <div className="query-builder__unsupported-view__main">
            <div className="query-builder__unsupported-view__summary">
              Unsupported fetch structure
            </div>
          </div>
        </BlankPanelContent>
      </PanelContent>
    );
  },
);

export const QueryBuilderFetchStructurePanel = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const fetchStructureState = queryBuilderState.fetchStructureState;
    const fetchConfig =
      queryBuilderState.workflowState.getFetchStructureLayoutConfig(
        queryBuilderState,
      );
    return (
      <Panel data-testid={QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FETCH_STRUCTURE}>
        <PanelHeader>
          <div className="panel__header__title">
            <div className="panel__header__title__label">
              {fetchConfig.label}
            </div>
            {fetchStructureState.implementation.fetchStructureValidationIssues
              .length !== 0 && (
              <QueryBuilderPanelIssueCountBadge
                issues={
                  fetchStructureState.implementation
                    .fetchStructureValidationIssues
                }
              />
            )}
          </div>
          {fetchConfig.showInFetchPanel ? (
            <PanelHeaderActions>
              <div className="query-builder__fetch__structure__modes">
                {Object.values(FETCH_STRUCTURE_IMPLEMENTATION).map((type) => (
                  <button
                    onClick={onChangeFetchStructureImplementation(
                      type,
                      fetchStructureState,
                    )}
                    className={clsx('query-builder__fetch__structure__mode', {
                      'query-builder__fetch__structure__mode--selected':
                        type === fetchStructureState.implementation.type,
                    })}
                    key={type}
                  >
                    {prettyCONSTName(type)}
                  </button>
                ))}
              </div>
            </PanelHeaderActions>
          ) : null}
        </PanelHeader>
        <QueryBuilderFetchStructureEditor
          queryBuilderState={queryBuilderState}
        />
      </Panel>
    );
  },
);
