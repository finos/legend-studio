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

import { computed, observable, action } from 'mobx';
import { Hashable } from 'MetaModelUtility';
import { HASH_STRUCTURE } from 'MetaModelConst';
import { hashArray } from 'Utilities/HashUtil';
import { IllegalStateError, addUniqueEntry } from 'Utilities/GeneralUtil';
import { FileGeneration } from 'MM/model/packageableElements/fileGeneration/FileGeneration';
import { PackageableElement, PackageableElementVisitor, PACKAGEABLE_ELEMENT_POINTER_TYPE, getElementPointerHashCode } from 'MM/model/packageableElements/PackageableElement';
import { PackageableElementReference, PackageableElementExplicitReference } from 'MM/model/packageableElements/PackageableElementReference';

export const DEFAULT_GENERATION_SPECIFICATION_NAME = 'MyGenerationSpecification';

// NOTE: As of now the tree only supports a linear order of generation. This is because the only use case is linear,
// but the shape has been left as a tree to support 'branching' off in the future.
export class GenerationTreeNode implements Hashable {
  generationElement: PackageableElementReference<PackageableElement>;
  @observable id: string;
  @observable parent?: GenerationTreeNode;

  constructor(generationElement: PackageableElementReference<PackageableElement>, id?: string) {
    this.generationElement = generationElement;
    this.id = id ?? generationElement.value.path;
  }

  @computed get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.GENERATION_TREE_NODE,
      this.generationElement.valueForSerialization,
      this.id
    ]);
  }
}

export class GenerationSpecification extends PackageableElement implements Hashable {
  @observable generationNodes: GenerationTreeNode[] = [];
  @observable fileGenerations: PackageableElementReference<FileGeneration>[] = [];

  // NOTE as of now the generation specification only supports model generation elements i.e elements that generate another graph compatabile with the current graph.
  @action addGenerationElement(packageableElement: PackageableElement): void {
    if (packageableElement instanceof FileGeneration) {
      this.addFileGeneration(packageableElement);
    } else {
      this.addNode(new GenerationTreeNode(PackageableElementExplicitReference.create(packageableElement)));
    }
  }

  @action addNode(value: GenerationTreeNode): void { addUniqueEntry(this.generationNodes, value) }
  @action addFileGeneration(value: FileGeneration): void { addUniqueEntry(this.fileGenerations, PackageableElementExplicitReference.create(value)) }

  @action findGenerationElementById(id: string): PackageableElement | undefined {
    return this.generationNodes.find(node => node.id === id)?.generationElement.value;
  }

  @computed({ keepAlive: true }) get hashCode(): string {
    if (this._isDisposed) { throw new IllegalStateError(`Element '${this.path}' is already disposed`) }
    if (this._isImmutable) { throw new IllegalStateError(`Readonly element '${this.path}' is modified`) }
    return hashArray([
      HASH_STRUCTURE.GENERATION_TREE,
      super.hashCode,
      hashArray(this.generationNodes),
      hashArray(this.fileGenerations.map(fileGeneration => getElementPointerHashCode(PACKAGEABLE_ELEMENT_POINTER_TYPE.FILE_GENERATION, fileGeneration.valueForSerialization))),
    ]);
  }

  accept_PackageableElementVisitor<T>(visitor: PackageableElementVisitor<T>): T {
    return visitor.visit_GenerationSpecification(this);
  }
}
