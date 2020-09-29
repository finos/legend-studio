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

import { PackageableElementVisitor } from 'V1/model/packageableElements/PackageableElement';
import { Profile } from 'V1/model/packageableElements/domain/Profile';
import { Enumeration } from 'V1/model/packageableElements/domain/Enumeration';
import { Class } from 'V1/model/packageableElements/domain/Class';
import { ConcreteFunctionDefinition } from 'V1/model/packageableElements/function/ConcreteFunctionDefinition';
import { Association } from 'V1/model/packageableElements/domain/Association';
import { Mapping } from 'V1/model/packageableElements/mapping/Mapping';
import { Diagram } from 'V1/model/packageableElements/diagram/Diagram';
import { Text } from 'V1/model/packageableElements/text/Text';
import { ClassMappingVisitor } from 'V1/model/packageableElements/mapping/ClassMapping';
import { OperationClassMapping } from 'V1/model/packageableElements/mapping/OperationClassMapping';
import { PureInstanceClassMapping } from 'V1/model/packageableElements/store/modelToModel/mapping/PureInstanceClassMapping';
import { PropertyMappingVisitor } from 'V1/model/packageableElements/mapping/PropertyMapping';
import { PurePropertyMapping } from 'V1/model/packageableElements/store/modelToModel/mapping/PurePropertyMapping';
import { ConnectionVisitor } from 'V1/model/packageableElements/connection/Connection';
import { JsonModelConnection } from 'V1/model/packageableElements/store/modelToModel/connection/JsonModelConnection';
import { DepdendencyProcessingContext, processDependencyPath, processDependableStereotypePointer, processDependableTaggedValue, processDependableProperty, processDependableObject, processDependableLambda, processDependableVariable, processDependableEnumValueMapping, processDependablePropertyPointer, processDependableMappingTest, processDependableRuntime, processDependableUnit } from './DependencyDisambiguatorHelper';
import { PackageableRuntime } from 'V1/model/packageableElements/runtime/PackageableRuntime';
import { PackageableConnection } from 'V1/model/packageableElements/connection/PackageableConnection';
import { ConnectionPointer } from 'V1/model/packageableElements/connection/ConnectionPointer';
import { XmlModelConnection } from 'V1/model/packageableElements/store/modelToModel/connection/XmlModelConnection';
import { FileGeneration } from 'V1/model/packageableElements/fileGeneration/FileGeneration';
import { GenerationSpecification } from 'V1/model/packageableElements/generationSpecification/GenerationSpecification';
import { Measure } from 'V1/model/packageableElements/domain/Measure';
import { SectionIndex } from 'V1/model/packageableElements/section/SectionIndex';

export class DependencyDisambiguator implements ClassMappingVisitor<void>, PropertyMappingVisitor<void>, PackageableElementVisitor<void>, ConnectionVisitor<void> {
  dependencyProcessingContext!: DepdendencyProcessingContext;

  constructor(dependencyProcessingContext: DepdendencyProcessingContext) {
    this.dependencyProcessingContext = dependencyProcessingContext;
  }

  // ----------------------------------------------- DOMAIN ----------------------------------------

  visit_Profile(element: Profile): void {
    element.package = processDependencyPath(element.package, this.dependencyProcessingContext);
  }

  visit_Enumeration(element: Enumeration): void {
    element.package = processDependencyPath(element.package, this.dependencyProcessingContext);
    element.taggedValues.forEach(taggedValue => processDependableTaggedValue(taggedValue, this.dependencyProcessingContext));
    element.stereotypes.forEach(stereotype => processDependableStereotypePointer(stereotype, this.dependencyProcessingContext));
    element.values.forEach(enumValue => {
      enumValue.taggedValues.forEach(taggedValue => processDependableTaggedValue(taggedValue, this.dependencyProcessingContext));
      enumValue.stereotypes.forEach(stereotype => processDependableStereotypePointer(stereotype, this.dependencyProcessingContext));
    });
  }

  visit_Measure(element: Measure): void {
    processDependableUnit(element.canonicalUnit, this.dependencyProcessingContext);
    element.nonCanonicalUnits.forEach(unit => processDependableUnit(unit, this.dependencyProcessingContext));
  }

  visit_Class(element: Class): void {
    element.package = processDependencyPath(element.package, this.dependencyProcessingContext);
    element.taggedValues.forEach(taggedValue => processDependableTaggedValue(taggedValue, this.dependencyProcessingContext));
    element.stereotypes.forEach(stereotype => processDependableStereotypePointer(stereotype, this.dependencyProcessingContext));
    element.superTypes = element.superTypes.map(superType => processDependencyPath(superType, this.dependencyProcessingContext));
    element.properties.forEach(property => processDependableProperty(property, this.dependencyProcessingContext));
    element.derivedProperties.forEach(derivedProperty => {
      derivedProperty.returnType = processDependencyPath(derivedProperty.returnType, this.dependencyProcessingContext);
      derivedProperty.taggedValues.forEach(taggedValue => processDependableTaggedValue(taggedValue, this.dependencyProcessingContext));
      derivedProperty.stereotypes.forEach(stereotype => processDependableStereotypePointer(stereotype, this.dependencyProcessingContext));
      derivedProperty.body = derivedProperty.body ? processDependableObject(derivedProperty.body as Record<PropertyKey, unknown>, this.dependencyProcessingContext) : undefined;
      derivedProperty.parameters = derivedProperty.parameters ? processDependableObject(derivedProperty.parameters as Record<PropertyKey, unknown>, this.dependencyProcessingContext) : undefined;
    });
    element.constraints.forEach(constraint => processDependableLambda(constraint.functionDefinition, this.dependencyProcessingContext));
  }

