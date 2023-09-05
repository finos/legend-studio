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

import type { PureProtocolProcessorPlugin } from '@finos/legend-graph';
import type { PlainObject } from '@finos/legend-shared';
import type { V1_PrecedenceRule } from './v1/model/packageableElements/mastery/V1_DSL_Mastery_PrecedenceRule.js';

// types: precedence rules
export type V1_PrecedenceRuleProtocolSerializer = (
  protocol: V1_PrecedenceRule,
) => PlainObject<V1_PrecedenceRule> | undefined;

export type V1_PrecedenceRuleProtocolDeserializer = (
  json: PlainObject<V1_PrecedenceRule>,
) => V1_PrecedenceRule | undefined;

export interface DSL_Mastery_PureProtocolProcessorPlugin_Extension
  extends PureProtocolProcessorPlugin {
  // extension hooks: precedence rules

  V1_getExtraPrecedenceRuleProtocolSerializers?(): V1_PrecedenceRuleProtocolSerializer[];

  V1_getExtraPrecedenceRuleProtocolDeserializers?(): V1_PrecedenceRuleProtocolDeserializer[];
}
