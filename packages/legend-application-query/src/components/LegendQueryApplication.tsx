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

import { observer } from 'mobx-react-lite';
import { LEGEND_QUERY_ROUTE_PATTERN } from '../stores/LegendQueryRouter.js';
import { QuerySetupLandingPage } from './QuerySetup.js';
import {
  MappingQueryCreator,
  ExistingQueryEditor,
  ServiceQueryCreator,
} from './QueryEditor.js';
import { DepotServerClientProvider } from '@finos/legend-server-depot';
import {
  generateExtensionUrlPattern,
  LegendApplicationComponentFrameworkProvider,
  Redirect,
  Route,
  Switch,
} from '@finos/legend-application';
import type { LegendQueryApplicationConfig } from '../application/LegendQueryApplicationConfig.js';
import {
  LegendQueryBaseStoreProvider,
  useLegendQueryApplicationStore,
} from './LegendQueryBaseStoreProvider.js';
import { EditExistingQuerySetup } from './EditExistingQuerySetup.js';
import { CreateMappingQuerySetup } from './CreateMappingQuerySetup.js';

const LegendQueryApplicationRoot = observer(() => {
  const applicationStore = useLegendQueryApplicationStore();
  const extraApplicationPageEntries = applicationStore.pluginManager
    .getApplicationPlugins()
    .flatMap((plugin) => plugin.getExtraApplicationPageEntries?.() ?? []);

  return (
    <div className="app">
      <Switch>
        <Route
          exact={true}
          path={LEGEND_QUERY_ROUTE_PATTERN.SETUP}
          component={QuerySetupLandingPage}
        />
        <Route
          exact={true}
          path={LEGEND_QUERY_ROUTE_PATTERN.EDIT_EXISTING_QUERY_SETUP}
          component={EditExistingQuerySetup}
        />
        <Route
          exact={true}
          path={LEGEND_QUERY_ROUTE_PATTERN.CREATE_MAPPING_QUERY_SETUP}
          component={CreateMappingQuerySetup}
        />
        <Route
          exact={true}
          path={LEGEND_QUERY_ROUTE_PATTERN.EDIT_EXISTING_QUERY}
          component={ExistingQueryEditor}
        />
        <Route
          exact={true}
          path={LEGEND_QUERY_ROUTE_PATTERN.CREATE_FROM_SERVICE_QUERY}
          component={ServiceQueryCreator}
        />
        <Route
          exact={true}
          path={LEGEND_QUERY_ROUTE_PATTERN.CREATE_FROM_MAPPING_QUERY}
          component={MappingQueryCreator}
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
  (props: { config: LegendQueryApplicationConfig }) => {
    const { config } = props;

    return (
      <DepotServerClientProvider
        config={{
          serverUrl: config.depotServerUrl,
        }}
      >
        <LegendQueryBaseStoreProvider>
          <LegendApplicationComponentFrameworkProvider>
            <LegendQueryApplicationRoot />
          </LegendApplicationComponentFrameworkProvider>
        </LegendQueryBaseStoreProvider>
      </DepotServerClientProvider>
    );
  },
);
