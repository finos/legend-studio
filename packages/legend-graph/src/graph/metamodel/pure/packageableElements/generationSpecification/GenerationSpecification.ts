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

import {
  CORE_HASH_STRUCTURE,
  hashElementPointer,
} from '../../../../../graph/Core_HashUtils.js';
import { type Hashable, hashArray } from '@finos/legend-shared';
import {
  type PackageableElementVisitor,
  PackageableElement,
} from '../PackageableElement.js';
import type { PackageableElementReference } from '../PackageableElementReference.js';
import type { FileGenerationSpecification } from '../fileGeneration/FileGenerationSpecification.js';
import { PackageableElementPointerType } from '../../../../MetaModelConst.js';

// NOTE: As of now the tree only supports a linear order of generation. This is because the only use case is linear,
// but the shape has been left as a tree to support 'branching' off in the future.
export class GenerationTreeNode implements Hashable {
  generationElement: PackageableElementReference<PackageableElement>;
  id: string;

  constructor(
    generationElement: PackageableElementReference<PackageableElement>,
    id?: string,
  ) {
    this.generationElement = generationElement;
    this.id = id ?? generationElement.value.path;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.GENERATION_TREE_NODE,
      this.generationElement.valueForSerialization ?? '',
      this.id,
    ]);
  }
}

export class GenerationSpecification
  extends PackageableElement
  implements Hashable
{
  generationNodes: GenerationTreeNode[] = [];
  fileGenerations: PackageableElementReference<FileGenerationSpecification>[] =
    [];

  findGenerationElementById(id: string): PackageableElement | undefined {
    return this.generationNodes.find((node) => node.id === id)
      ?.generationElement.value;
  }

  protected override get _elementHashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.GENERATION_TREE,
      this.path,
      hashArray(this.generationNodes),
      hashArray(
        this.fileGenerations.map((fileGeneration) =>
          hashElementPointer(
            PackageableElementPointerType.FILE_GENERATION,
            fileGeneration.valueForSerialization ?? '',
          ),
        ),
      ),
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_GenerationSpecification(this);
  }
}
