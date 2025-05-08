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
import { useParams } from '@finos/legend-application/browser';
import {
  LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN,
  type LakehouseEntitlementsTasksParam,
} from '../../../__lib__/LegendMarketplaceNavigation.js';
import { EntitlementsDashboardState } from '../../../stores/lakehouse/entitlements/EntitlementsDashboardState.js';
import { EntitlementsTaskViewerState } from '../../../stores/lakehouse/entitlements/EntitlementsTaskViewerState.js';
import { LegendMarketplacePage } from '../../LegendMarketplacePage.js';
import { EntitlementsDataContractViewer } from './EntitlementsDataContractViewer.js';
import { EntitlementsTaskViewer } from './EntitlementsTaskViewer.js';
import { EntitlementsDashboard } from './EntitlementsDashboard.js';
import { EntitlementsDataContractViewerState } from '../../../stores/lakehouse/entitlements/EntitlementsDataContractViewerState.js';

export const LakehouseEntitlements = withLakehouseEntitlementsStore(
  observer(() => {
    const entitlementsStore = useLakehouseEntitlementsStore();
    const auth = useAuth();
    const params = useParams<LakehouseEntitlementsTasksParam>();

    useEffect(() => {
      entitlementsStore.init(
        params[LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.TASK_ID],
        params[LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.CONTRACT_ID],
        auth.user?.access_token,
      );
    }, [auth.user?.access_token, entitlementsStore, params]);

    const renderCurrentViewer = (): React.ReactNode => {
      const currentViewer = entitlementsStore.currentViewer;
      if (currentViewer instanceof EntitlementsDashboardState) {
        return <EntitlementsDashboard currentViewer={currentViewer} />;
      } else if (currentViewer instanceof EntitlementsTaskViewerState) {
        return <EntitlementsTaskViewer currentViewer={currentViewer} />;
      } else if (currentViewer instanceof EntitlementsDataContractViewerState) {
        return <EntitlementsDataContractViewer currentViewer={currentViewer} />;
      }

      return null;
    };
    return (
      <LegendMarketplacePage className="legend-marketplace-lakehouse-entitlements">
        <CubesLoadingIndicator
          isLoading={Boolean(
            entitlementsStore.initializationState.isInProgress ||
              entitlementsStore.currentViewer?.initializationState.isInProgress,
          )}
        >
          <CubesLoadingIndicatorIcon />
        </CubesLoadingIndicator>
        {renderCurrentViewer()}
      </LegendMarketplacePage>
    );
  }),
);