  visit_Association(element: Association): void {
    element.package = processDependencyPath(element.package, this.dependencyProcessingContext);
    element.taggedValues.forEach(taggedValue => processDependableTaggedValue(taggedValue, this.dependencyProcessingContext));
    element.stereotypes.forEach(stereotype => processDependableStereotypePointer(stereotype, this.dependencyProcessingContext));
    element.properties.forEach(property => processDependableProperty(property, this.dependencyProcessingContext));
  }

  visit_ConcreteFunctionDefinition(element: ConcreteFunctionDefinition): void {
    element.package = processDependencyPath(element.package, this.dependencyProcessingContext);
    element.taggedValues.forEach(taggedValue => processDependableTaggedValue(taggedValue, this.dependencyProcessingContext));
    element.stereotypes.forEach(stereotype => processDependableStereotypePointer(stereotype, this.dependencyProcessingContext));
    element.body = element.body.map(body => processDependableObject(body as Record<PropertyKey, unknown>, this.dependencyProcessingContext));
    element.parameters.forEach(parameter => processDependableVariable(parameter, this.dependencyProcessingContext));
  }

  visit_GenerationSpecification(element: GenerationSpecification): void {
    // TODO
    return;
  }

  visit_SectionIndex(element: SectionIndex): void {
    // TODO
    return;
  }

  visit_Mapping(element: Mapping): void {
    element.package = processDependencyPath(element.package, this.dependencyProcessingContext);
    element.enumerationMappings.forEach(enumerationMapping => {
      enumerationMapping.enumeration = processDependencyPath(enumerationMapping.enumeration, this.dependencyProcessingContext);
      enumerationMapping.enumValueMappings.forEach(enumValueMapping => processDependableEnumValueMapping(enumValueMapping, this.dependencyProcessingContext));
    });
    // element.classMappings.forEach(p => p.processDependentElementPath(versionPrefix, allDependencyKeys, reservedPaths, projectEntityPaths));
    element.tests.forEach(test => processDependableMappingTest(test, this.dependencyProcessingContext));
  }

  visit_Diagram(element: Diagram): void {
    element.package = processDependencyPath(element.package, this.dependencyProcessingContext);
    element.classViews.forEach(classView => { classView.class = processDependencyPath(classView.class, this.dependencyProcessingContext) });
    element.propertyViews.forEach(propertyView => processDependablePropertyPointer(propertyView.property, this.dependencyProcessingContext));
  }

  visit_Text(element: Text): void {
    return;
  }

  visit_FileGeneration(element: FileGeneration): void {
    element.scopeElements.forEach(scopeElement => processDependencyPath(scopeElement, this.dependencyProcessingContext));
    return;
  }

  visit_PackageableRuntime(element: PackageableRuntime): void {
    processDependableRuntime(element.runtimeValue, this.dependencyProcessingContext, this);
  }

  visit_PackageableConnection(element: PackageableConnection): void {
    element.connectionValue.accept_ConnectionVisitor(this);
  }

  // ----------------------------------------------- CLASS MAPPING ----------------------------------------

  visit_OperationClassMapping(classMapping: OperationClassMapping): void {
    classMapping.class = processDependencyPath(classMapping.class, this.dependencyProcessingContext);
  }

  visit_PureInstanceClassMapping(classMapping: PureInstanceClassMapping): void {
    classMapping.class = processDependencyPath(classMapping.class, this.dependencyProcessingContext);
    classMapping.srcClass = classMapping.srcClass ? processDependencyPath(classMapping.srcClass, this.dependencyProcessingContext) : undefined;
    classMapping.propertyMappings.forEach(propertyMapping => propertyMapping.accept_PropertyMappingVisitor(this));
    // TODO? filter
  }
  // ----------------------------------------------- PROPERTY MAPPING ----------------------------------------

  visit_PurePropertyMapping(propertyMapping: PurePropertyMapping): void {
    processDependablePropertyPointer(propertyMapping.property, this.dependencyProcessingContext);
    processDependableLambda(propertyMapping.transform, this.dependencyProcessingContext);
  }

  // ----------------------------------------------- CONNECTION ----------------------------------------

  visit_ConnectionPointer(connection: ConnectionPointer): void {
    connection.connection = processDependencyPath(connection.connection, this.dependencyProcessingContext);
  }

  visit_JsonModelConnection(connection: JsonModelConnection): void {
    connection.class = processDependencyPath(connection.class, this.dependencyProcessingContext);
  }

  visit_XmlModelConnection(connection: XmlModelConnection): void {
    connection.class = processDependencyPath(connection.class, this.dependencyProcessingContext);
  }
}
