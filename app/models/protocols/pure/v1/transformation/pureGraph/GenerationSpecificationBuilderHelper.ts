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

import { assertNonEmptyString } from 'Utilities/GeneralUtil';
import { GenerationTreeNode as MM_GenerationTreeNode } from 'MM/model/packageableElements/generationSpecification/GenerationSpecification';
import { FileGeneration as MM_FileGeneration } from 'MM/model/packageableElements/fileGeneration/FileGeneration';
import { PackageableElementReference as MM_PackageableElementReference } from 'MM/model/packageableElements/PackageableElementReference';
import { GraphBuilderContext } from './GraphBuilderContext';
import { GenerationTreeNode } from 'V1/model/packageableElements/generationSpecification/GenerationSpecification';
import { PackageableElementPointer } from 'V1/model/packageableElements/PackageableElement';

export const processGenerationTreeNode = (generationNode: GenerationTreeNode, context: GraphBuilderContext): MM_GenerationTreeNode => {
  assertNonEmptyString(generationNode.generationElement, 'Generation tree node generation element is missing');
  assertNonEmptyString(generationNode.id, 'Generation tree node ID is missing');
  const genNode = new MM_GenerationTreeNode(context.resolveElement(generationNode.generationElement, false));
  genNode.id = generationNode.id;
  return genNode;
};

export const processFileGenerationPointer = (fileGeneration: PackageableElementPointer, context: GraphBuilderContext): MM_PackageableElementReference<MM_FileGeneration> => {
  assertNonEmptyString(fileGeneration.path, 'File generation pointer path is missing');
  return context.resolveFileGeneration(fileGeneration.path);
};
