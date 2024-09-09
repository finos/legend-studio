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

import type { PureModel } from '../PureModel.js';
import { Class } from '../metamodel/pure/packageableElements/domain/Class.js';
import {
  CORE_PURE_PATH,
  ELEMENT_PATH_DELIMITER,
  RESERVERD_PACKAGE_NAMES,
  MILESTONING_STEREOTYPE,
  PRIMITIVE_TYPE,
  MULTIPLICITY_INFINITE,
  PURE_DEPRECATED_STEREOTYPE,
  ROOT_PACKAGE_NAME,
  MILESTONING_VERSION_PROPERTY_SUFFIX,
  FUNCTION_SIGNATURE_MULTIPLICITY_INFINITE_TOKEN,
  PURE_DOC_TAG,
} from '../MetaModelConst.js';
import { Package } from '../metamodel/pure/packageableElements/domain/Package.js';
import type { PackageableElement } from '../metamodel/pure/packageableElements/PackageableElement.js';
import {
  type Clazz,
  AssertionError,
  assertNonEmptyString,
  assertTrue,
  guaranteeNonNullable,
  guaranteeType,
  uniqBy,
  UnsupportedOperationError,
  returnUndefOnError,
  filterByType,
} from '@finos/legend-shared';
import { createPath } from '../MetaModelUtils.js';
import type { BasicModel } from '../BasicModel.js';
import type { Profile } from '../metamodel/pure/packageableElements/domain/Profile.js';
import type { Tag } from '../metamodel/pure/packageableElements/domain/Tag.js';
import type { Stereotype } from '../metamodel/pure/packageableElements/domain/Stereotype.js';
import type { Type } from '../metamodel/pure/packageableElements/domain/Type.js';
import {
  Measure,
  Unit,
} from '../metamodel/pure/packageableElements/domain/Measure.js';
import { Enumeration } from '../metamodel/pure/packageableElements/domain/Enumeration.js';
import { PrimitiveType } from '../metamodel/pure/packageableElements/domain/PrimitiveType.js';
import { Property } from '../metamodel/pure/packageableElements/domain/Property.js';
import type { Association } from '../metamodel/pure/packageableElements/domain/Association.js';
import type {
  AbstractProperty,
  PropertyOwner,
} from '../metamodel/pure/packageableElements/domain/AbstractProperty.js';
import { DerivedProperty } from '../metamodel/pure/packageableElements/domain/DerivedProperty.js';
import type { Enum } from '../metamodel/pure/packageableElements/domain/Enum.js';
import type { Constraint } from '../metamodel/pure/packageableElements/domain/Constraint.js';
import type { GenericType } from '../metamodel/pure/packageableElements/domain/GenericType.js';
import { Multiplicity } from '../metamodel/pure/packageableElements/domain/Multiplicity.js';
import type { AnnotatedElement } from '../metamodel/pure/packageableElements/domain/AnnotatedElement.js';
import type { ConcreteFunctionDefinition } from '../metamodel/pure/packageableElements/function/ConcreteFunctionDefinition.js';
import { extractDependencyGACoordinateFromRootPackageName } from '../DependencyManager.js';

export const addElementToPackage = (
  parent: Package,
  element: PackageableElement,
): void => {
  // To improve performance we won't do duplication check here
  parent.children.push(element);
  element.package = parent;
};

export const deleteElementFromPackage = (
  parent: Package,
  packageableElement: PackageableElement,
): void => {
  parent.children = parent.children.filter(
    (child) => child !== packageableElement,
  );
};

export const getDescendantsOfPackage = (
  parent: Package,
): Set<PackageableElement> => {
  const descendants: Set<PackageableElement> = new Set<PackageableElement>();
  parent.children.forEach((c) => {
    if (c instanceof Package) {
      getDescendantsOfPackage(c).forEach((e) => descendants.add(e));
    } else {
      descendants.add(c);
    }
  });
  return descendants;
};

