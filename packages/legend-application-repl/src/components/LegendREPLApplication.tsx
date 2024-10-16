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
  formatDate,
  guaranteeNonNullable,
  LogEvent,
  NetworkClient,
} from '@finos/legend-shared';
import { LegendREPLServerClient } from '../stores/LegendREPLServerClient.js';
import { LegendREPLDataCubeEngine } from '../stores/LegendREPLDataCubeEngine.js';
import { DataCube, DataCubeSettingKey } from '@finos/legend-data-cube';
import {
  APPLICATION_EVENT,
  ApplicationFrameworkProvider,
  useApplicationStore,
  type LegendApplicationPlugin,
  type LegendApplicationPluginManager,
} from '@finos/legend-application';
import type { LegendREPLApplicationConfig } from '../application/LegendREPLApplicationConfig.js';
import { LegendREPLDataCubeSource } from '../stores/LegendREPLDataCubeSource.js';

const LegendREPLDataCube = observer(() => {
  const application = useApplicationStore<
    LegendREPLApplicationConfig,
    LegendApplicationPluginManager<LegendApplicationPlugin>
  >();
  const config = application.config;
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
    engine.blockNavigation(
      // Only block navigation in production
      // eslint-disable-next-line no-process-env
      [() => process.env.NODE_ENV === 'production'],
      undefined,
      () => {
        engine.logWarning(
          LogEvent.create(APPLICATION_EVENT.NAVIGATION_BLOCKED),
          `Navigation from the application is blocked`,
        );
      },
    );
    return (): void => {
      engine.unblockNavigation();
    };
  }, [engine]);

  return (
    <DataCube
      engine={engine}
      options={{
        onNameChanged(name, source) {
          const timestamp =
            source instanceof LegendREPLDataCubeSource
              ? source.timestamp
              : undefined;
          application.layoutService.setWindowTitle(
            `\u229E ${name}${timestamp ? ` - ${formatDate(new Date(timestamp), 'HH:mm:ss EEE MMM dd yyyy')}` : ''}`,
          );
        },
        onSettingChanged(key, value) {
          engine.persistSettingValue(key, value);
        },

        enableDebugMode: application.settingService.getBooleanValue(
          DataCubeSettingKey.ENABLE_DEBUG_MODE,
        ),
        gridClientRowBuffer: application.settingService.getNumericValue(
          DataCubeSettingKey.GRID_CLIENT_ROW_BUFFER,
        ),
        gridClientPurgeClosedRowNodes:
          application.settingService.getBooleanValue(
            DataCubeSettingKey.GRID_CLIENT_PURGE_CLOSED_ROW_NODES,
          ),
        gridClientSuppressLargeDatasetWarning:
          application.settingService.getBooleanValue(
            DataCubeSettingKey.GRID_CLIENT_SUPPRESS_LARGE_DATASET_WARNING,
          ),
      }}
    />
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
