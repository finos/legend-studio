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

import {
  PRIMITIVE_TYPE,
  ELEMENT_PATH_DELIMITER,
} from '../../../../../../../MetaModelConst';
import type { Log } from '@finos/legend-shared';
import {
  uniq,
  assertNonEmptyString,
  guaranteeType,
} from '@finos/legend-shared';
import { GenericType } from '../../../../../../metamodels/pure/packageableElements/domain/GenericType';
import type { PackageableElement } from '../../../../../../metamodels/pure/packageableElements/PackageableElement';
import type { PureModel } from '../../../../../../../graph/PureModel';
import type { Package } from '../../../../../../metamodels/pure/packageableElements/domain/Package';
import type { Section } from '../../../../../../metamodels/pure/packageableElements/section/Section';
import { ImportAwareCodeSection } from '../../../../../../metamodels/pure/packageableElements/section/Section';
import { StereotypeImplicitReference } from '../../../../../../metamodels/pure/packageableElements/domain/StereotypeReference';
import { GenericTypeImplicitReference } from '../../../../../../metamodels/pure/packageableElements/domain/GenericTypeReference';
import type { Type } from '../../../../../../metamodels/pure/packageableElements/domain/Type';
import type { Class } from '../../../../../../metamodels/pure/packageableElements/domain/Class';
import type { Enumeration } from '../../../../../../metamodels/pure/packageableElements/domain/Enumeration';
import type { Association } from '../../../../../../metamodels/pure/packageableElements/domain/Association';
import type { Mapping } from '../../../../../../metamodels/pure/packageableElements/mapping/Mapping';
import type { Profile } from '../../../../../../metamodels/pure/packageableElements/domain/Profile';
import type { ConcreteFunctionDefinition } from '../../../../../../metamodels/pure/packageableElements/domain/ConcreteFunctionDefinition';
import type { Store } from '../../../../../../metamodels/pure/packageableElements/store/Store';
import type { Service } from '../../../../../../metamodels/pure/packageableElements/service/Service';
import type { FlatData } from '../../../../../../metamodels/pure/packageableElements/store/flatData/model/FlatData';
import type { Database } from '../../../../../../metamodels/pure/packageableElements/store/relational/model/Database';
import type { PackageableConnection } from '../../../../../../metamodels/pure/packageableElements/connection/PackageableConnection';
import type { PackageableRuntime } from '../../../../../../metamodels/pure/packageableElements/runtime/PackageableRuntime';
import type { FileGenerationSpecification } from '../../../../../../metamodels/pure/packageableElements/fileGeneration/FileGenerationSpecification';
import type { GenerationSpecification } from '../../../../../../metamodels/pure/packageableElements/generationSpecification/GenerationSpecification';
import type {
  Measure,
  Unit,
} from '../../../../../../metamodels/pure/packageableElements/domain/Measure';
import { PackageableElementImplicitReference } from '../../../../../../metamodels/pure/packageableElements/PackageableElementReference';
import { TagImplicitReference } from '../../../../../../metamodels/pure/packageableElements/domain/TagReference';
import { PropertyImplicitReference } from '../../../../../../metamodels/pure/packageableElements/domain/PropertyReference';
import { JoinImplicitReference } from '../../../../../../metamodels/pure/packageableElements/store/relational/model/JoinReference';
import { FilterImplicitReference } from '../../../../../../metamodels/pure/packageableElements/store/relational/model/FilterReference';
import { RootFlatDataRecordTypeImplicitReference } from '../../../../../../metamodels/pure/packageableElements/store/flatData/model/RootFlatDataRecordTypeReference';
import type { ViewImplicitReference } from '../../../../../../metamodels/pure/packageableElements/store/relational/model/ViewReference';
import type { TableImplicitReference } from '../../../../../../metamodels/pure/packageableElements/store/relational/model/TableReference';
import { createImplicitRelationReference } from '../../../../../../metamodels/pure/packageableElements/store/relational/model/RelationReference';
import { EnumValueImplicitReference } from '../../../../../../metamodels/pure/packageableElements/domain/EnumValueReference';
import type { V1_StereotypePtr } from '../../../model/packageableElements/domain/V1_StereotypePtr';
import type { V1_PackageableElement } from '../../../model/packageableElements/V1_PackageableElement';
import type { V1_TagPtr } from '../../../model/packageableElements/domain/V1_TagPtr';
import type { V1_PropertyPointer } from '../../../model/packageableElements/domain/V1_PropertyPointer';
import type { V1_JoinPointer } from '../../../model/packageableElements/store/relational/model/V1_JoinPointer';
import type { V1_FilterPointer } from '../../../model/packageableElements/store/relational/mapping/V1_FilterPointer';
import type { V1_RootFlatDataClassMapping } from '../../../model/packageableElements/store/flatData/mapping/V1_RootFlatDataClassMapping';
import type { V1_TablePtr } from '../../../model/packageableElements/store/relational/model/V1_TablePtr';
import { V1_getRelation } from './helpers/V1_DatabaseBuilderHelper';
import type { BasicModel } from '../../../../../../../graph/BasicModel';
import type { V1_GraphBuilderExtensions } from './V1_GraphBuilderExtensions';
import type { GraphBuilderOptions } from '../../../../../../../graphManager/AbstractPureGraphManager';
import { DataType } from '../../../../../../metamodels/pure/packageableElements/domain/DataType';
import { GraphBuilderError } from '../../../../../../../graphManager/GraphManagerUtils';

