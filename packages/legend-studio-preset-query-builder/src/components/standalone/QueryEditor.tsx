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

import { RuntimePointer, useApplicationStore } from '@finos/legend-studio';
import { getQueryParameters } from '@finos/legend-studio-shared';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useParams } from 'react-router';
import type {
  CreateQueryPathParams,
  ExistingQueryPathParams,
  ServiceQueryPathParams,
  ServiceQueryQueryParams,
} from '../../stores/LegendQueryRouter';
import { generateCreateQueryRoute } from '../../stores/LegendQueryRouter';
import { CreateQueryInfoState, useQueryStore } from '../../stores/QueryStore';
import { QueryBuilder } from '../QueryBuilder';

export const QueryEditorInner = observer(() => {
  const queryStore = useQueryStore();
  return <QueryBuilder queryBuilderState={queryStore.queryBuilderState} />;
});

export const QueryEditor: React.FC<{}> = () => (
  <DndProvider backend={HTML5Backend}>
    <QueryEditorInner />
  </DndProvider>
);

export const ExistingQueryLoader = observer(() => {
  const queryStore = useQueryStore();
  const params = useParams<ExistingQueryPathParams>();

  useEffect(() => {
    queryStore.setupExistingQueryInfoState(params);
  }, [queryStore, params]);

  return <QueryEditor />;
});

export const ServiceQueryLoader = observer(() => {
  const applicationStore = useApplicationStore();
  const queryStore = useQueryStore();
  const params = useParams<ServiceQueryPathParams>();
  const queryParams = getQueryParameters<ServiceQueryQueryParams>(
    applicationStore.historyApiClient.location.search,
  );

  useEffect(() => {
    queryStore.setupServiceQueryInfoState(params, queryParams.key);
  }, [queryStore, params, queryParams]);

  return <QueryEditor />;
});

export const CreateQueryLoader = observer(() => {
  const applicationStore = useApplicationStore();
  const queryStore = useQueryStore();
  const params = useParams<CreateQueryPathParams>();
  const currentMapping = queryStore.queryBuilderState.querySetupState.mapping;
  const currentRuntime =
    queryStore.queryBuilderState.querySetupState.runtime instanceof
    RuntimePointer
      ? queryStore.queryBuilderState.querySetupState.runtime.packageableRuntime
          .value
      : undefined;

  useEffect(() => {
    queryStore.setupCreateQueryInfoState(params);
  }, [queryStore, params]);

  // TODO: this will make the route change as the users select another mapping and runtime
  useEffect(() => {
    if (queryStore.queryInfoState instanceof CreateQueryInfoState) {
      if (
        currentMapping &&
        currentRuntime &&
        (queryStore.queryInfoState.mapping !== currentMapping ||
          queryStore.queryInfoState.runtime !== currentRuntime)
      ) {
        applicationStore.historyApiClient.push(
          generateCreateQueryRoute(
            queryStore.queryInfoState.projectMetadata.projectId,
            queryStore.queryInfoState.versionId,
            currentMapping.path,
            currentRuntime.path,
          ),
        );
      }
    }
  }, [applicationStore, queryStore, currentMapping, currentRuntime]);

  return <QueryEditor />;
});
