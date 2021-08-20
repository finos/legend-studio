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

import type { ServiceStore } from '../../../../../../metamodels/pure/packageableElements/store/relational/model/ServiceStore';
import { V1_ServiceStore } from '../../../model/packageableElements/store/relational/V1_ServiceStore';
import { V1_initPackageableElement } from './V1_CoreTransformerHelper';

export const V1_transformServiceStore = (
  element: ServiceStore,
): V1_ServiceStore => {
  const serviceStore = new V1_ServiceStore();
  V1_initPackageableElement(serviceStore, element);
  serviceStore.docLink = element.docLink;
  return serviceStore;
};