interface ResolutionResult<T> {
  /**
   * The resolved element.
   */
  element: T;
  /**
   * Flag indicating if we need to use section imports to resolve the element.
   */
  resolvedUsingSectionImports?: boolean | undefined;
  /**
   * Flag indicating if the full path is already provided when resolving the element.
   */
  isFullPath?: boolean | undefined;
}

export class V1_GraphBuilderContext {
  readonly log: Log;
  readonly currentSubGraph: BasicModel;
  readonly extensions: V1_GraphBuilderExtensions;
  readonly graph: PureModel;
  readonly imports: Package[] = [];
  readonly section?: Section | undefined;
  readonly options?: GraphBuilderOptions | undefined;

  constructor(builder: V1_GraphBuilderContextBuilder) {
    this.log = builder.log;
    this.graph = builder.graph;
    this.currentSubGraph = builder.currentSubGraph;
    this.extensions = builder.extensions;
    this.imports = builder.imports;
    this.section = builder.section;
    this.options = builder.options;
  }

  resolve<T>(
    path: string,
    resolverFn: (path: string) => T,
  ): ResolutionResult<T> {
    // Try the find from special types (not user-defined top level types)
    const SPECIAL_TYPES: string[] = Object.values(PRIMITIVE_TYPE).concat([]);
    if (SPECIAL_TYPES.includes(path)) {
      return {
        element: resolverFn(path),
      };
    }
    // if the path is a path with package, no resolution from section imports is needed
    if (path.includes(ELEMENT_PATH_DELIMITER)) {
      return {
        element: resolverFn(path),
        isFullPath: true,
      };
    }
    // NOTE: here we make the assumption that we have populated the indices properly so the same element
    // is not referred using 2 different paths in the same element index
    const results = new Map<string, ResolutionResult<T>>();
    uniq(this.imports).forEach((importPackage) => {
      try {
        const fullPath = importPackage.path + ELEMENT_PATH_DELIMITER + path;
        const element = resolverFn(fullPath);
        if (element) {
          results.set(fullPath, {
            element,
            resolvedUsingSectionImports:
              !this.graph.sectionAutoImports.includes(importPackage),
          });
        }
      } catch {
        // do nothing
      }
    });
    switch (results.size) {
      /**
       * NOTE: if nothing is found then we will try to find user-defined elements at root package (i.e. no package)
       * We place this after import resolution since we want to emphasize that this type of element has the lowest precedence
       * In fact, due to the restriction that Alloy imposes on element path, the only kinds of element
       * we could find at this level are packages, but they will not fit the type we look for
       * in PURE, since we resolve to CoreInstance, further validation needs to be done to make the resolution complete
       * here we count on the `resolver` to do the validation of the type of element instead
       */
      case 0:
        return {
          element: resolverFn(path),
          isFullPath: true,
        };
      case 1:
        return Array.from(results.values())[0];
      default:
        throw new GraphBuilderError(
          undefined,
          `Can't resolve element with path '${path}' - multiple matches found [${Array.from(
            results.keys(),
          ).join(', ')}]`,
        );
    }
  }

