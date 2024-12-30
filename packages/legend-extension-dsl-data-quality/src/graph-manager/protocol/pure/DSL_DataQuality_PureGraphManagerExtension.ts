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

import {
  type AbstractPureGraphManager,
  type RawExecutionPlan,
  type ExecutionResult,
  type PureModel,
  type RootGraphFetchTree,
  AbstractPureGraphManagerExtension,
} from '@finos/legend-graph';
import { guaranteeNonNullable } from '@finos/legend-shared';
import type { DQExecuteInputOptions } from '../../../graph/metamodel/pure/packageableElements/data-quality/DataQualityValidationConfiguration.js';

export abstract class DSL_DataQuality_PureGraphManagerExtension extends AbstractPureGraphManagerExtension {
  abstract generatePlan(
    graph: PureModel,
    packagePath: string,
    options: DQExecuteInputOptions,
  ): Promise<RawExecutionPlan>;

  abstract execute(
    graph: PureModel,
    packagePath: string,
    options: DQExecuteInputOptions,
  ): Promise<ExecutionResult>;

  abstract exportData(
    graph: PureModel,
    packagePath: string,
    options: DQExecuteInputOptions,
  ): Promise<Response>;

  abstract debugExecutionPlanGeneration(
    graph: PureModel,
    packagePath: string,
    options: DQExecuteInputOptions,
  ): Promise<{ plan: RawExecutionPlan; debug: string }>;

  abstract fetchStructuralValidations(
    graph: PureModel,
    packagePath: string,
    options: DQExecuteInputOptions,
  ): Promise<RootGraphFetchTree>;
}

export const getDataQualityPureGraphManagerExtension = (
  graphManager: AbstractPureGraphManager,
): DSL_DataQuality_PureGraphManagerExtension =>
  guaranteeNonNullable(
    graphManager.extensions.find(
      (extension) =>
        extension instanceof DSL_DataQuality_PureGraphManagerExtension,
    ),
    `Can't find Data Quality Pure graph manager extension`,
  );
