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

import type { PlainObject } from '@finos/legend-shared';
import type { PureProtocolProcessorPlugin } from '../PureProtocolProcessorPlugin.js';
import type { V1_OrganizationalScope } from '../v1/lakehouse/entitlements/V1_CoreEntitlements.js';

export type V1_OrganizationalScopeSerializer = (
  value: V1_OrganizationalScope,
) => PlainObject<V1_OrganizationalScope> | undefined;

export type V1_OrganizationalScopeDeserializer = (
  json: PlainObject<V1_OrganizationalScope>,
) => V1_OrganizationalScope | undefined;

export interface DSL_Lakehouse_PureProtocolProcessorPlugin_Extension
  extends PureProtocolProcessorPlugin {
  V1_getExtraOrganizationalScopeSerializers?(): V1_OrganizationalScopeSerializer[];

  V1_getExtraOrganizationalScopeDeserializers?(): V1_OrganizationalScopeDeserializer[];
}
