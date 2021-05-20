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

import { computed, observable, action, makeObservable } from 'mobx';
import type { Hashable } from '@finos/legend-studio-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../MetaModelConst';
import {
  hashArray,
  IllegalStateError,
  addUniqueEntry,
  deleteEntry,
} from '@finos/legend-studio-shared';
import { FileGenerationSpecification } from '../fileGeneration/FileGenerationSpecification';
import type { PackageableElementVisitor } from '../../../model/packageableElements/PackageableElement';
import {
  PackageableElement,
  PACKAGEABLE_ELEMENT_POINTER_TYPE,
  getElementPointerHashCode,
} from '../../../model/packageableElements/PackageableElement';
import type { PackageableElementReference } from '../../../model/packageableElements/PackageableElementReference';
import { PackageableElementExplicitReference } from '../../../model/packageableElements/PackageableElementReference';
import { ModelGenerationSpecification } from './ModelGenerationSpecification';

export const DEFAULT_GENERATION_SPECIFICATION_NAME =
  'MyGenerationSpecification';

// NOTE: As of now the tree only supports a linear order of generation. This is because the only use case is linear,
// but the shape has been left as a tree to support 'branching' off in the future.
export class GenerationTreeNode implements Hashable {
  generationElement: PackageableElementReference<PackageableElement>;
  id: string;
  parent?: GenerationTreeNode;

  constructor(
    generationElement: PackageableElementReference<PackageableElement>,
    id?: string,
  ) {
    makeObservable(this, {
      id: observable,
      parent: observable,
      hashCode: computed,
      setId: action,
    });

    this.generationElement = generationElement;
    this.id = id ?? generationElement.value.path;
  }

  setId(val: string): void {
    this.id = val;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.GENERATION_TREE_NODE,
      this.generationElement.valueForSerialization,
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

  constructor(name: string) {
    super(name);

    makeObservable(this, {
      generationNodes: observable,
      fileGenerations: observable,
      deleteFileGeneration: action,
      addGenerationElement: action,
      deleteGenerationNode: action,
      addNode: action,
      addFileGeneration: action,
      findGenerationElementById: action,
      hashCode: computed({ keepAlive: true }),
    });
  }

  // NOTE as of now the generation specification only supports model generation elements i.e elements that generate another graph compatabile with the current graph.
  addGenerationElement(packageableElement: PackageableElement): void {
    if (
      !(
        packageableElement instanceof ModelGenerationSpecification ||
        packageableElement instanceof FileGenerationSpecification
      )
    ) {
      throw new Error(
        'Only model generation elements can be added to the generation specification',
      );
    }
    if (packageableElement instanceof FileGenerationSpecification) {
      this.addFileGeneration(packageableElement);
    } else {
      this.addNode(
        new GenerationTreeNode(
          PackageableElementExplicitReference.create(packageableElement),
        ),
      );
    }
  }

  addNode(value: GenerationTreeNode): void {
    addUniqueEntry(this.generationNodes, value);
  }
  addFileGeneration(value: FileGenerationSpecification): void {
    addUniqueEntry(
      this.fileGenerations,
      PackageableElementExplicitReference.create(value),
    );
  }
  deleteFileGeneration(
    value: PackageableElementReference<FileGenerationSpecification>,
  ): void {
    deleteEntry(this.fileGenerations, value);
  }
  deleteGenerationNode(value: GenerationTreeNode): void {
    deleteEntry(this.generationNodes, value);
  }

  findGenerationElementById(id: string): PackageableElement | undefined {
    return this.generationNodes.find((node) => node.id === id)
      ?.generationElement.value;
  }

  get hashCode(): string {
    if (this._isDisposed) {
      throw new IllegalStateError(`Element '${this.path}' is already disposed`);
    }
    if (this._isImmutable) {
      throw new IllegalStateError(
        `Readonly element '${this.path}' is modified`,
      );
    }
    return hashArray([
      CORE_HASH_STRUCTURE.GENERATION_TREE,
      super.hashCode,
      hashArray(this.generationNodes),
      hashArray(
        this.fileGenerations.map((fileGeneration) =>
          getElementPointerHashCode(
            PACKAGEABLE_ELEMENT_POINTER_TYPE.FILE_GENERATION,
            fileGeneration.valueForSerialization,
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
