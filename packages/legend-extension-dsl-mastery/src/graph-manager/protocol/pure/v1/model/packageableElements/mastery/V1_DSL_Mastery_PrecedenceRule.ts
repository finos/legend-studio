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
import { MASTERY_HASH_STRUCTURE } from '../../../../../../../graph/DSL_Mastery_HashUtils.js';
import type { V1_PropertyPath } from './V1_DSL_Mastery_PropertyPath.js';
import type { V1_RawLambda } from '@finos/legend-graph';
import type { V1_RuleScope } from './V1_DSL_Mastery_RuleScope.js';

export abstract class V1_PrecedenceRule implements Hashable {
  _type!: string;
  paths: V1_PropertyPath[] = [];
  scopes: V1_RuleScope[] = [];
  masterRecordFilter!: V1_RawLambda;

  get hashCode(): string {
    return hashArray([
      MASTERY_HASH_STRUCTURE.PRECEDENCE_RULE,
      this.masterRecordFilter,
      hashArray(this.paths),
      hashArray(this.scopes),
    ]);
  }
}

export class V1_CreateRule extends V1_PrecedenceRule {
  override get hashCode(): string {
    return hashArray([MASTERY_HASH_STRUCTURE.CREATE_RULE, super.hashCode]);
  }
}

export class V1_DeleteRule extends V1_PrecedenceRule {
  override get hashCode(): string {
    return hashArray([MASTERY_HASH_STRUCTURE.DELETE_RULE, super.hashCode]);
  }
}

export abstract class V1_UpdateRule extends V1_PrecedenceRule {
  override get hashCode(): string {
    return hashArray([MASTERY_HASH_STRUCTURE.UPDATE_RULE, super.hashCode]);
  }
}

export class V1_ConditionalRule extends V1_UpdateRule {
  predicate!: V1_RawLambda;

  override get hashCode(): string {
    return hashArray([
      MASTERY_HASH_STRUCTURE.CONDITIONAL_RULE,
      this.predicate,
      super.hashCode,
    ]);
  }
}

export class V1_SourcePrecedenceRule extends V1_UpdateRule {
  precedence!: number;
  action!: V1_RuleAction;

  override get hashCode(): string {
    return hashArray([
      MASTERY_HASH_STRUCTURE.SOURCE_PRECEDENCE_RULE,
      this.precedence,
      this.action,
      super.hashCode,
    ]);
  }
}

export enum V1_RuleAction {
  BLOCK = 'Block',
  OVERWRITE = 'Overwrite',
}

export enum V1_RuleType {
  SOURCE_PRECEDENCE_RULE = 'sourcePrecedenceRule',
  CONDITIONAL_RULE = 'conditionalRule',
  CREATE_RULE = 'createRule',
  DELETE_RULE = 'deleteRule',
}
