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

import { guaranteeType } from '@finos/legend-shared';
import { ServiceGroup } from '../metamodel/pure/model/packageableElements/store/serviceStore/model/STO_ServiceStore_ServiceGroup.js';
import { ServiceParameter } from '../metamodel/pure/model/packageableElements/store/serviceStore/model/STO_ServiceStore_ServiceParameter.js';
import type { ServiceStoreElement } from '../metamodel/pure/model/packageableElements/store/serviceStore/model/STO_ServiceStore_ServiceStoreElement.js';
import { ServiceStoreService } from '../metamodel/pure/model/packageableElements/store/serviceStore/model/STO_ServiceStore_ServiceStoreService.js';

export const getParameter = (
  value: string,
  parameters: ServiceParameter[],
): ServiceParameter =>
  guaranteeType(
    parameters.find((parameter: ServiceParameter) => parameter.name === value),
    ServiceParameter,
    `Can't find service parameter '${value}'`,
  );

export const getServiceStoreService = (
  elements: ServiceStoreElement[],
  value: string,
): ServiceStoreService =>
  guaranteeType(
    elements.find((element) => element.id === value),
    ServiceStoreService,
    `Can't find service '${value}'`,
  );

export const getServiceGroup = (
  elements: ServiceStoreElement[],
  value: string,
): ServiceGroup =>
  guaranteeType(
    elements.find((element) => element.id === value),
    ServiceGroup,
    `Can't find service group '${value}'`,
  );
