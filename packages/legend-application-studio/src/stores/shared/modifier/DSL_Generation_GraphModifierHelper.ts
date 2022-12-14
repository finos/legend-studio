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
  type PackageableElement,
  PackageableElementReference,
  type ConfigurationProperty,
  type GenerationSpecification,
  FileGenerationSpecification,
  GenerationTreeNode,
  PackageableElementExplicitReference,
  ModelGenerationSpecification,
  observe_PackageableElementReference,
  observe_FileGenerationSpecification,
  observe_GenerationTreeNode,
  observe_ConfigurationProperty,
} from '@finos/legend-graph';
import {
  addUniqueEntry,
  changeEntry,
  deleteEntry,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { action } from 'mobx';

// --------------------------------------------- File Generation -------------------------------------

export const configurationProperty_setValue = action(
  (cp: ConfigurationProperty, value: unknown): void => {
    cp.value = value;
  },
);

export const configurationProperty_addConfigurationProperty = action(
  (
    configurationProperties: ConfigurationProperty[],
    cp: ConfigurationProperty,
  ): void => {
    addUniqueEntry(configurationProperties, observe_ConfigurationProperty(cp));
  },
);

export const fileGeneration_setType = action(
  (fg: FileGenerationSpecification, value: string): void => {
    fg.type = value;
  },
);

export const fileGeneration_setGenerationOutputPath = action(
  (fg: FileGenerationSpecification, val?: string): void => {
    fg.generationOutputPath = val;
  },
);
export const fileGeneration_setScopeElements = action(
  (
    fg: FileGenerationSpecification,
    value: (PackageableElementReference<PackageableElement> | string)[],
  ): void => {
    fg.scopeElements = value.map((v) =>
      v instanceof PackageableElementReference
        ? observe_PackageableElementReference(v)
        : v,
    );
  },
);
export const fileGeneration_addScopeElement = action(
  (
    fg: FileGenerationSpecification,
    value: PackageableElementReference<PackageableElement> | string,
  ): void => {
    addUniqueEntry(
      fg.scopeElements,
      value instanceof PackageableElementReference
        ? observe_PackageableElementReference(value)
        : value,
    );
  },
);
export const fileGeneration_deleteScopeElement = action(
  (
    fg: FileGenerationSpecification,
    value: PackageableElementReference<PackageableElement> | string,
  ): void => {
    deleteEntry(fg.scopeElements, value);
  },
);
export const fileGeneration_changeScopeElement = action(
  (
    fg: FileGenerationSpecification,
    oldValue: PackageableElementReference<PackageableElement> | string,
    newValue: PackageableElementReference<PackageableElement> | string,
  ): void => {
    changeEntry(
      fg.scopeElements,
      oldValue,
      newValue instanceof PackageableElementReference
        ? observe_PackageableElementReference(newValue)
        : newValue,
    );
  },
);

// -------------------------------- Generation Specification -------------------------------------

export const generationSpecification_addNode = action(
  (genSpec: GenerationSpecification, value: GenerationTreeNode): void => {
    addUniqueEntry(genSpec.generationNodes, observe_GenerationTreeNode(value));
  },
);
export const generationSpecification_addFileGeneration = action(
  (
    genSpec: GenerationSpecification,
    value: FileGenerationSpecification,
  ): void => {
    addUniqueEntry(
      genSpec.fileGenerations,
      observe_PackageableElementReference(
        PackageableElementExplicitReference.create(
          observe_FileGenerationSpecification(value),
        ),
      ),
    );
  },
);

export const createObservableFileGeneration = action(() =>
  observe_FileGenerationSpecification(new FileGenerationSpecification('')),
);

export const generationSpecification_deleteFileGeneration = action(
  (
    genSpec: GenerationSpecification,
    value: PackageableElementReference<FileGenerationSpecification>,
  ): void => {
    deleteEntry(genSpec.fileGenerations, value);
  },
);
export const generationSpecification_setId = action(
  (treeNode: GenerationTreeNode, val: string): void => {
    treeNode.id = val;
  },
);
export const generationSpecification_deleteGenerationNode = action(
  (genSpec: GenerationSpecification, value: GenerationTreeNode): void => {
    deleteEntry(genSpec.generationNodes, value);
  },
);

// NOTE as of now the generation specification only supports model generation elements i.e elements that generate another graph compatabile with the current graph.
export const generationSpecification_addGenerationElement = action(
  (genSpec: GenerationSpecification, element: PackageableElement): void => {
    if (
      !(
        element instanceof ModelGenerationSpecification ||
        element instanceof FileGenerationSpecification
      )
    ) {
      throw new UnsupportedOperationError(
        `Can't add generation element: only model generation elements can be added to the generation specification`,
        element,
      );
    }
    if (element instanceof FileGenerationSpecification) {
      generationSpecification_addFileGeneration(genSpec, element);
    } else {
      generationSpecification_addNode(
        genSpec,
        observe_GenerationTreeNode(
          new GenerationTreeNode(
            PackageableElementExplicitReference.create(element),
          ),
        ),
      );
    }
  },
);