export const getAllDescendantsOfPackage = (
  parent: Package,
  graph: PureModel,
): Set<PackageableElement> =>
  new Set(
    graph
      .getPackages(parent.path)
      .map((p) => [...getDescendantsOfPackage(p)])
      .flat(),
  );

export const elementBelongsToPackage = (
  element: PackageableElement,
  parent: Package,
): boolean => {
  const elementPackage = element instanceof Package ? element : element.package;
  if (!elementPackage) {
    return false;
  }
  const elementPackagePath = elementPackage.path;
  const parentPackage = parent.path;
  return (elementPackagePath + ELEMENT_PATH_DELIMITER).startsWith(
    parentPackage + ELEMENT_PATH_DELIMITER,
  );
};

export const getElementRootPackage = (element: PackageableElement): Package =>
  !element.package
    ? guaranteeType(element, Package)
    : getElementRootPackage(element.package);

/**
 * If package name is a path, continue to recursively
 * traverse the package chain to find the leaf package
 *
 * NOTE: if we do not allow create new packages, errorcould be
 * thrown if a package with the specified path is not found
 */
const _getOrCreatePackage = (
  parentPackage: Package,
  relativePackagePath: string,
  createNewPackageIfNotFound: boolean,
  cache: Map<string, Package> | undefined,
): Package => {
  const index = relativePackagePath.indexOf(ELEMENT_PATH_DELIMITER);
  const packageName =
    index === -1
      ? relativePackagePath
      : relativePackagePath.substring(0, index);

  // try to resolve when there is a cache miss
  let pkg: Package | undefined;
  pkg = parentPackage.children.find(
    (child: PackageableElement): child is Package =>
      child instanceof Package && child.name === packageName,
  );
  if (!pkg) {
    if (!createNewPackageIfNotFound) {
      throw new AssertionError(
        `Can't find child package '${packageName}' in package '${parentPackage.path}'`,
      );
    }
    // create the node if it is not in parent package
    assertTrue(
      !RESERVERD_PACKAGE_NAMES.includes(packageName),
      `Can't create package with reserved name '${packageName}'`,
    );
    pkg = new Package(packageName);
    pkg.package = parentPackage;
    // NOTE: here we directly push the element to the children array without any checks rather than use `addUniqueEntry` to improve performance.
    // Duplication checks should be handled separately for speed
    parentPackage.children.push(pkg);
  }

  // populate cache after resolving the package
  if (cache) {
    cache.set(createPath(parentPackage.path, packageName), pkg);
  }

  // traverse the package chain
  if (index !== -1) {
    return _getOrCreatePackage(
      pkg,
      relativePackagePath.substring(index + ELEMENT_PATH_DELIMITER.length),
      createNewPackageIfNotFound,
      cache,
    );
  }

  return pkg;
};

export const getOrCreatePackage = (
  parentPackage: Package,
  relativePackagePath: string,
  createNewPackageIfNotFound: boolean,
  cache: Map<string, Package> | undefined,
): Package => {
  // check cache to find the shortest chain of packages to find/build
  if (cache) {
    // short-circuit
    const cachedPackage = cache.get(
      createPath(parentPackage.path, relativePackagePath),
    );
    if (cachedPackage) {
      return cachedPackage;
    }

    // NOTE: to check the cache, we need to traverse from the full package path
    // up its ancestor chain till we find a cache hit
    let immediateParentPackageRelativePath = relativePackagePath;
    while (immediateParentPackageRelativePath !== '') {
      const fullPath = createPath(
        parentPackage.path,
        immediateParentPackageRelativePath,
      );
      const cachedParentPackage = cache.get(fullPath);
      if (cachedParentPackage) {
        return _getOrCreatePackage(
          cachedParentPackage,
          relativePackagePath.substring(
            immediateParentPackageRelativePath.length +
              ELEMENT_PATH_DELIMITER.length,
            relativePackagePath.length,
          ),
          createNewPackageIfNotFound,
          cache,
        );
      }
      const index = immediateParentPackageRelativePath.lastIndexOf(
        ELEMENT_PATH_DELIMITER,
      );
      immediateParentPackageRelativePath =
        index !== -1
          ? immediateParentPackageRelativePath.substring(0, index)
          : '';
    }
  }

  return _getOrCreatePackage(
    parentPackage,
    relativePackagePath,
    createNewPackageIfNotFound,
    cache,
  );
};

