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
import { PackageableElementVisitor } from 'MM/model/packageableElements/PackageableElement';
import { SetImplementationVisitor } from 'MM/model/packageableElements/mapping/SetImplementation';
import { ConnectionVisitor, ConnectionPointer } from 'MM/model/packageableElements/connection/Connection';
import { Profile } from 'MM/model/packageableElements/domain/Profile';
import { Enumeration } from 'MM/model/packageableElements/domain/Enumeration';
import { Class } from 'MM/model/packageableElements/domain/Class';
import { Association } from 'MM/model/packageableElements/domain/Association';
import { ConcreteFunctionDefinition } from 'MM/model/packageableElements/domain/ConcreteFunctionDefinition';
import { Mapping } from 'MM/model/packageableElements/mapping/Mapping';
import { Diagram } from 'MM/model/packageableElements/diagram/Diagram';
import { Text } from 'MM/model/packageableElements/text/Text';
import { OperationSetImplementation } from 'MM/model/packageableElements/mapping/OperationSetImplementation';
import { PureInstanceSetImplementation } from 'MM/model/packageableElements/store/modelToModel/mapping/PureInstanceSetImplementation';
import { PropertyMappingVisitor } from 'MM/model/packageableElements/mapping/PropertyMapping';
import { PurePropertyMapping } from 'MM/model/packageableElements/store/modelToModel/mapping/PurePropertyMapping';
import { JsonModelConnection } from 'MM/model/packageableElements/store/modelToModel/connection/JsonModelConnection';
import { PrimitiveType } from 'MM/model/packageableElements/domain/PrimitiveType';
import { Package } from 'MM/model/packageableElements/domain/Package';
import { freeze, freezeArray, freezeProperty, freezeDerivedProperty, freezeRelationshipView, freezeEnumerationMapping, freezeMappingTest, freezeRuntime, freezeUnit } from './GraphFreezerHelper';
import { PackageableRuntime } from 'MM/model/packageableElements/runtime/PackageableRuntime';
import { PackageableConnection } from 'MM/model/packageableElements/connection/PackageableConnection';
import { XmlModelConnection } from 'MM/model/packageableElements/store/modelToModel/connection/XmlModelConnection';
import { FileGeneration } from 'MM/model/packageableElements/fileGeneration/FileGeneration';
import { GenerationSpecification } from 'MM/model/packageableElements/generationSpecification/GenerationSpecification';
import { Measure } from 'MM/model/packageableElements/domain/Measure';
import { SectionIndex } from 'MM/model/packageableElements/section/SectionIndex';

export class GraphFreezer implements PackageableElementVisitor<void>, SetImplementationVisitor<void>, PropertyMappingVisitor<void>, ConnectionVisitor<void> {
  // ----------------------------------------------- DOMAIN ----------------------------------------

  visit_PrimitiveType(element: PrimitiveType): void {
    throw new UnsupportedOperationError();
  }

  visit_Package(element: Package): void {
    throw new UnsupportedOperationError();
  }

  visit_Profile(element: Profile): void {
    freeze(element);
    freezeArray(element.tags, freeze);
    freezeArray(element.stereotypes, freeze);
  }

  visit_Measure(element: Measure): void {
    freeze(element);
    freezeUnit(element.canonicalUnit);
    freezeArray(element.nonCanonicalUnits, freezeUnit);
  }

  visit_Enumeration(element: Enumeration): void {
    freeze(element);
    freezeArray(element.stereotypes);
    freezeArray(element.taggedValues, tagValue => {
      freeze(tagValue);
      freeze(tagValue.tag);
    });
    freezeArray(element.values, enumValue => {
      freeze(enumValue);
      freezeArray(enumValue.stereotypes, freeze);
      freezeArray(enumValue.taggedValues, tagValue => {
        freeze(tagValue);
        freeze(tagValue.tag);
      });
    });
  }

