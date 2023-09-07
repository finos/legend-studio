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

import type { V1_Multiplicity } from '../../packageableElements/domain/V1_Multiplicity.js';
import type { V1_ResultType } from '../results/V1_ResultType.js';
import type { V1_PlatformImplementation } from './V1_PlatformImplementation.js';

export abstract class V1_ExecutionNode {
  resultType!: V1_ResultType;
  executionNodes: V1_ExecutionNode[] = [];
  authDependent?: boolean | undefined;
  resultSizeRange?: V1_Multiplicity | undefined;
  implementation?: V1_PlatformImplementation | undefined;
}
