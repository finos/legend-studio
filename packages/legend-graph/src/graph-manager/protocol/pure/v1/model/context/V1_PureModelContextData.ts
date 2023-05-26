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

import { V1_PureModelContext } from '../../model/context/V1_PureModelContext.js';
import type { V1_PackageableElement } from '../../model/packageableElements/V1_PackageableElement.js';
import type { V1_PureModelContextPointer } from '../../model/context/V1_PureModelContextPointer.js';
import type { V1_Protocol } from '../../model/V1_Protocol.js';
import type { Entity } from '@finos/legend-storage';

export class V1_PureModelContextData extends V1_PureModelContext {
  origin?: V1_PureModelContextPointer | undefined;
  serializer?: V1_Protocol | undefined;
  elements: V1_PackageableElement[] = [];
  /**
   * We use this to hold serialized elements as entities to save on transforming/serializing immutable entities
   *
   * @discrepancy model
   */
  INTERNAL__rawDependencyEntities?: Entity[] | undefined;
}
