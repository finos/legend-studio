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

import type { QueryBuilderState } from '../QueryBuilderState.js';

export interface FetchStructureLayoutConfig {
  label: string;
  showInFetchPanel: boolean;
}

export class QueryBuilderActionConfig {
  static INSTANCE = new QueryBuilderActionConfig();
}

export abstract class QueryBuilderWorkflowState {
  actionConfig = QueryBuilderActionConfig.INSTANCE;

  abstract get showStatusBar(): boolean;

  abstract getFetchStructureLayoutConfig(
    state: QueryBuilderState,
  ): FetchStructureLayoutConfig;

  updateActionConfig(actionConfig: QueryBuilderActionConfig): void {
    this.actionConfig = actionConfig;
  }
}

export class QueryBuilderAdvancedWorkflowState extends QueryBuilderWorkflowState {
  get showStatusBar(): boolean {
    return true;
  }

  override getFetchStructureLayoutConfig(
    state: QueryBuilderState,
  ): FetchStructureLayoutConfig {
    return {
      label: 'fetch structure',
      showInFetchPanel: true,
    };
  }

  static INSTANCE = new QueryBuilderAdvancedWorkflowState();
}

export class QueryBuilderDataBrowserWorkflow extends QueryBuilderWorkflowState {
  override get showStatusBar(): boolean {
    return false;
  }

  override getFetchStructureLayoutConfig(
    state: QueryBuilderState,
  ): FetchStructureLayoutConfig {
    return {
      label: state.fetchStructureState.implementation.fetchLabel,
      showInFetchPanel: false,
    };
  }

  static readonly INSTANCE = new QueryBuilderDataBrowserWorkflow();
}
