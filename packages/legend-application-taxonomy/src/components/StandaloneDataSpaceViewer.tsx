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
import type { LegendTaxonomyStandaloneDataSpaceViewerPathParams } from '../stores/LegendTaxonomyRouter.js';
import { flowResult } from 'mobx';
import {
  ArrowRightIcon,
  BlankPanelContent,
  PanelLoadingIndicator,
  TimesCircleIcon,
} from '@finos/legend-art';
import { DataSpaceViewer } from '@finos/legend-extension-dsl-data-space';
import { StandaloneDataSpaceViewerStore } from '../stores/StandaloneDataSpaceViewerStore.js';
import { useDepotServerClient } from '@finos/legend-server-depot';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { useLegendTaxonomyApplicationStore } from './LegendTaxonomyBaseStoreProvider.js';

const StandaloneDataSpaceViewerStoreContext = createContext<
  StandaloneDataSpaceViewerStore | undefined
>(undefined);

const StandaloneDataSpaceViewerStoreProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const applicationStore = useLegendTaxonomyApplicationStore();
  const depotServerClient = useDepotServerClient();
  const store = useLocalObservable(
    () =>
      new StandaloneDataSpaceViewerStore(applicationStore, depotServerClient),
  );
  return (
    <StandaloneDataSpaceViewerStoreContext.Provider value={store}>
      {children}
    </StandaloneDataSpaceViewerStoreContext.Provider>
  );
};

export const withStandaloneDataSpaceViewerStore = (
  WrappedComponent: React.FC,
): React.FC =>
  function WithStandaloneDataSpaceViewerStore() {
    return (
      <StandaloneDataSpaceViewerStoreProvider>
        <WrappedComponent />
      </StandaloneDataSpaceViewerStoreProvider>
    );
  };

const useStandaloneDataSpaceViewerStore = (): StandaloneDataSpaceViewerStore =>
  guaranteeNonNullable(
    useContext(StandaloneDataSpaceViewerStoreContext),
    `Can't find standalone data space viewer store in context`,
  );

export const StandaloneDataSpaceViewer = withStandaloneDataSpaceViewerStore(
  observer(() => {
    const params =
      useParams<LegendTaxonomyStandaloneDataSpaceViewerPathParams>();
    const applicationStore = useApplicationStore();
    const viewerStore = useStandaloneDataSpaceViewerStore();

    const queryDataSpace = (): void => viewerStore.queryDataSpace(undefined);

    useEffect(() => {
      flowResult(viewerStore.initialize(params)).catch(
        applicationStore.alertUnhandledError,
      );
    }, [applicationStore, params, viewerStore]);

    return (
      <div className="panel standalone-data-space-viewer">
        <div className="panel__header standalone-data-space-viewer__header">
          <div className="panel__header__title"></div>
          <div className="panel__header__actions standalone-data-space-viewer__header__actions">
            <button
              className="standalone-data-space-viewer__header__action btn--dark"
              onClick={queryDataSpace}
              disabled={!viewerStore.initState.hasSucceeded}
              tabIndex={-1}
              title="Query data space..."
            >
              <ArrowRightIcon />
            </button>
          </div>
        </div>
        <div className="panel__content standalone-data-space-viewer__content">
          <PanelLoadingIndicator
            isLoading={viewerStore.initState.isInProgress}
          />
          {viewerStore.viewerState && (
            <DataSpaceViewer dataSpaceViewerState={viewerStore.viewerState} />
          )}
          {!viewerStore.viewerState && (
            <>
              {viewerStore.initState.isInProgress && (
                <BlankPanelContent>
                  {viewerStore.initState.message}
                </BlankPanelContent>
              )}
              {viewerStore.initState.hasFailed && (
                <BlankPanelContent>
                  <div className="query-setup__data-space__view--failed">
                    <div className="query-setup__data-space__view--failed__icon">
                      <TimesCircleIcon />
                    </div>
                    <div className="query-setup__data-space__view--failed__text">
                      Can&apos;t load data space
                    </div>
                  </div>
                </BlankPanelContent>
              )}
            </>
          )}
        </div>
      </div>
    );
  }),
);
