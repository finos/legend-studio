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
import type {
  ApplicationStore,
  GenericLegendApplicationStore,
} from '../stores/ApplicationStore.js';
import type { LegendApplicationConfig } from '../application/LegendApplicationConfig.js';
import { guaranteeNonNullable } from '@finos/legend-shared';
import type { LegendApplicationPluginManager } from '../application/LegendApplicationPluginManager.js';
import type { LegendApplicationPlugin } from '../stores/LegendApplicationPlugin.js';

const ApplicationStoreContext = createContext<
  GenericLegendApplicationStore | undefined
>(undefined);

export const useApplicationStore = <
  T extends LegendApplicationConfig,
  V extends LegendApplicationPluginManager<LegendApplicationPlugin>,
>(): ApplicationStore<T, V> =>
  guaranteeNonNullable(
    useContext(ApplicationStoreContext) as ApplicationStore<T, V> | undefined,
    `Can't find application store in context`,
  );

export const ApplicationStoreProvider = <
  T extends LegendApplicationConfig,
  V extends LegendApplicationPluginManager<LegendApplicationPlugin>,
>(props: {
  children: React.ReactNode;
  store: ApplicationStore<T, V>;
}) => {
  const { children, store } = props;
  const applicationStore = useLocalObservable(() => store);
  return (
    <ApplicationStoreContext.Provider value={applicationStore}>
      {children}
    </ApplicationStoreContext.Provider>
  );
};
