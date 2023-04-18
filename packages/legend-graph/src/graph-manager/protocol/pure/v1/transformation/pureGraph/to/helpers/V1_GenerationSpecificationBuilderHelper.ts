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

import { assertNonEmptyString } from '@finos/legend-shared';
import { GenerationTreeNode } from '../../../../../../../../graph/metamodel/pure/packageableElements/generationSpecification/GenerationSpecification.js';
import type { FileGenerationSpecification } from '../../../../../../../../graph/metamodel/pure/packageableElements/fileGeneration/FileGenerationSpecification.js';
import type { PackageableElementReference } from '../../../../../../../../graph/metamodel/pure/packageableElements/PackageableElementReference.js';
import type { V1_GraphBuilderContext } from '../../../../transformation/pureGraph/to/V1_GraphBuilderContext.js';
import type { V1_GenerationTreeNode } from '../../../../model/packageableElements/generationSpecification/V1_GenerationSpecification.js';
import type { V1_PackageableElementPointer } from '../../../../model/packageableElements/V1_PackageableElement.js';

export const V1_buildGenerationTreeNode = (
  generationNode: V1_GenerationTreeNode,
  context: V1_GraphBuilderContext,
): GenerationTreeNode => {
  assertNonEmptyString(
    generationNode.generationElement,
    `Generation tree node 'generationElement' field is missing or empty`,
  );
  assertNonEmptyString(
    generationNode.id,
    `Generation tree node 'id' field is missing or empty`,
  );
  const genNode = new GenerationTreeNode(
    context.resolveElement(generationNode.generationElement, false),
  );
  genNode.id = generationNode.id;
  return genNode;
};

export const V1_buildFileGenerationPointer = (
  fileGeneration: V1_PackageableElementPointer,
  context: V1_GraphBuilderContext,
): PackageableElementReference<FileGenerationSpecification> => {
  assertNonEmptyString(
    fileGeneration.path,
    `File generation pointer 'path' field is missing or empty`,
  );
  return context.resolveFileGeneration(fileGeneration.path);
};
