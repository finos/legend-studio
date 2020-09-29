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

export const SOURCE_INFORMATION_KEY = 'sourceInformation';
export const MULTIPLICITY_INFINITE = '*';
export const ENTITY_PATH_DELIMITER = '::';
export const LAMBDA_START = '|';
export const DEFAULT_SOURCE_PARAMETER_NAME = 'src';

export enum SOURCR_ID_LABEL {
  CONSTRAINT = 'constraint',
  DERIVED_PROPERTY = 'derivedProperty',
  ENUMERATION_MAPPING = 'enumerationMapping',
  OPERATION_CLASS_MAPPING = 'operationClassMapping',
  PURE_INSTANCE_CLASS_MAPPING = 'pureInstanceClassMapping'
}

export enum CLIENT_VERSION {
  V1_0_0 = 'v1_0_0',
  VX_X_X = 'vX_X_X',
}

export enum ROOT_PACKAGE_NAME {
  CORE = 'CORE',
  MAIN = 'ROOT',
  MODEL_GENERATION = 'MODEL_GENERATION_ROOT',
  SYSTEM = 'SYSTEM_ROOT',
  PROJECT_DEPENDENCY_ROOT = 'PROJECT_DEPENDENCY_ROOT',
  LEGAL = 'LEGAL_ROOT', // TODO: remove when we remove demo mode support
}

// Pure model connection does not use an actual store so this is just a dummy value
export const MODEL_STORE_NAME = 'ModelStore';

export enum PRIMITIVE_TYPE {
  STRING = 'String',
  BOOLEAN = 'Boolean',
  BINARY = 'Binary',
  NUMBER = 'Number', // `Number` is the supper type of all other numeric types
  INTEGER = 'Integer',
  FLOAT = 'Float',
  DECIMAL = 'Decimal',
  DATE = 'Date', // `Date` is the supper type of all other temporal types
  STRICTDATE = 'StrictDate', // just date, without time
  DATETIME = 'DateTime',
  // NOTE: `LatestDate` is a special type that is used for milestoning in store so its used in the body of function and lamdba but never should be exposed to users
  // as such, if there is a day we want to have `LatestDate` in the graph but not exposed to the users
  LATESTDATE = 'LatestDate',
}

export enum TYPICAL_MULTIPLICITY_TYPE {
  ONE = 'one',
  ZEROONE = 'zeroone',
  ZEROMANY = 'zeromany',
  ONEMANY = 'onemany',
  ZERO = 'zero',
}

// NOTE: the list of auto-import are kept in m3.pure, this includes a more extensive list of packges
// which contain native functions, classes, etc.
export const AUTO_IMPORTS = [
  // 'meta::pure::metamodel',
  'meta::pure::metamodel::type',
  // 'meta::pure::metamodel::type::generics',
  // 'meta::pure::metamodel::relationship',
  // 'meta::pure::metamodel::valuespecification',
  // 'meta::pure::metamodel::multiplicity',
  // 'meta::pure::metamodel::function',
  // 'meta::pure::metamodel::function::property',
  // 'meta::pure::metamodel::extension',
  // 'meta::pure::metamodel::import',
  // 'meta::pure::functions::date',
  // 'meta::pure::functions::string',
  // 'meta::pure::functions::collection',
  // 'meta::pure::functions::meta',
  // 'meta::pure::functions::constraints',
  // 'meta::pure::functions::lang',
  // 'meta::pure::functions::boolean',
  // 'meta::pure::functions::tools',
  // 'meta::pure::functions::io',
  // 'meta::pure::functions::math',
  // 'meta::pure::functions::asserts',
  // 'meta::pure::functions::test',
  // 'meta::pure::functions::multiplicity',
  // 'meta::pure::router',
  // 'meta::pure::service',
  // 'meta::pure::tds',
  // 'meta::pure::tools',
  'meta::pure::profiles',
];

export enum PATH {
  ANY = 'meta::pure::metamodel::type::Any',
  // NOTE: we could have moved most of the paths from protocol classifier path here if it's not for the fact that
  // Typescript does not allow to use computed value for enum.
  // See https://github.com/microsoft/TypeScript/issues/27976
}

// TODO?: We should refactor this once we're refactoring this to a visitor
/* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
export enum PROTOCOL_CLASSIFIER_PATH {
  PROFILE = 'meta::pure::metamodel::extension::Profile',
  ENUMERATION = 'meta::pure::metamodel::type::Enumeration',
  MEASURE = 'meta::pure::metamodel::type::Measure',
  // since we don't expose unit outside of measure, we probably don't need to reveal it
  CLASS = 'meta::pure::metamodel::type::Class',
  ASSOCIATION = 'meta::pure::metamodel::relationship::Association',
  FUNCTION = 'meta::pure::metamodel::function::ConcreteFunctionDefinition',
  MAPPING = 'meta::pure::mapping::Mapping',
  DIAGRAM = 'meta::pure::metamodel::diagram::Diagram',
  TEXT = 'meta::pure::metamodel::text::Text',
  CONNECTION = 'meta::pure::runtime::PackageableConnection',
  RUNTIME = 'meta::pure::runtime::PackageableRuntime',
  FILE_GENERATION = 'meta::pure::generation::metamodel::GenerationConfiguration',
  GENERATION_SPECIFICATION = 'meta::pure::generation::metamodel::GenerationSpecification',
  SECTION_INDEX = 'meta::pure::metamodel::section::SectionIndex',
}

/**
 * The main point of maintaining this enum is to keep lessen magic string in hash computation
 * so that we are less error-prone in the process of defining hash.
 *
 * These tokens will be used in the definition of the hash as marker for the type of the strucure
 * arguably some of these can be redundant since this information is encoded in the resulting hash
 * code anyway, but sometimes when polymorphism manifests, such as when we have an array of structure
 * which are sub-classes of an abstract stucture, hashing the marker is sometimes the only way to
 * discern between instances of different sub-structures
 */
