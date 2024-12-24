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
import { useEffect } from 'react';
import { formatDate, LogEvent } from '@finos/legend-shared';
import {
  DataCube,
  DataCubeSettingKey,
  type DataCubeQuery,
} from '@finos/legend-data-cube';
import { APPLICATION_EVENT } from '@finos/legend-application';
import { LegendREPLDataCubeSource } from '../stores/LegendREPLDataCubeSource.js';
import { LegendREPLDataCubeHeader } from './LegendREPLDataCubeHeader.js';
import {
  LegendREPLFrameworkProvider,
  useLegendREPLBaseStore,
} from './LegendREPLFramworkProvider.js';

const LegendREPLDataCube = observer((props: { query: DataCubeQuery }) => {
  const { query } = props;
  const store = useLegendREPLBaseStore();
  const application = store.application;

  useEffect(() => {
    application.navigationService.navigator.blockNavigation(
      // Only block navigation in production
      // eslint-disable-next-line no-process-env
      [() => process.env.NODE_ENV === 'production'],
      undefined,
      () => {
        application.logService.warn(
          LogEvent.create(APPLICATION_EVENT.NAVIGATION_BLOCKED),
          `Navigation from the application is blocked`,
        );
      },
    );
    return (): void => {
      application.navigationService.navigator.unblockNavigation();
    };
  }, [application]);

  return (
    <DataCube
      query={query}
      engine={store.engine}
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
          application.settingService.persistValue(key, value);
        },
        enableDebugMode: application.settingService.getBooleanValue(
          DataCubeSettingKey.ENABLE_DEBUG_MODE,
        ),
        gridClientLicense: store.gridClientLicense,
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
        innerHeaderComponent: (dataCube) => (
          <LegendREPLDataCubeHeader dataCube={dataCube} />
        ),
      }}
    />
  );
});

export const LEGEND_REPL_GRID_CLIENT_ROUTE_PATTERN = Object.freeze({
  DATA_CUBE: `/dataCube`,
});

export const LegendREPLRouter = observer(() => {
  const store = useLegendREPLBaseStore();

  useEffect(() => {
    store
      .initialize()
      .catch((error) => store.application.alertUnhandledError(error));
  }, [store]);

  return (
    <div className="h-full">
      {store.initState.hasSucceeded && store.query && (
        <Routes>
          <Route
            path={LEGEND_REPL_GRID_CLIENT_ROUTE_PATTERN.DATA_CUBE}
            element={<LegendREPLDataCube query={store.query} />}
          />
        </Routes>
      )}
    </div>
  );
});

export const LegendREPLWebApplication = (props: { baseUrl: string }) => {
  const { baseUrl } = props;

  return (
    <BrowserEnvironmentProvider baseUrl={baseUrl}>
      <LegendREPLFrameworkProvider>
        <LegendREPLRouter />
      </LegendREPLFrameworkProvider>
    </BrowserEnvironmentProvider>
  );
};
