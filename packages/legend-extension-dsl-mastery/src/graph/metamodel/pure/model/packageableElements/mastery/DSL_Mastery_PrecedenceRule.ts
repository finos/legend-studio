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

import { type Hashable, hashArray } from '@finos/legend-shared';
import { MASTERY_HASH_STRUCTURE } from '../../../../../DSL_Mastery_HashUtils.js';
import type { PropertyPath } from './DSL_Mastery_PropertyPath.js';
import type { RawLambda } from '@finos/legend-graph';
import type { RuleScope } from './DSL_Mastery_RuleScope.js';

export abstract class PrecedenceRule implements Hashable {
  paths: PropertyPath[] = [];
  scopes: RuleScope[] = [];
  masterRecordFilter!: RawLambda;

  get hashCode(): string {
    return hashArray([
      MASTERY_HASH_STRUCTURE.PRECEDENCE_RULE,
      this.masterRecordFilter,
      hashArray(this.paths),
      hashArray(this.scopes),
    ]);
  }
}

export class DeleteRule extends PrecedenceRule {
  override get hashCode(): string {
    return hashArray([MASTERY_HASH_STRUCTURE.DELETE_RULE, super.hashCode]);
  }
}

export class CreateRule extends PrecedenceRule {
  override get hashCode(): string {
    return hashArray([MASTERY_HASH_STRUCTURE.CREATE_RULE, super.hashCode]);
  }
}

export abstract class UpdateRule extends PrecedenceRule {
  override get hashCode(): string {
    return hashArray([MASTERY_HASH_STRUCTURE.UPDATE_RULE, super.hashCode]);
  }
}

export class ConditionalRule extends UpdateRule {
  predicate!: RawLambda;

  override get hashCode(): string {
    return hashArray([
      MASTERY_HASH_STRUCTURE.CONDITIONAL_RULE,
      this.predicate,
      super.hashCode,
    ]);
  }
}

export class SourcePrecedenceRule extends UpdateRule {
  precedence!: number;
  action!: RuleAction;

  override get hashCode(): string {
    return hashArray([
      MASTERY_HASH_STRUCTURE.SOURCE_PRECEDENCE_RULE,
      this.precedence,
      this.action,
      super.hashCode,
    ]);
  }
}

export enum RuleAction {
  BLOCK = 'Block',
  OVERWRITE = 'Overwrite',
}
