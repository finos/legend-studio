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

import type { IdentityResolution } from './DSL_Mastery_IdentityResolution.js';
import type { RecordSource } from './DSL_Mastery_RecordSource.js';
import {
  PackageableElement,
  type PackageableElementVisitor,
} from '@finos/legend-graph';
import { type Hashable, hashArray } from '@finos/legend-shared';
import { MASTERY_HASH_STRUCTURE } from '../../../../../DSL_Mastery_HashUtils.js';
import type { PrecedenceRule } from './DSL_Mastery_PrecedenceRule.js';

export class MasterRecordDefinition
  extends PackageableElement
  implements Hashable
{
  modelClass!: string;
  identityResolution!: IdentityResolution;
  precedenceRules: PrecedenceRule[] | undefined;
  sources: RecordSource[] = [];

  protected override get _elementHashCode(): string {
    return hashArray([
      MASTERY_HASH_STRUCTURE.MASTER_RECORD_DEFINITION,
      this.modelClass,
      this.identityResolution,
      hashArray(this.sources),
      this.precedenceRules ? hashArray(this.precedenceRules) : '',
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_PackageableElement(this);
  }
}
