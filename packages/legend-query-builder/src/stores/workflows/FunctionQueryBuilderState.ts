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
import type {
  ConcreteFunctionDefinition,
  GraphManagerState,
} from '@finos/legend-graph';
import { ClassQueryBuilderState } from './ClassQueryBuilderState.js';
import type { QueryBuilderConfig } from '../../graph-manager/QueryBuilderConfig.js';
import type { QueryBuilderWorkflowState } from '../query-workflow/QueryBuilderWorkFlowState.js';

// Note: We may want to move it to extend QueryBuilderState directly
// but for now we will use the same setup as class as class, mapping, runtime are editable
export class FunctionQueryBuilderState extends ClassQueryBuilderState {
  readonly functionElement: ConcreteFunctionDefinition;

  constructor(
    applicationStore: GenericLegendApplicationStore,
    graphManagerState: GraphManagerState,
    workflowState: QueryBuilderWorkflowState,
    functionElemenet: ConcreteFunctionDefinition,
    config: QueryBuilderConfig | undefined,
  ) {
    super(applicationStore, graphManagerState, workflowState, config);
    this.functionElement = functionElemenet;
    this.showParametersPanel = true;
  }
}
