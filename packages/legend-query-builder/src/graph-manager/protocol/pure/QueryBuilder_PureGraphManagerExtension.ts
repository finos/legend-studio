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

import type { EntitiesWithOrigin, Entity } from '@finos/legend-storage';
import {
  type AbstractPureGraphManager,
  AbstractPureGraphManagerExtension,
} from '@finos/legend-graph';
import { guaranteeNonNullable } from '@finos/legend-shared';
import type { MappingRuntimeCompatibilityAnalysisResult } from '../../action/analytics/MappingRuntimeCompatibilityAnalysis.js';
import type { ServiceExecutionAnalysisResult } from '../../action/analytics/ServiceExecutionAnalysis.js';

export abstract class QueryBuilder_PureGraphManagerExtension extends AbstractPureGraphManagerExtension {
  abstract surveyMappingRuntimeCompatibility(
    entities: Entity[],
    dependencyEntitiesIndex: Map<string, EntitiesWithOrigin>,
  ): Promise<MappingRuntimeCompatibilityAnalysisResult[]>;

  abstract surveyServiceExecution(
    entities: Entity[],
    dependencyEntitiesIndex: Map<string, EntitiesWithOrigin>,
  ): Promise<ServiceExecutionAnalysisResult[]>;
}

export const getQueryBuilderGraphManagerExtension = (
  graphManager: AbstractPureGraphManager,
): QueryBuilder_PureGraphManagerExtension =>
  guaranteeNonNullable(
    graphManager.extensions.find(
      (extension) =>
        extension instanceof QueryBuilder_PureGraphManagerExtension,
    ),
    `Can't find query builder Pure graph manager extension`,
  );
