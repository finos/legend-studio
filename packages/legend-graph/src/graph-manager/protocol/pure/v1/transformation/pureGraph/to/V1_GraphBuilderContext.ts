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
  ROOT_PACKAGE_NAME,
} from '../../../../../../../graph/MetaModelConst.js';
import {
  type LogService,
  uniq,
  guaranteeNonNullable,
  assertNonEmptyString,
  guaranteeType,
} from '@finos/legend-shared';
import { GenericType } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/GenericType.js';
import type { PackageableElement } from '../../../../../../../graph/metamodel/pure/packageableElements/PackageableElement.js';
import type { PureModel } from '../../../../../../../graph/PureModel.js';
import type { Package } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/Package.js';
import {
  type Section,
  ImportAwareCodeSection,
} from '../../../../../../../graph/metamodel/pure/packageableElements/section/Section.js';
import { StereotypeImplicitReference } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/StereotypeReference.js';
import {
  GenericTypeImplicitReference,
  type GenericTypeReference
} from '../../../../../../../graph/metamodel/pure/packageableElements/domain/GenericTypeReference.js';
import type { Type } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/Type.js';
import type { Class } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/Class.js';
import type { Enumeration } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/Enumeration.js';
import type { Association } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/Association.js';
import type { Mapping } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/Mapping.js';
import type { Profile } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/Profile.js';
import type { ConcreteFunctionDefinition } from '../../../../../../../graph/metamodel/pure/packageableElements/function/ConcreteFunctionDefinition.js';
import type { Store } from '../../../../../../../graph/metamodel/pure/packageableElements/store/Store.js';
import type { Service } from '../../../../../../../graph/metamodel/pure/packageableElements/service/Service.js';
import type { FlatData } from '../../../../../../../graph/metamodel/pure/packageableElements/store/flatData/model/FlatData.js';
import type { Database } from '../../../../../../../graph/metamodel/pure/packageableElements/store/relational/model/Database.js';
import type { PackageableConnection } from '../../../../../../../graph/metamodel/pure/packageableElements/connection/PackageableConnection.js';
import type { PackageableRuntime } from '../../../../../../../graph/metamodel/pure/packageableElements/runtime/PackageableRuntime.js';
import type { FileGenerationSpecification } from '../../../../../../../graph/metamodel/pure/packageableElements/fileGeneration/FileGenerationSpecification.js';
import type { GenerationSpecification } from '../../../../../../../graph/metamodel/pure/packageableElements/generationSpecification/GenerationSpecification.js';
import type {
  Measure,
  Unit,
} from '../../../../../../../graph/metamodel/pure/packageableElements/domain/Measure.js';
import { PackageableElementImplicitReference } from '../../../../../../../graph/metamodel/pure/packageableElements/PackageableElementReference.js';
import { TagImplicitReference } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/TagReference.js';
import { PropertyImplicitReference } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/PropertyReference.js';
import { JoinImplicitReference } from '../../../../../../../graph/metamodel/pure/packageableElements/store/relational/model/JoinReference.js';
import { FilterImplicitReference } from '../../../../../../../graph/metamodel/pure/packageableElements/store/relational/model/FilterReference.js';
import { RootFlatDataRecordTypeImplicitReference } from '../../../../../../../graph/metamodel/pure/packageableElements/store/flatData/model/RootFlatDataRecordTypeReference.js';
import type { ViewImplicitReference } from '../../../../../../../graph/metamodel/pure/packageableElements/store/relational/model/ViewReference.js';
import type { TableImplicitReference } from '../../../../../../../graph/metamodel/pure/packageableElements/store/relational/model/TableReference.js';
import { createImplicitRelationReference } from '../../../../../../../graph/metamodel/pure/packageableElements/store/relational/model/RelationReference.js';
import { EnumValueImplicitReference } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/EnumValueReference.js';
import type { V1_StereotypePtr } from '../../../model/packageableElements/domain/V1_StereotypePtr.js';
import type { V1_PackageableElement } from '../../../model/packageableElements/V1_PackageableElement.js';
import type { V1_TagPtr } from '../../../model/packageableElements/domain/V1_TagPtr.js';
import type { V1_PropertyPointer } from '../../../model/packageableElements/domain/V1_PropertyPointer.js';
import type { V1_JoinPointer } from '../../../model/packageableElements/store/relational/model/V1_JoinPointer.js';
import type { V1_FilterPointer } from '../../../model/packageableElements/store/relational/mapping/V1_FilterPointer.js';
import type { V1_RootFlatDataClassMapping } from '../../../model/packageableElements/store/flatData/mapping/V1_RootFlatDataClassMapping.js';
import type { V1_TablePtr } from '../../../model/packageableElements/store/relational/model/V1_TablePtr.js';
import { V1_getRelation } from './helpers/V1_DatabaseBuilderHelper.js';
import type { BasicModel } from '../../../../../../../graph/BasicModel.js';
import type { V1_GraphBuilderExtensions } from './V1_GraphBuilderExtensions.js';
import type { GraphBuilderOptions } from '../../../../../../../graph-manager/AbstractPureGraphManager.js';
import { DataType } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/DataType.js';
import { GraphBuilderError } from '../../../../../../../graph-manager/GraphManagerUtils.js';
import {
  getClassProperty,
  getEnumValue,
  getOwnProperty,
  getStereotype,
  getTag,
  newGenericType,
} from '../../../../../../../graph/helpers/DomainHelper.js';
import {
  getFilter,
  getJoin,
} from '../../../../../../../graph/helpers/STO_Relational_Helper.js';
import {
  getRootRecordType,
  getSection,
} from '../../../../../../../graph/helpers/STO_FlatData_Helper.js';
import type { PropertyOwner } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/AbstractProperty.js';
import type { DataElement } from '../../../../../../../graph/metamodel/pure/packageableElements/data/DataElement.js';
import type { V1_GenericType } from '../../../model/packageableElements/type/V1_GenericType.js';
import { V1_getGenericTypeFullPath } from '../../../helpers/V1_DomainHelper.js';

