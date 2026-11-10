/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { TypeFamily } from '@finos/legend-cube';

// What kind of value a type holds, in words: apart from the page's other
// text, so a definition flow (`@finos/legend-cube-builder/definition-flow`)
// says it without loading the editor's

/** The kind of value a type family holds, as the editors name it (the review of the demo, 2026-10-13) */
const TYPE_FAMILY_LABELS: Partial<Record<TypeFamily, string>> = {
  [TypeFamily.BOOLEAN]: 'True or false',
  [TypeFamily.STRING]: 'Text',
  [TypeFamily.INTEGER]: 'Whole number',
  [TypeFamily.FLOAT]: 'Number',
  [TypeFamily.DECIMAL]: 'Decimal',
  [TypeFamily.NUMBER]: 'Number',
  [TypeFamily.STRICT_DATE]: 'Date',
  [TypeFamily.DATETIME]: 'Date and time',
  [TypeFamily.DATE]: 'Date',
  [TypeFamily.STRICT_TIME]: 'Time',
  [TypeFamily.VARIANT]: 'Variant',
};

/** The kind of value a type family holds, as the editors name it; none for an enumeration or a type Cube doesn't know */
export const getTypeFamilyLabel = (family: TypeFamily): string | undefined =>
  TYPE_FAMILY_LABELS[family];
