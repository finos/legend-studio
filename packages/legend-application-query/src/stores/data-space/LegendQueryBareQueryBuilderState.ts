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

import { type DepotServerClient } from '@finos/legend-server-depot';
import { type GraphManagerState } from '@finos/legend-graph';
import { action, makeObservable, observable } from 'mobx';
import {
  type QueryBuilderConfig,
  QueryBuilderDataBrowserWorkflow,
  BaseQueryBuilderState,
} from '@finos/legend-query-builder';
import type { ResolvedDataSpaceEntityWithOrigin } from '@finos/legend-extension-dsl-data-space/application';
import type { DepotEntityWithOrigin } from '@finos/legend-storage';
import {
  QueryBuilderActionConfig_QueryApplication,
  type QueryEditorStore,
} from '../QueryEditorStore.js';
import { renderDataSpaceQuerySetupSetupPanelContent } from '../../components/data-space/DataSpaceQuerySetup.js';
import { DataSpaceAdvancedSearchState } from '@finos/legend-extension-dsl-data-space/application-query';
import { DataProductSelectorState } from './DataSpaceQueryCreatorStore.js';
import {
  createViewProjectHandler,
  createViewSDLCProjectHandler,
} from './DataSpaceQueryBuilderHelper.js';
import type { LegendQueryApplicationStore } from '../LegendQueryBaseStore.js';

export class LegendQueryBareQueryBuilderState extends BaseQueryBuilderState {
  declare applicationStore: LegendQueryApplicationStore;
  editorStore: QueryEditorStore;
  readonly depotServerClient: DepotServerClient;
  readonly changeHandlers: {
    onDataSpaceChange: (val: ResolvedDataSpaceEntityWithOrigin) => void;
    onDataProductChange: (val: DepotEntityWithOrigin) => void;
  };

  override TEMPORARY__setupPanelContentRenderer = (): React.ReactNode =>
    renderDataSpaceQuerySetupSetupPanelContent(this);

  showRuntimeSelector = false;
  isLightGraphEnabled!: boolean;
  productSelectorState: DataProductSelectorState;

  // advanced state
  advancedSearchState?: DataSpaceAdvancedSearchState | undefined;

  constructor(
    editorStore: QueryEditorStore,
    applicationStore: LegendQueryApplicationStore,
    graphManagerState: GraphManagerState,
    depotServerClient: DepotServerClient,
    changeHandlers: {
      onDataSpaceChange: (val: ResolvedDataSpaceEntityWithOrigin) => void;
      onDataProductChange: (val: DepotEntityWithOrigin) => void;
    },
    config: QueryBuilderConfig | undefined,
    productSelectorState: DataProductSelectorState | undefined,
  ) {
    super(
      applicationStore,
      graphManagerState,
      QueryBuilderDataBrowserWorkflow.INSTANCE,
      config,
    );

    makeObservable(this, {
      advancedSearchState: observable,
      showAdvancedSearchPanel: action,
      hideAdvancedSearchPanel: action,
    });

    this.editorStore = editorStore;
    this.workflowState.updateActionConfig(
      new QueryBuilderActionConfig_QueryApplication(editorStore),
    );
    this.depotServerClient = depotServerClient;
    this.changeHandlers = changeHandlers;
    this.productSelectorState =
      productSelectorState ??
      new DataProductSelectorState(depotServerClient, applicationStore);
  }

  override get sideBarClassName(): string | undefined {
    return 'query-builder__setup__data-space-setup';
  }

  showAdvancedSearchPanel(): void {
    this.advancedSearchState = new DataSpaceAdvancedSearchState(
      this.applicationStore,
      this.graphManagerState,
      this.depotServerClient,
      {
        viewProject: createViewProjectHandler(this.applicationStore),
        viewSDLCProject: createViewSDLCProjectHandler(
          this.applicationStore,
          this.depotServerClient,
        ),
      },
    );
  }

  hideAdvancedSearchPanel(): void {
    this.advancedSearchState = undefined;
  }
}