export const V1_buildFullPath = (
  packagePath: string | undefined,
  name: string | undefined,
): string =>
  `${guaranteeNonNullable(
    packagePath,
    'Package path is required',
  )}${ELEMENT_PATH_DELIMITER}${guaranteeNonNullable(name, 'Name is required')}`;

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
  private readonly autoImports: Package[];
  private readonly sectionImports: Package[] = [];
  readonly logService: LogService;
  readonly currentSubGraph: BasicModel;
  readonly extensions: V1_GraphBuilderExtensions;
  readonly graph: PureModel;
  readonly section?: Section | undefined;
  readonly options?: GraphBuilderOptions | undefined;

  constructor(builder: V1_GraphBuilderContextBuilder) {
    this.logService = builder.logService;
    this.graph = builder.graph;
    this.autoImports = this.graph.autoImports;
    this.currentSubGraph = builder.currentSubGraph;
    this.extensions = builder.extensions;
    this.sectionImports = builder.sectionImports;
    this.section = builder.section;
    this.options = builder.options;
  }

  /**
   * Since we haven't fully supported section index, shortened paths
   * using imports in the graph might need to be fully resolved.
   *
   * To handle this need, we make use of references. References can auto
   * resolve full paths when the section index is deleted. But, when
   * building the graph, we leave the value specifications
   * raw/unprocessed. Hence, we cannot make use of references to do full
   * path resolution, as such, we make a best effort traversal in the model
   * of raw value specifications to resolve path automatically.
   *
   * We create this flag to control the behavior of lambda auto path-resolution.
   * This rewriting behavior should not be done for immutable graphs, such as
   * system, depdendencies, and generation. However, in overall, it would be controlled
   * also by the `TEMPORARY__preserveSectionIndex` flag.
   *
   * NOTE: When we fully support section index, we would certainly need to
   * revise the usefullness of this flag, perhaps, we don't auto-resolve anymore,
   * but this mechanism would still be beneficial as we can keep it as an utility
   * to resolve raw lambdas' paths when the user deliberately delete the section
   * index, for example.
   *
   * https://github.com/finos/legend-studio/issues/1067
   */
  get enableRawLambdaAutoPathResolution(): boolean {
    return (
      this.graph.root.name === ROOT_PACKAGE_NAME.MAIN &&
      !this.options?.TEMPORARY__preserveSectionIndex
    );
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
    this.autoImports.forEach((importPackage) => {
      try {
        const fullPath = importPackage.path + ELEMENT_PATH_DELIMITER + path;
        const element = resolverFn(fullPath);
        if (element) {
          results.set(fullPath, {
            element,
            resolvedUsingSectionImports: false,
          });
        }
      } catch {
        // do nothing
      }
    });
    // only resolve section imports if there is a section
    if (this.section) {
      this.sectionImports.forEach((importPackage) => {
        try {
          const fullPath = importPackage.path + ELEMENT_PATH_DELIMITER + path;
          const element = resolverFn(fullPath);
          if (element) {
            results.set(fullPath, {
              element,
              resolvedUsingSectionImports: true,
            });
          }
        } catch {
          // do nothing
        }
      });
    }
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
        return guaranteeNonNullable(Array.from(results.values())[0]);
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
      `Steoreotype pointer 'profile' field is missing or empty`,
    );
    assertNonEmptyString(
      stereotypePtr.value,
      `Steoreotype pointer 'value' field is missing or empty`,
    );
    const ownerReference = this.resolveProfile(stereotypePtr.profile);
    const value = getStereotype(ownerReference.value, stereotypePtr.value);
    return StereotypeImplicitReference.create(ownerReference, value);
  };

  resolveTag = (tagPtr: V1_TagPtr): TagImplicitReference => {
    assertNonEmptyString(
      tagPtr.profile,
      `Tag pointer 'profile' field is missing or empty`,
    );
    assertNonEmptyString(
      tagPtr.value,
      `Tag pointer 'value' field is missing or empty`,
    );
    const ownerReference = this.resolveProfile(tagPtr.profile);
    const value = getTag(ownerReference.value, tagPtr.value);
    return TagImplicitReference.create(ownerReference, value);
  };

  resolveGenericType = (path: string): GenericTypeImplicitReference => {
    const ownerReference = this.resolveType(path);
    const value = new GenericType(ownerReference.value);
    return GenericTypeImplicitReference.create(ownerReference, value);
  };

  resolveGenericTypeFromProtocol = (genericType: V1_GenericType): GenericTypeReference => {
    const ownerReference = this.resolveType(V1_getGenericTypeFullPath(genericType));
    const typeArguments = genericType.typeArguments.map((g) => this.resolveGenericTypeFromProtocol(g));
    const value = newGenericType(ownerReference.value, typeArguments);
    return GenericTypeImplicitReference.create(ownerReference, value);
  };

  resolveOwnProperty = (
    pointer: V1_PropertyPointer,
  ): PropertyImplicitReference => {
    assertNonEmptyString(
      pointer.class,
      `Property pointer 'class' field is missing or empty`,
    );
    assertNonEmptyString(
      pointer.property,
      `Property pointer 'property' field is missing or empty`,
    );
    const ownerReference = this.resolvePropertyOwner(pointer.class);
    const value = getOwnProperty(ownerReference.value, pointer.property);
    return PropertyImplicitReference.create(ownerReference, value);
  };

  resolveProperty = (
    pointer: V1_PropertyPointer,
  ): PropertyImplicitReference => {
    assertNonEmptyString(
      pointer.class,
      `Property pointer 'class' field is missing or empty`,
    );
    assertNonEmptyString(
      pointer.property,
      `Property pointer 'property' field is missing or empty`,
    );
    const ownerReference = this.resolveClass(pointer.class);
    const value = getClassProperty(ownerReference.value, pointer.property);
    return PropertyImplicitReference.create(ownerReference, value);
  };

  resolveRootFlatDataRecordType = (
    classMapping: V1_RootFlatDataClassMapping,
  ): RootFlatDataRecordTypeImplicitReference => {
    assertNonEmptyString(
      classMapping.flatData,
      `Flat-data class mapping 'flatData' field is missing or empty`,
    );
    assertNonEmptyString(
      classMapping.sectionName,
      `Flat-data class mapping 'sectionName' field is missing or empty`,
    );
    const ownerReference = this.resolveFlatDataStore(classMapping.flatData);
    const value = getRootRecordType(
      getSection(ownerReference.value, classMapping.sectionName),
    );
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
      `Table pointer 'database' field is missing or empty`,
    );
    assertNonEmptyString(
      tablePtr.schema,
      `Table pointer 'schema' field is missing or empty`,
    );
    assertNonEmptyString(
      tablePtr.table,
      `Table pointer 'table' field is missing or empty`,
    );
    const ownerReference = this.resolveDatabase(tablePtr.database);
    const value = V1_getRelation(
      ownerReference.value,
      tablePtr.schema,
      tablePtr.table,
    );
    return createImplicitRelationReference(ownerReference, value);
  };

  resolveJoin = (joinPtr: V1_JoinPointer): JoinImplicitReference => {
    assertNonEmptyString(
      joinPtr.db,
      `Join pointer 'db' field is missing or empty`,
    );
    assertNonEmptyString(
      joinPtr.name,
      `Join pointer 'name' field is missing or empty`,
    );
    const ownerReference = this.resolveDatabase(joinPtr.db);
    const value = getJoin(ownerReference.value, joinPtr.name);
    return JoinImplicitReference.create(ownerReference, value);
  };

  resolveFilter = (filterPtr: V1_FilterPointer): FilterImplicitReference => {
    assertNonEmptyString(
      filterPtr.db,
      `Filter pointer 'db' field is missing or empty`,
    );
    assertNonEmptyString(
      filterPtr.name,
      `Filter pointer 'name' field is missing or empty`,
    );
    const ownerReference = this.resolveDatabase(filterPtr.db);
    const value = getFilter(ownerReference.value, filterPtr.name);
    return FilterImplicitReference.create(ownerReference, value);
  };

  resolveEnumValue = (
    enumeration: string,
    enumValue: string,
  ): EnumValueImplicitReference => {
    const ownerReference = this.resolveEnumeration(enumeration);
    const value = getEnumValue(ownerReference.value, enumValue);
    return EnumValueImplicitReference.create(ownerReference, value);
  };

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
  resolvePropertyOwner = (
    path: string,
  ): PackageableElementImplicitReference<PropertyOwner> =>
    this.createImplicitPackageableElementReference(
      path,
      this.graph.getPropertyOwner,
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
  resolveDataElement = (
    path: string,
  ): PackageableElementImplicitReference<DataElement> =>
    this.createImplicitPackageableElementReference(
      path,
      this.graph.getDataElement,
    );
}

