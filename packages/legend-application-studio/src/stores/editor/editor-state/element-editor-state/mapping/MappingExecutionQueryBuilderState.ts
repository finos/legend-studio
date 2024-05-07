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

import type { GenericLegendApplicationStore } from '@finos/legend-application';
import {
  type QueryBuilderConfig,
  QueryBuilderState,
  QueryBuilderAdvancedWorkflowState,
} from '@finos/legend-query-builder';
import type { GraphManagerState, Mapping } from '@finos/legend-graph';
import { renderMappingExecutionQueryBuilderSetupPanelContent } from '../../../../../components/editor/editor-group/mapping-editor/MappingExecutionQueryBuilder.js';

export class MappingExecutionQueryBuilderState extends QueryBuilderState {
  readonly executionMapping: Mapping;

  override TEMPORARY__setupPanelContentRenderer = (): React.ReactNode =>
    renderMappingExecutionQueryBuilderSetupPanelContent(this);

  constructor(
    applicationStore: GenericLegendApplicationStore,
    graphManagerState: GraphManagerState,
    mapping: Mapping,
    config: QueryBuilderConfig | undefined,
    sourceInfo?: object | undefined,
  ) {
    super(
      applicationStore,
      graphManagerState,
      QueryBuilderAdvancedWorkflowState.INSTANCE,
      config,
      sourceInfo,
    );
    this.executionMapping = mapping;
    this.executionContextState.mapping = mapping;
  }

  override get isMappingReadOnly(): boolean {
    return true;
  }

  override get isRuntimeReadOnly(): boolean {
    return true;
  }

  override get isParameterSupportDisabled(): boolean {
    return true;
  }

  override get isResultPanelHidden(): boolean {
    return true;
  }

  override get sideBarClassName(): string | undefined {
    return 'query-builder__setup__mapping-execution';
  }
}
