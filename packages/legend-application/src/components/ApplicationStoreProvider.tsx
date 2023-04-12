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

import { createContext, useContext, useEffect } from 'react';
import { observer, useLocalObservable } from 'mobx-react-lite';
import {
  ApplicationStore,
  type GenericLegendApplicationStore,
} from '../stores/ApplicationStore.js';
import type { LegendApplicationConfig } from '../application/LegendApplicationConfig.js';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { useWebApplicationNavigator } from './WebApplicationNavigatorProvider.js';
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

const ApplicationContent = observer(
  (props: { children: React.ReactNode }): React.ReactElement => {
    const { children } = props;
    const applicationStore = useApplicationStore();

    useEffect(() => {
      applicationStore.initialize().catch(applicationStore.alertUnhandledError);
    }, [applicationStore]);

    if (!applicationStore.initState.hasSucceeded) {
      return <></>;
    }
    // TODO: would be great if we can have <React.StrictMode> here but since Mobx React is not ready for
    // concurrency yet, we would have to wait
    // See https://github.com/mobxjs/mobx/issues/2526
    return <>{children}</>;
  },
);

export const ApplicationStoreProvider = <
  T extends LegendApplicationConfig,
  V extends LegendApplicationPluginManager<LegendApplicationPlugin>,
>({
  children,
  config,
  pluginManager,
}: {
  children: React.ReactNode;
  config: T;
  pluginManager: V;
}): React.ReactElement => {
  const navigator = useWebApplicationNavigator();
  const applicationStore = useLocalObservable(
    () => new ApplicationStore(config, navigator, pluginManager),
  );
  return (
    <ApplicationStoreContext.Provider value={applicationStore}>
      <ApplicationContent>{children}</ApplicationContent>
    </ApplicationStoreContext.Provider>
  );
};
