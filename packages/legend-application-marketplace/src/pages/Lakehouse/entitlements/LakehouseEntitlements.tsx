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
  useLakehouseEntitlementsStore,
  withLakehouseEntitlementsStore,
} from './LakehouseEntitlementsStoreProvider.js';
import { useAuth } from 'react-oidc-context';
import { useEffect } from 'react';
import {
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
} from '@finos/legend-art';
import {} from '@finos/legend-lego/data-grid';
import { LegendMarketplacePage } from '../../LegendMarketplacePage.js';
import { EntitlementsDashboard } from './EntitlementsDashboard.js';
import { flowResult } from 'mobx';

export const LakehouseEntitlements = withLakehouseEntitlementsStore(
  observer(() => {
    const entitlementsStore = useLakehouseEntitlementsStore();
    const auth = useAuth();

    useEffect(() => {
      if (
        entitlementsStore.dashboardViewer.initializationState.isInInitialState
      ) {
        flowResult(
          entitlementsStore.dashboardViewer.init(auth.user?.access_token),
        );
      }
    }, [auth.user?.access_token, entitlementsStore]);

    const loading = Boolean(
      entitlementsStore.dashboardViewer?.initializationState.isInProgress,
    );

    return (
      <LegendMarketplacePage className="marketplace-lakehouse-entitlements">
        <CubesLoadingIndicator isLoading={loading}>
          <CubesLoadingIndicatorIcon />
        </CubesLoadingIndicator>
        {!loading && entitlementsStore.dashboardViewer !== undefined && (
          <EntitlementsDashboard
            dashboardState={entitlementsStore.dashboardViewer}
          />
        )}
      </LegendMarketplacePage>
    );
  }),
);
