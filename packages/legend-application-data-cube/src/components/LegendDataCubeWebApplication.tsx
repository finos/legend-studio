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
  APPLICATION_EVENT,
  BrowserEnvironmentProvider,
  useApplicationStore,
} from '@finos/legend-application';
import { Route, Routes } from '@finos/legend-application/browser';
import {
  LegendDataCubeFrameworkProvider,
  useLegendDataCubeBaseStore,
} from './LegendDataCubeFrameworkProvider.js';
import { observer } from 'mobx-react-lite';
import { LegendDataCubeQueryBuilder } from './query-builder/LegendDataCubeQueryBuilder.js';
import { LEGEND_DATA_CUBE_ROUTE_PATTERN } from '../__lib__/LegendDataCubeNavigation.js';
import { LogEvent } from '@finos/legend-shared';
import { useEffect } from 'react';

const LegendDataCubeWebApplicationRouter = observer(() => {
  const application = useApplicationStore();
  const store = useLegendDataCubeBaseStore();

  useEffect(() => {
    store
      .initialize()
      .catch((error) => store.engine.alertUnhandledError(error));
  }, [store]);

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
    <div className="h-full">
      {store.initState.hasSucceeded && (
        <Routes>
          <Route
            path={LEGEND_DATA_CUBE_ROUTE_PATTERN.QUERY_BUILDER}
            element={<LegendDataCubeQueryBuilder />}
          />
        </Routes>
      )}
    </div>
  );
});

export const LegendDataCubeWebApplication = observer(
  (props: { baseUrl: string }) => {
    const { baseUrl } = props;

    return (
      <BrowserEnvironmentProvider baseUrl={baseUrl}>
        <LegendDataCubeFrameworkProvider>
          <LegendDataCubeWebApplicationRouter />
        </LegendDataCubeFrameworkProvider>
      </BrowserEnvironmentProvider>
    );
  },
);
