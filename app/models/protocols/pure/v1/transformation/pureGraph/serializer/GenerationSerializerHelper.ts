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

import { list, createSimpleSchema, custom, primitive } from 'serializr';
import { PackageableElementReference as MM_PackageableElementReference } from 'MM/model/packageableElements/PackageableElementReference';
import { PackageableElementType, PackageableElementPointerType } from 'V1/model/packageableElements/PackageableElement';
import { constant, usingModelSchema, packagePathSerializer, plainSerializer, SKIP_FN, elementReferenceSerializer, elementReferencePointerSerializer } from './CoreSerializerHelper';

// ----------------------------------------------- GENERATION SPECIFICATION ----------------------------------------

const generationTreeNodeSchema = createSimpleSchema({
  generationElement: elementReferenceSerializer,
  id: primitive()
});

export const generationSpecSerializationSchema = createSimpleSchema({
  _type: constant(PackageableElementType.GENERATION_SPECIFICATION),
  fileGenerations: list(elementReferencePointerSerializer(PackageableElementPointerType.FILE_GENERATION)),
  generationNodes: list(usingModelSchema(generationTreeNodeSchema)),
  name: primitive(),
  package: packagePathSerializer,
});

// ----------------------------------------------- FILE GENERATION ----------------------------------------

const configurationPropertySchema = createSimpleSchema({
  name: primitive(),
  value: plainSerializer
});

export const fileGenerationSerializationSchema = createSimpleSchema({
  _type: constant(PackageableElementType.FILE_GENERATION),
  configurationProperties: list(usingModelSchema(configurationPropertySchema)),
  name: primitive(),
  package: packagePathSerializer,
  scopeElements: list(custom(path => path instanceof MM_PackageableElementReference ? path.valueForSerialization : path, SKIP_FN)),
  type: primitive(),
});
