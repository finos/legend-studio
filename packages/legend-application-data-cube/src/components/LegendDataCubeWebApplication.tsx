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

import { BrowserEnvironmentProvider } from '@finos/legend-application';
import { Route, Routes } from '@finos/legend-application/browser';
import { LegendDataCubeFrameworkProvider } from './LegendDataCubeFrameworkProvider.js';
import { observer } from 'mobx-react-lite';
import { DataCubeEditor } from './DataCubeEditor.js';
import { ExistingDataCubeQuery } from './source/ExistingDataCubeQuery.js';
import { LEGEND_DATA_CUBE_ROUTE_PATTERN } from '../__lib__/LegendDataCubeNavigation.js';

const LegendDataCubeWebApplicationRouter = observer(() => {
  return (
    <div className="app">
      <Routes>
        <Route
          path={LEGEND_DATA_CUBE_ROUTE_PATTERN.VIEW_EXISTING_QUERY}
          element={<ExistingDataCubeQuery />}
        />
        <Route path="/" element={<DataCubeEditor />} />
      </Routes>
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
