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

import { useEffect } from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { LEGEND_QUERY_ROUTE_PATTERN } from '../stores/LegendQueryRouter';
import { QuerySetup } from './QuerySetup';
import {
  CreateQueryLoader,
  ExistingQueryLoader,
  ServiceQueryLoader,
} from './QueryEditor';
import { flowResult } from 'mobx';
import { PanelLoadingIndicator } from '@finos/legend-art';
import {
  LegendQueryStoreProvider,
  useLegendQueryStore,
} from './LegendQueryStoreProvider';
import { DepotServerClientProvider } from '@finos/legend-server-depot';
import { GraphManagerStateProvider } from '@finos/legend-graph';
import {
  LegendApplicationComponentFrameworkProvider,
  useApplicationStore,
} from '@finos/legend-application';
import type { LegendQueryPluginManager } from '../application/LegendQueryPluginManager';
import type { LegendQueryConfig } from '../application/LegendQueryConfig';

const LegendQueryApplicationInner = observer(() => {
  const queryStore = useLegendQueryStore();
  const applicationStore = useApplicationStore();

  useEffect(() => {
    flowResult(queryStore.initialize()).catch(
      applicationStore.alertUnhandledError,
    );
  }, [queryStore, applicationStore]);

  return (
    <div className="app">
      <PanelLoadingIndicator isLoading={queryStore.initState.isInProgress} />
      {queryStore.initState.hasSucceeded && (
        <Switch>
          <Route
            exact={true}
            path={LEGEND_QUERY_ROUTE_PATTERN.EXISTING_QUERY}
            component={ExistingQueryLoader}
          />
          <Route
            exact={true}
            path={LEGEND_QUERY_ROUTE_PATTERN.SERVICE_QUERY}
            component={ServiceQueryLoader}
          />
          <Route
            exact={true}
            path={[
              LEGEND_QUERY_ROUTE_PATTERN.CREATE_QUERY,
              LEGEND_QUERY_ROUTE_PATTERN.CREATE_QUERY_WITH_CLASS,
            ]}
            component={CreateQueryLoader}
          />
          <Route
            exact={true}
            path={LEGEND_QUERY_ROUTE_PATTERN.SETUP}
            component={QuerySetup}
          />
          <Redirect to={LEGEND_QUERY_ROUTE_PATTERN.SETUP} />
        </Switch>
      )}
    </div>
  );
});

export const LegendQueryApplication = observer(
  (props: {
    config: LegendQueryConfig;
    pluginManager: LegendQueryPluginManager;
  }) => {
    const { config, pluginManager } = props;
    const applicationStore = useApplicationStore();

    return (
      <DepotServerClientProvider
        config={{
          serverUrl: config.depotServerUrl,
          TEMPORARY__useLegacyDepotServerAPIRoutes:
            config.TEMPORARY__useLegacyDepotServerAPIRoutes,
        }}
      >
        <GraphManagerStateProvider
          pluginManager={pluginManager}
          log={applicationStore.log}
        >
          <LegendQueryStoreProvider pluginManager={pluginManager}>
            <LegendApplicationComponentFrameworkProvider>
              <LegendQueryApplicationInner />
            </LegendApplicationComponentFrameworkProvider>
          </LegendQueryStoreProvider>
        </GraphManagerStateProvider>
      </DepotServerClientProvider>
    );
  },
);
