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

import { UnsupportedOperationError, assertTrue, isNonNullable } from 'Utilities/GeneralUtil';
import { PATH } from 'MetaModelConst';
import { GraphError } from 'MetaModelUtility';
import { Class as MM_Class } from 'MM/model/packageableElements/domain/Class';
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
import { ProtocolToMetaModelClassMappingFirstPassVisitor } from './ProtocolToMetaModelClassMappingFirstPassVisitor';
import { processAssociationProperty, processDerivedProperty, processProperty, processTaggedValue } from './DomainBuilderHelper';
import { PackageableRuntime } from 'V1/model/packageableElements/runtime/PackageableRuntime';
import { PackageableConnection } from 'V1/model/packageableElements/connection/PackageableConnection';
import { FileGeneration } from 'V1/model/packageableElements/fileGeneration/FileGeneration';
import { GenerationSpecification } from 'V1/model/packageableElements/generationSpecification/GenerationSpecification';
import { Measure } from 'V1/model/packageableElements/domain/Measure';
import { SectionIndex } from 'V1/model/packageableElements/section/SectionIndex';

export class ProtocolToMetaModelGraphThirdPassVisitor implements PackageableElementVisitor<MM_PackageableElement> {
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
    const _class = this.context.graph.getClass(this.context.graph.buildPackageString(element.package, element.name));
    element.superTypes.forEach(type => {
      // supertype `Any` will not be processed
      if (type !== PATH.ANY) {
        try {
          const genricTypeReference = this.context.resolveGenericType(type);
          _class.addSuperType(genricTypeReference);
          if (genricTypeReference.ownerReference.value instanceof MM_Class) {
            genricTypeReference.ownerReference.value.addSubClass(_class);
          }
        } catch (error) {
          // NOTE: reconsider this as we might need to get elements from `system` and `platform` as well
          throw new GraphError(`Can't find supertype '${type}' of class '${this.context.graph.buildPackageString(element.package, element.name)}': ${error.message}`);
        }
      }
    });
    element.properties.forEach(property => _class.properties.push(processProperty(property, this.context, _class)));
    return _class;
  }

  visit_Association(element: Association): MM_PackageableElement {
    assertTrue(element.properties.length === 2, 'Association must have exactly 2 properties');
    const association = this.context.graph.getAssociation(this.context.graph.buildPackageString(element.package, element.name));
    const first = element.properties[0];
    const second = element.properties[1];
    association.setProperties([
      processAssociationProperty(first, second, this.context, association),
      processAssociationProperty(second, first, this.context, association)
    ]);
    association.stereotypes = element.stereotypes.map(stereotype => this.context.resolveStereotype(stereotype)).filter(isNonNullable);
    association.taggedValues = element.taggedValues.map(taggedValue => processTaggedValue(taggedValue, this.context)).filter(isNonNullable);
    association.derivedProperties = element.derivedProperties.map(derivedProperty => processDerivedProperty(derivedProperty, this.context, association));
    return association;
  }

  visit_ConcreteFunctionDefinition(element: ConcreteFunctionDefinition): MM_PackageableElement {
    throw new UnsupportedOperationError();
  }

  visit_Mapping(element: Mapping): MM_PackageableElement {
    const path = this.context.graph.buildPackageString(element.package, element.name);
    const mapping = this.context.graph.getMapping(path);
    mapping.classMappings = element.classMappings.map(classMapping => classMapping.accept_ClassMappingVisitor(new ProtocolToMetaModelClassMappingFirstPassVisitor(this.context, mapping)));
    return mapping;
  }

  visit_Diagram(element: Diagram): MM_PackageableElement {
    throw new UnsupportedOperationError();
  }

  visit_Text(element: Text): MM_PackageableElement {
    throw new UnsupportedOperationError();
  }

  visit_FileGeneration(element: FileGeneration): MM_PackageableElement {
    throw new UnsupportedOperationError();
  }

  visit_GenerationSpecification(element: GenerationSpecification): MM_PackageableElement {
    throw new UnsupportedOperationError();
  }

  visit_SectionIndex(element: SectionIndex): MM_PackageableElement {
    throw new UnsupportedOperationError();
  }

  visit_PackageableRuntime(element: PackageableRuntime): MM_PackageableElement {
    throw new UnsupportedOperationError();
  }

  visit_PackageableConnection(element: PackageableConnection): MM_PackageableElement {
    throw new UnsupportedOperationError();
  }
}
