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
  DataCubePlaceholder,
  DataCubePlaceholderErrorDisplay,
  DEFAULT_REPORT_NAME,
  type DataCubeSpecification,
  type DataCubeSettingValues,
} from '@finos/legend-data-cube';
import { APPLICATION_EVENT } from '@finos/legend-application';
import { LegendREPLDataCubeSource } from '../stores/LegendREPLDataCubeSource.js';
import { LegendREPLDataCubeHeader } from './LegendREPLDataCubeHeader.js';
import {
  LegendREPLFrameworkProvider,
  useLegendREPLBaseStore,
} from './LegendREPLFrameworkProvider.js';
import { LegendREPLSettingStorageKey } from '../__lib__/LegendREPLSetting.js';

const LegendREPLDataCube = observer(
  (props: { specification: DataCubeSpecification }) => {
    const { specification } = props;
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
        specification={specification}
        engine={store.engine}
        options={{
          gridClientLicense: store.gridClientLicense,
          layoutManager: store.layoutService.manager,
          taskManager: store.taskService.manager,
          onNameChanged(event) {
            const timestamp =
              event.source instanceof LegendREPLDataCubeSource
                ? event.source.timestamp
                : undefined;
            application.layoutService.setWindowTitle(
              `\u229E ${name}${timestamp ? ` - ${formatDate(new Date(timestamp), 'HH:mm:ss EEE MMM dd yyyy')}` : ''}`,
            );
          },
          onViewInitialized(event) {
            store.setSource(event.source);
          },
          innerHeaderRenderer: (params) => (
            <LegendREPLDataCubeHeader api={params.api} />
          ),
          getHeaderMenuItems: () => {
            return [
              {
                label: 'See Documentation',
                action: () => {
                  const url = application.documentationService.url;
                  if (url) {
                    application.navigationService.navigator.visitAddress(
                      application.documentationService.url,
                    );
                  }
                },
                disabled: !application.documentationService.url,
              },
            ];
          },
          settingsData: {
            values: application.settingService.getObjectValue(
              LegendREPLSettingStorageKey.DATA_CUBE,
            ) as DataCubeSettingValues | undefined,
          },
          onSettingsChanged(event) {
            application.settingService.persistValue(
              LegendREPLSettingStorageKey.DATA_CUBE,
              event.values,
            );
          },
        }}
      />
    );
  },
);

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

  if (!store.initializeState.hasSucceeded) {
    return (
      <DataCubePlaceholder
        title={DEFAULT_REPORT_NAME}
        layoutManager={store.layoutService.manager}
        taskManager={store.taskService.manager}
      >
        {store.initializeState.isInProgress && (
          <div className="h-full w-full p-2">
            <div>Initializing...</div>
          </div>
        )}
        {store.initializeState.hasFailed && (
          <DataCubePlaceholderErrorDisplay
            message="Initialization Failure"
            prompt="Resolve the issue and reload."
          />
        )}
      </DataCubePlaceholder>
    );
  }
  return (
    <div className="h-full">
      {store.specification && (
        <Routes>
          <Route
            path={LEGEND_REPL_GRID_CLIENT_ROUTE_PATTERN.DATA_CUBE}
            element={<LegendREPLDataCube specification={store.specification} />}
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
