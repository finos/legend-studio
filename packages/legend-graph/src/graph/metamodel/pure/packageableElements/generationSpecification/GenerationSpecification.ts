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
import {
  type Hashable,
  hashArray,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import {
  type PackageableElementVisitor,
  PackageableElement,
} from '../PackageableElement.js';
import type { PackageableElementReference } from '../PackageableElementReference.js';
import type { FileGenerationSpecification } from '../fileGeneration/FileGenerationSpecification.js';
import { PackageableElementPointerType } from '../../../../MetaModelConst.js';

// NOTE: nodes run in a linear order, but a node may hold several generation elements, which are
// generated against the same compiled graph and so cannot consume each other's output.
export class GenerationTreeNode implements Hashable {
  generationElements: PackageableElementReference<PackageableElement>[];
  /**
   * A node written with the singular `generationElement` field keeps that form, so a specification
   * round-trips as its author wrote it rather than being rewritten to the plural form on save.
   */
  writtenAsSingleElement: boolean;
  id: string;

  constructor(
    generationElement: PackageableElementReference<PackageableElement>,
    id?: string,
  ) {
    this.generationElements = [generationElement];
    this.writtenAsSingleElement = true;
    this.id = id ?? generationElement.value.path;
  }

  static createGroup(
    generationElements: PackageableElementReference<PackageableElement>[],
    id?: string,
  ): GenerationTreeNode {
    const node = new GenerationTreeNode(
      guaranteeNonNullable(
        generationElements[0],
        `Generation tree node must hold at least one generation element`,
      ),
      id,
    );
    node.generationElements = generationElements;
    node.writtenAsSingleElement = false;
    node.id = id ?? GenerationTreeNode.buildDefaultId(generationElements);
    return node;
  }

  /**
   * The id a node carries when its author did not name it: the paths of the elements it holds.
   * A node whose id still matches this is shown as unnamed, and follows its elements as they change.
   */
  static buildDefaultId(
    generationElements: PackageableElementReference<PackageableElement>[],
  ): string {
    return generationElements.map((element) => element.value.path).join(',');
  }

  get defaultId(): string {
    return GenerationTreeNode.buildDefaultId(this.generationElements);
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.GENERATION_TREE_NODE,
      ...this.generationElements.map(
        (element) => element.valueForSerialization ?? '',
      ),
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
      ?.generationElements[0]?.value;
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
