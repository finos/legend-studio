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

import { PRIMITIVE_TYPE, ENTITY_PATH_DELIMITER } from 'MetaModelConst';
import { uniq, assertNonEmptyString } from 'Utilities/GeneralUtil';
import { GraphError } from 'MetaModelUtility';
import { GenericType as MM_GenericType } from 'MM/model/packageableElements/domain/GenericType';
import { PackageableElement as MM_PackageableElement } from 'MM/model/packageableElements/PackageableElement';
import { PureModel as MM_PureModel } from 'MM/PureModel';
import { Package as MM_Package } from 'MM/model/packageableElements/domain/Package';
import { Section as MM_Section, ImportAwareCodeSection as MM_ImportAwareCodeSection } from 'MM/model/packageableElements/section/Section';
import { StereotypeImplicitReference as MM_StereotypeImplicitReference } from 'MM/model/packageableElements/domain/StereotypeReference';
import { GenericTypeImplicitReference as MM_GenericTypeImplicitReference } from 'MM/model/packageableElements/domain/GenericTypeReference';
import { Type as MM_Type } from 'MM/model/packageableElements/domain/Type';
import { Class as MM_Class } from 'MM/model/packageableElements/domain/Class';
import { Enumeration as MM_Enumeration } from 'MM/model/packageableElements/domain/Enumeration';
import { Association as MM_Association } from 'MM/model/packageableElements/domain/Association';
import { Mapping as MM_Mapping } from 'MM/model/packageableElements/mapping/Mapping';
import { Profile as MM_Profile } from 'MM/model/packageableElements/domain/Profile';
import { Diagram as MM_Diagram } from 'MM/model/packageableElements/diagram/Diagram';
import { Text as MM_Text } from 'MM/model/packageableElements/text/Text';
import { ConcreteFunctionDefinition as MM_ConcreteFunctionDefinition } from 'MM/model/packageableElements/domain/ConcreteFunctionDefinition';
import { Store as MM_Store } from 'MM/model/packageableElements/store/Store';
import { PackageableConnection as MM_PackageableConnection } from 'MM/model/packageableElements/connection/PackageableConnection';
import { PackageableRuntime as MM_PackageableRuntime } from 'MM/model/packageableElements/runtime/PackageableRuntime';
import { FileGeneration as MM_FileGeneration } from 'MM/model/packageableElements/fileGeneration/FileGeneration';
import { GenerationSpecification as MM_GenerationSpecification } from 'MM/model/packageableElements/generationSpecification/GenerationSpecification';
import { Measure as MM_Measure, Unit as MM_Unit } from 'MM/model/packageableElements/domain/Measure';
import { PackageableElementImplicitReference as MM_PackageableElementImplicitReference } from 'MM/model/packageableElements/PackageableElementReference';
import { TagImplicitReference as MM_TagImplicitReference } from 'MM/model/packageableElements/domain/TagReference';
import { PropertyImplicitReference as MM_PropertyImplicitReference } from 'MM/model/packageableElements/domain/PropertyReference';
import { StereotypePtr } from 'V1/model/packageableElements/domain/StereotypePtr';
import { PackageableElement } from 'V1/model/packageableElements/PackageableElement';
import { TagPtr } from 'V1/model/packageableElements/domain/TagPtr';
import { PropertyPointer } from 'V1/model/packageableElements/domain/PropertyPointer';

type ResolutionResult<T> = [T, boolean | undefined];

export class GraphBuilderContext {
  readonly graph: MM_PureModel;
  readonly imports: MM_Package[] = [];
  readonly section?: MM_Section;

  constructor(builder: GraphBuilderContextBuilder) {
    this.graph = builder.graph;
    this.imports = builder.imports;
    this.section = builder.section;
  }

