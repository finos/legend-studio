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
import { useParams } from '@finos/legend-application/browser';
import { parseGAVCoordinates } from '@finos/legend-storage';
import {
  useLegendQueryApplicationStore,
  useLegendQueryBaseStore,
} from '../LegendQueryFrameworkProvider.js';
import { DataSpaceTemplateQueryCreatorStore } from '../../stores/data-space/DataSpaceTemplateQueryCreatorStore.js';
import { QueryEditorStoreContext } from '../QueryEditorStoreProvider.js';
import {
  DATA_SPACE_TEMPLATE_QUERY_CREATOR_ROUTE_PATTERN_TOKEN,
  type DataSpaceTemplateQueryCreatorPathParams,
} from '../../__lib__/DSL_DataSpace_LegendQueryNavigation.js';
import { QueryEditor } from '../QueryEditor.js';
import { guaranteeNonNullable } from '@finos/legend-shared';

const DataSpaceTemplateQueryCreatorStoreProvider: React.FC<{
  children: React.ReactNode;
  gav: string;
  dataSpacePath: string;
  executionContext: string;
  templateQueryId: string;
}> = ({ children, gav, dataSpacePath, executionContext, templateQueryId }) => {
  const { groupId, artifactId, versionId } = parseGAVCoordinates(gav);
  const applicationStore = useLegendQueryApplicationStore();
  const baseStore = useLegendQueryBaseStore();
  const store = useLocalObservable(
    () =>
      new DataSpaceTemplateQueryCreatorStore(
        applicationStore,
        baseStore.depotServerClient,
        groupId,
        artifactId,
        versionId,
        dataSpacePath,
        executionContext,
        templateQueryId,
      ),
  );
  return (
    <QueryEditorStoreContext.Provider value={store}>
      {children}
    </QueryEditorStoreContext.Provider>
  );
};

export const DataSpaceTemplateQueryCreator = observer(() => {
  const parameters = useParams<DataSpaceTemplateQueryCreatorPathParams>();
  const gav = guaranteeNonNullable(
    parameters[DATA_SPACE_TEMPLATE_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.GAV],
  );
  const dataSpacePath = guaranteeNonNullable(
    parameters[
      DATA_SPACE_TEMPLATE_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.DATA_SPACE_PATH
    ],
  );
  const executionContext = guaranteeNonNullable(
    parameters[
      DATA_SPACE_TEMPLATE_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.EXECUTION_CONTEXT
    ],
  );
  const templateQueryId = guaranteeNonNullable(
    parameters[
      DATA_SPACE_TEMPLATE_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.TEMPLATE_QUERY_ID
    ],
  );

  return (
    <DataSpaceTemplateQueryCreatorStoreProvider
      gav={gav}
      dataSpacePath={dataSpacePath}
      executionContext={executionContext}
      templateQueryId={templateQueryId}
    >
      <QueryEditor />
    </DataSpaceTemplateQueryCreatorStoreProvider>
  );
});
