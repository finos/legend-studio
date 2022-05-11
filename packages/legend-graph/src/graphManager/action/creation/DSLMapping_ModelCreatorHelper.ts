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
import type { EnumValueMapping } from '../../../DSLMapping_Exports';
import { Mapping } from '../../../models/metamodels/pure/packageableElements/mapping/Mapping';
import type { StoreConnections } from '../../../models/metamodels/pure/packageableElements/runtime/Runtime';

export const stub_Mapping = (): Mapping => new Mapping('');

export const isStubbed_EnumValueMapping = (value: EnumValueMapping): boolean =>
  !value.sourceValues.filter(isNonNullable).length;

export const isStubbed_StoreConnections = (value: StoreConnections): boolean =>
  !value.storeConnections.length;
