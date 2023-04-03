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

import { observer } from 'mobx-react-lite';
import {
  generateExploreTaxonomyTreeRoute,
  LEGEND_TAXONOMY_ROUTE_PATTERN,
} from '../application/LegendTaxonomyNavigation.js';
import { DepotServerClientProvider } from '@finos/legend-server-depot';
import {
  LegendApplicationComponentFrameworkProvider,
  Redirect,
  Route,
  Switch,
} from '@finos/legend-application';
import type { LegendTaxonomyApplicationConfig } from '../application/LegendTaxonomyApplicationConfig.js';
import { TaxonomyExplorer } from './TaxonomyExplorer.js';
import { DataSpacePreview } from './data-space-preview/DataSpacePreview.js';
import {
  LegendTaxonomyBaseStoreProvider,
  useLegendTaxonomyApplicationStore,
  useLegendTaxonomyBaseStore,
} from './LegendTaxonomyBaseStoreProvider.js';
import { useEffect } from 'react';
import { flowResult } from 'mobx';
import { PanelLoadingIndicator } from '@finos/legend-art';

export const LegendTaxonomyApplicationRoot = observer(() => {
  const applicationStore = useLegendTaxonomyApplicationStore();
  const baseStore = useLegendTaxonomyBaseStore();

  useEffect(() => {
    flowResult(baseStore.initialize()).catch(
      applicationStore.alertUnhandledError,
    );
  }, [applicationStore, baseStore]);

  return (
    <div className="app">
      {baseStore.initState.isInProgress && (
        <div className="app__page">
          <PanelLoadingIndicator isLoading={true} />
        </div>
      )}
      {baseStore.initState.hasSucceeded && (
        <Switch>
          <Route
            exact={true}
            path={[
              LEGEND_TAXONOMY_ROUTE_PATTERN.EXPLORE_TAXONOMY_TREE,
              LEGEND_TAXONOMY_ROUTE_PATTERN.EXPLORE_TAXONOMY_TREE_NODE,
              LEGEND_TAXONOMY_ROUTE_PATTERN.EXPLORE_TAXONOMY_TREE_NODE_DATA_SPACE,
            ]}
            component={TaxonomyExplorer}
          />
          <Route
            exact={true}
            path={LEGEND_TAXONOMY_ROUTE_PATTERN.VIEW_DATA_SPACE}
            component={DataSpacePreview}
          />
          <Redirect
            to={generateExploreTaxonomyTreeRoute(
              applicationStore.config.defaultTaxonomyTreeOption.key,
            )}
          />
        </Switch>
      )}
    </div>
  );
});

export const LegendTaxonomyApplication = observer(
  (props: { config: LegendTaxonomyApplicationConfig }) => {
    const { config } = props;

    return (
      <DepotServerClientProvider
        config={{
          serverUrl: config.depotServerUrl,
        }}
      >
        <LegendTaxonomyBaseStoreProvider>
          <LegendApplicationComponentFrameworkProvider>
            <LegendTaxonomyApplicationRoot />
          </LegendApplicationComponentFrameworkProvider>
        </LegendTaxonomyBaseStoreProvider>
      </DepotServerClientProvider>
    );
  },
);
