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
import { DataCube } from './dataCube/DataCube.js';
import { LegendREPLFrameworkProvider } from './LegendREPLFrameworkProvider.js';
import { observer } from 'mobx-react-lite';
import { withREPLStore } from './REPLStoreProvider.js';
import { BlockingActionAlert } from './repl/Alert.js';

export const LEGEND_REPL_GRID_CLIENT_ROUTE_PATTERN = Object.freeze({
  DATA_CUBE: `/dataCube`,
});

export const LegendREPLRouter = withREPLStore(
  observer(() => (
    <div className="app">
      <Switch>
        <Route
          exact={true}
          path={[LEGEND_REPL_GRID_CLIENT_ROUTE_PATTERN.DATA_CUBE]}
          component={
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            DataCube as TEMPORARY__ReactRouterComponentType
          }
        />
      </Switch>
    </div>
  )),
);

export const LegendREPLWebApplication: React.FC<{
  baseUrl: string;
}> = (props) => {
  const { baseUrl } = props;

  return (
    <BrowserEnvironmentProvider baseUrl={baseUrl}>
      <LegendREPLFrameworkProvider>
        <LegendREPLRouter />
        <BlockingActionAlert />
      </LegendREPLFrameworkProvider>
    </BrowserEnvironmentProvider>
  );
};
