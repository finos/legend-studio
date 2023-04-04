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

import { createContext, useContext, useEffect } from 'react';
import {
  useApplicationStore,
  useNavigationZone,
  useParams,
} from '@finos/legend-application';
import { observer, useLocalObservable } from 'mobx-react-lite';
import {
  LEGEND_TAXONOMY_ROUTE_PATTERN_TOKEN,
  type DataSpacePreviewPathParams,
} from '../../application/LegendTaxonomyNavigation.js';
import { flowResult } from 'mobx';
import {
  BlankPanelContent,
  PanelLoadingIndicator,
  TimesCircleIcon,
} from '@finos/legend-art';
import { DataSpaceViewer } from '@finos/legend-extension-dsl-data-space';
import { DataSpacePreviewStore as DataSpacePreviewStore } from '../../stores/data-space-preview/DataSpacePreviewStore.js';
import { useDepotServerClient } from '@finos/legend-server-depot';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { useLegendTaxonomyApplicationStore } from '../LegendTaxonomyBaseStoreProvider.js';

const DataSpacePreviewStoreContext = createContext<
  DataSpacePreviewStore | undefined
>(undefined);

const DataSpacePreviewStoreProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const applicationStore = useLegendTaxonomyApplicationStore();
  const depotServerClient = useDepotServerClient();
  const store = useLocalObservable(
    () => new DataSpacePreviewStore(applicationStore, depotServerClient),
  );
  return (
    <DataSpacePreviewStoreContext.Provider value={store}>
      {children}
    </DataSpacePreviewStoreContext.Provider>
  );
};

export const withDataSpacePreviewStore = (
  WrappedComponent: React.FC,
): React.FC =>
  function WithDataSpacePreviewStore() {
    return (
      <DataSpacePreviewStoreProvider>
        <WrappedComponent />
      </DataSpacePreviewStoreProvider>
    );
  };

const useDataSpacePreviewStore = (): DataSpacePreviewStore =>
  guaranteeNonNullable(
    useContext(DataSpacePreviewStoreContext),
    `Can't find data space preview store in context`,
  );

export const DataSpacePreview = withDataSpacePreviewStore(
  observer(() => {
    const params = useParams<DataSpacePreviewPathParams>();
    const gav = params[LEGEND_TAXONOMY_ROUTE_PATTERN_TOKEN.GAV];
    const dataSpacePath =
      params[LEGEND_TAXONOMY_ROUTE_PATTERN_TOKEN.DATA_SPACE_PATH];
    const applicationStore = useApplicationStore();
    const previewStore = useDataSpacePreviewStore();
    const navigationZone = useNavigationZone();

    useEffect(() => {
      if (previewStore.viewerState) {
        previewStore.viewerState.changeZone(navigationZone);
      }
    }, [previewStore.viewerState, navigationZone]);

    useEffect(() => {
      flowResult(previewStore.initialize(gav, dataSpacePath)).catch(
        applicationStore.alertUnhandledError,
      );
    }, [applicationStore, gav, dataSpacePath, previewStore]);

    return (
      <div className="data-space-preview">
        <PanelLoadingIndicator
          isLoading={previewStore.initState.isInProgress}
        />
        {previewStore.viewerState && (
          <DataSpaceViewer dataSpaceViewerState={previewStore.viewerState} />
        )}
        {!previewStore.viewerState && (
          <>
            {previewStore.initState.isInProgress && (
              <BlankPanelContent>
                {previewStore.initState.message}
              </BlankPanelContent>
            )}
            {previewStore.initState.hasFailed && (
              <BlankPanelContent>
                <div className="data-space-preview__failure">
                  <div className="data-space-preview__failure__icon">
                    <TimesCircleIcon />
                  </div>
                  <div className="data-space-preview__failure__text">
                    {`Can't load data space`}
                  </div>
                </div>
              </BlankPanelContent>
            )}
          </>
        )}
      </div>
    );
  }),
);
