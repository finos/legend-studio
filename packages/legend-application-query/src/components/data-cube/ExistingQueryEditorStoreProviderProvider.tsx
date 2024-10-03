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

import { createContext, useContext } from 'react';
import { useLocalObservable } from 'mobx-react-lite';
import { ExistingQueryDataCubeEditorStore } from '../../stores/data-cube/ExistingQueryDataCubeViewer.js';
import {
  useLegendQueryApplicationStore,
  useLegendQueryBaseStore,
} from '../LegendQueryFrameworkProvider.js';
import { guaranteeNonNullable } from '@finos/legend-shared';

export const ExistingQueryDataCubeEditorStoreContext = createContext<
  ExistingQueryDataCubeEditorStore | undefined
>(undefined);

export const ExistingQueryDataCubeEditorStoreProvider: React.FC<{
  children: React.ReactNode;
  queryId: string;
}> = ({ children, queryId }) => {
  const applicationStore = useLegendQueryApplicationStore();
  const baseStore = useLegendQueryBaseStore();
  const store = useLocalObservable(
    () =>
      new ExistingQueryDataCubeEditorStore(
        applicationStore,
        baseStore.depotServerClient,
        queryId,
      ),
  );
  return (
    <ExistingQueryDataCubeEditorStoreContext.Provider value={store}>
      {children}
    </ExistingQueryDataCubeEditorStoreContext.Provider>
  );
};

export const useExistingQueryDataCubeEditorStore =
  (): ExistingQueryDataCubeEditorStore =>
    guaranteeNonNullable(
      useContext(ExistingQueryDataCubeEditorStoreContext),
      `Can't find query editor store in context`,
    );
