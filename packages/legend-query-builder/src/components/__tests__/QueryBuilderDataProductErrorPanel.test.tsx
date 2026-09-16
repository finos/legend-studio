/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { test, describe, expect } from '@jest/globals';
import { integrationTest } from '@finos/legend-shared/test';
import { render, fireEvent, type RenderResult } from '@testing-library/react';
import { Route, Routes } from '@finos/legend-application/browser';
import {
  ApplicationStore,
  ApplicationStoreProvider,
  ApplicationFrameworkProvider,
  LegendApplicationPlugin,
} from '@finos/legend-application';
import { TEST__BrowserEnvironmentProvider } from '@finos/legend-application/test';
import { Core_GraphManagerPreset } from '@finos/legend-graph';
import { TEST__getTestGraphManagerState } from '@finos/legend-graph/test';
import {
  TEST__getGenericApplicationConfig,
  TEST__LegendApplicationPluginManager,
} from '../../stores/__test-utils__/QueryBuilderStateTestUtils.js';
import { QueryBuilder_GraphManagerPreset } from '../../graph-manager/QueryBuilder_GraphManagerPreset.js';
import {
  type QueryBuilderState,
  INTERNAL__BasicQueryBuilderState,
} from '../../stores/QueryBuilderState.js';
import { QueryBuilderAdvancedWorkflowState } from '../../stores/query-workflow/QueryBuilderWorkFlowState.js';
import {
  QueryBuilderDataProductAccessErrorPanel,
  QueryBuilderDataProductWarehouseErrorPanel,
} from '../result/QueryBuilderDataProductErrorPanel.js';
import type { DataProductAccessInfo } from '../../stores/data-access/DataProductAccessInfo.js';
import type {
  DataProductAccessRequestLinkBuilder,
  QueryBuilder_LegendApplicationPlugin_Extension,
} from '../../stores/QueryBuilder_LegendApplicationPlugin_Extension.js';

const TEST_DATA__accessInfo: DataProductAccessInfo = {
  dataProductLabel: 'Trading Data',
  dataProductId: 'TradingData',
  accessPointGroupId: 'positions',
  accessPointGroupLabel: 'Positions',
  deploymentId: '20153',
  environment: 'PROD-PARALLEL',
  warehouse: 'LAKEHOUSE_WH',
  supportEmails: ['trading-data-support@test.com'],
};

const TEST_DATA__marketplaceUrl =
  'https://marketplace.test.com/dataProduct/deployed/TradingData/20153#apg-positions';

class TEST__MarketplaceLinkPlugin
  extends LegendApplicationPlugin
  implements QueryBuilder_LegendApplicationPlugin_Extension
{
  constructor() {
    super('TEST__MarketplaceLinkPlugin', '0.0.0');
  }

  install(): void {
    // do nothing
  }

  getDataProductAccessRequestLinkBuilders(): DataProductAccessRequestLinkBuilder[] {
    return [(): string => TEST_DATA__marketplaceUrl];
  }
}

const setUpPanel = (
  withLinkBuilder: boolean,
  buildPanel: (queryBuilderState: QueryBuilderState) => React.ReactNode,
): RenderResult => {
  const pluginManager = TEST__LegendApplicationPluginManager.create();
  pluginManager
    .usePresets([
      new Core_GraphManagerPreset(),
      new QueryBuilder_GraphManagerPreset(),
    ])
    .install();
  if (withLinkBuilder) {
    pluginManager.registerApplicationPlugin(new TEST__MarketplaceLinkPlugin());
  }
  const applicationStore = new ApplicationStore(
    TEST__getGenericApplicationConfig(),
    pluginManager,
  );
  const queryBuilderState = new INTERNAL__BasicQueryBuilderState(
    applicationStore,
    TEST__getTestGraphManagerState(pluginManager),
    QueryBuilderAdvancedWorkflowState.INSTANCE,
    undefined,
  );

  return render(
    <ApplicationStoreProvider store={applicationStore}>
      <TEST__BrowserEnvironmentProvider initialEntries={['/']}>
        <ApplicationFrameworkProvider>
          <Routes>
            <Route path="*" element={buildPanel(queryBuilderState)} />
          </Routes>
        </ApplicationFrameworkProvider>
      </TEST__BrowserEnvironmentProvider>
    </ApplicationStoreProvider>,
  );
};

const setUpAccessErrorPanel = (props: {
  withLinkBuilder: boolean;
  errorMessage?: string | undefined;
  errorStackTrace?: string | undefined;
}): RenderResult =>
  setUpPanel(props.withLinkBuilder, (queryBuilderState) => (
    <QueryBuilderDataProductAccessErrorPanel
      queryBuilderState={queryBuilderState}
      info={TEST_DATA__accessInfo}
      headline="You don't have access to Positions in Trading Data"
      errorMessage={props.errorMessage}
      errorStackTrace={props.errorStackTrace}
    />
  ));