export const getOrCreateGraphPackage = (
  graph: BasicModel,
  packagePath: string | undefined,
  cache: Map<string, Package> | undefined,
): Package => {
  assertNonEmptyString(packagePath, 'Package path is required');
  return getOrCreatePackage(graph.root, packagePath, true, cache);
};

export const getRawGenericType = <T extends Type>(
  genericType: GenericType,
  clazz: Clazz<T>,
): T => guaranteeType<T>(genericType.rawType, clazz);

export const isMainGraphElement = (
  element: PackageableElement,
): element is PackageableElement =>
  returnUndefOnError(() => getElementRootPackage(element))?.name ===
  ROOT_PACKAGE_NAME.MAIN;

export const isElementReadOnly = (element: PackageableElement): boolean =>
  !isMainGraphElement(element);

export const isDependencyElement = (
  element: PackageableElement,
): element is PackageableElement => {
  const rootPackage = returnUndefOnError(() => getElementRootPackage(element));
  return (
    rootPackage?.name === ROOT_PACKAGE_NAME.PROJECT_DEPENDENCY_ROOT ||
    (rootPackage !== undefined &&
      Boolean(
        extractDependencyGACoordinateFromRootPackageName(rootPackage.name),
      ))
  );
};

export const isGeneratedElement = (
  element: PackageableElement,
): element is PackageableElement =>
  returnUndefOnError(() => getElementRootPackage(element))?.name ===
  ROOT_PACKAGE_NAME.MODEL_GENERATION;

export const isSystemElement = (
  element: PackageableElement,
): element is PackageableElement => {
  const elementRootPackageName = returnUndefOnError(() =>
    getElementRootPackage(element),
  )?.name;
  return (
    element instanceof PrimitiveType ||
    elementRootPackageName === ROOT_PACKAGE_NAME.SYSTEM ||
    elementRootPackageName === ROOT_PACKAGE_NAME.CORE
  );
};

/**
 * Extract the type of temporal milestone the class is associated with (using stereotype).
 *
 * Whatever the type, it means the class is milestoned, which means:
 * 1. properties of this type will now be considered milestoned, and will be automatically
 *    converted into a derived property which accept some temporal parameters (depending
 *    on the milestoning type)
 * 2. when we query properties of this type, we can provide the values for these parameters
 */
export const getMilestoneTemporalStereotype = (
  val: Class,
  graph: PureModel,
): MILESTONING_STEREOTYPE | undefined => {
  const milestonedProfile = graph.getProfile(CORE_PURE_PATH.PROFILE_TEMPORAL);
  let stereotype;
  const profile = val.stereotypes.find(
    (st) => st.ownerReference.value === milestonedProfile,
  );
  stereotype = Object.values(MILESTONING_STEREOTYPE).find(
    (value) => value === profile?.value.value,
  );
  if (stereotype !== undefined) {
    return stereotype;
  }
  val.generalizations.forEach((generalization) => {
    const superType = generalization.value.rawType;
    if (superType instanceof Class) {
      const milestonedStereotype = getMilestoneTemporalStereotype(
        superType,
        graph,
      );
      if (milestonedStereotype !== undefined) {
        stereotype = Object.values(MILESTONING_STEREOTYPE).find(
          (value) => value === milestonedStereotype,
        );
      }
    }
  });
  return stereotype;
};

