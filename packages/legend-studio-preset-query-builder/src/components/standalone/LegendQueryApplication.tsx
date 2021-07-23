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
import { Redirect, Route, Switch, useHistory } from 'react-router-dom';
import type { History, State } from 'history';
import { observer } from 'mobx-react-lite';
import { PanelLoadingIndicator } from '@finos/legend-studio-components';
import { ThemeProvider } from '@material-ui/core/styles';
import type { ApplicationConfig, PluginManager } from '@finos/legend-studio';
import {
  ActionAlert,
  ApplicationStoreProvider,
  BlockingAlert,
  LegendMaterialUITheme,
  NotificationSnackbar,
  useApplicationStore,
} from '@finos/legend-studio';
import { LEGEND_QUERY_ROUTE_PATTERN } from '../../stores/LegendQueryRouter';
import { QuerySetup } from './QuerySetup';
import { QueryStoreProvider } from '../../stores/QueryStore';
import { QueryEditor } from './QueryEditor';

export const LegendQueryApplicationRoot = observer(() => {
  const applicationStore = useApplicationStore();

  useEffect(() => {
    applicationStore.init().catch(applicationStore.alertIllegalUnhandledError);
  }, [applicationStore]);

  return (
    <div className="app">
      <BlockingAlert />
      <ActionAlert />
      <NotificationSnackbar />
      {!applicationStore.isSDLCAuthorized && (
        <div className="app__page">
          <PanelLoadingIndicator isLoading={true} />
        </div>
      )}
      {applicationStore.isSDLCAuthorized && (
        <Switch>
          <Route
            exact={true}
            path={[
              LEGEND_QUERY_ROUTE_PATTERN.LOAD_SERVICE_QUERY,
              LEGEND_QUERY_ROUTE_PATTERN.CREATE_NEW_QUERY,
              LEGEND_QUERY_ROUTE_PATTERN.EDIT_QUERY,
            ]}
            component={QueryEditor}
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
  (props: { config: ApplicationConfig; pluginManager: PluginManager }) => {
    const { config, pluginManager } = props;
    const history = useHistory() as unknown as History<State>;

    if (!config.isConfigured) {
      return null;
    }
    return (
      <ApplicationStoreProvider
        config={config}
        history={history}
        pluginManager={pluginManager}
      >
        <QueryStoreProvider>
          <ThemeProvider theme={LegendMaterialUITheme}>
            <LegendQueryApplicationRoot />
          </ThemeProvider>
        </QueryStoreProvider>
      </ApplicationStoreProvider>
    );
  },
);
