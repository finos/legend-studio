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

import { createModelSchema, primitive } from 'serializr';

export interface UsageConcept {
  path: string;
  owner?: string;
  type?: string;
}

export const getUsageConceptLabel = (usageConcept: UsageConcept): string =>
  `'${usageConcept.path}'${
    usageConcept.owner ? ` of '${usageConcept.owner}'` : ''
  }`;

export class Usage {
  source!: string;
  line!: number;
  column!: number;
  startLine!: number;
  startColumn!: number;
  endLine!: number;
  endColumn!: number;
  // __TYPE: "meta::pure::functions::meta::SourceInformation"
}

createModelSchema(Usage, {
  source: primitive(),
  line: primitive(),
  column: primitive(),
  startLine: primitive(),
  startColumn: primitive(),
  endLine: primitive(),
  endColumn: primitive(),
});