export const getTag = (profile: Profile, value: string): Tag =>
  guaranteeNonNullable(
    profile.p_tags.find((tag) => tag.value === value),
    `Can't find tag '${value}' in profile '${profile.path}'`,
  );

export const getStereotype = (profile: Profile, value: string): Stereotype =>
  guaranteeNonNullable(
    profile.p_stereotypes.find((stereotype) => stereotype.value === value),
    `Can't find stereotype '${value}' in profile '${profile.path}'`,
  );

export const getEnumValueNames = (enumeration: Enumeration): string[] =>
  enumeration.values.map((value) => value.name).filter(Boolean);

export const getEnumValue = (enumeration: Enumeration, name: string): Enum =>
  guaranteeNonNullable(
    enumeration.values.find((value) => value.name === name),
    `Can't find enum value '${name}' in enumeration '${enumeration.path}'`,
  );

export const getFirstAssociatedProperty = (
  association: Association,
): Property => guaranteeNonNullable(association.properties[0]);

export const getSecondAssociatedProperty = (
  association: Association,
): Property => guaranteeNonNullable(association.properties[1]);

export const getOtherAssociatedProperty = (
  association: Association,
  property: Property,
): Property => {
  const idx = association.properties.findIndex((p) => p === property);
  assertTrue(
    idx !== -1,
    `Can't find property '${property.name}' in association '${association.path}'`,
  );
  return guaranteeNonNullable(association.properties[(idx + 1) % 2]);
};

export const getAssociatedPropertyClass = (
  association: Association,
  property: AbstractProperty,
): Class => {
  if (property instanceof Property) {
    return guaranteeType(
      getOtherAssociatedProperty(association, property).genericType
        .ownerReference.value,
      Class,
      `Association property '${property.name}' must be of type 'class'`,
    );
  } else if (property instanceof DerivedProperty) {
    throw new UnsupportedOperationError(
      `Derived property is not currently supported in association`,
    );
  }
  throw new UnsupportedOperationError(
    `Can't get associated class of property`,
    property,
  );
};

/**
 * Get all superclasses of a class, accounted for loop and duplication (which should be caught by compiler)
 * NOTE: we intentionally leave out `Any`
 */
export const getAllSuperclasses = (c: Class): Class[] => {
  const visitedClasses = new Set<Class>();
  visitedClasses.add(c);
  const resolveSuperTypes = (_class: Class): void => {
    _class.generalizations.forEach((gen) => {
      const superType = getRawGenericType(gen.value, Class);
      if (!visitedClasses.has(superType)) {
        visitedClasses.add(superType);
        resolveSuperTypes(superType);
      }
    });
  };
  resolveSuperTypes(c);
  visitedClasses.delete(c);
  return Array.from(visitedClasses);
};

/**
 * Get all subclasses of a class, accounted for loop and duplication (which should be caught by compiler)
 * NOTE: we intentionally leave out `Any`
 */
export const getAllSubclasses = (c: Class): Class[] => {
  const visitedClasses = new Set<Class>();
  visitedClasses.add(c);
  const resolveSubclasses = (_class: Class): void => {
    _class._subclasses.forEach((subclass) => {
      if (!visitedClasses.has(subclass)) {
        visitedClasses.add(subclass);
        resolveSubclasses(subclass);
      }
    });
  };
  resolveSubclasses(c);
  visitedClasses.delete(c);
  return Array.from(visitedClasses);
};

export const getMilestoningGeneratedProperties = (_class: Class): Property[] =>
  _class._generatedMilestonedProperties.filter(filterByType(Property));

/**
 * Get class and its supertypes' properties recursively, duplications and loops are handled (Which should be caught by compiler)
 */
export const getAllClassProperties = (
  _class: Class,
  includeGeneratedMilestoning?: boolean | undefined,
): Property[] =>
  uniqBy(
    getAllSuperclasses(_class)
      .concat(_class)
      .map((c) => c.propertiesFromAssociations.concat(c.properties))
      .flat()
      .concat(
        includeGeneratedMilestoning
          ? getMilestoningGeneratedProperties(_class)
          : [],
      ),
    (property) => property.name,
  );

