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
import { Editor, REPLQueryEditor } from './REPLGridClient.js';
import { LegendREPLGridClientFrameworkProvider } from './LegendREPLGridClientFrameworkProvider.js';
import { observer } from 'mobx-react-lite';
import { withEditorStore } from './REPLGridClientStoreProvider.js';

export enum LEGEND_REPL_GRID_CLIENT_PATTERN_TOKEN {
  QUERY_ID = 'queryId',
}

export const LEGEND_REPL_GRID_CLIENT_ROUTE_PATTERN = Object.freeze({
  GRID: `/grid`,
  SAVED_QUERY: `/query/:${LEGEND_REPL_GRID_CLIENT_PATTERN_TOKEN.QUERY_ID}`,
});

export type REPLQueryEditorPathParams = {
  [LEGEND_REPL_GRID_CLIENT_PATTERN_TOKEN.QUERY_ID]: string;
};

export const LegendREPLGridClientRouter = withEditorStore(
  observer(() => (
    <div className="app">
      <Switch>
        <Route
          exact={true}
          path={[LEGEND_REPL_GRID_CLIENT_ROUTE_PATTERN.GRID]}
          component={
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            Editor as TEMPORARY__ReactRouterComponentType
          }
        />
        <Route
          exact={true}
          path={[LEGEND_REPL_GRID_CLIENT_ROUTE_PATTERN.SAVED_QUERY]}
          component={
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            REPLQueryEditor as TEMPORARY__ReactRouterComponentType
          }
        />
      </Switch>
    </div>
  )),
);

export const LegendREPLGridClientWebApplication: React.FC<{
  baseUrl: string;
}> = (props) => {
  const { baseUrl } = props;

  return (
    <BrowserEnvironmentProvider baseUrl={baseUrl}>
      <LegendREPLGridClientFrameworkProvider>
        <LegendREPLGridClientRouter />
      </LegendREPLGridClientFrameworkProvider>
    </BrowserEnvironmentProvider>
  );
};
