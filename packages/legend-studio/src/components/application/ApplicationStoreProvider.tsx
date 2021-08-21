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
import { ApplicationStore } from '../../stores/ApplicationStore';
import type { ApplicationConfig } from '../../stores/application/ApplicationConfig';
import type { Log } from '@finos/legend-shared';
import { guaranteeNonNullable } from '@finos/legend-shared';
import type { WebApplicationNavigator } from '../../stores/application/WebApplicationNavigator';

const ApplicationStoreContext = createContext<ApplicationStore | undefined>(
  undefined,
);

export const ApplicationStoreProvider = ({
  children,
  config,
  navigator,
  log,
}: {
  children: React.ReactNode;
  config: ApplicationConfig;
  navigator: WebApplicationNavigator;
  log: Log;
}): React.ReactElement => {
  const applicationStore = useLocalObservable(
    () => new ApplicationStore(config, navigator, log),
  );
  return (
    <ApplicationStoreContext.Provider value={applicationStore}>
      {children}
    </ApplicationStoreContext.Provider>
  );
};

export const useApplicationStore = (): ApplicationStore =>
  guaranteeNonNullable(
    useContext(ApplicationStoreContext),
    `Can't find application store in context`,
  );
