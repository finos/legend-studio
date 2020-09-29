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

import { UnsupportedOperationError } from 'Utilities/GeneralUtil';
import { serialize } from 'serializr';
import { PackageableElementVisitor as MM_PackageableElementVisitor } from 'MM/model/packageableElements/PackageableElement';
import { Profile as MM_Profile } from 'MM/model/packageableElements/domain/Profile';
import { Enumeration as MM_Enumeration } from 'MM/model/packageableElements/domain/Enumeration';
import { Measure as MM_Measure } from 'MM/model/packageableElements/domain/Measure';
import { Class as MM_Class } from 'MM/model/packageableElements/domain/Class';
import { Association as MM_Association } from 'MM/model/packageableElements/domain/Association';
import { ConcreteFunctionDefinition as MM_ConcreteFunctionDefinition } from 'MM/model/packageableElements/domain/ConcreteFunctionDefinition';
import { Mapping as MM_Mapping } from 'MM/model/packageableElements/mapping/Mapping';
import { Diagram as MM_Diagram } from 'MM/model/packageableElements/diagram/Diagram';
import { Text as MM_Text } from 'MM/model/packageableElements/text/Text';
import { PackageableRuntime as MM_PackageableRuntime } from 'MM/model/packageableElements/runtime/PackageableRuntime';
import { PackageableConnection as MM_PackageableConnection } from 'MM/model/packageableElements/connection/PackageableConnection';
import { FileGeneration as MM_FileGeneration } from 'MM/model/packageableElements/fileGeneration/FileGeneration';
import { GenerationSpecification as MM_GenerationSpecification } from 'MM/model/packageableElements/generationSpecification/GenerationSpecification';
import { Package as MM_Package } from 'MM/model/packageableElements/domain/Package';
import { PrimitiveType as MM_PrimitiveType } from 'MM/model/packageableElements/domain/PrimitiveType';
import { SectionIndex as MM_SectionIndex } from 'MM/model/packageableElements/section/SectionIndex';
import { profileSerializationSchema, enumerationSerializationSchema, measureSerializationSchema, classSerializationSchema, associationSerializationSchema, functionSerializationSchema } from './DomainSerializerHelper';
import { mappingSerializationSchema } from './MappingSerializer';
import { diagramSerializationSchema } from './DiagramSerializerHelper';
import { textSerializationSchema } from './TextSerializerHelper';
import { packageableRuntimeSerializationSchema } from './RuntimeSerializerHelper';
import { packageableConnectionSerializationSchema } from './ConnectionSerializer';
import { sectionIndexSchema } from './SectionIndexSerializer';
import { fileGenerationSerializationSchema, generationSpecSerializationSchema } from './GenerationSerializerHelper';

/**
 * NOTE: During serialization, we try our best to have the props within each schema ordered the same way
 * as in the backend (which is in alphabetical order). This won't matter usually because this is JSON, but in
 * the local changes JSON diff view this would help reduce noises a lot
 */
export class PackageableElementSerializer implements MM_PackageableElementVisitor<object> {

  // ----------------------------------------------- ELEMENT ----------------------------------------

  visit_Package(element: MM_Package): Record<PropertyKey, unknown> {
    throw new UnsupportedOperationError();
  }

  visit_SectionIndex(element: MM_SectionIndex): Record<PropertyKey, unknown> {
    return serialize(sectionIndexSchema, element);
  }

  visit_PrimitiveType(element: MM_PrimitiveType): Record<PropertyKey, unknown> {
    throw new UnsupportedOperationError();
  }

  visit_Profile(element: MM_Profile): Record<PropertyKey, unknown> {
    return serialize(profileSerializationSchema, element);
  }

  visit_Enumeration(element: MM_Enumeration): Record<PropertyKey, unknown> {
    return serialize(enumerationSerializationSchema, element);
  }

  visit_Measure(element: MM_Measure): Record<PropertyKey, unknown> {
    return serialize(measureSerializationSchema, element);
  }

  visit_Class(element: MM_Class): Record<PropertyKey, unknown> {
    return serialize(classSerializationSchema, element);
  }

  visit_Association(element: MM_Association): Record<PropertyKey, unknown> {
    return serialize(associationSerializationSchema, element);
  }

  visit_ConcreteFunctionDefinition(element: MM_ConcreteFunctionDefinition): Record<PropertyKey, unknown> {
    return serialize(functionSerializationSchema, element);
  }

  visit_Mapping(element: MM_Mapping): Record<PropertyKey, unknown> {
    return serialize(mappingSerializationSchema, element);
  }

  visit_Diagram(element: MM_Diagram): Record<PropertyKey, unknown> {
    return serialize(diagramSerializationSchema, element);
  }

  visit_Text(element: MM_Text): Record<PropertyKey, unknown> {
    return serialize(textSerializationSchema, element);
  }

  visit_PackageableRuntime(element: MM_PackageableRuntime): Record<PropertyKey, unknown> {
    return serialize(packageableRuntimeSerializationSchema, element);
  }

  visit_PackageableConnection(element: MM_PackageableConnection): Record<PropertyKey, unknown> {
    return serialize(packageableConnectionSerializationSchema, element);
  }

  visit_FileGeneration(element: MM_FileGeneration): Record<PropertyKey, unknown> {
    return serialize(fileGenerationSerializationSchema, element);
  }

  visit_GenerationSpecification(element: MM_GenerationSpecification): Record<PropertyKey, unknown> {
    return serialize(generationSpecSerializationSchema, element);
  }

}
