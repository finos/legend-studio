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
  PlusIcon,
  OptionsIcon,
} from '@finos/legend-art';
import type { QueryBuilderState } from '../stores/QueryBuilderState';
import { prettyCONSTName } from '@finos/legend-shared';
import { QueryBuilderProjectionPanel } from './QueryBuilderProjectionPanel';
import { QueryBuilderGraphFetchTreePanel } from './QueryBuilderGraphFetchTreePanel';
import { FETCH_STRUCTURE_MODE } from '../stores/QueryBuilderFetchStructureState';

const QueryBuilderUnsupportedFetchStructure = observer(
  (props: { mode: FETCH_STRUCTURE_MODE }) => {
    const { mode } = props;

    return (
      <div className="panel__content">
        <BlankPanelContent>
          <div className="query-builder__unsupported-view__main">
            <div className="query-builder__unsupported-view__summary">{`Unsupported fetch structure mode ${prettyCONSTName(
              mode,
            )}`}</div>
          </div>
        </BlankPanelContent>
      </div>
    );
  },
);

export const QueryBuilderFetchStructurePanel = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const fetchStructureState = queryBuilderState.fetchStructureState;
    const fetchStructureStateMode = fetchStructureState.fetchStructureMode;
    const openResultSetModifierEditor = (): void =>
      queryBuilderState.resultSetModifierState.setShowModal(true);
    const addNewBlankDerivation = (): void =>
      fetchStructureState.projectionState.addNewBlankDerivation();

    const renderFetchMode = (): React.ReactNode => {
      switch (fetchStructureStateMode) {
        case FETCH_STRUCTURE_MODE.PROJECTION:
          return (
            <QueryBuilderProjectionPanel
              queryBuilderState={queryBuilderState}
            />
          );
        case FETCH_STRUCTURE_MODE.GRAPH_FETCH:
          return (
            <QueryBuilderGraphFetchTreePanel
              queryBuilderState={queryBuilderState}
            />
          );
        default:
          return (
            <QueryBuilderUnsupportedFetchStructure
              mode={fetchStructureStateMode}
            />
          );
      }
    };
    const onChangeFetchStructureMode =
      (fetchMode: FETCH_STRUCTURE_MODE): (() => void) =>
      (): void => {
        if (fetchStructureState.fetchStructureMode !== fetchMode) {
          fetchStructureState.setFetchStructureMode(fetchMode);
          // TODO: might want to add alert modal to alert user changing fetch structure resets state
          queryBuilderState.changeFetchStructure();
        }
      };

    return (
      <div className="panel">
        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label">fetch structure</div>
          </div>
          <div className="panel__header__actions">
            {fetchStructureStateMode === FETCH_STRUCTURE_MODE.PROJECTION && (
              <>
                <button
                  className="panel__header__action"
                  onClick={openResultSetModifierEditor}
                  tabIndex={-1}
                  title="Configure result set modifiers..."
                >
                  <OptionsIcon className="query-builder__icon query-builder__icon__query-option" />
                </button>
                <button
                  className="panel__header__action"
                  onClick={addNewBlankDerivation}
                  tabIndex={-1}
                  title="Add a new derivation"
                >
                  <PlusIcon />
                </button>
              </>
            )}
            <div className="query-builder__fetch__structure__modes">
              {Object.values(FETCH_STRUCTURE_MODE).map((fetchMode) => (
                <button
                  onClick={onChangeFetchStructureMode(fetchMode)}
                  className={clsx('query-builder__fetch__structure__mode', {
                    'query-builder__fetch__structure__mode--selected':
                      fetchMode === fetchStructureState.fetchStructureMode,
                  })}
                  key={fetchMode}
                >
                  {prettyCONSTName(fetchMode)}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderFetchMode()}
      </div>
    );
  },
);
