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

import {
  type SelectComponent,
  ArrowLeftIcon,
  ArrowRightIcon,
  BlankPanelContent,
  clsx,
  CustomSelectorInput,
  PanelLoadingIndicator,
  SearchIcon,
  UserIcon,
} from '@finos/legend-art';
import { debounce, guaranteeType } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  generateExistingQueryEditorRoute,
  generateQuerySetupRoute,
} from '../stores/LegendQueryRouter.js';
import { useDepotServerClient } from '@finos/legend-server-depot';
import {
  useApplicationStore,
  EDITOR_LANGUAGE,
  TextInputEditor,
} from '@finos/legend-application';
import {
  type QueryOption,
  buildQueryOption,
} from '@finos/legend-query-builder';
import { useLegendQueryApplicationStore } from './LegendQueryBaseStoreProvider.js';
import { EditExistingQuerySetupStore } from '../stores/EditExistingQuerySetupStore.js';
import { BaseQuerySetup, BaseQuerySetupStoreContext } from './QuerySetup.js';

const EditExistingQuerySetupStoreProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const applicationStore = useLegendQueryApplicationStore();
  const depotServerClient = useDepotServerClient();
  const store = useLocalObservable(
    () => new EditExistingQuerySetupStore(applicationStore, depotServerClient),
  );
  return (
    <BaseQuerySetupStoreContext.Provider value={store}>
      {children}
    </BaseQuerySetupStoreContext.Provider>
  );
};

const useEditExistingQuerySetupStore = (): EditExistingQuerySetupStore =>
  guaranteeType(
    useContext(BaseQuerySetupStoreContext),
    EditExistingQuerySetupStore,
    `Can't find query setup store in context`,
  );