  /**
   * This method and this class in general demonstrates the difference
   * between explicit and implicit reference.
   * See {@link PackageableElementImplicitReference} for more details.
   *
   * Notice that every method in the resolver ends up creating an implicit reference.
   * It does not matter whether the full path is specified or not (i.e. so almost
   * no inference was done), the resulting reference must be implicit, as we took the
   * input into account when creating this reference.
   */
  createImplicitPackageableElementReference = <T extends PackageableElement>(
    path: string,
    resolverFn: (path: string) => T,
  ): PackageableElementImplicitReference<T> => {
    const { element, resolvedUsingSectionImports, isFullPath } = this.resolve(
      path,
      resolverFn,
    );
    if (!resolvedUsingSectionImports && !isFullPath) {
      return PackageableElementImplicitReference.create(element, path);
    }
    return PackageableElementImplicitReference.resolveFromSection(
      element,
      path,
      resolvedUsingSectionImports ? this.section : undefined,
    );
  };

  resolveStereotype = (
    stereotypePtr: V1_StereotypePtr,
  ): StereotypeImplicitReference => {
    assertNonEmptyString(
      stereotypePtr.profile,
      'Steoreotype pointer profile is missing',
    );
    assertNonEmptyString(
      stereotypePtr.value,
      'Steoreotype pointer value is missing',
    );
    const ownerReference = this.resolveProfile(stereotypePtr.profile);
    const value = ownerReference.value.getStereotype(stereotypePtr.value);
    return StereotypeImplicitReference.create(ownerReference, value);
  };

  resolveTag = (tagPtr: V1_TagPtr): TagImplicitReference => {
    assertNonEmptyString(tagPtr.profile, 'Tag pointer profile is missing');
    assertNonEmptyString(tagPtr.value, 'Tag pointer value is missing');
    const ownerReference = this.resolveProfile(tagPtr.profile);
    const value = ownerReference.value.getTag(tagPtr.value);
    return TagImplicitReference.create(ownerReference, value);
  };

  resolveGenericType = (path: string): GenericTypeImplicitReference => {
    const ownerReference = this.resolveType(path);
    const value = new GenericType(ownerReference.value);
    return GenericTypeImplicitReference.create(ownerReference, value);
  };

  resolveOwnedProperty = (
    propertyPtr: V1_PropertyPointer,
  ): PropertyImplicitReference => {
    assertNonEmptyString(
      propertyPtr.class,
      'Property pointer class is missing',
    );
    assertNonEmptyString(
      propertyPtr.property,
      'Property pointer name is missing',
    );
    const ownerReference = this.resolveClass(propertyPtr.class);
    const value = ownerReference.value.getOwnedProperty(propertyPtr.property);
    return PropertyImplicitReference.create(ownerReference, value);
  };

  resolveProperty = (
    propertyPtr: V1_PropertyPointer,
  ): PropertyImplicitReference => {
    assertNonEmptyString(
      propertyPtr.class,
      'Property pointer class is missing',
    );
    assertNonEmptyString(
      propertyPtr.property,
      'Property pointer name is missing',
    );
    const ownerReference = this.resolveClass(propertyPtr.class);
    const value = ownerReference.value.getProperty(propertyPtr.property);
    return PropertyImplicitReference.create(ownerReference, value);
  };

