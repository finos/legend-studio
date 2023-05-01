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
import { guaranteeType } from '@finos/legend-shared';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { useContext } from 'react';
import { useApplicationStore } from '@finos/legend-application';
import {
  useLegendQueryApplicationStore,
  useLegendQueryBaseStore,
} from './LegendQueryFrameworkProvider.js';
import { QueryProductionizerSetupStore } from '../stores/QueryProductionizerSetupStore.js';
import { BaseQuerySetup, BaseQuerySetupStoreContext } from './QuerySetup.js';
import { generateQuerySetupRoute } from '../__lib__/LegendQueryNavigation.js';
import { QueryLoader } from '@finos/legend-query-builder';

const QueryProductionizerSetupStoreProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const applicationStore = useLegendQueryApplicationStore();
  const baseStore = useLegendQueryBaseStore();
  const store = useLocalObservable(
    () =>
      new QueryProductionizerSetupStore(
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

const useQueryProductionizerSetupStore = (): QueryProductionizerSetupStore =>
  guaranteeType(
    useContext(BaseQuerySetupStoreContext),
    QueryProductionizerSetupStore,
    `Can't find query setup store in context`,
  );

const QueryProductionizerSetupContent = observer(() => {
  const applicationStore = useApplicationStore();
  const setupStore = useQueryProductionizerSetupStore();

  // actions
  const back = (): void => {
    applicationStore.navigationService.navigator.goToLocation(
      generateQuerySetupRoute(),
    );
  };

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
      </div>
      <div className="query-setup__productionize-query__content">
        <QueryLoader
          queryLoaderState={setupStore.queryLoaderState}
          loadActionLabel="productionize query"
        />
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
