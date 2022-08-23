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

import { observer, useLocalObservable } from 'mobx-react-lite';
import { getQueryParameters } from '@finos/legend-shared';
import { useApplicationStore } from '@finos/legend-application';
import {
  parseGAVCoordinates,
  useDepotServerClient,
} from '@finos/legend-server-depot';
import {
  LEGEND_QUERY_PATH_PARAM_TOKEN,
  LEGEND_QUERY_QUERY_PARAM_TOKEN,
  QueryEditor,
  QueryEditorStoreContext,
  useLegendQueryApplicationStore,
  useLegendQueryBaseStore,
} from '@finos/legend-application-query';
import { useParams } from 'react-router';
import { DataSpaceQueryEditorStore } from '../../stores/query/DataSpaceQueryEditorStore.js';
import {
  type DataSpaceQueryEditorPathParams,
  type DataSpaceQueryEditorQueryParams,
  DATA_SPACE_QUERY_EDITOR_PATH_PARAM_TOKEN,
} from '../../stores/query/DSLDataSpace_LegendQueryRouter.js';

const DataSpaceQueryEditorStoreProvider: React.FC<{
  children: React.ReactNode;
  gav: string;
  dataSpacePath: string;
  executionContext: string;
  runtimePath: string | undefined;
  classPath: string | undefined;
}> = ({
  children,
  gav,
  dataSpacePath,
  executionContext,
  runtimePath,
  classPath,
}) => {
  const { groupId, artifactId, versionId } = parseGAVCoordinates(gav);
  const applicationStore = useLegendQueryApplicationStore();
  const depotServerClient = useDepotServerClient();
  const baseStore = useLegendQueryBaseStore();
  const store = useLocalObservable(
    () =>
      new DataSpaceQueryEditorStore(
        applicationStore,
        depotServerClient,
        baseStore.pluginManager,
        groupId,
        artifactId,
        versionId,
        dataSpacePath,
        executionContext,
        runtimePath,
        classPath,
      ),
  );
  return (
    <QueryEditorStoreContext.Provider value={store}>
      {children}
    </QueryEditorStoreContext.Provider>
  );
};

export const DataSpaceQueryEditor = observer(() => {
  const applicationStore = useApplicationStore();
  const params = useParams<DataSpaceQueryEditorPathParams>();
  const gav = params[LEGEND_QUERY_PATH_PARAM_TOKEN.GAV];
  const dataSpacePath =
    params[DATA_SPACE_QUERY_EDITOR_PATH_PARAM_TOKEN.DATA_SPACE_PATH];
  const executionContext =
    params[DATA_SPACE_QUERY_EDITOR_PATH_PARAM_TOKEN.EXECUTION_CONTEXT];
  const runtimePath = params[LEGEND_QUERY_PATH_PARAM_TOKEN.RUNTIME_PATH];
  const classPath = getQueryParameters<DataSpaceQueryEditorQueryParams>(
    applicationStore.navigator.getCurrentLocation(),
    true,
  )[LEGEND_QUERY_QUERY_PARAM_TOKEN.CLASS_PATH];

  return (
    <DataSpaceQueryEditorStoreProvider
      gav={gav}
      dataSpacePath={dataSpacePath}
      executionContext={executionContext}
      runtimePath={runtimePath}
      classPath={classPath}
    >
      <QueryEditor />
    </DataSpaceQueryEditorStoreProvider>
  );
});
