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
import { useApplicationStore } from '@finos/legend-studio';
import { ProjectDashboardStore } from '../stores/ProjectDashboardStore';

const ProjectDashboardStoreContext = createContext<
  ProjectDashboardStore | undefined
>(undefined);

export const ProjectDashboardStoreProvider = ({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement => {
  const applicationStore = useApplicationStore();
  const store = useLocalObservable(
    () => new ProjectDashboardStore(applicationStore),
  );
  return (
    <ProjectDashboardStoreContext.Provider value={store}>
      {children}
    </ProjectDashboardStoreContext.Provider>
  );
};

export const useProjectDashboardStore = (): ProjectDashboardStore =>
  guaranteeNonNullable(
    useContext(ProjectDashboardStoreContext),
    'useProjectDashboardStore() hook must be used inside ProjectDashboardStoreContext context provider',
  );