export const getAllClassDerivedProperties = (
  _class: Class,
): DerivedProperty[] =>
  uniqBy(
    getAllSuperclasses(_class)
      .concat(_class)
      .map((c) => c.derivedProperties)
      .flat(),
    (property) => property.name,
  );

export const getClassProperty = (_class: Class, name: string): Property =>
  guaranteeNonNullable(
    getAllClassProperties(_class, true).find(
      (property) => property.name === name,
    ),
    `Can't find property '${name}' in class '${_class.path}'`,
  );

export const getAllOwnClassProperties = (_class: Class): AbstractProperty[] =>
  _class.properties
    .concat(_class.propertiesFromAssociations)
    .concat(_class.derivedProperties);

export const getOwnClassProperty = (
  _class: Class,
  name: string,
): AbstractProperty =>
  guaranteeNonNullable(
    getAllOwnClassProperties(_class).find((property) => property.name === name),
    `Can't find property '${name}' in class '${_class.path}'`,
  );

export const getAllClassConstraints = (_class: Class): Constraint[] =>
  // Perhaps we don't need to care about deduping constraints here like for properties
  getAllSuperclasses(_class)
    .concat(_class)
    .map((c) => c.constraints)
    .flat();

export const getOwnProperty = (
  propertyOwner: PropertyOwner,
  name: string,
): AbstractProperty =>
  guaranteeNonNullable(
    propertyOwner instanceof Class
      ? getAllOwnClassProperties(propertyOwner).find(
          (property) => property.name === name,
        )
      : propertyOwner.properties.find((property) => property.name === name),
    `Can't find property '${name}' of '${propertyOwner.path}'`,
  );

/**
 * Check if the first type subtype of the second type
 *
 * NOTE: Use this for contravariant and covariant check
 * See https://www.originate.com/cheat-codes-for-contravariance-and-covariance
 * See https://en.wikipedia.org/wiki/Covariance_and_contravariance_of_vectors
 */
export const isSubType = (type1: Type, type2: Type): boolean => {
  if (type1 === type2) {
    return true;
  }
  if (type1 instanceof Unit) {
    return type1.measure === type2;
  } else if (type1 instanceof Measure) {
    return false;
  } else if (type1 instanceof Enumeration) {
    return false;
  } else if (type1 instanceof PrimitiveType) {
    if (!(type2 instanceof PrimitiveType)) {
      return false;
    }
    if (type2.name === PRIMITIVE_TYPE.NUMBER) {
      return (
        type1.name === PRIMITIVE_TYPE.INTEGER ||
        type1.name === PRIMITIVE_TYPE.FLOAT ||
        type1.name === PRIMITIVE_TYPE.DECIMAL
      );
    }
    if (type2.name === PRIMITIVE_TYPE.DATE) {
      return (
        type1.name === PRIMITIVE_TYPE.STRICTDATE ||
        type1.name === PRIMITIVE_TYPE.DATETIME ||
        type1.name === PRIMITIVE_TYPE.LATESTDATE
      );
    }
  } else if (type1 instanceof Class) {
    return (
      type1.path === CORE_PURE_PATH.ANY ||
      (type2 instanceof Class && getAllSuperclasses(type2).includes(type1))
    );
  }
  return false;
};

/**
 * Check if the first type supertype of the second type
 *
 * NOTE: Use this for contravariant and covariant check
 * See https://www.originate.com/cheat-codes-for-contravariance-and-covariance
 * See https://en.wikipedia.org/wiki/Covariance_and_contravariance_of_vectors
 */