  resolveRootFlatDataRecordType = (
    classMapping: V1_RootFlatDataClassMapping,
  ): RootFlatDataRecordTypeImplicitReference => {
    assertNonEmptyString(
      classMapping.flatData,
      'Flat-data class mapping source flat-data store is missing',
    );
    assertNonEmptyString(
      classMapping.sectionName,
      'Flat-data class mapping source flat-data section is missing',
    );
    const ownerReference = this.resolveFlatDataStore(classMapping.flatData);
    const value = ownerReference.value
      .findSection(classMapping.sectionName)
      .getRecordType();
    return RootFlatDataRecordTypeImplicitReference.create(
      ownerReference,
      value,
    );
  };

  resolveRelation = (
    tablePtr: V1_TablePtr,
  ): ViewImplicitReference | TableImplicitReference => {
    assertNonEmptyString(
      tablePtr.database,
      'Table pointer database is missing',
    );
    assertNonEmptyString(tablePtr.schema, 'Table pointer schema is missing');
    assertNonEmptyString(tablePtr.table, 'Table pointer table is missing');
    const ownerReference = this.resolveDatabase(tablePtr.database);
    const value = V1_getRelation(
      ownerReference.value,
      tablePtr.schema,
      tablePtr.table,
    );
    return createImplicitRelationReference(ownerReference, value);
  };

  resolveJoin = (joinPtr: V1_JoinPointer): JoinImplicitReference => {
    assertNonEmptyString(joinPtr.db, 'Join pointer database is missing');
    assertNonEmptyString(joinPtr.name, 'Join pointer name is missing');
    const ownerReference = this.resolveDatabase(joinPtr.db);
    const value = ownerReference.value.getJoin(joinPtr.name);
    return JoinImplicitReference.create(ownerReference, value);
  };

  resolveFilter = (filterPtr: V1_FilterPointer): FilterImplicitReference => {
    assertNonEmptyString(filterPtr.db, 'Filter pointer database is missing');
    assertNonEmptyString(filterPtr.name, 'Filter pointer name is missing');
    const ownerReference = this.resolveDatabase(filterPtr.db);
    const value = ownerReference.value.getFilter(filterPtr.name);
    return FilterImplicitReference.create(ownerReference, value);
  };

  resolveEnumValue = (
    enumeration: string,
    enumValue: string,
  ): EnumValueImplicitReference => {
    const ownerReference = this.resolveEnumeration(enumeration);
    const value = ownerReference.value.getValue(enumValue);
    return EnumValueImplicitReference.create(ownerReference, value);
  };

