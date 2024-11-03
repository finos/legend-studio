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

import { createModelSchema, list, object, primitive } from 'serializr';

export interface ConceptInfo {
  path: string;
  owner?: string | undefined;
  pureName: string;
  pureType: string;
  signature?: string | undefined;
  test?: boolean | undefined;
  pct?: boolean | undefined;
  doc?: string | undefined;
  grammarDoc?: string | undefined;
  grammarChars?: string | undefined;
}

export enum FIND_USAGE_FUNCTION_PATH {
  ENUM = 'meta::pure::ide::findusages::findUsagesForEnum_String_1__String_1__SourceInformation_MANY_',
  PROPERTY = 'meta::pure::ide::findusages::findUsagesForProperty_String_1__String_1__SourceInformation_MANY_',
  ELEMENT = 'meta::pure::ide::findusages::findUsagesForPath_String_1__SourceInformation_MANY_',
  MULTIPLE_PATHS = 'meta::pure::ide::findusages::findUsagesForMultiplePaths_String_1__Pair_MANY_',
}

export const getConceptInfoLabel = (usageConcept: ConceptInfo): string =>
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

export class PackageableElementUsage {
  first!: string;
  second!: Usage[];
}

createModelSchema(PackageableElementUsage, {
  first: primitive(),
  second: list(object(Usage)),
});