export const isSuperType = (type1: Type, type2: Type): boolean => {
  if (type1 === type2) {
    return true;
  }
  if (type1 instanceof Unit) {
    return false;
  } else if (type1 instanceof Measure) {
    return type2 instanceof Unit && type2.measure === type1;
  } else if (type1 instanceof Enumeration) {
    return false;
  } else if (type1 instanceof PrimitiveType) {
    if (!(type2 instanceof PrimitiveType)) {
      return false;
    }
    if (type1.name === PRIMITIVE_TYPE.NUMBER) {
      return (
        type2.name === PRIMITIVE_TYPE.INTEGER ||
        type2.name === PRIMITIVE_TYPE.FLOAT ||
        type2.name === PRIMITIVE_TYPE.DECIMAL
      );
    }
    if (type1.name === PRIMITIVE_TYPE.DATE) {
      return (
        type2.name === PRIMITIVE_TYPE.STRICTDATE ||
        type2.name === PRIMITIVE_TYPE.DATETIME ||
        type2.name === PRIMITIVE_TYPE.LATESTDATE
      );
    }
  } else if (type1 instanceof Class) {
    return (
      type2.path === CORE_PURE_PATH.ANY ||
      (type2 instanceof Class && getAllSubclasses(type2).includes(type1))
    );
  }
  return false;
};

export const getMultiplicityDescription = (
  multiplicity: Multiplicity,
): string => {
  if (multiplicity.lowerBound === multiplicity.upperBound) {
    return `[${multiplicity.lowerBound.toString()}] - Must have exactly ${multiplicity.lowerBound.toString()} value(s)`;
  } else if (
    multiplicity.lowerBound === 0 &&
    multiplicity.upperBound === undefined
  ) {
    return `[${MULTIPLICITY_INFINITE}] - May have many values`;
  }
  return `[${multiplicity.lowerBound}..${
    multiplicity.upperBound ?? MULTIPLICITY_INFINITE
  }] - ${
    multiplicity.upperBound
      ? `Must have from ${multiplicity.lowerBound} to ${multiplicity.upperBound} value(s)`
      : `Must have at least ${multiplicity.lowerBound} values(s)`
  }`;
};

export const getMultiplicityPrettyDescription = (
  multiplicity: Multiplicity,
): string => {
  if (multiplicity === Multiplicity.ONE) {
    return `[${multiplicity.lowerBound.toString()}] - Required`;
  } else if (multiplicity === Multiplicity.ZERO_MANY) {
    return `[${MULTIPLICITY_INFINITE}] - List`;
  } else if (multiplicity === Multiplicity.ZERO_ONE) {
    return `[${multiplicity.lowerBound}..${
      multiplicity.upperBound ?? MULTIPLICITY_INFINITE
    }] - Optional`;
  }
  return `[${multiplicity.lowerBound}..${
    multiplicity.upperBound ?? MULTIPLICITY_INFINITE
  }] - ${
    multiplicity.upperBound
      ? `Must have from ${multiplicity.lowerBound} to ${multiplicity.upperBound} value(s)`
      : `Must have at least ${multiplicity.lowerBound} values(s)`
  }`;
};

export const areMultiplicitiesEqual = (
  mul1: Multiplicity,
  mul2: Multiplicity,
): boolean =>
  mul1.upperBound === mul2.upperBound && mul1.lowerBound === mul2.lowerBound;

export const isElementDeprecated = (
  element: AnnotatedElement | Class,
  graph: PureModel,
): boolean =>
  element.stereotypes.some(
    (st) =>
      st.value ===
      graph
        .getProfile(CORE_PURE_PATH.PROFILE_DOC)
        .p_stereotypes.find((s) => s.value === PURE_DEPRECATED_STEREOTYPE),
  );

export const extractAnnotatedElementDocumentation = (
  el: AnnotatedElement,
): string | undefined => {
  let result: string | undefined = undefined;
  for (const taggedValue of el.taggedValues) {
    if (
      taggedValue.tag.ownerReference.value.path ===
        CORE_PURE_PATH.PROFILE_DOC &&
      taggedValue.tag.value.value === PURE_DOC_TAG
    ) {
      result = taggedValue.value;
      break;
    }
  }
  return result;
};

