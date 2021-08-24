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
import { ThemeProvider } from '@material-ui/core/styles';
import { LEGEND_QUERY_ROUTE_PATTERN } from '../stores/LegendQueryRouter';
import { QuerySetup } from './QuerySetup';
import {
  CreateQueryLoader,
  ExistingQueryLoader,
  ServiceQueryLoader,
} from './QueryEditor';
import { flowResult } from 'mobx';
import {
  LegendMaterialUITheme,
  PanelLoadingIndicator,
} from '@finos/legend-art';
import type { Log } from '@finos/legend-shared';
import { QueryStoreProvider, useQueryStore } from './QueryStoreProvider';
import { DepotServerClientProvider } from '@finos/legend-server-depot';
import { GraphManagerStateProvider } from '@finos/legend-graph';
import {
  ActionAlert,
  ApplicationStoreProvider,
  BlockingAlert,
  NotificationSnackbar,
  useApplicationStore,
  useWebApplicationNavigator,
} from '@finos/legend-application';
import type { QueryPluginManager } from '../application/QueryPluginManager';
import type { QueryConfig } from '../application/QueryConfig';

const LegendQueryApplicationInner = observer(() => {
  const queryStore = useQueryStore();
  const applicationStore = useApplicationStore();

  useEffect(() => {
    flowResult(queryStore.initialize()).catch(
      applicationStore.alertIllegalUnhandledError,
    );
  }, [queryStore, applicationStore]);

  return (
    <div className="app">
      <BlockingAlert />
      <ActionAlert />
      <NotificationSnackbar />
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
            path={LEGEND_QUERY_ROUTE_PATTERN.CREATE_QUERY}
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
    config: QueryConfig;
    pluginManager: QueryPluginManager;
    log: Log;
  }) => {
    const { config, pluginManager, log } = props;
    const navigator = useWebApplicationNavigator();

    return (
      <ApplicationStoreProvider config={config} navigator={navigator} log={log}>
        <DepotServerClientProvider
          config={{
            serverUrl: config.depotServerUrl,
          }}
        >
          <GraphManagerStateProvider pluginManager={pluginManager} log={log}>
            <QueryStoreProvider pluginManager={pluginManager}>
              <ThemeProvider theme={LegendMaterialUITheme}>
                <LegendQueryApplicationInner />
              </ThemeProvider>
            </QueryStoreProvider>
          </GraphManagerStateProvider>
        </DepotServerClientProvider>
      </ApplicationStoreProvider>
    );
  },
);
