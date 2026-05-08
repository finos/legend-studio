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
  type DataResolver,
  BaseDataResolver,
  ReferenceDataResolver,
} from '../../../../../../../graph/metamodel/pure/data/DataResolver.js';
import {
  V1_BaseDataResolver,
  V1_ReferenceDataResolver,
  type V1_DataResolver,
} from '../../../model/data/V1_DataResolver.js';
import { V1_transformElementReferencePointer } from './V1_CoreTransformerHelper.js';
import { V1_transformEmbeddedData } from './V1_DataElementTransformer.js';
import type { V1_GraphTransformerContext } from './V1_GraphTransformerContext.js';

export const V1_transformDataResolver = (
  dataResolver: DataResolver,
  context: V1_GraphTransformerContext,
): V1_DataResolver => {
  if (dataResolver instanceof BaseDataResolver) {
    const protocol = new V1_BaseDataResolver();
    protocol.elementPointer = V1_transformElementReferencePointer(
      undefined,
      dataResolver.element,
    );
    protocol.data = V1_transformEmbeddedData(dataResolver.data, context);
    return protocol;
  } else if (dataResolver instanceof ReferenceDataResolver) {
    const protocol = new V1_ReferenceDataResolver();
    protocol.elementPointer = V1_transformElementReferencePointer(
      undefined,
      dataResolver.element,
    );
    return protocol;
  }
  throw new UnsupportedOperationError(
    `Unable to transform data resolver of type '${dataResolver.constructor.name}'`,
  );
};
