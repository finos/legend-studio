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

import { useApplicationStore } from '@finos/legend-application';
import { observer } from 'mobx-react-lite';
import {
  LEGEND_QUERY_ROUTE_PATTERN_TOKEN,
  type ExistingQueryEditorPathParams,
} from '../../__lib__/LegendQueryNavigation.js';
import { useParams } from '@finos/legend-application/browser';
import {
  ExistingQueryDataCubeEditorStoreProvider,
  useExistingQueryDataCubeEditorStore,
} from './ExistingQueryEditorStoreProviderProvider.js';
import { useEffect } from 'react';
import { flowResult } from 'mobx';
import { DataCube, DataCubeProvider } from '@finos/legend-data-cube';
import { QueryBuilderDataCubeApplicationEngine } from '@finos/legend-query-builder';
import { guaranteeNonNullable } from '@finos/legend-shared';

export const DataCubeWrapper = observer(() => {
  const applicationStore = useApplicationStore();
  const store = useExistingQueryDataCubeEditorStore();

  useEffect(() => {
    flowResult(store.initialize()).catch(applicationStore.alertUnhandledError);
  }, [applicationStore, store]);

  if (!store.engine) {
    return null;
  }
  const _appEngine = new QueryBuilderDataCubeApplicationEngine(
    applicationStore,
  );

  return (
    <DataCubeProvider application={_appEngine} engine={store.engine}>
      <DataCube />
    </DataCubeProvider>
  );
});

export const ExistingQueryDataCubeViewer = observer(() => {
  const params = useParams<ExistingQueryEditorPathParams>();
  const queryId = guaranteeNonNullable(
    params[LEGEND_QUERY_ROUTE_PATTERN_TOKEN.QUERY_ID],
  );

  return (
    <ExistingQueryDataCubeEditorStoreProvider queryId={queryId}>
      <DataCubeWrapper />
    </ExistingQueryDataCubeEditorStoreProvider>
  );
});