/**
 *  Gets the generated milestoned properties of a property owner
 */
export const getGeneratedMilestonedPropertiesForAssociation = (
  propertyOwner: PropertyOwner,
  property: DerivedProperty,
): AbstractProperty[] =>
  propertyOwner._generatedMilestonedProperties.filter(
    (prop) =>
      prop.name !== property.name &&
      prop.name !==
        `${property.name}${MILESTONING_VERSION_PROPERTY_SUFFIX.ALL_VERSIONS}` &&
      prop.name !==
        `${property.name}${MILESTONING_VERSION_PROPERTY_SUFFIX.ALL_VERSIONS_IN_RANGE}`,
  );

const getMultiplicityString = (
  lowerBound: number,
  upperBound: number | undefined,
): string => {
  if (lowerBound === upperBound) {
    return lowerBound.toString();
  } else if (lowerBound === 0 && upperBound === undefined) {
    return FUNCTION_SIGNATURE_MULTIPLICITY_INFINITE_TOKEN;
  }
  return `$${lowerBound}_${upperBound ?? 'MANY'}$`;
};

export const getFunctionSignature = (
  func: ConcreteFunctionDefinition,
): string =>
  `_${func.parameters
    .map(
      (p) =>
        `${p.type.value.name}_${getMultiplicityString(
          p.multiplicity.lowerBound,
          p.multiplicity.upperBound,
        )}_`,
    )
    .join('_')}_${func.returnType.value.name}_${getMultiplicityString(
    func.returnMultiplicity.lowerBound,
    func.returnMultiplicity.upperBound,
  )}_`;

export const getFunctionName = (
  func: ConcreteFunctionDefinition,
  name: string,
): string => name.substring(0, name.indexOf(getFunctionSignature(func)));

export const getFunctionNameWithPath = (
  func: ConcreteFunctionDefinition,
): string => func.package?.path + ELEMENT_PATH_DELIMITER + func.functionName;

const _classHasCycle = (
  _class: Class,
  __classesIndex: Set<string>,
  options?: {
    traverseNonRequiredProperties?: boolean | undefined;
    excludedPaths?: Map<string, string[]> | undefined;
  },
): boolean => {
  if (__classesIndex.has(_class.path)) {
    return true;
  }
  const excludedProperties = options?.excludedPaths?.get(_class.path) ?? [];
  const properties = options?.traverseNonRequiredProperties
    ? getAllClassProperties(_class)
    : getAllClassProperties(_class).filter(
        (property) => property.multiplicity.lowerBound,
      );
  const complexPropertyTypes = properties
    .filter((property) => !excludedProperties.includes(property.name))
    .map((property) => property.genericType.value.rawType)
    .filter(filterByType(Class));
  if (complexPropertyTypes.length > 0) {
    // we only count classes with complex properties in the cycle
    __classesIndex.add(_class.path);
  }
  // we only check unique complex property classes; 2 same property classes on the same level do not count as a cycle
  return Boolean(
    Array.from(new Set(complexPropertyTypes)).find((type) =>
      _classHasCycle(type, __classesIndex, options),
    ),
  );
};

export const classHasCycle = (
  _class: Class,
  options?: {
    traverseNonRequiredProperties?: boolean | undefined;
    excludedPaths?: Map<string, string[]> | undefined;
  },
): boolean => _classHasCycle(_class, new Set<string>(), options);

export const getElementOrigin = (
  element: PackageableElement,
  graph: PureModel,
): string => {
  if (isSystemElement(element)) {
    return 'system elements';
  } else if (isGeneratedElement(element)) {
    return 'generation elements';
  } else if (isDependencyElement(element)) {
    const name = graph.dependencyManager.getElementOrigin(element);
    if (name) {
      return `project dependency ${name}`;
    }
  }
  return '';
};