export enum HASH_STRUCTURE {
  PACKAGE = 'PACKAGE',
  PACKAGEABLE_ELEMENT = 'PACKAGEABLE_ELEMENT',
  PACKAGEABLE_ELEMENT_POINTER = 'PACKAGEABLE_ELEMENT_POINTER',
  // domain
  PROFILE = 'PROFILE',
  TAG_POINTER = 'TAG_POINTER',
  STEREOTYPE_POINTER = 'STEREOTYPE_POINTER',
  TAGGED_VALUE = 'TAGGED_VALUE',
  ENUMERATION = 'ENUMERATION',
  ENUM_VALUE = 'ENUM_VALUE',
  CLASS = 'CLASS',
  PROPERTY = 'PROPERTY',
  PROPERTY_POINTER = 'PROPERTY_POINTER',
  MULTIPLICITY = 'MULTIPLICITY',
  CONSTRAINT = 'CONSTRAINT',
  DERIVED_PROPERTY = 'DERIVED_PROPERTY',
  ASSOCIATION = 'ASSOCIATION',
  FUNCTION = 'FUNCTION',
  MEASURE = 'MEASURE',
  UNIT = 'UNIT',
  // runtime
  RUNTIME = 'RUNTIME',
  PACKAGEABLE_RUNTIME = 'PACKAGEABLE_RUNTIME',
  ENGINE_RUNTIME = 'ENGINE_RUNTIME',
  LEGACY_RUNTIME = 'LEGACY_RUNTIME',
  RUNTIME_POINTER = 'RUNTIME_POINTER',
  STORE_CONNECTIONS = 'STORE_CONNECTIONS',
  IDENTIFIED_CONNECTION = 'IDENTIFIED_CONNECTION',
  // connection
  CONNECTION = 'CONNECTION',
  PACKAGEABLE_CONNECTION = 'PACKAGEABLE_CONNECTION',
  CONNECTION_POINTER = 'CONNECTION_POINTER',
  XML_MODEL_CONNECTION = 'XML_MODEL_CONNECTION',
  JSON_MODEL_CONNECTION = 'JSON_MODEL_CONNECTION',
  // store
  STORE = 'STORE',
  // mapping
  MAPPING = 'MAPPING',
  MAPPING_INCLUDE = 'MAPPING_INCLUDE',
  ASSOCIATION_IMPLEMENTATION = 'ASSOCIATION_IMPLEMENTATION',
  ENUMERATION_MAPPING = 'ENUMERATION_MAPPING',
  ENUM_VALUE_MAPPING = 'ENUM_VALUE_MAPPING',
  SET_IMPLEMENTATION = 'SET_IMPLEMENTATION',
  OPERATION_SET_IMPLEMENTATION = 'OPERATION_SET_IMPLEMENTATION',
  PURE_INSTANCE_SET_IMPLEMENTATION = 'PURE_INSTANCE_SET_IMPLEMENTATION',
  PROPERTY_MAPPING = 'PROPERTY_MAPPING',
  PURE_PROPERTY_MAPPING = 'PURE_PROPERTY_MAPPING',
  MAPPING_TEST = 'MAPPING_TEST',
  INPUT_DATA = 'INPUT_DATA',
  OBJECT_INPUT_DATA = 'OBJECT_INPUT_DATA',
  MAPPING_TEST_ASSERT = 'MAPPING_TEST_ASSERT',
  EXPECTED_OUTPUT_MAPPING_TEST_ASSERT = 'EXPECTED_OUTPUT_MAPPING_TEST_ASSERT',
  FILTER_MAPPING = 'FILTER_MAPPING',
  COLUMN_MAPPING = 'COLUMN_MAPPING',
  GROUP_BY_MAPPING = 'GROUP_BY_MAPPING',
  // text
  TEXT = 'TEXT',
  // diagram
  DIAGRAM = 'DIAGRAM',
  CLASS_VIEW = 'CLASS_VIEW',
  PROPERTY_VIEW = 'PROPERTY_VIEW',
  ASSOCIATION_VIEW = 'ASSOCIATION_VIEW',
  PROPERTY_HOLDER_VIEW = 'PROPERTY_HOLDER_VIEW',
  GENERALIZATION_VIEW = 'GENERALIZATION_VIEW',
  RELATIONSHIP_VIEW = 'RELATIONSHIP_VIEW',
  POINT = 'POINT',
  RECTANGLE = 'RECTANGLE',
  POSITIONED_RECTANGLE = 'POSITIONED_RECTANGLE',
  // file generation
  FILE_GENERATION = 'FILE_GENERATION',
  CONFIGURATION_PROPERTY = 'CONFIGURATION_PROPERTY',
  // value specification
  LAMBDA = 'LAMBDA',
  VARIABLE = 'VARIABLE',
  // generation specification
  GENERATION_TREE = 'GENERATION_TREE',
  GENERATION_TREE_NODE = 'GENERATION_TREE_NODE',
  // SDLC
  PROJECT_DEPENDENCY = 'PROJECT_DEPENDENCY',
  PROJECT_CONFIGURATION = 'PROJECT_CONFIGURATION',
  ARTIFACT_GENERATION = 'ARTIFACT_GENERATION',
  // SECTION INDEX
  SECTION_INDEX = 'SECTION_INDEX',
  SECTION = 'SECTION',
  IMPORT_AWARE_CODE_SECTION = 'IMPORT_AWARE_CODE_SECTION',
  DEFAULT_CODE_SECTION = 'DEFAULT_CODE_SECTION'
}