  visit_Class(element: Class): void {
    freeze(element);
    freezeArray(element.stereotypes);
    freezeArray(element.taggedValues, tagValue => {
      freeze(tagValue);
      freeze(tagValue.tag);
    });
    freezeArray(element.properties, freezeProperty);
    freezeArray(element.propertiesFromAssociations, freezeProperty);
    freezeArray(element.derivedProperties, freezeDerivedProperty);
    freezeArray(element.generalizations, freeze);
    freezeArray(element.constraints, constraint => {
      freeze(constraint);
      freeze(constraint.functionDefinition);
    });
  }

  visit_Association(element: Association): void {
    freeze(element);
    freezeArray(element.stereotypes);
    freezeArray(element.taggedValues, tagValue => {
      freeze(tagValue);
      freeze(tagValue.tag);
    });
    freezeArray(element.properties, freezeProperty);
  }

  visit_ConcreteFunctionDefinition(element: ConcreteFunctionDefinition): void {
    freeze(element);
    freeze(element.returnMultiplicity);
    freezeArray(element.body);
    freezeArray(element.parameters);
    freezeArray(element.stereotypes);
    freezeArray(element.taggedValues, tagValue => {
      freeze(tagValue);
      freeze(tagValue.tag);
    });
  }

  visit_GenerationSpecification(element: GenerationSpecification): void {
    freeze(element);
    freezeArray(element.generationNodes);
    freezeArray(element.fileGenerations);
  }

  visit_Mapping(element: Mapping): void {
    freeze(element);
    // freezeArray(element.includes);
    freezeArray(element.classMappings, classMapping => classMapping.accept_SetImplementationVisitor(this));
    freezeArray(element.enumerationMappings, freezeEnumerationMapping);
    freezeArray(element.tests, freezeMappingTest);
  }

  visit_PackageableRuntime(element: PackageableRuntime): void {
    freeze(element);
    freezeRuntime(element.runtimeValue, this);
  }

  visit_PackageableConnection(element: PackageableConnection): void {
    freeze(element);
    element.connectionValue.accept_ConnectionVisitor(this);
  }

  visit_Diagram(element: Diagram): void {
    freeze(element);
    freezeArray(element.classViews, classView => {
      freeze(classView);
      freeze(classView.position);
      freeze(classView.rectangle);
    });
    freezeArray(element.associationViews, freezeRelationshipView);
    freezeArray(element.generalizationViews, freezeRelationshipView);
    freezeArray(element.propertyViews, freezeRelationshipView);
  }

  visit_Text(element: Text): void {
    freeze(element);
  }

  visit_FileGeneration(element: FileGeneration): void {
    freeze(element);
    freezeArray(element.scopeElements);
    freezeArray(element.configurationProperties, configProperty => {
      freeze(configProperty);
      freezeArray(configProperty.value as unknown[]);
    });
  }

  visit_SectionIndex(element: SectionIndex): void {
    freeze(element);
    freezeArray(element.sections);
  }

  // ----------------------------------------------- CLASS MAPPING ----------------------------------------

  visit_OperationSetImplementation(setImplementation: OperationSetImplementation): void {
    freeze(setImplementation);
    freeze(setImplementation.id);
    freezeArray(setImplementation.parameters, freeze);
  }

  visit_PureInstanceSetImplementation(setImplementation: PureInstanceSetImplementation): void {
    freeze(setImplementation);
    freeze(setImplementation.id);
    freezeArray(setImplementation.propertyMappings, propertyMapping => propertyMapping.accept_PropertyMappingVisitor(this));
  }

  // ----------------------------------------------- PROPERTY MAPPING ----------------------------------------

  visit_PurePropertyMapping(propertyMapping: PurePropertyMapping): void {
    freeze(propertyMapping);
    freeze(propertyMapping.transform);
  }

  // ----------------------------------------------- CONNECTION ----------------------------------------

  visit_ConnectionPointer(connection: ConnectionPointer): void {
    freeze(connection);
  }

  visit_JsonModelConnection(connection: JsonModelConnection): void {
    freeze(connection);
  }

  visit_XmlModelConnection(connection: XmlModelConnection): void {
    freeze(connection);
  }
}
