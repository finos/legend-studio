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
import { useApplicationStore, useParams } from '@finos/legend-application';
import { useDepotServerClient } from '@finos/legend-server-depot';
import {
  QueryEditor,
  QueryEditorStoreContext,
  useLegendQueryApplicationStore,
} from '@finos/legend-application-query';
import { DataSpaceQueryCreatorStore } from '../../stores/query/DataSpaceQueryCreatorStore.js';
import {
  type DataSpaceQueryCreatorPathParams,
  DATA_SPACE_QUERY_CREATOR_ROUTE_PATTERN_TOKEN,
  DATA_SPACE_QUERY_CREATOR_QUERY_PARAM_TOKEN,
} from '../../application/query/DSL_DataSpace_LegendQueryNavigation.js';
import { parseGAVCoordinates } from '@finos/legend-storage';

const DataSpaceQueryCreatorStoreProvider: React.FC<{
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
  const store = useLocalObservable(
    () =>
      new DataSpaceQueryCreatorStore(
        applicationStore,
        depotServerClient,
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

export const DataSpaceQueryCreator = observer(() => {
  const applicationStore = useApplicationStore();
  const parameters = useParams<DataSpaceQueryCreatorPathParams>();
  const gav = parameters[DATA_SPACE_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.GAV];
  const dataSpacePath =
    parameters[DATA_SPACE_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.DATA_SPACE_PATH];
  const executionContext =
    parameters[DATA_SPACE_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.EXECUTION_CONTEXT];
  const runtimePath =
    parameters[DATA_SPACE_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.RUNTIME_PATH];
  const classPath =
    applicationStore.navigationService.navigator.getCurrentLocationParameterValue(
      DATA_SPACE_QUERY_CREATOR_QUERY_PARAM_TOKEN.CLASS_PATH,
    );

  return (
    <DataSpaceQueryCreatorStoreProvider
      gav={gav}
      dataSpacePath={dataSpacePath}
      executionContext={executionContext}
      runtimePath={runtimePath}
      classPath={classPath}
    >
      <QueryEditor />
    </DataSpaceQueryCreatorStoreProvider>
  );
});
