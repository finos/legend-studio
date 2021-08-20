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

import { EnrichedError } from '@finos/legend-shared';

/**
 * NOTE: We don't handle any itermediate version e.g. v1_1_0, v1_2_0, etc.
 */
export enum PureClientVersion {
  V1_0_0 = 'v1_0_0',
  VX_X_X = 'vX_X_X',
}

export class GraphBuilderError extends EnrichedError {
  constructor(error: string | Error | undefined, message?: string) {
    super('Graph Builder Error', error, message);
  }
}

export class GraphDataDeserializationError extends EnrichedError {
  constructor(error: string | Error | undefined, message?: string) {
    super('Graph Data Deserialization Error', error, message);
  }
}

export class DependencyGraphBuilderError extends EnrichedError {
  constructor(error: string | Error | undefined, message?: string) {
    super('Dependency Graph Builder Error', error, message);
  }
}

export class SystemGraphBuilderError extends EnrichedError {
  constructor(error: string | Error | undefined, message?: string) {
    super('System Graph Builder Error', error, message);
  }
}
