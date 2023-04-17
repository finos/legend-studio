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
  type ServiceQueryEditorStore,
  ServiceQueryUpdaterStore,
  ProjectServiceQueryUpdaterStore,
} from '../../stores/studio/ServiceQueryEditorStore.js';
import {
  useLegendStudioApplicationStore,
  useLegendStudioBaseStore,
} from '@finos/legend-application-studio';

export const ServiceQueryEditorStoreContext = createContext<
  ServiceQueryEditorStore | undefined
>(undefined);

export const ServiceQueryUpdaterStoreProvider: React.FC<{
  children: React.ReactNode;
  serviceCoordinates: string;
  groupWorkspaceId: string;
}> = ({ children, serviceCoordinates, groupWorkspaceId }) => {
  const applicationStore = useLegendStudioApplicationStore();
  const baseStore = useLegendStudioBaseStore();
  const store = useLocalObservable(
    () =>
      new ServiceQueryUpdaterStore(
        applicationStore,
        baseStore.sdlcServerClient,
        baseStore.depotServerClient,
        serviceCoordinates,
        groupWorkspaceId,
      ),
  );
  return (
    <ServiceQueryEditorStoreContext.Provider value={store}>
      {children}
    </ServiceQueryEditorStoreContext.Provider>
  );
};

export const ProjectServiceQueryUpdaterStoreProvider: React.FC<{
  children: React.ReactNode;
  projectId: string;
  groupWorkspaceId: string;
  servicePath: string;
}> = ({ children, projectId, groupWorkspaceId, servicePath }) => {
  const applicationStore = useLegendStudioApplicationStore();
  const baseStore = useLegendStudioBaseStore();
  const store = useLocalObservable(
    () =>
      new ProjectServiceQueryUpdaterStore(
        applicationStore,
        baseStore.sdlcServerClient,
        baseStore.depotServerClient,
        projectId,
        groupWorkspaceId,
        servicePath,
      ),
  );
  return (
    <ServiceQueryEditorStoreContext.Provider value={store}>
      {children}
    </ServiceQueryEditorStoreContext.Provider>
  );
};

export const useServiceQueryEditorStore = (): ServiceQueryEditorStore =>
  guaranteeNonNullable(
    useContext(ServiceQueryEditorStoreContext),
    `Can't find service query editor store in context`,
  );
