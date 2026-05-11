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
  BaseDataResolver,
  ReferenceDataResolver,
  type DataResolver,
} from '../../../../../../../../graph/metamodel/pure/data/DataResolver.js';
import {
  V1_BaseDataResolver,
  V1_ReferenceDataResolver,
  type V1_DataResolver,
} from '../../../../model/data/V1_DataResolver.js';
import type { V1_GraphBuilderContext } from '../V1_GraphBuilderContext.js';
import { V1_buildEmbeddedData } from './V1_DataElementBuilderHelper.js';

export const V1_buildDataResolver = (
  protocol: V1_DataResolver,
  context: V1_GraphBuilderContext,
): DataResolver => {
  if (protocol instanceof V1_BaseDataResolver) {
    const resolver = new BaseDataResolver();
    resolver.element = context.resolveElement(
      protocol.elementPointer.path,
      false,
    );
    resolver.data = V1_buildEmbeddedData(protocol.data, context);
    return resolver;
  } else if (protocol instanceof V1_ReferenceDataResolver) {
    const resolver = new ReferenceDataResolver();
    resolver.element = context.resolveElement(
      protocol.elementPointer.path,
      false,
    );
    return resolver;
  }
  throw new UnsupportedOperationError(
    `Unable to build data resolver of type '${protocol.constructor.name}'`,
  );
};
