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
import { guaranteeNonNullable } from '@finos/legend-shared';
import {
  type QueryEditorStore,
  MappingQueryCreatorStore,
  ExistingQueryEditorStore,
  ServiceQueryCreatorStore,
} from '../stores/QueryEditorStore.js';
import {
  useLegendQueryApplicationStore,
  useLegendQueryBaseStore,
} from './LegendQueryFrameworkProvider.js';
import { parseGAVCoordinates } from '@finos/legend-storage';

export const QueryEditorStoreContext = createContext<
  QueryEditorStore | undefined
>(undefined);

export const ExistingQueryEditorStoreProvider: React.FC<{
  children: React.ReactNode;
  queryId: string;
  params: Record<string, string> | undefined;
}> = ({ children, queryId, params }) => {
  const applicationStore = useLegendQueryApplicationStore();
  const baseStore = useLegendQueryBaseStore();
  const store = useLocalObservable(
    () =>
      new ExistingQueryEditorStore(
        applicationStore,
        baseStore.depotServerClient,
        queryId,
        params,
      ),
  );
  return (
    <QueryEditorStoreContext.Provider value={store}>
      {children}
    </QueryEditorStoreContext.Provider>
  );
};

export const MappingQueryCreatorStoreProvider: React.FC<{
  children: React.ReactNode;
  gav: string;
  mappingPath: string;
  runtimePath: string;
}> = ({ children, gav, mappingPath, runtimePath }) => {
  const { groupId, artifactId, versionId } = parseGAVCoordinates(gav);
  const applicationStore = useLegendQueryApplicationStore();
  const baseStore = useLegendQueryBaseStore();
  const store = useLocalObservable(
    () =>
      new MappingQueryCreatorStore(
        applicationStore,
        baseStore.depotServerClient,
        groupId,
        artifactId,
        versionId,
        mappingPath,
        runtimePath,
      ),
  );
  return (
    <QueryEditorStoreContext.Provider value={store}>
      {children}
    </QueryEditorStoreContext.Provider>
  );
};

export const ServiceQueryCreatorStoreProvider: React.FC<{
  children: React.ReactNode;
  gav: string;
  servicePath: string;
  executionKey: string | undefined;
}> = ({ children, gav, servicePath, executionKey }) => {
  const { groupId, artifactId, versionId } = parseGAVCoordinates(gav);
  const applicationStore = useLegendQueryApplicationStore();
  const baseStore = useLegendQueryBaseStore();
  const store = useLocalObservable(
    () =>
      new ServiceQueryCreatorStore(
        applicationStore,
        baseStore.depotServerClient,
        groupId,
        artifactId,
        versionId,
        servicePath,
        executionKey,
      ),
  );
  return (
    <QueryEditorStoreContext.Provider value={store}>
      {children}
    </QueryEditorStoreContext.Provider>
  );
};

export const useQueryEditorStore = (): QueryEditorStore =>
  guaranteeNonNullable(
    useContext(QueryEditorStoreContext),
    `Can't find query editor store in context`,
  );
