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
  type PureModel,
  AbstractPureGraphManagerExtension,
} from '@finos/legend-graph';
import type { Entity } from '@finos/legend-storage';
import { guaranteeNonNullable } from '@finos/legend-shared';
import type { MappingGenerationConfiguration } from '../../action/generation/MappingGenerationConfiguration.js';

export abstract class MappingGeneration_PureGraphManagerExtension extends AbstractPureGraphManagerExtension {
  abstract generate(
    config: MappingGenerationConfiguration,
    graph: PureModel,
  ): Promise<Entity[]>;
}

export const getMappingGenerationGraphManagerExtension = (
  graphManager: AbstractPureGraphManager,
): MappingGeneration_PureGraphManagerExtension =>
  guaranteeNonNullable(
    graphManager.extensions.find(
      (extension) =>
        extension instanceof MappingGeneration_PureGraphManagerExtension,
    ),
    `Can't find Mapping Generation Pure graph manager extension`,
  ) as MappingGeneration_PureGraphManagerExtension;
