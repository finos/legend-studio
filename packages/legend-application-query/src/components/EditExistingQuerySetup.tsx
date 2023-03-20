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

import { ArrowLeftIcon } from '@finos/legend-art';
import {
  type ActionState,
  assertErrorThrown,
  guaranteeType,
} from '@finos/legend-shared';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { useContext } from 'react';
import {
  generateExistingQueryEditorRoute,
  generateQuerySetupRoute,
} from '../__lib__/LegendQueryNavigation.js';
import { useApplicationStore } from '@finos/legend-application';
import {
  useLegendQueryApplicationStore,
  useLegendQueryBaseStore,
} from './LegendQueryFrameworkProvider.js';
import { EditExistingQuerySetupStore } from '../stores/EditExistingQuerySetupStore.js';
import { BaseQuerySetup, BaseQuerySetupStoreContext } from './QuerySetup.js';
import type { LightQuery } from '@finos/legend-graph';
import { QueryLoader } from '@finos/legend-query-builder';
import { LegendQueryTelemetryHelper } from '../__lib__/LegendQueryTelemetryHelper.js';

const EditExistingQuerySetupStoreProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const applicationStore = useLegendQueryApplicationStore();
  const baseStore = useLegendQueryBaseStore();
  const store = useLocalObservable(
    () =>
      new EditExistingQuerySetupStore(
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

const useEditExistingQuerySetupStore = (): EditExistingQuerySetupStore =>
  guaranteeType(
    useContext(BaseQuerySetupStoreContext),
    EditExistingQuerySetupStore,
    `Can't find query setup store in context`,
  );

const EditExistingQuerySetupContent = observer(() => {
  const setupStore = useEditExistingQuerySetupStore();
  const applicationStore = useApplicationStore();

  // actions
  const back = (): void => {
    applicationStore.navigationService.navigator.goToLocation(
      generateQuerySetupRoute(),
    );
  };

  const loadQuery = (selectedQuery: LightQuery): void => {
    setupStore.queryLoaderState.setIsQueryLoaderOpen(false);
    applicationStore.navigationService.navigator.goToLocation(
      generateExistingQueryEditorRoute(selectedQuery.id),
      { ignoreBlocking: true },
    );
  };

  const renameQuery = async (
    selectedQuery: LightQuery,
    updatedQueryName: string,
    renameQueryState: ActionState,
  ): Promise<void> => {
    try {
      renameQueryState.inProgress();
      await setupStore.graphManagerState.graphManager.renameQuery(
        selectedQuery.id,
        updatedQueryName,
      );
      applicationStore.notificationService.notifySuccess(
        `Successfully updated query!`,
      );

      LegendQueryTelemetryHelper.logEvent_RenameQuerySucceeded(
        applicationStore.telemetryService,
        {
          query: {
            id: selectedQuery.id,
            name: selectedQuery.name,
            groupId: selectedQuery.groupId,
            artifactId: selectedQuery.artifactId,
            versionId: selectedQuery.versionId,
          },
        },
      );
      selectedQuery.name = updatedQueryName;
      renameQueryState.pass();
    } catch (error) {
      renameQueryState.fail();
      assertErrorThrown(error);
      applicationStore.notificationService.notifyError(error);
    }
  };

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
      </div>
      <div className="query-setup__existing-query__content">
        <QueryLoader
          queryLoaderState={setupStore.queryLoaderState}
          graphManager={setupStore.graphManagerState.graphManager}
          loadQuery={loadQuery}
          renameQuery={renameQuery}
          moreOptions={{ isDeleteSupported: true }}
        />
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
