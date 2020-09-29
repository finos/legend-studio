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
import { PackageableElement as MM_PackageableElement } from 'MM/model/packageableElements/PackageableElement';
import { GraphBuilderContext } from './GraphBuilderContext';
import { PackageableElementVisitor } from 'V1/model/packageableElements/PackageableElement';
import { Profile } from 'V1/model/packageableElements/domain/Profile';
import { Enumeration } from 'V1/model/packageableElements/domain/Enumeration';
import { Class } from 'V1/model/packageableElements/domain/Class';
import { ConcreteFunctionDefinition } from 'V1/model/packageableElements/function/ConcreteFunctionDefinition';
import { Association } from 'V1/model/packageableElements/domain/Association';
import { Mapping } from 'V1/model/packageableElements/mapping/Mapping';
import { Diagram } from 'V1/model/packageableElements/diagram/Diagram';
import { Text } from 'V1/model/packageableElements/text/Text';
import { ProtocolToMetaModelClassMappingSecondPassVisitor } from './ProtocolToMetaModelClassMappingSecondPassVisitor';
import { processMappingTest } from './MappingBuilderHelper';
import { PackageableRuntime } from 'V1/model/packageableElements/runtime/PackageableRuntime';
import { PackageableConnection } from 'V1/model/packageableElements/connection/PackageableConnection';
import { FileGeneration } from 'V1/model/packageableElements/fileGeneration/FileGeneration';
import { GenerationSpecification } from 'V1/model/packageableElements/generationSpecification/GenerationSpecification';
import { Measure } from 'V1/model/packageableElements/domain/Measure';
import { SectionIndex } from 'V1/model/packageableElements/section/SectionIndex';

export class ProtocolToMetaModelGraphFourthPassVisitor implements PackageableElementVisitor<MM_PackageableElement> {
  context: GraphBuilderContext;

  constructor(context: GraphBuilderContext) {
    this.context = context;
  }

  visit_Profile(element: Profile): MM_PackageableElement {
    throw new UnsupportedOperationError();
  }

  visit_Enumeration(element: Enumeration): MM_PackageableElement {
    throw new UnsupportedOperationError();
  }

  visit_Measure(element: Measure): MM_PackageableElement {
    throw new UnsupportedOperationError();
  }

  visit_Class(element: Class): MM_PackageableElement {
    // TODO?: milestoning (process properties and class)
    throw new UnsupportedOperationError();
  }

  visit_Association(element: Association): MM_PackageableElement {
    // TODO?: milestoning (process properties)
    throw new UnsupportedOperationError();
  }

  visit_ConcreteFunctionDefinition(element: ConcreteFunctionDefinition): MM_PackageableElement {
    throw new UnsupportedOperationError();
  }

  visit_Mapping(element: Mapping): MM_PackageableElement {
    const path = this.context.graph.buildPackageString(element.package, element.name);
    const mapping = this.context.graph.getMapping(path);
    // NOTE: we currently do not support processing association mapping
    element.classMappings.forEach(classMapping => classMapping.accept_ClassMappingVisitor(new ProtocolToMetaModelClassMappingSecondPassVisitor(this.context, mapping)));
    mapping.tests = element.tests.map(test => processMappingTest(test, this.context));
    return mapping;
  }

  visit_Diagram(element: Diagram): MM_PackageableElement {
    throw new UnsupportedOperationError();
  }

  visit_Text(element: Text): MM_PackageableElement {
    throw new UnsupportedOperationError();
  }

  visit_SectionIndex(element: SectionIndex): MM_PackageableElement {
    throw new UnsupportedOperationError();
  }

  visit_FileGeneration(element: FileGeneration): MM_PackageableElement {
    throw new UnsupportedOperationError();
  }

  visit_GenerationSpecification(element: GenerationSpecification): MM_PackageableElement {
    throw new UnsupportedOperationError();
  }

  visit_PackageableRuntime(element: PackageableRuntime): MM_PackageableElement {
    throw new UnsupportedOperationError();
  }

  visit_PackageableConnection(element: PackageableConnection): MM_PackageableElement {
    throw new UnsupportedOperationError();
  }
}
