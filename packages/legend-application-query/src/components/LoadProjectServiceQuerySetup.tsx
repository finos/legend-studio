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

import { ArrowLeftIcon, CustomSelectorInput } from '@finos/legend-art';
import { guaranteeType } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { useContext, useEffect } from 'react';
import { generateQuerySetupRoute } from '../__lib__/LegendQueryNavigation.js';
import {
  useLegendQueryApplicationStore,
  useLegendQueryBaseStore,
} from './LegendQueryFrameworkProvider.js';
import { LoadProjectServiceQuerySetupStore } from '../stores/LoadProjectServiceQuerySetupStore.js';
import {
  BaseQuerySetup,
  BaseQuerySetupStoreContext,
  buildProjectOption,
  type ProjectOption,
} from './QuerySetup.js';
import {} from '@finos/legend-query-builder';
import { useApplicationStore } from '@finos/legend-application';

const LoadProjectServiceQuerySetupStoreProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const applicationStore = useLegendQueryApplicationStore();
  const baseStore = useLegendQueryBaseStore();
  const store = useLocalObservable(
    () =>
      new LoadProjectServiceQuerySetupStore(
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

const useLoadProjectServiceQuerySetupStore =
  (): LoadProjectServiceQuerySetupStore =>
    guaranteeType(
      useContext(BaseQuerySetupStoreContext),
      LoadProjectServiceQuerySetupStore,
      `Can't find query setup store in context`,
    );

const LoadProjectServiceQuerySetupContent = observer(() => {
  const applicationStore = useApplicationStore();
  const setupStore = useLoadProjectServiceQuerySetupStore();

  const back = (): void => {
    applicationStore.navigationService.navigator.goToLocation(
      generateQuerySetupRoute(),
    );
  };

  // project
  const projectOptions = setupStore.projects.map(buildProjectOption);
  const projectSelectorPlaceholder = setupStore.loadProjectsState.isInProgress
    ? 'Loading projects'
    : setupStore.loadProjectsState.hasFailed
      ? 'Error fetching projects'
      : setupStore.projects.length
        ? 'Choose a project'
        : 'You have no projects, please create or acquire access for at least one';
  const onProjectOptionChange = (option: ProjectOption): void => {
    setupStore
      .loadProjectServiceUpdater(option.value)
      .catch(applicationStore.alertUnhandledError);
  };

  useEffect(() => {
    flowResult(setupStore.loadProjects()).catch(
      applicationStore.alertUnhandledError,
    );
  }, [setupStore, applicationStore]);

  return (
    <div className="query-setup__wizard query-setup__existing-service-query">
      <div className="query-setup__wizard__header query-setup__service-query__header">
        <button
          className="query-setup__wizard__header__btn"
          onClick={back}
          title="Back to Main Menu"
        >
          <ArrowLeftIcon />
        </button>
        <div className="query-setup__wizard__header__title">
          Load service query from a project...
        </div>
      </div>
      <div className="query-setup__wizard__content">
        <div className="query-setup__wizard__group query-setup__wizard__group--inline query-setup__existing-service-query__search-bar">
          <CustomSelectorInput
            className="query-setup__wizard__selector"
            options={projectOptions}
            disabled={
              setupStore.loadProjectsState.isInProgress ||
              !projectOptions.length
            }
            isLoading={setupStore.loadProjectsState.isInProgress}
            onChange={onProjectOptionChange}
            placeholder={projectSelectorPlaceholder}
            darkMode={
              !applicationStore.layoutService
                .TEMPORARY__isLightColorThemeEnabled
            }
          />
        </div>
      </div>
    </div>
  );
});

export const LoadProjectServiceQuerySetup: React.FC = () => (
  <LoadProjectServiceQuerySetupStoreProvider>
    <BaseQuerySetup>
      <LoadProjectServiceQuerySetupContent />
    </BaseQuerySetup>
  </LoadProjectServiceQuerySetupStoreProvider>
);
