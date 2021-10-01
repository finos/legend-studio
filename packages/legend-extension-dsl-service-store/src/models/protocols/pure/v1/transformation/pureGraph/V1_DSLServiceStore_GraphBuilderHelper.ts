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

import { getServiceStore } from '../../../../../../graphManager/DSLServiceStore_GraphManagerHelper';
import type { ServiceStore } from '../../../../../metamodels/pure/model/packageableElements/store/serviceStore/model/ServiceStore';
import type {
  PackageableElementImplicitReference,
  V1_GraphBuilderContext,
} from '@finos/legend-graph';
import type { V1_ServicePtr } from '../../model/packageableElements/store/serviceStore/model/V1_ServicePtr';
import type { Service } from '../../../../../metamodels/pure/model/packageableElements/store/serviceStore/model/Service';
import type { V1_ServiceGroupPtr } from '../../model/packageableElements/store/serviceStore/model/V1_ServiceGroupPtr';
import type { ServiceGroup } from '../../../../../metamodels/pure/model/packageableElements/store/serviceStore/model/ServiceGroup';

export const V1_resolveServiceStore = (
  path: string,
  context: V1_GraphBuilderContext,
): PackageableElementImplicitReference<ServiceStore> =>
  context.createImplicitPackageableElementReference(path, (_path: string) =>
    getServiceStore(_path, context.graph),
  );

export const V1_resolveServiceGroup = (
  serviceGroupPtr: V1_ServiceGroupPtr,
  store: PackageableElementImplicitReference<ServiceStore>,
): ServiceGroup => {
  if (serviceGroupPtr.parent === undefined) {
    return store.value.getServiceGroup(serviceGroupPtr.serviceGroup);
  } else {
    const parentServiceGroup = V1_resolveServiceGroup(
      serviceGroupPtr.parent,
      store,
    );
    return store.value.getServiceGroup(parentServiceGroup.id);
  }
};

export const V1_resolveService = (
  servicePtr: V1_ServicePtr,
  context: V1_GraphBuilderContext,
): Service => {
  const serviceStore = V1_resolveServiceStore(servicePtr.serviceStore, context);
  if (servicePtr.parent === undefined) {
    return serviceStore.value.getService(servicePtr.service);
  } else {
    const parentServiceGroup = V1_resolveServiceGroup(
      servicePtr.parent,
      serviceStore,
    );
    return parentServiceGroup.getService(servicePtr.service);
  }
};
