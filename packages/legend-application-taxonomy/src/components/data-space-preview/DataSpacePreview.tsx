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
import { useApplicationStore, useParams } from '@finos/legend-application';
import { observer, useLocalObservable } from 'mobx-react-lite';
import type { DataSpacePreviewPathParams } from '../../application/LegendTaxonomyNavigation.js';
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
  function WithStandaloneDataSpaceViewerStore() {
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
    const applicationStore = useApplicationStore();
    const previewStore = useDataSpacePreviewStore();

    // const queryDataSpace = (): void => viewerStore.queryDataSpace(undefined);

    useEffect(() => {
      flowResult(previewStore.initialize(params)).catch(
        applicationStore.alertUnhandledError,
      );
    }, [applicationStore, params, previewStore]);

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
