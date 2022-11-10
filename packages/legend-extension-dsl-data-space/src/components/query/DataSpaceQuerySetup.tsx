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

import { observer, useLocalObservable } from 'mobx-react-lite';
import { debounce } from '@finos/legend-shared';
import { useApplicationStore } from '@finos/legend-application';
import { useDepotServerClient } from '@finos/legend-server-depot';
import {
  QueryEditor,
  QueryEditorStoreContext,
  useLegendQueryApplicationStore,
} from '@finos/legend-application-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { flowResult } from 'mobx';
import { QueryBuilderClassSelector } from '@finos/legend-query-builder';
import {
  CustomSelectorInput,
  SearchIcon,
  type SelectComponent,
} from '@finos/legend-art';
import { DataSpaceIcon } from '../DSL_DataSpace_Icon.js';
import {
  type DataSpaceQuerySetupState,
  DataSpaceQuerySetupStore,
} from '../../stores/query/DataSpaceQuerySetupStore.js';
import {
  buildDataSpaceOption,
  formatDataSpaceOptionLabel,
  type DataSpaceOption,
} from './DataSpaceQueryBuilder.js';
import { DataSpaceAdvancedSearchModal } from './DataSpaceAdvancedSearchModal.js';

const DataSpaceQuerySetupStoreProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const applicationStore = useLegendQueryApplicationStore();
  const depotServerClient = useDepotServerClient();
  const store = useLocalObservable(
    () => new DataSpaceQuerySetupStore(applicationStore, depotServerClient),
  );
  return (
    <QueryEditorStoreContext.Provider value={store}>
      {children}
    </QueryEditorStoreContext.Provider>
  );
};

export const DataSpaceQuerySetup = observer(() => (
  <DataSpaceQuerySetupStoreProvider>
    <QueryEditor />
  </DataSpaceQuerySetupStoreProvider>
));

/**
 * This setup panel supports cascading in order: Data-space -> Execution context (-> Runtime) -> Class
 *
 * In other words, we will only show:
 * - For runtime selector: the list of compatible runtimes with the selected execution context mapping
 * - For class selector: the list of compatible class with the selected execution context mapping
 *
 * See details on propagation/cascading in {@link DataSpaceQuerySetupState}
 */
const DataSpaceQuerySetupSetupPanelContent = observer(
  (props: { queryBuilderState: DataSpaceQuerySetupState }) => {
    const { queryBuilderState } = props;
    const applicationStore = useApplicationStore();
    const dataSpaceSearchRef = useRef<SelectComponent>(null);
    const [dataSpaceSearchText, setDataSpaceSearchText] = useState('');

    // data space
    const dataSpaceOptions =
      queryBuilderState.dataSpaces.map(buildDataSpaceOption);
    const selectedDataSpaceOption = null;
    const onDataSpaceOptionChange = (option: DataSpaceOption): void => {
      queryBuilderState.onDataSpaceChange(option.value);
    };

    // data space search text
    const debouncedLoadDataSpaces = useMemo(
      () =>
        debounce((input: string): void => {
          flowResult(queryBuilderState.loadDataSpaces(input)).catch(
            applicationStore.alertUnhandledError,
          );
        }, 500),
      [applicationStore, queryBuilderState],
    );
    const onDataSpaceSearchTextChange = (value: string): void => {
      if (value !== dataSpaceSearchText) {
        setDataSpaceSearchText(value);
        debouncedLoadDataSpaces.cancel();
        debouncedLoadDataSpaces(value);
      }
    };
    const openDataSpaceAdvancedSearch = (): void =>
      queryBuilderState.showAdvancedSearchPanel();

    useEffect(() => {
      flowResult(queryBuilderState.loadDataSpaces('')).catch(
        applicationStore.alertUnhandledError,
      );
    }, [queryBuilderState, applicationStore]);

    useEffect(() => dataSpaceSearchRef.current?.focus());

    return (
      <>
        <div className="query-builder__setup__config-group">
          <div className="query-builder__setup__config-group__header">
            <div className="query-builder__setup__config-group__header__title">
              data space execution context
            </div>
          </div>
          <div className="query-builder__setup__config-group__content">
            <div className="query-builder__setup__config-group__item">
              <div
                className="btn--sm query-builder__setup__config-group__item__label"
                title="data space"
              >
                <DataSpaceIcon />
              </div>
              <CustomSelectorInput
                ref={dataSpaceSearchRef}
                className="panel__content__form__section__dropdown query-builder__setup__config-group__item__selector"
                options={dataSpaceOptions}
                isLoading={queryBuilderState.loadDataSpacesState.isInProgress}
                onInputChange={onDataSpaceSearchTextChange}
                inputValue={dataSpaceSearchText}
                onChange={onDataSpaceOptionChange}
                value={selectedDataSpaceOption}
                placeholder="Search for data space..."
                escapeClearsValue={true}
                darkMode={!applicationStore.TEMPORARY__isLightThemeEnabled}
                formatOptionLabel={formatDataSpaceOptionLabel}
              />
              <button
                tabIndex={-1}
                className="query-builder__setup__data-space-searcher__btn btn--dark"
                onClick={openDataSpaceAdvancedSearch}
                title="Open advanced search for data space..."
              >
                <SearchIcon />
              </button>
              {queryBuilderState.advancedSearchState && (
                <DataSpaceAdvancedSearchModal
                  searchState={queryBuilderState.advancedSearchState}
                  onClose={() => queryBuilderState.hideAdvancedSearchPanel()}
                />
              )}
            </div>
          </div>
        </div>
        <QueryBuilderClassSelector
          queryBuilderState={queryBuilderState}
          classes={[]}
          noMatchMessage="No compatible class found"
        />
      </>
    );
  },
);

export const renderDataSpaceQuerySetupSetupPanelContent = (
  queryBuilderState: DataSpaceQuerySetupState,
): React.ReactNode => (
  <DataSpaceQuerySetupSetupPanelContent queryBuilderState={queryBuilderState} />
);
