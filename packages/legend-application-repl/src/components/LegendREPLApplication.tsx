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

import {
  BrowserEnvironmentProvider,
  Route,
  Switch,
  type TEMPORARY__ReactRouterComponentType,
} from '@finos/legend-application/browser';
import { observer } from 'mobx-react-lite';
import { DataCube } from './dataCube/DataCube.js';
import { useMemo } from 'react';
import { guaranteeNonNullable, NetworkClient } from '@finos/legend-shared';
import { REPLServerClient } from '../server/REPLServerClient.js';
import { LegendREPLDataCubeApplicationEngine } from '../stores/LegendREPLDataCubeApplicationEngine.js';
import { LegendREPLDataCubeEngine } from '../stores/LegendREPLDataCubeEngine.js';
import { DataCubeProvider } from './dataCube/DataCubeProvider.js';
import {
  ApplicationFrameworkProvider,
  useApplicationStore,
  type LegendApplicationPlugin,
  type LegendApplicationPluginManager,
} from '@finos/legend-application';
import type { LegendREPLApplicationConfig } from '../application/LegendREPLApplicationConfig.js';

const LegendREPLDataCube = observer(() => {
  const applicationStore = useApplicationStore<
    LegendREPLApplicationConfig,
    LegendApplicationPluginManager<LegendApplicationPlugin>
  >();
  const application = useMemo(
    () => new LegendREPLDataCubeApplicationEngine(applicationStore),
    [applicationStore],
  );
  const engine = new LegendREPLDataCubeEngine(
    new REPLServerClient(
      new NetworkClient({
        baseUrl: applicationStore.config.useDynamicREPLServer
          ? window.location.origin +
            guaranteeNonNullable(applicationStore.config.baseAddress).replace(
              '/repl/',
              '',
            )
          : applicationStore.config.replUrl,
      }),
    ),
  );

  return (
    <DataCubeProvider application={application} engine={engine}>
      <DataCube />
    </DataCubeProvider>
  );
});

export const LEGEND_REPL_GRID_CLIENT_ROUTE_PATTERN = Object.freeze({
  DATA_CUBE: `/dataCube`,
});

export const LegendREPLRouter = observer(() => (
  <div className="h-full">
    <Switch>
      <Route
        exact={true}
        path={[LEGEND_REPL_GRID_CLIENT_ROUTE_PATTERN.DATA_CUBE]}
        component={
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          LegendREPLDataCube as TEMPORARY__ReactRouterComponentType
        }
      />
    </Switch>
  </div>
));

export const LegendREPLWebApplication = (props: { baseUrl: string }) => {
  const { baseUrl } = props;

  return (
    <BrowserEnvironmentProvider baseUrl={baseUrl}>
      <ApplicationFrameworkProvider simple={true}>
        <LegendREPLRouter />
      </ApplicationFrameworkProvider>
    </BrowserEnvironmentProvider>
  );
};
