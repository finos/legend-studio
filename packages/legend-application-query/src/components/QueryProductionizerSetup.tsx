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
  ArrowLeftIcon,
  ArrowRightIcon,
  BlankPanelContent,
  clsx,
  CustomSelectorInput,
  PanelLoadingIndicator,
  SearchIcon,
  type SelectComponent,
} from '@finos/legend-art';
import { debounce, guaranteeType } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useDepotServerClient } from '@finos/legend-server-depot';
import {
  CODE_EDITOR_LANGUAGE,
  useApplicationStore,
} from '@finos/legend-application';
import { useLegendQueryApplicationStore } from './LegendQueryBaseStoreProvider.js';
import { QueryProductionizerSetupStore } from '../stores/QueryProductionizerSetupStore.js';
import { BaseQuerySetup, BaseQuerySetupStoreContext } from './QuerySetup.js';
import {
  buildQueryOption,
  type QueryOption,
} from '@finos/legend-query-builder';
import { generateQuerySetupRoute } from '../application/LegendQueryNavigation.js';
import { CodeEditor } from '@finos/legend-lego/code-editor';

const QueryProductionizerSetupStoreProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const applicationStore = useLegendQueryApplicationStore();
  const depotServerClient = useDepotServerClient();
  const store = useLocalObservable(
    () =>
      new QueryProductionizerSetupStore(applicationStore, depotServerClient),
  );
  return (
    <BaseQuerySetupStoreContext.Provider value={store}>
      {children}
    </BaseQuerySetupStoreContext.Provider>
  );
};

const useQueryProductionizerSetupStore = (): QueryProductionizerSetupStore =>
  guaranteeType(
    useContext(BaseQuerySetupStoreContext),
    QueryProductionizerSetupStore,
    `Can't find query setup store in context`,
  );

const QueryProductionizerSetupContent = observer(() => {
  const applicationStore = useApplicationStore();
  const setupStore = useQueryProductionizerSetupStore();
  const querySearchRef = useRef<SelectComponent>(null);
  const [searchText, setSearchText] = useState('');

  // actions
  const back = (): void => {
    applicationStore.navigationService.navigator.goToLocation(
      generateQuerySetupRoute(),
    );
  };
  const next = (): void => {
    if (setupStore.currentQuery) {
      setupStore
        .loadQueryProductionizer()
        .catch(applicationStore.alertUnhandledError);
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

  useEffect(() => {
    flowResult(setupStore.loadQueries('')).catch(
      applicationStore.alertUnhandledError,
    );
  }, [setupStore, applicationStore]);

  useEffect(() => {
    querySearchRef.current?.focus();
  }, []);

  return (
    <div className="query-setup__wizard query-setup__productionize-query">
      <div className="query-setup__wizard__header query-setup__productionize-query__header">
        <button
          className="query-setup__wizard__header__btn"
          onClick={back}
          title="Back to Main Menu"
        >
          <ArrowLeftIcon />
        </button>
        <div className="query-setup__wizard__header__title">
          Productionizing an existing query...
        </div>
        <button
          className={clsx('query-setup__wizard__header__btn', {
            'query-setup__wizard__header__btn--ready': canProceed,
          })}
          onClick={next}
          disabled={!canProceed}
          title="Productionize query"
        >
          <ArrowRightIcon />
        </button>
      </div>
      <div className="query-setup__wizard__content">
        <div className="query-setup__wizard__group query-setup__wizard__group--inline">
          <div className="query-setup__wizard__group__title">
            <SearchIcon />
          </div>
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
          />
        </div>
        <div className="query-setup__productionize-query__preview">
          <PanelLoadingIndicator
            isLoading={setupStore.loadQueryState.isInProgress}
          />
          {setupStore.currentQuery && (
            <>
              {!setupStore.currentQueryInfo && (
                <BlankPanelContent>{`Can't preview query`}</BlankPanelContent>
              )}
              {setupStore.currentQueryInfo && (
                <CodeEditor
                  inputValue={setupStore.currentQueryInfo.content}
                  isReadOnly={true}
                  language={CODE_EDITOR_LANGUAGE.PURE}
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

export const QueryProductionizerSetup: React.FC = () => (
  <QueryProductionizerSetupStoreProvider>
    <BaseQuerySetup>
      <QueryProductionizerSetupContent />
    </BaseQuerySetup>
  </QueryProductionizerSetupStoreProvider>
);
