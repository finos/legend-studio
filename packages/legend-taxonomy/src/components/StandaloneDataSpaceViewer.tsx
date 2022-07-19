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

import { useEffect } from 'react';
import { useApplicationStore } from '@finos/legend-application';
import { observer } from 'mobx-react-lite';
import { useParams } from 'react-router';
import type { LegendTaxonomyStandaloneDataSpaceViewerParams } from '../stores/LegendTaxonomyRouter.js';
import { useLegendTaxonomyStore } from './LegendTaxonomyStoreProvider.js';
import { flowResult } from 'mobx';
import {
  ArrowRightIcon,
  BlankPanelContent,
  PanelLoadingIndicator,
  TimesCircleIcon,
} from '@finos/legend-art';
import { DataSpaceViewer } from '@finos/legend-extension-dsl-data-space';

export const StandaloneDataSpaceViewer = observer(() => {
  const params = useParams<LegendTaxonomyStandaloneDataSpaceViewerParams>();
  const applicationStore = useApplicationStore();
  const taxonomyStore = useLegendTaxonomyStore();

  useEffect(() => {
    flowResult(taxonomyStore.initializeStandaloneDataSpaceViewer(params)).catch(
      applicationStore.alertUnhandledError,
    );
  }, [applicationStore, params, taxonomyStore]);
  const queryDataSpace = (): void => {
    if (taxonomyStore.standaloneDataSpaceViewerState) {
      taxonomyStore.queryUsingDataSpace(
        taxonomyStore.standaloneDataSpaceViewerState,
      );
    }
  };

  return (
    <div className="panel standalone-data-space-viewer">
      <PanelLoadingIndicator
        isLoading={
          taxonomyStore.initStandaloneDataSpaceViewerState.isInProgress
        }
      />
      <div className="panel__header standalone-data-space-viewer__header">
        <div className="panel__header__title"></div>
        <div className="panel__header__actions standalone-data-space-viewer__header__actions">
          <button
            className="standalone-data-space-viewer__header__action btn--dark"
            onClick={queryDataSpace}
            disabled={!taxonomyStore.standaloneDataSpaceViewerState}
            tabIndex={-1}
            title="Query data space..."
          >
            <ArrowRightIcon />
          </button>
        </div>
      </div>
      <div className="panel__content standalone-data-space-viewer__content">
        {taxonomyStore.standaloneDataSpaceViewerState && (
          <DataSpaceViewer
            dataSpaceViewerState={taxonomyStore.standaloneDataSpaceViewerState}
          />
        )}
        {!taxonomyStore.standaloneDataSpaceViewerState &&
          taxonomyStore.initStandaloneDataSpaceViewerState.isInProgress && (
            <BlankPanelContent>
              {taxonomyStore.initStandaloneDataSpaceViewerState.message ??
                taxonomyStore.graphManagerState.systemBuildState.message ??
                taxonomyStore.graphManagerState.dependenciesBuildState
                  .message ??
                taxonomyStore.graphManagerState.generationsBuildState.message ??
                taxonomyStore.graphManagerState.graphBuildState.message}
            </BlankPanelContent>
          )}
        {!taxonomyStore.standaloneDataSpaceViewerState &&
          taxonomyStore.initStandaloneDataSpaceViewerState.hasFailed && (
            <BlankPanelContent>
              <div className="standalone-data-space-viewer__content__placeholder--failed">
                <div className="standalone-data-space-viewer__content__placeholder--failed__icon">
                  <TimesCircleIcon />
                </div>
                <div className="standalone-data-space-viewer__content__placeholder--failed__text">
                  Can&apos;t load data space
                </div>
              </div>
            </BlankPanelContent>
          )}
      </div>
    </div>
  );
});