export class V1_GraphBuilderContextBuilder {
  readonly logService: LogService;
  /**
   * The (sub) graph where the current processing is taking place.
   * This information is important because each sub-graph holds their
   * own indexes for elements they are responsible for.
   *
   * e.g. dependency graph, generation graph, system graph, etc.
   */
  readonly currentSubGraph: BasicModel;
  readonly extensions: V1_GraphBuilderExtensions;
  readonly graph: PureModel;

  sectionImports: Package[] = [];
  section?: Section | undefined;
  options?: GraphBuilderOptions | undefined;

  constructor(
    graph: PureModel,
    currentSubGraph: BasicModel,
    extensions: V1_GraphBuilderExtensions,
    logService: LogService,
    options?: GraphBuilderOptions,
  ) {
    this.graph = graph;
    this.currentSubGraph = currentSubGraph;
    this.extensions = extensions;
    this.logService = logService;
    this.options = options;
  }

  withElement(element: V1_PackageableElement): V1_GraphBuilderContextBuilder {
    const section = this.graph.getOwnNullableSection(element.path);
    return this.withSection(section);
  }

  withSection(section: Section | undefined): V1_GraphBuilderContextBuilder {
    this.section = section;
    if (section instanceof ImportAwareCodeSection) {
      this.sectionImports = this.sectionImports.concat(
        section.imports.map((i) => i.value),
      );
    }
    this.sectionImports = uniq(this.sectionImports); // remove duplicates
    return this;
  }

  build(): V1_GraphBuilderContext {
    return new V1_GraphBuilderContext(this);
  }
}