const EditExistingQuerySetupContent = observer(() => {
  const setupStore = useEditExistingQuerySetupStore();
  const applicationStore = useApplicationStore();
  const querySearchRef = useRef<SelectComponent>(null);
  const [searchText, setSearchText] = useState('');

  // actions
  const back = (): void => {
    applicationStore.navigationService.goToLocation(generateQuerySetupRoute());
  };
  const next = (): void => {
    if (setupStore.currentQuery) {
      applicationStore.navigationService.goToLocation(
        generateExistingQueryEditorRoute(setupStore.currentQuery.id),
      );
    }
  };
  const canProceed = setupStore.currentQuery;

  // query
  const queryOptions = setupStore.queries.map(buildQueryOption);
  const selectedQueryOption = setupStore.currentQuery
    ? buildQueryOption(setupStore.currentQuery)
    : null;
  const onQueryOptionChange = (option: QueryOption | null): void => {
    if (option?.value !== setupStore.currentQuery) {
      setupStore.setCurrentQuery(option?.value.id);
    }
  };
  const formatQueryOptionLabel = (option: QueryOption): React.ReactNode => {
    const deleteQuery: React.MouseEventHandler<HTMLButtonElement> = (event) => {
      event.preventDefault();
      event.stopPropagation();
      setupStore.graphManagerState.graphManager
        .deleteQuery(option.value.id)
        .then(() =>
          flowResult(setupStore.loadQueries('')).catch(
            applicationStore.alertUnhandledError,
          ),
        )
        .catch(applicationStore.alertUnhandledError);
    };
    if (option.value.id === setupStore.currentQuery?.id) {
      return option.label;
    }
    return (
      <div className="query-setup__existing-query__query-option">
        <div
          className="query-setup__existing-query__query-option__label"
          title={option.label}
        >
          {option.label}
        </div>
        {setupStore.showCurrentUserQueriesOnly && (
          <button
            className="query-setup__existing-query__query-option__action"
            tabIndex={-1}
            onClick={deleteQuery}
          >
            Delete
          </button>
        )}
        {!setupStore.showCurrentUserQueriesOnly &&
          Boolean(option.value.owner) && (
            <div
              className={clsx(
                'query-setup__existing-query__query-option__user',
                {
                  'query-setup__existing-query__query-option__user--mine':
                    option.value.isCurrentUserQuery,
                },
              )}
            >
              {option.value.isCurrentUserQuery ? 'mine' : option.value.owner}
            </div>
          )}
      </div>
    );
  };

  // search text
  const debouncedLoadQueries = useMemo(
    () =>
      debounce((input: string): void => {
        flowResult(setupStore.loadQueries(input)).catch(
          applicationStore.alertUnhandledError,
        );
      }, 500),
    [applicationStore, setupStore],
  );
  const onSearchTextChange = (value: string): void => {
    if (value !== searchText) {
      setSearchText(value);
      debouncedLoadQueries.cancel();
      debouncedLoadQueries(value);
    }
  };

  // show current user queries only
  const toggleShowCurrentUserQueriesOnly = (): void => {
    setupStore.setShowCurrentUserQueriesOnly(
      !setupStore.showCurrentUserQueriesOnly,
    );
    debouncedLoadQueries.cancel();
    debouncedLoadQueries(searchText);
  };

  useEffect(() => {
    flowResult(setupStore.loadQueries('')).catch(
      applicationStore.alertUnhandledError,
    );
  }, [setupStore, applicationStore]);

  useEffect(() => {
    querySearchRef.current?.focus();
  }, []);

  return (
    <div className="query-setup__wizard query-setup__existing-query">
      <div className="query-setup__wizard__header query-setup__existing-query__header">
        <button
          className="query-setup__wizard__header__btn"
          onClick={back}
          title="Back to Main Menu"
        >
          <ArrowLeftIcon />
        </button>
        <div className="query-setup__wizard__header__title">
          Loading an existing query...
        </div>
        <button
          className={clsx('query-setup__wizard__header__btn', {
            'query-setup__wizard__header__btn--ready': canProceed,
          })}
          onClick={next}
          disabled={!canProceed}
          title="Edit query"
        >
          <ArrowRightIcon />
        </button>
      </div>
      <div className="query-setup__wizard__content">
        <div className="query-setup__wizard__group query-setup__wizard__group--inline">
          <div className="query-setup__wizard__group__title">
            <SearchIcon />
          </div>
          <div className="query-setup__existing-query__input">
            <CustomSelectorInput
              ref={querySearchRef}
              className="query-setup__wizard__selector"
              options={queryOptions}
              isLoading={setupStore.loadQueriesState.isInProgress}
              onInputChange={onSearchTextChange}
              inputValue={searchText}
              onChange={onQueryOptionChange}
              value={selectedQueryOption}
              placeholder="Search for query by name..."
              isClearable={true}
              escapeClearsValue={true}
              darkMode={true}
              formatOptionLabel={formatQueryOptionLabel}
            />
            <button
              className={clsx('query-setup__existing-query__btn', {
                'query-setup__existing-query__btn--active':
                  setupStore.showCurrentUserQueriesOnly,
              })}
              tabIndex={-1}
              title={`[${
                setupStore.showCurrentUserQueriesOnly ? 'on' : 'off'
              }] Toggle show only queries of current user`}
              onClick={toggleShowCurrentUserQueriesOnly}
            >
              <UserIcon />
            </button>
          </div>
        </div>
        <div className="query-setup__existing-query__preview">
          <PanelLoadingIndicator
            isLoading={setupStore.loadQueryState.isInProgress}
          />
          {setupStore.currentQuery && (
            <>
              {!setupStore.currentQueryInfo && (
                <BlankPanelContent>{`Can't preview query`}</BlankPanelContent>
              )}
              {setupStore.currentQueryInfo && (
                <TextInputEditor
                  inputValue={setupStore.currentQueryInfo.content}
                  isReadOnly={true}
                  language={EDITOR_LANGUAGE.PURE}
                  showMiniMap={false}
                  hideGutter={true}
                />
              )}
            </>
          )}
          {!setupStore.currentQuery && (
            <BlankPanelContent>No query to preview</BlankPanelContent>
          )}
        </div>
      </div>
    </div>
  );
});

export const EditExistingQuerySetup: React.FC = () => (
  <EditExistingQuerySetupStoreProvider>
    <BaseQuerySetup>
      <EditExistingQuerySetupContent />
    </BaseQuerySetup>
  </EditExistingQuerySetupStoreProvider>
);
