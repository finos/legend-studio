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
import { parseGAVCoordinates } from '@finos/legend-storage';
import { DataSpacePreviewStore } from '../../stores/studio/DataSpacePreviewStore.js';
import { createContext, useContext, useEffect } from 'react';
import { useLegendStudioApplicationStore } from '@finos/legend-application-studio';
import {
  DATA_SPACE_STUDIO_ROUTE_PATTERN_TOKEN,
  type DataSpacePreviewPathParams,
} from '../../application/studio/DSL_DataSpace_LegendStudioNavigation.js';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { DataSpaceViewer } from '../DataSpaceViewer.js';
import {
  BlankPanelContent,
  PanelLoadingIndicator,
  TimesCircleIcon,
} from '@finos/legend-art';

const DataSpacePreviewStoreContext = createContext<
  DataSpacePreviewStore | undefined
>(undefined);

const DataSpacePreviewStoreProvider: React.FC<{
  children: React.ReactNode;
  gav: string;
  dataSpacePath: string;
}> = ({ children, gav, dataSpacePath }) => {
  const { groupId, artifactId, versionId } = parseGAVCoordinates(gav);
  const applicationStore = useLegendStudioApplicationStore();
  const depotServerClient = useDepotServerClient();
  const store = useLocalObservable(
    () =>
      new DataSpacePreviewStore(
        applicationStore,
        depotServerClient,
        groupId,
        artifactId,
        versionId,
        dataSpacePath,
      ),
  );
  return (
    <DataSpacePreviewStoreContext.Provider value={store}>
      {children}
    </DataSpacePreviewStoreContext.Provider>
  );
};

const useDataSpacePreviewStore = (): DataSpacePreviewStore =>
  guaranteeNonNullable(
    useContext(DataSpacePreviewStoreContext),
    `Can't find data space preview store in context`,
  );

const DataSpacePreviewInner = observer(() => {
  const previewStore = useDataSpacePreviewStore();
  const applicationStore = useApplicationStore();

  useEffect(() => {
    flowResult(previewStore.initialize()).catch(
      applicationStore.alertUnhandledError,
    );
  }, [applicationStore, previewStore]);

  return (
    <div className="data-space-preview">
      <PanelLoadingIndicator
        isLoading={previewStore.loadDataSpaceState.isInProgress}
      />
      {previewStore.dataSpaceViewerState && (
        <DataSpaceViewer
          dataSpaceViewerState={previewStore.dataSpaceViewerState}
        />
      )}
      {!previewStore.dataSpaceViewerState && (
        <>
          {previewStore.loadDataSpaceState.isInProgress && (
            <BlankPanelContent>
              {previewStore.loadDataSpaceState.message}
            </BlankPanelContent>
          )}
          {previewStore.loadDataSpaceState.hasFailed && (
            <BlankPanelContent>
              <div className="data-space-preview__failure">
                <div className="data-space-preview__failure__icon">
                  <TimesCircleIcon />
                </div>
                <div className="data-space-preview__failure__text">
                  Can&apos;t load data space
                </div>
              </div>
            </BlankPanelContent>
          )}
        </>
      )}
    </div>
  );
});

export const DataSpacePreview = observer(() => {
  const parameters = useParams<DataSpacePreviewPathParams>();
  const gav = parameters[DATA_SPACE_STUDIO_ROUTE_PATTERN_TOKEN.GAV];
  const dataSpacePath =
    parameters[DATA_SPACE_STUDIO_ROUTE_PATTERN_TOKEN.DATA_SPACE_PATH];

  return (
    <DataSpacePreviewStoreProvider gav={gav} dataSpacePath={dataSpacePath}>
      <DataSpacePreviewInner />
    </DataSpacePreviewStoreProvider>
  );
});