  /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
  resolveElement = (
    path: string,
    includePackage: boolean,
  ): PackageableElementImplicitReference<PackageableElement> =>
    this.createImplicitPackageableElementReference(path, (_path: string) =>
      this.graph.getElement(_path, includePackage),
    );
  resolveType = (path: string): PackageableElementImplicitReference<Type> =>
    this.createImplicitPackageableElementReference(path, this.graph.getType);
  resolveDataType = (
    path: string,
  ): PackageableElementImplicitReference<DataType> =>
    this.createImplicitPackageableElementReference(path, (_path) =>
      guaranteeType(
        this.graph.getType(_path),
        DataType,
        `Can't find data type '${_path}'`,
      ),
    );
  resolveProfile = (
    path: string,
  ): PackageableElementImplicitReference<Profile> =>
    this.createImplicitPackageableElementReference(path, this.graph.getProfile);
  resolveClass = (path: string): PackageableElementImplicitReference<Class> =>
    this.createImplicitPackageableElementReference(path, this.graph.getClass);
  resolveEnumeration = (
    path: string,
  ): PackageableElementImplicitReference<Enumeration> =>
    this.createImplicitPackageableElementReference(
      path,
      this.graph.getEnumeration,
    );
  resolveMeasure = (
    path: string,
  ): PackageableElementImplicitReference<Measure> =>
    this.createImplicitPackageableElementReference(path, this.graph.getMeasure);
  resolveUnit = (path: string): PackageableElementImplicitReference<Unit> =>
    this.createImplicitPackageableElementReference(path, this.graph.getUnit);
  resolveAssociation = (
    path: string,
  ): PackageableElementImplicitReference<Association> =>
    this.createImplicitPackageableElementReference(
      path,
      this.graph.getAssociation,
    );
  resolveFunction = (
    path: string,
  ): PackageableElementImplicitReference<ConcreteFunctionDefinition> =>
    this.createImplicitPackageableElementReference(
      path,
      this.graph.getFunction,
    );
  resolveStore = (path: string): PackageableElementImplicitReference<Store> =>
    this.createImplicitPackageableElementReference(path, this.graph.getStore);
  resolveFlatDataStore = (
    path: string,
  ): PackageableElementImplicitReference<FlatData> =>
    this.createImplicitPackageableElementReference(
      path,
      this.graph.getFlatDataStore,
    );
  resolveDatabase = (
    path: string,
  ): PackageableElementImplicitReference<Database> =>
    this.createImplicitPackageableElementReference(
      path,
      this.graph.getDatabase,
    );
  resolveMapping = (
    path: string,
  ): PackageableElementImplicitReference<Mapping> =>
    this.createImplicitPackageableElementReference(path, this.graph.getMapping);
  resolveService = (
    path: string,
  ): PackageableElementImplicitReference<Service> =>
    this.createImplicitPackageableElementReference(path, this.graph.getService);
  resolveConnection = (
    path: string,
  ): PackageableElementImplicitReference<PackageableConnection> =>
    this.createImplicitPackageableElementReference(
      path,
      this.graph.getConnection,
    );
  resolveRuntime = (
    path: string,
  ): PackageableElementImplicitReference<PackageableRuntime> =>
    this.createImplicitPackageableElementReference(path, this.graph.getRuntime);
  resolveGenerationSpecification = (
    path: string,
  ): PackageableElementImplicitReference<GenerationSpecification> =>
    this.createImplicitPackageableElementReference(
      path,
      this.graph.getGenerationSpecification,
    );
  resolveFileGeneration = (
    path: string,
  ): PackageableElementImplicitReference<FileGenerationSpecification> =>
    this.createImplicitPackageableElementReference(
      path,
      this.graph.getFileGeneration,
    );
}

export class V1_GraphBuilderContextBuilder {
  log: Log;
  /**
   * The (sub) graph where the current processing is taking place.
   * This information is important because each sub-graph holds their
   * own indexes for elements they are responsible for.
   *
   * e.g. dependency graph, generation graph, system graph, etc.
   */
  currentSubGraph: BasicModel;
  extensions: V1_GraphBuilderExtensions;
  graph: PureModel;
  imports: Package[] = [];
  section?: Section | undefined;
  options?: GraphBuilderOptions | undefined;

  constructor(
    graph: PureModel,
    currentSubGraph: BasicModel,
    extensions: V1_GraphBuilderExtensions,
    log: Log,
    options?: GraphBuilderOptions,
  ) {
    this.graph = graph;
    this.currentSubGraph = currentSubGraph;
    this.extensions = extensions;
    this.log = log;
    this.options = options;
  }

  withElement(element: V1_PackageableElement): V1_GraphBuilderContextBuilder {
    const section = this.graph.getOwnSection(element.path);
    return this.withSection(section);
  }

  withSection(section: Section | undefined): V1_GraphBuilderContextBuilder {
    this.section = section;
    // NOTE: we add auto-imports regardless the type of the section or whether if there is any section at all
    // so system elements will always be resolved no matter what.
    this.imports = this.graph.sectionAutoImports;
    if (section instanceof ImportAwareCodeSection) {
      this.imports = this.imports.concat(section.imports.map((i) => i.value));
    }
    this.imports = uniq(this.imports); // remove duplicates
    return this;
  }

  build(): V1_GraphBuilderContext {
    return new V1_GraphBuilderContext(this);
  }
}
