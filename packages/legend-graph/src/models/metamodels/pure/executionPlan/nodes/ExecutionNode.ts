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

import type { Multiplicity } from '../../packageableElements/domain/Multiplicity';
import type { ResultType } from '../result/ResultType';

export class ExecutionNode {
  // fromCluster : ClusteredValueSpecification[0..1];
  resultType!: ResultType;
  resultSizeRange?: Multiplicity | undefined;
  executionNodes: ExecutionNode[] = [];
  authDependent?: boolean | undefined;
  kerberos?: string | undefined;
  supportFunctions: string[] = [];
  // implementation : PlatformImplementation[0..1];
}
