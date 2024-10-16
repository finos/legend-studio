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
  Routes,
} from '@finos/legend-application/browser';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo } from 'react';
import {
  guaranteeNonNullable,
  LogEvent,
  NetworkClient,
} from '@finos/legend-shared';
import { LegendREPLServerClient } from '../stores/LegendREPLServerClient.js';
import { LegendREPLDataCubeApplicationEngine } from '../stores/LegendREPLDataCubeApplicationEngine.js';
import { LegendREPLDataCubeEngine } from '../stores/LegendREPLDataCubeEngine.js';
import { DataCube, DataCubeProvider } from '@finos/legend-data-cube';
import {
  APPLICATION_EVENT,
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
  const config = applicationStore.config;
  const application = useMemo(
    () => new LegendREPLDataCubeApplicationEngine(applicationStore),
    [applicationStore],
  );
  const engine = useMemo(
    () =>
      new LegendREPLDataCubeEngine(
        application,
        new LegendREPLServerClient(
          new NetworkClient({
            baseUrl: config.useDynamicREPLServer
              ? window.location.origin +
                guaranteeNonNullable(config.baseAddress).replace('/repl/', '')
              : config.replUrl,
          }),
        ),
      ),
    [application, config],
  );

  useEffect(() => {
    application.blockNavigation(
      // Only block navigation in production
      // eslint-disable-next-line no-process-env
      [() => process.env.NODE_ENV === 'production'],
      undefined,
      () => {
        application.logWarning(
          LogEvent.create(APPLICATION_EVENT.NAVIGATION_BLOCKED),
          `Navigation from the application is blocked`,
        );
      },
    );
    return (): void => {
      application.unblockNavigation();
    };
  }, [application]);

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
    <Routes>
      <Route
        path={LEGEND_REPL_GRID_CLIENT_ROUTE_PATTERN.DATA_CUBE}
        element={<LegendREPLDataCube />}
      />
    </Routes>
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