  resolve<T>(path: string, resolverFn: (path: string) => T): ResolutionResult<T> {
    // Try the find from special types (not user-defined top level types)
    const SPECIAL_TYPES: string[] = Object.values(PRIMITIVE_TYPE).concat([]);
    if (SPECIAL_TYPES.includes(path)) {
      return [resolverFn(path), undefined];
    }
    // if the path is a path with package, no resolution from import is needed
    if (path.includes(ENTITY_PATH_DELIMITER)) {
      return [resolverFn(path), undefined];
    }
    // NOTE: here we make the assumption that we have populated the indices properly so the same element
    // is not referred using 2 different paths in the same element index
    const results = new Map<string, ResolutionResult<T>>();
    uniq(this.imports).forEach(importPackage => {
      try {
        const fullPath = importPackage.path + ENTITY_PATH_DELIMITER + path;
        const element = resolverFn(fullPath);
        if (element) {
          results.set(fullPath, [element, this.graph.sectionAutoImports.includes(importPackage)]);
        }
      } catch {
        // do nothing
      }
    });
    switch (results.size) {
      /**
       * NOTE: if nothing is found then we will try to find user-defined elements at root package (i.e. no package)
       * We place this after import resolution since we want to emphasize that this type of element has the lowest precedence
       * In fact, due to the restriction that Legend imposes on element path, the only kinds of element
       * we could find at this level are packages, but they will not fit the type we look for
       * in PURE, since we resolve to CoreInstance, further validation needs to be done to make the resolution complete
       * here we count on the `resolver` to do the validation of the type of element instead
       */
      case 0: return [resolverFn(path), undefined];
      case 1: return Array.from(results.values())[0];
      default: throw new GraphError(undefined, `Can't resolve element with path '${path}' - multiple matches found [${Array.from(results.keys()).join(', ')}]`);
    }
  }

  resolveStereotype = (stereotypePtr: StereotypePtr): MM_StereotypeImplicitReference => {
    assertNonEmptyString(stereotypePtr.profile, 'Steoreotype pointer profile is missing');
    assertNonEmptyString(stereotypePtr.value, 'Steoreotype pointer value is missing');
    const ownerReference = this.resolveProfile(stereotypePtr.profile);
    return MM_StereotypeImplicitReference.create(ownerReference, ownerReference.value.getStereotype(stereotypePtr.value));
  }

  resolveTag = (tagPtr: TagPtr): MM_TagImplicitReference => {
    assertNonEmptyString(tagPtr.profile, 'Tag pointer profile is missing');
    assertNonEmptyString(tagPtr.value, 'Tag pointer value is missing');
    const ownerReference = this.resolveProfile(tagPtr.profile);
    return MM_TagImplicitReference.create(ownerReference, ownerReference.value.getTag(tagPtr.value));
  }

  resolveGenericType = (path: string): MM_GenericTypeImplicitReference => {
    const ownerReference = this.resolveType(path);
    return MM_GenericTypeImplicitReference.create(ownerReference, new MM_GenericType(ownerReference.value));
  }

  resolveOwnedProperty = (propertyPtr: PropertyPointer): MM_PropertyImplicitReference => {
    assertNonEmptyString(propertyPtr.class, 'Property pointer class is missing');
    assertNonEmptyString(propertyPtr.property, 'Property pointer name is missing');
    const ownerReference = this.resolveClass(propertyPtr.class);
    return MM_PropertyImplicitReference.create(ownerReference, ownerReference.value.getOwnedProperty(propertyPtr.property));
  }

  resolveProperty = (propertyPtr: PropertyPointer): MM_PropertyImplicitReference => {
    assertNonEmptyString(propertyPtr.class, 'Property pointer class is missing');
    assertNonEmptyString(propertyPtr.property, 'Property pointer name is missing');
    const ownerReference = this.resolveClass(propertyPtr.class);
    return MM_PropertyImplicitReference.create(ownerReference, ownerReference.value.getProperty(propertyPtr.property));
  }

  private createImplicitPackageableElementReference = <T extends MM_PackageableElement>(path: string, resolverFn: (path: string) => T): MM_PackageableElementImplicitReference<T> => {
    const resolutionResult = this.resolve(path, resolverFn);
    return MM_PackageableElementImplicitReference.create(resolutionResult[0], path, this.section, resolutionResult[1]);
  }