const setUpWarehouseErrorPanel = (props: {
  errorMessage?: string | undefined;
}): RenderResult =>
  setUpPanel(true, (queryBuilderState) => (
    <QueryBuilderDataProductWarehouseErrorPanel
      queryBuilderState={queryBuilderState}
      info={TEST_DATA__accessInfo}
      faqUrl="https://docs.test.com/snowflake-warehouse-faq"
      errorMessage={props.errorMessage}
    />
  ));

describe(
  integrationTest('Query builder data product access error panel'),
  () => {
    test('Shows the blocked data product, the request access action, and the raw error', async () => {
      const renderResult = setUpAccessErrorPanel({
        withLinkBuilder: true,
        errorMessage:
          "SQL access control error: Insufficient privileges to operate on table 'POSITIONS_V1'",
      });

      expect(
        await renderResult.findByText(
          "You don't have access to Positions in Trading Data",
        ),
      ).not.toBeNull();
      expect(
        renderResult.getByRole('button', {
          name: 'Request Access in Marketplace',
        }),
      ).not.toBeNull();

      // identifying context
      expect(renderResult.getByText('Trading Data')).not.toBeNull();
      expect(renderResult.getByText('Positions')).not.toBeNull();
      expect(renderResult.getByText('PROD-PARALLEL')).not.toBeNull();
      expect(renderResult.getByText('20153')).not.toBeNull();
      expect(renderResult.getByText('LAKEHOUSE_WH')).not.toBeNull();
      expect(
        renderResult.getByText('trading-data-support@test.com'),
      ).not.toBeNull();

      // the raw error stays visible rather than being collapsed away
      expect(
        renderResult.getByText(
          "SQL access control error: Insufficient privileges to operate on table 'POSITIONS_V1'",
        ),
      ).not.toBeNull();
    });

    test('Omits the request access action when no plugin can build a link', async () => {
      const renderResult = setUpAccessErrorPanel({
        withLinkBuilder: false,
        errorMessage: 'permission denied',
      });

      // the rest of the view still renders
      expect(
        await renderResult.findByText(
          "You don't have access to Positions in Trading Data",
        ),
      ).not.toBeNull();
      expect(
        renderResult.queryByRole('button', {
          name: 'Request Access in Marketplace',
        }),
      ).toBeNull();
      expect(renderResult.getByText('permission denied')).not.toBeNull();
    });

    test('Collapses the stack trace behind a toggle', async () => {
      const renderResult = setUpAccessErrorPanel({
        withLinkBuilder: true,
        errorMessage: 'permission denied',
        errorStackTrace: 'at com.snowflake.Executor.run(Executor.java:42)',
      });

      expect(await renderResult.findByText('permission denied')).not.toBeNull();
      expect(
        renderResult.queryByText(
          'at com.snowflake.Executor.run(Executor.java:42)',
        ),
      ).toBeNull();
      fireEvent.click(renderResult.getByText('Show stack trace'));
      expect(
        renderResult.getByText(
          'at com.snowflake.Executor.run(Executor.java:42)',
        ),
      ).not.toBeNull();
    });
  },
);

describe(
  integrationTest('Query builder data product warehouse error panel'),
  () => {
    test('Names the warehouse, links to the FAQ, and keeps the raw error', async () => {
      const renderResult = setUpWarehouseErrorPanel({
        errorMessage:
          "No active warehouse selected in the current session. Select an active warehouse with the 'use warehouse' command.",
      });

      expect(
        await renderResult.findByText("Can't access warehouse LAKEHOUSE_WH"),
      ).not.toBeNull();
      expect(
        renderResult.getByRole('button', {
          name: 'Snowflake Warehouse FAQ',
        }),
      ).not.toBeNull();
      expect(renderResult.getByText('LAKEHOUSE_WH')).not.toBeNull();
      expect(renderResult.getByText('PROD-PARALLEL')).not.toBeNull();
      expect(renderResult.getByText('Trading Data')).not.toBeNull();
      expect(
        renderResult.getByText(
          "No active warehouse selected in the current session. Select an active warehouse with the 'use warehouse' command.",
        ),
      ).not.toBeNull();
    });

    test('Does not offer to request access, which would not fix a compute problem', async () => {
      const renderResult = setUpWarehouseErrorPanel({
        errorMessage: 'no active warehouse selected',
      });

      expect(
        await renderResult.findByText("Can't access warehouse LAKEHOUSE_WH"),
      ).not.toBeNull();
      expect(
        renderResult.queryByRole('button', {
          name: 'Request Access in Marketplace',
        }),
      ).toBeNull();
      // the access point group is about data grants, so it is not shown here
      expect(renderResult.queryByText('Access Point Group')).toBeNull();
    });
  },
);
