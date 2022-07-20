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

import { Redirect, Route, Switch } from 'react-router';
import { observer } from 'mobx-react-lite';
import { LEGEND_QUERY_ROUTE_PATTERN } from '../stores/LegendQueryRouter.js';
import { QuerySetup } from './QuerySetup.js';
import {
  CreateQueryEditor,
  ExistingQueryEditor,
  ServiceQueryEditor,
} from './QueryEditor.js';
import { LegendQueryStoreProvider } from './LegendQueryStoreProvider.js';
import { DepotServerClientProvider } from '@finos/legend-server-depot';
import {
  generateExtensionUrlPattern,
  LegendApplicationComponentFrameworkProvider,
  useApplicationStore,
} from '@finos/legend-application';
import type { LegendQueryPluginManager } from '../application/LegendQueryPluginManager.js';
import type { LegendQueryConfig } from '../application/LegendQueryConfig.js';

const LegendQueryApplicationRoot = observer(() => {
  const applicationStore = useApplicationStore<LegendQueryConfig>();
  const extraApplicationPageEntries = applicationStore.pluginManager
    .getApplicationPlugins()
    .flatMap((plugin) => plugin.getExtraApplicationPageEntries?.() ?? []);

  return (
    <div className="app">
      <Switch>
        <Route
          exact={true}
          path={LEGEND_QUERY_ROUTE_PATTERN.SETUP}
          component={QuerySetup}
        />
        <Route
          exact={true}
          path={LEGEND_QUERY_ROUTE_PATTERN.EXISTING_QUERY}
          component={ExistingQueryEditor}
        />
        <Route
          exact={true}
          path={LEGEND_QUERY_ROUTE_PATTERN.SERVICE_QUERY}
          component={ServiceQueryEditor}
        />
        <Route
          exact={true}
          path={LEGEND_QUERY_ROUTE_PATTERN.CREATE_QUERY}
          component={CreateQueryEditor}
        />
        {extraApplicationPageEntries.map((entry) => (
          <Route
            key={entry.key}
            exact={true}
            path={entry.urlPatterns.map(generateExtensionUrlPattern)}
            component={entry.renderer as React.ComponentType<unknown>}
          />
        ))}
        <Redirect to={LEGEND_QUERY_ROUTE_PATTERN.SETUP} />
      </Switch>
    </div>
  );
});

export const LegendQueryApplication = observer(
  (props: {
    config: LegendQueryConfig;
    pluginManager: LegendQueryPluginManager;
  }) => {
    const { config, pluginManager } = props;

    return (
      <DepotServerClientProvider
        config={{
          serverUrl: config.depotServerUrl,
          TEMPORARY__useLegacyDepotServerAPIRoutes:
            config.TEMPORARY__useLegacyDepotServerAPIRoutes,
        }}
      >
        <LegendQueryStoreProvider pluginManager={pluginManager}>
          <LegendApplicationComponentFrameworkProvider>
            <LegendQueryApplicationRoot />
          </LegendApplicationComponentFrameworkProvider>
        </LegendQueryStoreProvider>
      </DepotServerClientProvider>
    );
  },
);
