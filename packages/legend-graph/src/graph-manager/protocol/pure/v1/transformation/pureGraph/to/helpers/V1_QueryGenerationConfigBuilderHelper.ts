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

import { UnsupportedOperationError } from '@finos/legend-shared';
import {
  type RelationalQueryGenerationConfig,
  GenerationFeaturesConfig,
} from '../../../../../../../../graph/metamodel/pure/packageableElements/store/relational/connection/RelationalQueryGenerationConfig.js';
import {
  type V1_RelationalQueryGenerationConfig,
  V1_GenerationFeaturesConfig,
} from '../../../../model/packageableElements/store/relational/connection/V1_RelationalQueryGenerationConfig.js';
import type { V1_GraphBuilderContext } from '../V1_GraphBuilderContext.js';

export const V1_buildQueryGenerationConfig = (
  protocol: V1_RelationalQueryGenerationConfig,
  context: V1_GraphBuilderContext,
): RelationalQueryGenerationConfig => {
  if (protocol instanceof V1_GenerationFeaturesConfig) {
    const metamodel = new GenerationFeaturesConfig();
    metamodel.enabled = protocol.enabled;
    metamodel.disabled = protocol.disabled;
    return metamodel;
  }

  throw new UnsupportedOperationError(
    `Can't build query generation config: no compatible builder available`,
    protocol,
  );
};
