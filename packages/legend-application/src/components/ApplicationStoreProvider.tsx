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
import { ApplicationStore } from '../stores/ApplicationStore';
import type { LegendApplicationConfig } from '../stores/LegendApplicationConfig';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { useWebApplicationNavigator } from './WebApplicationNavigatorProvider';
import type { LegendApplicationPluginManager } from '../application/LegendApplicationPluginManager';

const ApplicationStoreContext = createContext<
  ApplicationStore<LegendApplicationConfig> | undefined
>(undefined);

export const ApplicationStoreProvider = <T extends LegendApplicationConfig>({
  children,
  config,
  pluginManager,
}: {
  children: React.ReactNode;
  config: T;
  pluginManager: LegendApplicationPluginManager;
}): React.ReactElement => {
  const navigator = useWebApplicationNavigator();
  const applicationStore = useLocalObservable(
    () => new ApplicationStore(config, navigator, pluginManager),
  );
  return (
    <ApplicationStoreContext.Provider value={applicationStore}>
      {children}
    </ApplicationStoreContext.Provider>
  );
};

export const useApplicationStore = <
  T extends LegendApplicationConfig,
>(): ApplicationStore<T> =>
  guaranteeNonNullable(
    useContext(ApplicationStoreContext) as ApplicationStore<T> | undefined,
    `Can't find application store in context`,
  );
