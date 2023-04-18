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

import type { DatasetSpecification } from '../../../../../../action/analytics/StoreEntitlementAnalysis.js';
import type { PureProtocolProcessorPlugin } from '../../../../PureProtocolProcessorPlugin.js';
import { V1_DatasetSpecification } from '../../../engine/analytics/V1_StoreEntitlementAnalysis.js';

export const V1_transformDatasetSpecification = (
  element: DatasetSpecification,
  plugins: PureProtocolProcessorPlugin[],
): V1_DatasetSpecification => {
  const extraTransformers = plugins.flatMap(
    (plugin) => plugin.V1_getExtraDatasetSpecificationTransformers?.() ?? [],
  );
  for (const transformer of extraTransformers) {
    const metamodel = transformer(element, plugins);
    if (metamodel) {
      return metamodel;
    }
  }
  const protocol = new V1_DatasetSpecification();
  protocol.name = element.name;
  protocol.type = element.type;
  return protocol;
};
