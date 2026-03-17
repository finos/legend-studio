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
import { generatePath, useParams } from '@finos/legend-application/browser';
import { parseGAVCoordinates } from '@finos/legend-storage';
import {
  useLegendQueryApplicationStore,
  useLegendQueryBaseStore,
} from '../LegendQueryFrameworkProvider.js';
import {
  DataProductQueryCreatorStore,
  QueryableDataProduct,
  QueryableLegacyDataProduct,
  type LegendQueryableElement,
} from '../../stores/data-space/DataProductQueryCreatorStore.js';
import { QueryEditorStoreContext } from '../QueryEditorStoreProvider.js';
import {
  DATA_PRODUCT_QUERY_CREATOR_ROUTE_PATTERN_TOKEN,
  LEGEND_QUERY_ROUTE_PATTERN,
  type DataProductPathParams,
} from '../../__lib__/LegendQueryNavigation.js';
import {
  DATA_SPACE_QUERY_CREATOR_QUERY_PARAM_TOKEN,
  DATA_SPACE_QUERY_CREATOR_ROUTE_PATTERN_TOKEN,
  type DataSpaceQueryCreatorPathParams,
} from '../../__lib__/DSL_DataSpace_LegendQueryNavigation.js';
import { QueryEditor } from '../QueryEditor.js';
import { useEffect } from 'react';
import type { DataProductAccessType } from '@finos/legend-graph';

/**
 * Resolves a {@link LegendQueryableElement} from the current route parameters.
 *
 * Data-product routes provide `dataProductPath`, `accessType` and `accessId`.
 * Legacy data-space routes provide `dataSpacePath` and `executionContext`.
 * The DEFAULT route (`/`) provides no params – returns `undefined`.
 */
export const resolveQueryableElement = (
  dataProductParams: Readonly<Record<string, string | undefined>>,
  dataSpaceParams: Readonly<Record<string, string | undefined>>,
  runtimePath: string | undefined,
  classPath: string | undefined,
): LegendQueryableElement | undefined => {
  const dpGav =
    dataProductParams[DATA_PRODUCT_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.GAV];
  const dpPath =
    dataProductParams[
      DATA_PRODUCT_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.DATA_PRODUCT_PATH
    ];
  const dpAccessType =
    dataProductParams[
      DATA_PRODUCT_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.DATA_PRODUCT_ACCESS_TYPE
    ];
  const dpAccessId =
    dataProductParams[
      DATA_PRODUCT_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.DATA_PRODUCT_ACCESS_ID
    ];

  if (dpGav && dpPath && dpAccessType && dpAccessId) {
    const { groupId, artifactId, versionId } = parseGAVCoordinates(dpGav);
    return new QueryableDataProduct(
      groupId,
      artifactId,
      versionId,
      dpPath,
      dpAccessType as DataProductAccessType,
      dpAccessId,
    );
  }

  const dsGav =
    dataSpaceParams[DATA_SPACE_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.GAV];
  const dsPath =
    dataSpaceParams[
      DATA_SPACE_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.DATA_SPACE_PATH
    ];
  const dsExecCtx =
    dataSpaceParams[
      DATA_SPACE_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.EXECUTION_CONTEXT
    ];

  if (dsGav && dsPath && dsExecCtx) {
    const { groupId, artifactId, versionId } = parseGAVCoordinates(dsGav);
    return new QueryableLegacyDataProduct(
      groupId,
      artifactId,
      versionId,
      dsPath,
      dsExecCtx,
      runtimePath,
      classPath,
    );
  }

  return undefined;
};

/**
 * Unified query creator component used for data-product routes,
 * legacy data-space routes, and the default (`/`) route.
 *
 * Because every route renders the same component type, React Router
 * reconciles rather than unmounting when the URL changes, which prevents
 * the store from being recreated and `initialize()` from firing twice.
 */
export const QueryCreator = observer(() => {
  const applicationStore = useLegendQueryApplicationStore();
  const baseStore = useLegendQueryBaseStore();

  // Grab all possible route params — only the ones belonging to
  // the matched route pattern will be populated.
  const params = useParams<
    DataProductPathParams & DataSpaceQueryCreatorPathParams
  >();

  // Legacy data-space query params (from the query string)
  const runtimePath =
    applicationStore.navigationService.navigator.getCurrentLocationParameterValue(
      DATA_SPACE_QUERY_CREATOR_QUERY_PARAM_TOKEN.RUNTIME_PATH,
    );
  const classPath =
    applicationStore.navigationService.navigator.getCurrentLocationParameterValue(
      DATA_SPACE_QUERY_CREATOR_QUERY_PARAM_TOKEN.CLASS_PATH,
    );

  const queryableElement = resolveQueryableElement(
    params,
    params,
    runtimePath,
    classPath,
  );

  const store = useLocalObservable(
    () =>
      new DataProductQueryCreatorStore(
        applicationStore,
        baseStore.depotServerClient,
        queryableElement,
      ),
  );

  useEffect(() => {
    applicationStore.navigationService.navigator.updateCurrentLocation(
      generatePath(LEGEND_QUERY_ROUTE_PATTERN.DEFAULT),
    );
  }, [applicationStore]);

  return (
    <QueryEditorStoreContext.Provider value={store}>
      <QueryEditor />
    </QueryEditorStoreContext.Provider>
  );
});
