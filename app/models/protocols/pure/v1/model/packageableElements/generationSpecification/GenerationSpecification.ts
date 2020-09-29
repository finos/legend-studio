/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Hashable } from 'MetaModelUtility';
import { HASH_STRUCTURE } from 'MetaModelConst';
import { hashArray } from 'Utilities/HashUtil';
import { serializable, list, object, primitive } from 'serializr';
import { PackageableElement, PackageableElementVisitor, PackageableElementPointer } from 'V1/model/packageableElements/PackageableElement';

export class GenerationTreeNode {
  @serializable id!: string;
  @serializable generationElement!: string;
  @serializable(list(primitive())) children: GenerationTreeNode[] = [];

  get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.GENERATION_TREE_NODE,
      this.generationElement,
      this.id
    ]);
  }
}

export class GenerationSpecification extends PackageableElement implements Hashable {
  @serializable(list(object(GenerationTreeNode))) generationNodes: GenerationTreeNode[] = [];
  @serializable(list(object(PackageableElementPointer))) fileGenerations: PackageableElementPointer[] = [];

  get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.GENERATION_TREE,
      super.hashCode,
      hashArray(this.generationNodes),
      hashArray(this.fileGenerations)
    ]);
  }

  accept_PackageableElementVisitor<T>(visitor: PackageableElementVisitor<T>): T {
    return visitor.visit_GenerationSpecification(this);
  }
}
