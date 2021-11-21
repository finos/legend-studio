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
import { Switch, Route, Redirect, useRouteMatch } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { LegendMaterialUITheme } from '@finos/legend-art';
import type { LegendTaxonomyPathParams } from '../stores/LegendTaxonomyRouter';
import {
  URL_PATH_PLACEHOLDER,
  generateRoutePatternWithTaxonomyServerKey,
  generateViewTaxonomyRoute,
  LEGEND_TAXONOMY_ROUTE_PATTERN,
} from '../stores/LegendTaxonomyRouter';
import { ThemeProvider } from '@material-ui/core/styles';
import type { LegendTaxonomyPluginManager } from '../application/LegendTaxonomyPluginManager';
import type { Log } from '@finos/legend-shared';
import { DepotServerClientProvider } from '@finos/legend-server-depot';
import { LegendTaxonomyStoreProvider } from './LegendTaxonomyStoreProvider';
import { GraphManagerStateProvider } from '@finos/legend-graph';
import {
  ActionAlert,
  ApplicationStoreProvider,
  BlockingAlert,
  NotificationSnackbar,
  useApplicationStore,
  useWebApplicationNavigator,
} from '@finos/legend-application';
import type { LegendTaxonomyConfig } from '../application/LegendTaxonomyConfig';
import { TaxonomyViewer } from './TaxonomyViewer';

export const LegendTaxonomyApplicationRoot = observer(() => {
  const applicationStore = useApplicationStore<LegendTaxonomyConfig>();

  return (
    <div className="app">
      <BlockingAlert />
      <ActionAlert />
      <NotificationSnackbar />
      <Switch>
        <Route
          exact={true}
          path={[
            ...LEGEND_TAXONOMY_ROUTE_PATTERN.VIEW,
            ...LEGEND_TAXONOMY_ROUTE_PATTERN.VIEW_BY_TAXONOMY_NODE,
            ...LEGEND_TAXONOMY_ROUTE_PATTERN.VIEW_BY_TAXONOMY_NODE,
          ]}
          component={TaxonomyViewer}
        />
        <Redirect
          to={generateViewTaxonomyRoute(
            applicationStore.config.defaultTaxonomyServerOption,
          )}
        />
      </Switch>
    </div>
  );
});

export const LegendTaxonomyApplication = observer(
  (props: {
    config: LegendTaxonomyConfig;
    pluginManager: LegendTaxonomyPluginManager;
    log: Log;
  }) => {
    const { config, pluginManager, log } = props;
    const navigator = useWebApplicationNavigator();
    const routeMatch = useRouteMatch<LegendTaxonomyPathParams>(
      generateRoutePatternWithTaxonomyServerKey('/*'),
    );
    const matchedTaxonomyServerKey = routeMatch?.params.taxonomyPath;
    const matchingTaxonomyServerOption = config.taxonomyServerOptions.find(
      (option) => {
        if (matchedTaxonomyServerKey === URL_PATH_PLACEHOLDER) {
          return config.defaultTaxonomyServerOption;
        }
        return option.key === matchedTaxonomyServerKey;
      },
    );

    /**
     * NOTE: here we handle 3 cases:
     * 1. When the URL matches specific server pattern, and the key is found: if the key doesn't match
     *    the current server option, update the current server option.
     * 2. When the URL matches specific server pattern, and the key is NOT found: auto-fix the URL by
     *    redirecting users to the setup page with the default server option.
     * 3. When the URL DOES NOT match specific server pattern: do nothing here, let the app flows through
     *    because this might represent a sub-application that does not need to specify a server option
     *    (i.e. use the default server option)
     */
    useEffect(() => {
      if (matchedTaxonomyServerKey) {
        // auto-fix the URL by using the default server option
        if (!matchingTaxonomyServerOption) {
          navigator.goTo(
            generateViewTaxonomyRoute(config.defaultTaxonomyServerOption),
          );
        } else if (
          matchingTaxonomyServerOption !== config.currentTaxonomyServerOption
        ) {
          config.setCurrentTaxonomyServerOption(matchingTaxonomyServerOption);
        }
      }
    }, [
      config,
      navigator,
      matchedTaxonomyServerKey,
      matchingTaxonomyServerOption,
    ]);

    if (
      // See the note above, we will only pass when the either the server option is properly set
      // or the URL does not match the specific server pattern at all (i.e. some sub applications that just
      // uses the default server option)
      matchedTaxonomyServerKey &&
      (!matchingTaxonomyServerOption ||
        matchingTaxonomyServerOption !== config.currentTaxonomyServerOption)
    ) {
      return null;
    }
    return (
      <ApplicationStoreProvider config={config} navigator={navigator} log={log}>
        <DepotServerClientProvider
          config={{
            serverUrl: config.depotServerUrl,
          }}
        >
          <GraphManagerStateProvider pluginManager={pluginManager} log={log}>
            <LegendTaxonomyStoreProvider pluginManager={pluginManager}>
              <ThemeProvider theme={LegendMaterialUITheme}>
                <LegendTaxonomyApplicationRoot />
              </ThemeProvider>
            </LegendTaxonomyStoreProvider>
          </GraphManagerStateProvider>
        </DepotServerClientProvider>
      </ApplicationStoreProvider>
    );
  },
);
