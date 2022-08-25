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
import { clsx, BlankPanelContent } from '@finos/legend-art';
import type { QueryBuilderState } from '../../stores/QueryBuilderState.js';
import { prettyCONSTName } from '@finos/legend-shared';
import { QueryBuilderProjectionPanel } from './QueryBuilderProjectionPanel.js';
import { QueryBuilderGraphFetchTreePanel } from './QueryBuilderGraphFetchTreePanel.js';
import { QueryBuilderProjectionState } from '../../stores/fetch-structure/projection/QueryBuilderProjectionState.js';
import { QueryBuilderGraphFetchTreeState } from '../../stores/fetch-structure/graph-fetch/QueryBuilderGraphFetchTreeState.js';
import { QueryBuilderPanelIssueCountBadge } from '../shared/QueryBuilderPanelIssueCountBadge.js';
import { FETCH_STRUCTURE_IMPLEMENTATION } from '../../stores/fetch-structure/QueryBuilderFetchStructureImplementationState.js';

const QueryBuilderFetchStructureEditor = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const fetchStructureState = queryBuilderState.fetchStructureState;
    const fetchStructureImplementation = fetchStructureState.implementation;

    if (fetchStructureImplementation instanceof QueryBuilderProjectionState) {
      return (
        <QueryBuilderProjectionPanel queryBuilderState={queryBuilderState} />
      );
    } else if (
      fetchStructureImplementation instanceof QueryBuilderGraphFetchTreeState
    ) {
      return (
        <QueryBuilderGraphFetchTreePanel
          queryBuilderState={queryBuilderState}
        />
      );
    }
    return (
      <div className="panel__content">
        <BlankPanelContent>
          <div className="query-builder__unsupported-view__main">
            <div className="query-builder__unsupported-view__summary">
              Unsupported fetch structure
            </div>
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
    // const fetchStructureImplementation = fetchStructureState.implementation;
    // const applicationStore = useApplicationStore();

    // TODO-BEFORE-PR: move this to inside of query builder projection state
    // const openResultSetModifierEditor = (): void =>
    //   queryBuilderState.fetchStructureState.projectionState.resultSetModifierState.setShowModal(
    //     true,
    //   );
    // const addNewBlankDerivation = (): void =>
    //   fetchStructureState.projectionState.addNewBlankDerivation();

    // TODO-BEFORE-PR: move this to inside of query builder projection state
    // const onChangeFetchStructureImplementation =
    //   (implementationType: FETCH_STRUCTURE_IMPLEMENTATION): (() => void) =>
    //   (): void => {
    //     const reset = (): void => {
    //       fetchStructureState.changeImplementation(implementationType);
    //       queryBuilderState.changeFetchStructure();
    //       queryBuilderState.fetchStructureState.projectionState.postFilterState =
    //         new QueryBuilderPostFilterState(
    //           queryBuilderState.fetchStructureState.projectionState,
    //           queryBuilderState.fetchStructureState.projectionState.postFilterOperators,
    //         );
    //       queryBuilderState.fetchStructureState.projectionState.setShowPostFilterPanel(
    //         false,
    //       );
    //     };
    //     if (fetchStructureState.fetchStructureMode !== implementationType) {
    //       switch (implementationType) {
    //         case FETCH_STRUCTURE_MODE.GRAPH_FETCH: {
    //           if (
    //             queryBuilderState.fetchStructureState.projectionState.columns
    //               .length > 0
    //             // NOTE: here we could potentially check for the presence of post-filter as well
    //             // but we make the assumption that if there is no projection column, there should
    //             // not be any post-filter at all
    //           ) {
    //             applicationStore.setActionAlertInfo({
    //               message:
    //                 queryBuilderState.fetchStructureState.projectionState
    //                   .showPostFilterPanel &&
    //                 queryBuilderState.fetchStructureState.projectionState
    //                   .postFilterState.nodes.size > 0
    //                   ? 'With graph-fetch mode, post filter is not supported. Current projection columns and post filters will be lost when switching to the graph-fetch mode. Do you still want to proceed?'
    //                   : 'Current projection columns will be lost when switching to the graph-fetch mode. Do you still want to proceed?',
    //               type: ActionAlertType.CAUTION,
    //               actions: [
    //                 {
    //                   label: 'Proceed',
    //                   type: ActionAlertActionType.PROCEED_WITH_CAUTION,
    //                   handler: applicationStore.guardUnhandledError(
    //                     async () => {
    //                       queryBuilderState.fetchStructureState.projectionState =
    //                         new QueryBuilderProjectionState(
    //                           queryBuilderState,
    //                           queryBuilderState.fetchStructureState,
    //                         );
    //                       reset();
    //                     },
    //                   ),
    //                 },
    //                 {
    //                   label: 'Cancel',
    //                   type: ActionAlertActionType.PROCEED,
    //                   default: true,
    //                 },
    //               ],
    //             });
    //           } else {
    //             reset();
    //           }
    //           return;
    //         }
    //         case FETCH_STRUCTURE_MODE.PROJECTION: {
    //           if (
    //             queryBuilderState.fetchStructureState.graphFetchTreeState
    //               .treeData?.rootIds.length
    //           ) {
    //             applicationStore.setActionAlertInfo({
    //               message:
    //                 'Current graph-fetch will be lost when switching to projection mode. Do you still want to proceed?',
    //               type: ActionAlertType.CAUTION,
    //               actions: [
    //                 {
    //                   label: 'Proceed',
    //                   type: ActionAlertActionType.PROCEED_WITH_CAUTION,
    //                   handler: applicationStore.guardUnhandledError(
    //                     async () => {
    //                       queryBuilderState.fetchStructureState.graphFetchTreeState =
    //                         new QueryBuilderGraphFetchTreeState(
    //                           queryBuilderState,
    //                           queryBuilderState.fetchStructureState,
    //                         );
    //                       reset();
    //                     },
    //                   ),
    //                 },
    //                 {
    //                   label: 'Cancel',
    //                   type: ActionAlertActionType.PROCEED,
    //                   default: true,
    //                 },
    //               ],
    //             });
    //           } else {
    //             reset();
    //           }
    //           return;
    //         }
    //         default:
    //           return;
    //       }
    //     }
    //   };

    return (
      <div className="panel">
        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label">fetch structure</div>
            <QueryBuilderPanelIssueCountBadge
              issues={fetchStructureState.validationIssues}
            />
          </div>
          <div className="panel__header__actions">
            {/* {fetchStructureImplementation instanceof
              QueryBuilderProjectionState && (
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
            )} */}
            <div className="query-builder__fetch__structure__modes">
              {Object.values(FETCH_STRUCTURE_IMPLEMENTATION).map((type) => (
                <button
                  // onClick={onChangeFetchStructureImplementation(type)}
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
          </div>
        </div>
        <QueryBuilderFetchStructureEditor
          queryBuilderState={queryBuilderState}
        />
      </div>
    );
  },
);
