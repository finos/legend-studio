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

import { isNonNullable } from '@finos/legend-shared';
import type { EnumValueMapping } from '../../metamodel/pure/packageableElements/mapping/EnumValueMapping.js';
import { Mapping } from '../../metamodel/pure/packageableElements/mapping/Mapping.js';
import type { SetImplementationContainer } from '../../metamodel/pure/packageableElements/mapping/SetImplementationContainer.js';
import { PackageableRuntime } from '../../metamodel/pure/packageableElements/runtime/PackageableRuntime.js';
import type { StoreConnections } from '../../metamodel/pure/packageableElements/runtime/Runtime.js';

export const stub_Mapping = (): Mapping => new Mapping('');

export const isStubbed_EnumValueMapping = (value: EnumValueMapping): boolean =>
  !value.sourceValues.filter((sourceValue) => isNonNullable(sourceValue.value))
    .length;

export const isStubbed_StoreConnections = (value: StoreConnections): boolean =>
  !value.storeConnections.length;

export const isStubbed_SetImplementationContainer = (
  value: SetImplementationContainer,
): boolean => !value.setImplementation.value.id.value;

export const stub_PackageableRuntime = (): PackageableRuntime =>
  new PackageableRuntime('');
