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
import { useApplicationStore } from '@finos/legend-application';
import { generatePath, useParams } from '@finos/legend-application/browser';
import { parseGAVCoordinates } from '@finos/legend-storage';
import {
  useLegendQueryApplicationStore,
  useLegendQueryBaseStore,
} from '../LegendQueryFrameworkProvider.js';
import {
  DataSpaceQueryCreatorStore,
  type QueryableDataSpace,
} from '../../stores/data-space/DataSpaceQueryCreatorStore.js';
import { QueryEditorStoreContext } from '../QueryEditorStoreProvider.js';
import {
  DATA_SPACE_QUERY_CREATOR_QUERY_PARAM_TOKEN,
  DATA_SPACE_QUERY_CREATOR_ROUTE_PATTERN_TOKEN,
  type DataSpaceQueryCreatorPathParams,
} from '../../__lib__/DSL_DataSpace_LegendQueryNavigation.js';
import { QueryEditor } from '../QueryEditor.js';
import { LEGEND_QUERY_ROUTE_PATTERN } from '../../__lib__/LegendQueryNavigation.js';
import { useEffect } from 'react';

const DataSpaceQueryCreatorStoreProvider: React.FC<{
  children: React.ReactNode;
  gav: string | undefined;
  dataSpacePath: string | undefined;
  executionContext: string | undefined;
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
  let queryableDataSpace: QueryableDataSpace | undefined = undefined;
  if (gav && dataSpacePath && executionContext) {
    const { groupId, artifactId, versionId } = parseGAVCoordinates(gav);
    queryableDataSpace = {
      groupId,
      artifactId,
      versionId,
      dataSpacePath,
      executionContext,
      runtimePath,
      classPath,
    };
  }
  const applicationStore = useLegendQueryApplicationStore();
  const baseStore = useLegendQueryBaseStore();
  const store = useLocalObservable(
    () =>
      new DataSpaceQueryCreatorStore(
        applicationStore,
        baseStore.depotServerClient,
        queryableDataSpace,
      ),
  );
  useEffect(() => {
    applicationStore.navigationService.navigator.updateCurrentLocation(
      generatePath(LEGEND_QUERY_ROUTE_PATTERN.DEFAULT),
    );
  }, [applicationStore]);
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
    applicationStore.navigationService.navigator.getCurrentLocationParameterValue(
      DATA_SPACE_QUERY_CREATOR_QUERY_PARAM_TOKEN.RUNTIME_PATH,
    );
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
