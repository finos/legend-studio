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
import { useLegendQueryStore } from './LegendQueryStoreProvider.js';
import { guaranteeNonNullable } from '@finos/legend-shared';
import {
  type QueryEditorStore,
  CreateQueryEditorStore,
  ExistingQueryEditorStore,
  ServiceQueryEditorStore,
} from '../stores/QueryEditorStore.js';
import { useApplicationStore } from '@finos/legend-application';
import type { LegendQueryConfig } from '../application/LegendQueryConfig.js';
import { useDepotServerClient } from '@finos/legend-server-depot';

const QueryEditorStoreContext = createContext<QueryEditorStore | undefined>(
  undefined,
);

export const ExistingQueryEditorStoreProvider: React.FC<{
  children: React.ReactNode;
  queryId: string;
}> = ({ children, queryId }) => {
  const applicationStore = useApplicationStore<LegendQueryConfig>();
  const depotServerClient = useDepotServerClient();
  const queryStore = useLegendQueryStore();
  const store = useLocalObservable(
    () =>
      new ExistingQueryEditorStore(
        applicationStore,
        depotServerClient,
        queryStore.pluginManager,
        queryId,
      ),
  );
  return (
    <QueryEditorStoreContext.Provider value={store}>
      {children}
    </QueryEditorStoreContext.Provider>
  );
};

export const CreateQueryEditorStoreProvider: React.FC<{
  children: React.ReactNode;
  groupId: string;
  artifactId: string;
  versionId: string;
  mappingPath: string;
  runtimePath: string;
  classPath: string | undefined;
}> = ({
  children,
  groupId,
  artifactId,
  versionId,
  mappingPath,
  runtimePath,
  classPath,
}) => {
  const applicationStore = useApplicationStore<LegendQueryConfig>();
  const depotServerClient = useDepotServerClient();
  const queryStore = useLegendQueryStore();
  const store = useLocalObservable(
    () =>
      new CreateQueryEditorStore(
        applicationStore,
        depotServerClient,
        queryStore.pluginManager,
        groupId,
        artifactId,
        versionId,
        mappingPath,
        runtimePath,
        classPath,
      ),
  );
  return (
    <QueryEditorStoreContext.Provider value={store}>
      {children}
    </QueryEditorStoreContext.Provider>
  );
};

export const ServiceQueryEditorStoreProvider: React.FC<{
  children: React.ReactNode;
  groupId: string;
  artifactId: string;
  versionId: string;
  servicePath: string;
  executionKey: string | undefined;
}> = ({
  children,
  groupId,
  artifactId,
  versionId,
  servicePath,
  executionKey,
}) => {
  const applicationStore = useApplicationStore<LegendQueryConfig>();
  const depotServerClient = useDepotServerClient();
  const queryStore = useLegendQueryStore();
  const store = useLocalObservable(
    () =>
      new ServiceQueryEditorStore(
        applicationStore,
        depotServerClient,
        queryStore.pluginManager,
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
