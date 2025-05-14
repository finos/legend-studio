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
import { useEffect, useState } from 'react';
import {
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
} from '@finos/legend-art';
import {} from '@finos/legend-lego/data-grid';
import { useParams } from '@finos/legend-application/browser';
import {
  LEGEND_MARKETPLACE_ROUTE_PATTERN,
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
import { flowResult } from 'mobx';
import { Drawer } from '@mui/material';

export const LakehouseEntitlements = withLakehouseEntitlementsStore(
  observer(() => {
    const entitlementsStore = useLakehouseEntitlementsStore();
    const auth = useAuth();
    const params = useParams<LakehouseEntitlementsTasksParam>();
    const [showDrawer, setShowDrawer] = useState(false);

    useEffect(() => {
      if (
        !entitlementsStore.dashboardViewer?.initializationState.hasCompleted
      ) {
        entitlementsStore.initDashboard(auth.user?.access_token);
      }
      if (params[LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.TASK_ID]) {
        flowResult(
          entitlementsStore.initWithTaskId(
            params[LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.TASK_ID],
            auth.user?.access_token,
          ),
        ).catch(entitlementsStore.applicationStore.alertUnhandledError);
      } else if (params[LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.CONTRACT_ID]) {
        flowResult(
          entitlementsStore.initWithContract(
            params[LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.CONTRACT_ID],
            auth.user?.access_token,
          ),
        ).catch(entitlementsStore.applicationStore.alertUnhandledError);
      }
    }, [auth.user?.access_token, entitlementsStore, params]);

    useEffect(() => {
      if (entitlementsStore.currentViewer !== undefined) {
        setShowDrawer(true);
      }
    }, [entitlementsStore.currentViewer]);

    return (
      <LegendMarketplacePage className="legend-marketplace-lakehouse-entitlements">
        <CubesLoadingIndicator
          isLoading={Boolean(
            entitlementsStore.dashboardViewer?.initializationState.isInProgress,
          )}
        >
          <CubesLoadingIndicatorIcon />
        </CubesLoadingIndicator>
        {entitlementsStore.dashboardViewer instanceof
          EntitlementsDashboardState && (
          <EntitlementsDashboard
            currentViewer={entitlementsStore.dashboardViewer}
          />
        )}
        <Drawer
          anchor="right"
          open={showDrawer}
          onClose={() => {
            setShowDrawer(false);
            entitlementsStore.applicationStore.navigationService.navigator.updateCurrentLocation(
              LEGEND_MARKETPLACE_ROUTE_PATTERN.LAKEHOUSE_ENTITLEMENTS,
            );
          }}
          onAnimationEnd={() => {
            entitlementsStore.setCurrentViewer(undefined);
          }}
          slotProps={{
            paper: {
              sx: {
                width: '50%',
                maxWidth: '120rem',
              },
            },
          }}
        >
          <CubesLoadingIndicator
            isLoading={Boolean(
              entitlementsStore.currentViewerFetchStatus.isInProgress ||
                entitlementsStore.currentViewer?.initializationState
                  .isInProgress,
            )}
          >
            <CubesLoadingIndicatorIcon />
          </CubesLoadingIndicator>
          {entitlementsStore.currentViewer instanceof
            EntitlementsTaskViewerState &&
          entitlementsStore.currentViewer.initializationState.hasCompleted ? (
            <EntitlementsTaskViewer
              currentViewer={entitlementsStore.currentViewer}
            />
          ) : entitlementsStore.currentViewer instanceof
              EntitlementsDataContractViewerState &&
            entitlementsStore.currentViewer.initializationState.hasCompleted ? (
            <EntitlementsDataContractViewer
              currentViewer={entitlementsStore.currentViewer}
            />
          ) : (
            <p>Unable to display viewer</p>
          )}
        </Drawer>
      </LegendMarketplacePage>
    );
  }),
);
