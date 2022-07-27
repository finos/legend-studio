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

import { CORE_HASH_STRUCTURE } from '../../../../../../../graph/Core_HashUtils.js';
import { type Hashable, hashArray } from '@finos/legend-shared';
import {
  V1_PackageableElement,
  type V1_PackageableElementVisitor,
  type V1_PackageableElementPointer,
} from '../../../model/packageableElements/V1_PackageableElement.js';

export class V1_GenerationTreeNode {
  id!: string;
  generationElement!: string;
  children: V1_GenerationTreeNode[] = [];

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.GENERATION_TREE_NODE,
      this.generationElement,
      this.id,
    ]);
  }
}

export class V1_GenerationSpecification
  extends V1_PackageableElement
  implements Hashable
{
  generationNodes: V1_GenerationTreeNode[] = [];
  fileGenerations: V1_PackageableElementPointer[] = [];

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.GENERATION_TREE,
      this.path,
      hashArray(this.generationNodes),
      hashArray(this.fileGenerations),
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: V1_PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_GenerationSpecification(this);
  }
}
