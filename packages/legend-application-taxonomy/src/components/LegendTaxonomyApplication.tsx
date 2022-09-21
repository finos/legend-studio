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

import { Switch, Route, Redirect } from 'react-router';
import { observer } from 'mobx-react-lite';
import {
  generateExploreTaxonomyTreeRoute,
  LEGEND_TAXONOMY_ROUTE_PATTERN,
} from '../stores/LegendTaxonomyRouter.js';
import { DepotServerClientProvider } from '@finos/legend-server-depot';
import { LegendApplicationComponentFrameworkProvider } from '@finos/legend-application';
import type { LegendTaxonomyApplicationConfig } from '../application/LegendTaxonomyApplicationConfig.js';
import { TaxonomyExplorer } from './TaxonomyExplorer.js';
import { StandaloneDataSpaceViewer } from './StandaloneDataSpaceViewer.js';
import {
  LegendTaxonomyBaseStoreProvider,
  useLegendTaxonomyApplicationStore,
} from './LegendTaxonomyBaseStoreProvider.js';

export const LegendTaxonomyApplicationRoot = observer(() => {
  const applicationStore = useLegendTaxonomyApplicationStore();

  return (
    <div className="app">
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
          path={LEGEND_TAXONOMY_ROUTE_PATTERN.STANDALONE_DATA_SPACE_VIEWER}
          component={StandaloneDataSpaceViewer}
        />
        <Redirect
          to={generateExploreTaxonomyTreeRoute(
            applicationStore.config.defaultTaxonomyTreeOption.key,
          )}
        />
      </Switch>
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
