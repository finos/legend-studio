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
import { LEGEND_QUERY_ROUTE_PATTERN } from '../__lib__/LegendQueryNavigation.js';
import { QuerySetupLandingPage } from './QuerySetup.js';
import {
  MappingQueryCreator,
  ExistingQueryEditor,
  ServiceQueryCreator,
} from './QueryEditor.js';
import {
  BrowserEnvironmentProvider,
  Redirect,
  Route,
  Switch,
  generateExtensionUrlPattern,
  type TEMPORARY__ReactRouterComponentType,
} from '@finos/legend-application/browser';
import {
  LegendQueryFrameworkProvider,
  useLegendQueryApplicationStore,
  useLegendQueryBaseStore,
} from './LegendQueryFrameworkProvider.js';
import { EditExistingQuerySetup } from './EditExistingQuerySetup.js';
import { CreateMappingQuerySetup } from './CreateMappingQuerySetup.js';
import { useEffect } from 'react';
import { flowResult } from 'mobx';

const LegendQueryWebApplicationRouter = observer(() => {
  const applicationStore = useLegendQueryApplicationStore();
  const baseStore = useLegendQueryBaseStore();

  const extraApplicationPageEntries = applicationStore.pluginManager
    .getApplicationPlugins()
    .flatMap((plugin) => plugin.getExtraApplicationPageEntries?.() ?? []);

  useEffect(() => {
    flowResult(baseStore.initialize()).catch(
      applicationStore.alertUnhandledError,
    );
  }, [applicationStore, baseStore]);

  return (
    <div className="app">
      {baseStore.initState.hasCompleted && (
        <Switch>
          <Route
            exact={true}
            path={LEGEND_QUERY_ROUTE_PATTERN.SETUP}
            component={
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              QuerySetupLandingPage as TEMPORARY__ReactRouterComponentType
            }
          />
          <Route
            exact={true}
            path={LEGEND_QUERY_ROUTE_PATTERN.EDIT_EXISTING_QUERY_SETUP}
            component={
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              EditExistingQuerySetup as TEMPORARY__ReactRouterComponentType
            }
          />
          <Route
            exact={true}
            path={LEGEND_QUERY_ROUTE_PATTERN.CREATE_MAPPING_QUERY_SETUP}
            component={
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              CreateMappingQuerySetup as TEMPORARY__ReactRouterComponentType
            }
          />
          <Route
            exact={true}
            path={LEGEND_QUERY_ROUTE_PATTERN.EDIT_EXISTING_QUERY}
            component={
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              ExistingQueryEditor as TEMPORARY__ReactRouterComponentType
            }
          />
          <Route
            exact={true}
            path={LEGEND_QUERY_ROUTE_PATTERN.CREATE_FROM_SERVICE_QUERY}
            component={
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              ServiceQueryCreator as TEMPORARY__ReactRouterComponentType
            }
          />
          <Route
            exact={true}
            path={LEGEND_QUERY_ROUTE_PATTERN.CREATE_FROM_MAPPING_QUERY}
            component={
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              MappingQueryCreator as TEMPORARY__ReactRouterComponentType
            }
          />
          {extraApplicationPageEntries.map((entry) => (
            <Route
              key={entry.key}
              exact={true}
              path={entry.addressPatterns.map(generateExtensionUrlPattern)}
              component={
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                entry.renderer as TEMPORARY__ReactRouterComponentType
              }
            />
          ))}
          <Redirect to={LEGEND_QUERY_ROUTE_PATTERN.SETUP} />
        </Switch>
      )}
    </div>
  );
});

export const LegendQueryWebApplication = observer(
  (props: { baseUrl: string }) => {
    const { baseUrl } = props;

    return (
      <BrowserEnvironmentProvider baseUrl={baseUrl}>
        <LegendQueryFrameworkProvider>
          <LegendQueryWebApplicationRouter />
        </LegendQueryFrameworkProvider>
      </BrowserEnvironmentProvider>
    );
  },
);
