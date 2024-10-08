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
  CustomSelectorInput,
  SearchIcon,
  type SelectComponent,
} from '@finos/legend-art';
import { debounce, guaranteeType } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { generateQuerySetupRoute } from '../__lib__/LegendQueryNavigation.js';
import {
  useLegendQueryApplicationStore,
  useLegendQueryBaseStore,
} from './LegendQueryFrameworkProvider.js';
import { UpdateExistingServiceQuerySetupStore } from '../stores/UpdateExistingServiceQuerySetupStore.js';
import { BaseQuerySetup, BaseQuerySetupStoreContext } from './QuerySetup.js';
import {
  buildServiceOption,
  formatServiceOptionLabel,
  type ServiceOption,
} from '@finos/legend-query-builder';

const UpdateExistingServiceQuerySetupStoreProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const applicationStore = useLegendQueryApplicationStore();
  const baseStore = useLegendQueryBaseStore();
  const store = useLocalObservable(
    () =>
      new UpdateExistingServiceQuerySetupStore(
        applicationStore,
        baseStore.depotServerClient,
      ),
  );
  return (
    <BaseQuerySetupStoreContext.Provider value={store}>
      {children}
    </BaseQuerySetupStoreContext.Provider>
  );
};

const useUpdateExistingServiceQuerySetupStore =
  (): UpdateExistingServiceQuerySetupStore =>
    guaranteeType(
      useContext(BaseQuerySetupStoreContext),
      UpdateExistingServiceQuerySetupStore,
      `Can't find query setup store in context`,
    );

const UpdateExistingServiceQuerySetupContent = observer(() => {
  const applicationStore = useLegendQueryApplicationStore();
  const setupStore = useUpdateExistingServiceQuerySetupStore();
  const serviceSearchRef = useRef<SelectComponent>(null);
  const [searchText, setSearchText] = useState('');

  const back = (): void => {
    applicationStore.navigationService.navigator.goToLocation(
      generateQuerySetupRoute(),
    );
  };

  const serviceOptions = setupStore.services.map(buildServiceOption);
  const onServiceOptionChange = (option: ServiceOption): void => {
    setupStore
      .loadServiceUpdater(option.value)
      .catch(applicationStore.alertUnhandledError);
  };

  // search text
  const debouncedLoadServices = useMemo(
    () =>
      debounce((input: string): void => {
        flowResult(setupStore.loadServices(input)).catch(
          applicationStore.alertUnhandledError,
        );
      }, 500),
    [applicationStore, setupStore],
  );
  const onSearchTextChange = (value: string): void => {
    if (value !== searchText) {
      setSearchText(value);
      debouncedLoadServices.cancel();
      debouncedLoadServices(value);
    }
  };

  useEffect(() => {
    flowResult(setupStore.loadServices('')).catch(
      applicationStore.alertUnhandledError,
    );
  }, [setupStore, applicationStore]);

  useEffect(() => {
    serviceSearchRef.current?.focus();
  }, []);

  return (
    <div className="query-setup__wizard query-setup__existing-service-query">
      <div className="query-setup__wizard__header query-setup__existing-service-query__header">
        <button
          className="query-setup__wizard__header__btn"
          onClick={back}
          title="Back to Main Menu"
        >
          <ArrowLeftIcon />
        </button>
        <div className="query-setup__wizard__header__title">
          Updating an existing service query...
        </div>
      </div>
      <div className="query-setup__wizard__content">
        <div className="query-setup__wizard__group query-setup__wizard__group--inline query-setup__existing-service-query__search-bar">
          <div className="query-setup__wizard__group__title">
            <SearchIcon />
          </div>
          <CustomSelectorInput
            inputRef={serviceSearchRef}
            className="query-setup__wizard__selector"
            options={serviceOptions}
            isLoading={setupStore.loadServicesState.isInProgress}
            onInputChange={onSearchTextChange}
            inputValue={searchText}
            onChange={onServiceOptionChange}
            placeholder="Search for service..."
            darkMode={
              !applicationStore.layoutService
                .TEMPORARY__isLightColorThemeEnabled
            }
            formatOptionLabel={formatServiceOptionLabel}
          />
        </div>
      </div>
    </div>
  );
});

export const UpdateExistingServiceQuerySetup: React.FC = () => (
  <UpdateExistingServiceQuerySetupStoreProvider>
    <BaseQuerySetup>
      <UpdateExistingServiceQuerySetupContent />
    </BaseQuerySetup>
  </UpdateExistingServiceQuerySetupStoreProvider>
);
