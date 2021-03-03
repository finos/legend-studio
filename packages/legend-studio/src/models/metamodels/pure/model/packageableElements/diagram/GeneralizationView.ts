/**
 * Copyright 2020 Goldman Sachs
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

import { computed, makeObservable } from 'mobx';
import { hashArray } from '@finos/legend-studio-shared';
import type { Hashable } from '@finos/legend-studio-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../MetaModelConst';
import { RelationshipView } from './RelationshipView';
import type { Diagram } from '../../../model/packageableElements/diagram/Diagram';
import type { ClassView } from '../../../model/packageableElements/diagram/ClassView';

export class GeneralizationView extends RelationshipView implements Hashable {
  constructor(owner: Diagram, from: ClassView, to: ClassView) {
    super(owner, from, to);

    makeObservable(this, {
      hashCode: computed,
    });
  }

  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.GENERALIZATION_VIEW, super.hashCode]);
  }
}
