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

import type { V1_Protocol } from '../V1_Protocol.js';
import type { V1_ExecutionNode } from './nodes/V1_ExecutionNode.js';
import type { V1_PlatformImplementation } from './nodes/V1_PlatformImplementation.js';
import { V1_ExecutionPlan } from './V1_ExecutionPlan.js';

export class V1_SimpleExecutionPlan extends V1_ExecutionPlan {
  authDependent!: boolean;
  kerberos?: string | undefined;
  serializer!: V1_Protocol;
  templateFunctions: string[] = [];
  rootExecutionNode!: V1_ExecutionNode;
  globalImplementationSupport?: V1_PlatformImplementation | undefined;
}
