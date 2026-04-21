/**
 * Copyright (c) 2026-present, Goldman Sachs
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
import { DataProductSampleQueryCreatorStore } from '../../stores/data-product/DataProductSampleQueryCreatorStore.js';
import { QueryEditorStoreContext } from '../QueryEditorStoreProvider.js';
import {
  DATA_PRODUCT_SAMPLE_QUERY_CREATOR_ROUTE_PATTERN_TOKEN,
  generateDataProductSampleQueryRoute,
  type DataProductSampleQueryPathParams,
} from '../../__lib__/LegendQueryNavigation.js';
import { QueryEditor } from '../QueryEditor.js';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { useApplicationStore } from '@finos/legend-application';
import { extractQueryParams } from '../utils/QueryParameterUtils.js';
import { useEffect } from 'react';

const DataProductSampleQueryCreatorStoreProvider: React.FC<{
  children: React.ReactNode;
  gav: string;
  dataProductPath: string;
  sampleQueryId: string;
  params: Record<string, string> | undefined;
}> = ({ children, gav, dataProductPath, sampleQueryId, params }) => {
  const { groupId, artifactId, versionId } = parseGAVCoordinates(gav);
  const applicationStore = useLegendQueryApplicationStore();
  const baseStore = useLegendQueryBaseStore();
  const store = useLocalObservable(
    () =>
      new DataProductSampleQueryCreatorStore(
        applicationStore,
        baseStore.depotServerClient,
        groupId,
        artifactId,
        versionId,
        dataProductPath,
        sampleQueryId,
        params,
      ),
  );
  return (
    <QueryEditorStoreContext.Provider value={store}>
      {children}
    </QueryEditorStoreContext.Provider>
  );
};

export const DataProductSampleQueryCreator = observer(() => {
  const applicationStore = useApplicationStore();
  const parameters = useParams<DataProductSampleQueryPathParams>();
  const gav = guaranteeNonNullable(
    parameters[DATA_PRODUCT_SAMPLE_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.GAV],
  );
  const dataProductPath = guaranteeNonNullable(
    parameters[
      DATA_PRODUCT_SAMPLE_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.DATA_PRODUCT_PATH
    ],
  );
  const sampleQueryId = guaranteeNonNullable(
    parameters[
      DATA_PRODUCT_SAMPLE_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.SAMPLE_QUERY_ID
    ],
  );

  const queryParams =
    applicationStore.navigationService.navigator.getCurrentLocationParameters();
  const processed = extractQueryParams(queryParams);

  useEffect(() => {
    // clear params from URL after extracting
    if (processed && Object.keys(processed).length) {
      const { groupId, artifactId, versionId } = parseGAVCoordinates(gav);
      applicationStore.navigationService.navigator.updateCurrentLocation(
        generateDataProductSampleQueryRoute(
          groupId,
          artifactId,
          versionId,
          dataProductPath,
          sampleQueryId,
        ),
      );
    }
  }, [applicationStore, gav, dataProductPath, sampleQueryId, processed]);

  return (
    <DataProductSampleQueryCreatorStoreProvider
      gav={gav}
      dataProductPath={dataProductPath}
      sampleQueryId={sampleQueryId}
      params={processed}
    >
      <QueryEditor />
    </DataProductSampleQueryCreatorStoreProvider>
  );
});
