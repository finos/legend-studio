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
import type { ApplicationConfig, PluginManager } from '@finos/legend-studio';
import {
  useWebApplicationNavigator,
  useApplicationStore,
  ActionAlert,
  ApplicationStoreProvider,
  BlockingAlert,
  NotificationSnackbar,
} from '@finos/legend-studio';
import { LEGEND_QUERY_ROUTE_PATTERN } from '../../stores/LegendQueryRouter';
import { QuerySetup } from './QuerySetup';
import { QueryStoreProvider, useQueryStore } from '../../stores/QueryStore';
import {
  CreateQueryLoader,
  ExistingQueryLoader,
  ServiceQueryLoader,
} from './QueryEditor';
import { flowResult } from 'mobx';
import {
  LegendMaterialUITheme,
  PanelLoadingIndicator,
} from '@finos/legend-studio-components';
import type { Log } from '@finos/legend-studio-shared';

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
    config: ApplicationConfig;
    pluginManager: PluginManager;
    log: Log;
  }) => {
    const { config, pluginManager, log } = props;
    const navigator = useWebApplicationNavigator();

    if (!config.isConfigured) {
      return null;
    }
    return (
      <ApplicationStoreProvider
        config={config}
        navigator={navigator}
        pluginManager={pluginManager}
        log={log}
      >
        <QueryStoreProvider>
          <ThemeProvider theme={LegendMaterialUITheme}>
            <LegendQueryApplicationInner />
          </ThemeProvider>
        </QueryStoreProvider>
      </ApplicationStoreProvider>
    );
  },
);