  /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
  resolveElement = (path: string, includePackage: boolean): MM_PackageableElementImplicitReference<MM_PackageableElement> => this.createImplicitPackageableElementReference(path, (_path: string) => this.graph.getElement(_path, includePackage))
  resolveType = (path: string): MM_PackageableElementImplicitReference<MM_Type> => this.createImplicitPackageableElementReference(path, this.graph.getType)
  resolveProfile = (path: string): MM_PackageableElementImplicitReference<MM_Profile> => this.createImplicitPackageableElementReference(path, this.graph.getProfile)
  resolveClass = (path: string): MM_PackageableElementImplicitReference<MM_Class> => this.createImplicitPackageableElementReference(path, this.graph.getClass)
  resolveEnumeration = (path: string): MM_PackageableElementImplicitReference<MM_Enumeration> => this.createImplicitPackageableElementReference(path, this.graph.getEnumeration)
  resolveMeasure = (path: string): MM_PackageableElementImplicitReference<MM_Measure> => this.createImplicitPackageableElementReference(path, this.graph.getMeasure)
  resolveUnit = (path: string): MM_PackageableElementImplicitReference<MM_Unit> => this.createImplicitPackageableElementReference(path, this.graph.getUnit)
  resolveAssociation = (path: string): MM_PackageableElementImplicitReference<MM_Association> => this.createImplicitPackageableElementReference(path, this.graph.getAssociation)
  resolveFunction = (path: string): MM_PackageableElementImplicitReference<MM_ConcreteFunctionDefinition> => this.createImplicitPackageableElementReference(path, this.graph.getFunction)
  resolveStore = (path: string): MM_PackageableElementImplicitReference<MM_Store> => this.createImplicitPackageableElementReference(path, this.graph.getStore)
  resolveMapping = (path: string): MM_PackageableElementImplicitReference<MM_Mapping> => this.createImplicitPackageableElementReference(path, this.graph.getMapping)
  resolveConnection = (path: string): MM_PackageableElementImplicitReference<MM_PackageableConnection> => this.createImplicitPackageableElementReference(path, this.graph.getConnection)
  resolveRuntime = (path: string): MM_PackageableElementImplicitReference<MM_PackageableRuntime> => this.createImplicitPackageableElementReference(path, this.graph.getRuntime)
  resolveDiagram = (path: string): MM_PackageableElementImplicitReference<MM_Diagram> => this.createImplicitPackageableElementReference(path, this.graph.getDiagram)
  resolveText = (path: string): MM_PackageableElementImplicitReference<MM_Text> => this.createImplicitPackageableElementReference(path, this.graph.getText)
  resolveGenerationSpecification = (path: string): MM_PackageableElementImplicitReference<MM_GenerationSpecification> => this.createImplicitPackageableElementReference(path, this.graph.getGenerationSpecification)
  resolveFileGeneration = (path: string): MM_PackageableElementImplicitReference<MM_FileGeneration> => this.createImplicitPackageableElementReference(path, this.graph.getFileGeneration)
}

export class GraphBuilderContextBuilder {
  graph: MM_PureModel;
  imports: MM_Package[] = [];
  section?: MM_Section;

  constructor(graph: MM_PureModel) {
    this.graph = graph;
  }

  withElement(element: PackageableElement): GraphBuilderContextBuilder {
    const section = this.graph.getSection(element.path);
    return this.withSection(section);
  }

  withSection(section: MM_Section | undefined): GraphBuilderContextBuilder {
    this.section = section;
    // NOTE: we add auto-imports regardless the type of the section or whether if there is any section at all
    // so system elements will always be resolved no matter what.
    this.imports = this.graph.sectionAutoImports;
    if (section instanceof MM_ImportAwareCodeSection) {
      this.imports = this.imports.concat(section.imports.map(i => i.value));
    }
    this.imports = uniq(this.imports); // remove duplicates
    return this;
  }

  build(): GraphBuilderContext {
    return new GraphBuilderContext(this);
  }
}
