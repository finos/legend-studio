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

import { PackageableElementPointerType } from '../../../../../../../graph/MetaModelConst.js';
import type { ConfigurationProperty } from '../../../../../../../graph/metamodel/pure/packageableElements/fileGeneration/ConfigurationProperty.js';
import type { FileGenerationSpecification } from '../../../../../../../graph/metamodel/pure/packageableElements/fileGeneration/FileGenerationSpecification.js';
import type {
  GenerationSpecification,
  GenerationTreeNode,
} from '../../../../../../../graph/metamodel/pure/packageableElements/generationSpecification/GenerationSpecification.js';
import { PackageableElementReference } from '../../../../../../../graph/metamodel/pure/packageableElements/PackageableElementReference.js';
import { V1_ConfigurationProperty } from '../../../model/packageableElements/fileGeneration/V1_ConfigurationProperty.js';
import { V1_FileGenerationSpecification } from '../../../model/packageableElements/fileGeneration/V1_FileGenerationSpecification.js';
import {
  V1_GenerationSpecification,
  V1_GenerationTreeNode,
} from '../../../model/packageableElements/generationSpecification/V1_GenerationSpecification.js';
import {
  V1_transformElementReferencePointer,
  V1_initPackageableElement,
} from './V1_CoreTransformerHelper.js';

// ----------------------------------------------- GENERATION SPECIFICATION ----------------------------------------

const transformGenerationTreeNode = (
  element: GenerationTreeNode,
): V1_GenerationTreeNode => {
  const treeNode = new V1_GenerationTreeNode();
  treeNode.generationElement =
    element.generationElement.valueForSerialization ?? '';
  treeNode.id = element.id;
  return treeNode;
};

export const V1_transformGenerationSpecification = (
  element: GenerationSpecification,
): V1_GenerationSpecification => {
  const spec = new V1_GenerationSpecification();
  V1_initPackageableElement(spec, element);
  spec.fileGenerations = element.fileGenerations.map((fileGeneration) =>
    V1_transformElementReferencePointer(
      PackageableElementPointerType.FILE_GENERATION,
      fileGeneration,
    ),
  );
  spec.generationNodes = element.generationNodes.map(
    transformGenerationTreeNode,
  );
  return spec;
};

// ----------------------------------------------- FILE GENERATION ----------------------------------------

const transformConfigurationProperty = (
  element: ConfigurationProperty,
): V1_ConfigurationProperty => {
  const config = new V1_ConfigurationProperty();
  config.name = element.name;
  config.value = element.value;
  return config;
};

export const V1_transformFileGeneration = (
  element: FileGenerationSpecification,
): V1_FileGenerationSpecification => {
  const fileGeneration = new V1_FileGenerationSpecification();
  V1_initPackageableElement(fileGeneration, element);
  fileGeneration.configurationProperties = element.configurationProperties.map(
    transformConfigurationProperty,
  );
  fileGeneration.scopeElements = element.scopeElements.map((path) =>
    path instanceof PackageableElementReference
      ? (path.valueForSerialization ?? '')
      : path,
  );
  fileGeneration.type = element.type;
  fileGeneration.generationOutputPath = element.generationOutputPath;
  return fileGeneration;
};
