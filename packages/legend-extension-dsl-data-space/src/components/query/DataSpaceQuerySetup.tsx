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
import type { DataSpaceQuerySetupState } from '../../stores/query/DataSpaceQuerySetupState';

// type QueryOption = { label: string; value: LightQuery };
// const buildQueryOption = (query: LightQuery): QueryOption => ({
//   label: query.name,
//   value: query,
// });

export const DataspaceQuerySetup = observer(
  (props: { querySetupState: DataSpaceQuerySetupState }) => {
    // const { querySetupState } = props;
    // const applicationStore = useApplicationStore();
    // const setupStore = useQuerySetupStore();
    // const queryStore = useQueryStore();
    // const [searchText, setSearchText] = useState('');
    // const back = (): void => {
    //   setupStore.setSetupState(undefined);
    //   querySetupState.setCurrentQuery(undefined);
    //   setupStore.queryStore.graphManagerState.resetGraph();
    // };
    // const next = (): void => {
    //   if (querySetupState.currentQuery) {
    //     queryStore.setQueryInfoState(
    //       new ExistingQueryInfoState(
    //         querySetupState.queryStore,
    //         querySetupState.currentQuery,
    //       ),
    //     );
    //     applicationStore.navigator.goTo(
    //       generateExistingQueryRoute(querySetupState.currentQuery.id),
    //     );
    //   }
    //   setupStore.setSetupState(undefined);
    // };
    // const canProceed = querySetupState.currentQuery;

    // // show current user queries only
    // const toggleShowCurrentUserQueriesOnly = (): void => {
    //   querySetupState.setShowCurrentUserQueriesOnly(
    //     !querySetupState.showCurrentUserQueriesOnly,
    //   );
    //   flowResult(querySetupState.loadQueries(searchText)).catch(
    //     applicationStore.alertIllegalUnhandledError,
    //   );
    // };

    // // query
    // const queryOptions = querySetupState.queries.map(buildQueryOption);
    // const selectedQueryOption = querySetupState.currentQuery
    //   ? buildQueryOption(querySetupState.currentQuery)
    //   : null;
    // const onQueryOptionChange = (option: QueryOption | null): void => {
    //   if (option?.value !== querySetupState.currentQuery?.id) {
    //     querySetupState.setCurrentQuery(option?.value.id);
    //   }
    // };
    // const formatQueryOptionLabel = (option: QueryOption): React.ReactNode => {
    //   const deleteQuery: React.MouseEventHandler<HTMLButtonElement> = (
    //     event,
    //   ) => {
    //     event.preventDefault();
    //     event.stopPropagation();
    //     queryStore.graphManagerState.graphManager
    //       .deleteQuery(option.value.id)
    //       .then(() =>
    //         flowResult(querySetupState.loadQueries('')).catch(
    //           applicationStore.alertIllegalUnhandledError,
    //         ),
    //       )
    //       .catch(applicationStore.alertIllegalUnhandledError);
    //   };
    //   if (option.value.id === querySetupState.currentQuery?.id) {
    //     return option.label;
    //   }
    //   return (
    //     <div className="query-setup__existing-query__query-option">
    //       <div className="query-setup__existing-query__query-option__label">
    //         {option.label}
    //       </div>
    //       {querySetupState.showCurrentUserQueriesOnly && (
    //         <button
    //           className="query-setup__existing-query__query-option__action"
    //           tabIndex={-1}
    //           onClick={deleteQuery}
    //         >
    //           Delete
    //         </button>
    //       )}
    //       {!querySetupState.showCurrentUserQueriesOnly &&
    //         Boolean(option.value.owner) && (
    //           <div
    //             className={clsx(
    //               'query-setup__existing-query__query-option__user',
    //               {
    //                 'query-setup__existing-query__query-option__user--mine':
    //                   option.value.isCurrentUserQuery,
    //               },
    //             )}
    //           >
    //             {option.value.isCurrentUserQuery ? 'mine' : option.value.owner}
    //           </div>
    //         )}
    //     </div>
    //   );
    // };

    // // search text
    // const debouncedLoadQueries = useMemo(
    //   () =>
    //     debounce((input: string): void => {
    //       flowResult(querySetupState.loadQueries(input)).catch(
    //         applicationStore.alertIllegalUnhandledError,
    //       );
    //     }, 500),
    //   [applicationStore, querySetupState],
    // );
    // const onSearchTextChange = (value: string): void => {
    //   if (value !== searchText) {
    //     setSearchText(value);
    //     debouncedLoadQueries.cancel();
    //     debouncedLoadQueries(value);
    //   }
    // };

    // useEffect(() => {
    //   flowResult(querySetupState.loadQueries('')).catch(
    //     applicationStore.alertIllegalUnhandledError,
    //   );
    // }, [querySetupState, applicationStore]);

    return (
      <div>Arrron</div>
      // <div className="query-setup__wizard query-setup__existing-query">
      //   <div className="query-setup__wizard__header query-setup__existing-query__header">
      //     <button
      //       className="query-setup__wizard__header__btn"
      //       onClick={back}
      //       title="Back to Main Menu"
      //     >
      //       <ArrowLeftIcon />
      //     </button>
      //     <div className="query-setup__wizard__header__title">
      //       Loading an existing query...
      //     </div>
      //     <button
      //       className={clsx('query-setup__wizard__header__btn', {
      //         'query-setup__wizard__header__btn--ready': canProceed,
      //       })}
      //       onClick={next}
      //       disabled={!canProceed}
      //       title="Proceed"
      //     >
      //       <ArrowRightIcon />
      //     </button>
      //   </div>
      //   <div className="query-setup__wizard__content">
      //     <div className="query-setup__wizard__group">
      //       <div className="query-setup__wizard__group__title">Query</div>
      //       <div className="query-setup__existing-query__input">
      //         <CustomSelectorInput
      //           className="query-setup__wizard__selector"
      //           options={queryOptions}
      //           isLoading={querySetupState.loadQueriesState.isInProgress}
      //           onInputChange={onSearchTextChange}
      //           inputValue={searchText}
      //           onChange={onQueryOptionChange}
      //           value={selectedQueryOption}
      //           placeholder="Search for query by name..."
      //           isClearable={true}
      //           escapeClearsValue={true}
      //           darkMode={true}
      //           formatOptionLabel={formatQueryOptionLabel}
      //         />
      //         <button
      //           className={clsx('query-setup__existing-query__btn', {
      //             'query-setup__existing-query__btn--active':
      //               querySetupState.showCurrentUserQueriesOnly,
      //           })}
      //           tabIndex={-1}
      //           title={`[${
      //             querySetupState.showCurrentUserQueriesOnly ? 'on' : 'off'
      //           }] Toggle show only queries of current user`}
      //           onClick={toggleShowCurrentUserQueriesOnly}
      //         >
      //           <UserIcon />
      //         </button>
      //       </div>
      //     </div>
      //   </div>
      // </div>
    );
  },
);
