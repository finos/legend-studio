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

export const SOURCE_INFORMATION_KEY = 'sourceInformation';
export const MULTIPLICITY_INFINITE = '*';
export const ELEMENT_PATH_DELIMITER = '::';
export const UNIT_PATH_DELIMITER = '~';
export const LAMBDA_PIPE = '|';
export const DEFAULT_SOURCE_PARAMETER_NAME = 'src';
export const DEFAULT_DATABASE_SCHEMA_NAME = 'default';
export const SECTION_INDEX_ELEMENT_PATH = '__internal__::SectionIndex';
export const VARIABLE_REFERENCE_TOKEN = '$';
export const TYPE_CAST_TOKEN = '@';
export const ARROW_FUNCTION_TOKEN = '->';

export enum ROOT_PACKAGE_NAME {
  CORE = 'CORE',
  MAIN = 'ROOT',
  MODEL_GENERATION = 'MODEL_GENERATION_ROOT',
  SYSTEM = 'SYSTEM_ROOT',
  PROJECT_DEPENDENCY_ROOT = 'PROJECT_DEPENDENCY_ROOT',
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
  STRICTTIME = 'StrictTime', // NOTE: not a sub-type of Date, this is used to measure length of time, not pointing at a particular moment in time like Date
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

export enum CORE_PURE_PATH {
  ANY = 'meta::pure::metamodel::type::Any',

  PROFILE_DOC = 'meta::pure::profiles::doc',
  PROFILE_TEMPORAL = 'meta::pure::profiles::temporal',

  // classifier paths
  PROFILE = 'meta::pure::metamodel::extension::Profile',
  ENUMERATION = 'meta::pure::metamodel::type::Enumeration',
  MEASURE = 'meta::pure::metamodel::type::Measure', // since we don't expose unit outside of measure, we probably don't need to reveal it
  CLASS = 'meta::pure::metamodel::type::Class',
  ASSOCIATION = 'meta::pure::metamodel::relationship::Association',
  FUNCTION = 'meta::pure::metamodel::function::ConcreteFunctionDefinition',
  FLAT_DATA = 'meta::flatData::metamodel::FlatData',
  DATABASE = 'meta::relational::metamodel::Database',
  MAPPING = 'meta::pure::mapping::Mapping',
  SERVICE = 'meta::legend::service::metamodel::Service',
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
 * which are subclasses of an abstract stucture, hashing the marker is sometimes the only way to
 * discern between instances of different sub-structures
 */
export enum CORE_HASH_STRUCTURE {
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
  PACKAGEABLE_CONNECTION = 'PACKAGEABLE_CONNECTION',
  CONNECTION_POINTER = 'CONNECTION_POINTER',
  XML_MODEL_CONNECTION = 'XML_MODEL_CONNECTION',
  JSON_MODEL_CONNECTION = 'JSON_MODEL_CONNECTION',
  MODEL_CHAIN_CONNECTION = 'MODEL_CHAIN_CONNECTION',
  FLAT_DATA_CONNECTION = 'FLAT_DATA_CONNECTION',
  RELATIONAL_DATABASE_CONNECTION = 'RELATIONAL_DATABASE_CONNECTION',
  // flat-data
  FLAT_DATA = 'FLAT_DATA',
  FLAT_DATA_SECTION = 'FLAT_DATA_SECTION',
  FLAT_DATA_PROPERTY = 'FLAT_DATA_PROPERTY',
  FLAT_DATA_ROOT_RECORD_TYPE = 'FLAT_DATA_ROOT_RECORD_TYPE',
  FLAT_DATA_RECORD_TYPE = 'FLAT_DATA_RECORD_TYPE',
  FLAT_DATA_RECORD_FIELD = 'FLAT_DATA_RECORD_FIELD',
  FLAT_DATA_STRING = 'FLAT_DATA_STRING',
  FLAT_DATA_BOOLEAN = 'FLAT_DATA_BOOLEAN',
  FLAT_DATA_NUMBER = 'FLAT_DATA_NUMBER',
  FLAT_DATA_INTEGER = 'FLAT_DATA_INTEGER',
  FLAT_DATA_FLOAT = 'FLAT_DATA_FLOAT',
  FLAT_DATA_DECIMAL = 'FLAT_DATA_DECIMAL',
  FLAT_DATA_DATE = 'FLAT_DATA_DATE',
  FLAT_DATA_DATE_TIME = 'FLAT_DATA_DATE_TIME',
  FLAT_DATA_STRICT_DATE = 'FLAT_DATA_STRICT_DATE',
  FLAT_DATA_INSTANCE_SET_IMPLEMENTATION = 'FLAT_DATA_INSTANCE_SET_IMPLEMENTATION',
  FLAT_DATA_PROPERTY_MAPPING = 'FLAT_DATA_PROPERTY_MAPPING',
  EMBEDDED_FLAT_DATA_PROPERTY_MAPPING = 'EMBEDDED_FLAT_DATA_PROPERTY_MAPPING',
  FLAT_DATA_SECTION_POINTER = 'FLAT_DATA_SECTION_POINTER',
  // database
  DATABASE = 'DATABASE',
  DATABASE_SCHEMA = 'DATABASE_SCHEMA',
  DATABASE_JOIN = 'DATABASE_JOIN',
  DATABASE_FILTER = 'DATABASE_FILTER',
  DATBASE_VIEW = 'DATBASE_VIEW',
  DATABASE_SCHEMA_TABLE = 'DATABASE_SCHEMA_TABLE',
  DATABASE_TABLE_COLUMN = 'DATABASE_TABLE_COLUMN',
  // relational operation element
  RELATIONAL = 'RELATIONAL',
  RELATIONAL_OPERATION_FUNCTION = 'RELATIONAL_OPERATION_FUNCTION',
  RELATIONAL_OPERATION_DYNA_FUNC = 'RELATIONAL_OPERATION_DYNA_FUNC',
  RELATIONAL_OPERATION_ELEMENTS_WITH_JOINS = 'RELATIONAL_OPERATION_ELEMENTS_WITH_JOINS',
  RELATIONAL_OPERATION_LITERAL = 'RELATIONAL_OPERATION_LITERAL',
  RELATIONAL_OPERATION_LITERAL_LIST = 'RELATIONAL_OPERATION_LITERAL_LIST',
  RELATIONAL_OPERATION_TABLE_ALIAS_COLUMN = 'RELATIONAL_OPERATION_TABLE_ALIAS_COLUMN',
  RELATIONAL_OPERATION_TABLE_POINTER = 'RELATIONAL_OPERATION_TABLE_POINTER',
  RELATIONAL_OPERATION_JOIN_POINTER = 'RELATIONAL_OPERATION_JOIN_POINTER',
  // relational data type
  RELATIONAL_DATATYPE_VARCHAR = 'RELATIONAL_DATATYPE_VARCHAR',
  RELATIONAL_DATATYPE_CHAR = 'RELATIONAL_DATATYPE_CHAR',
  RELATIONAL_DATATYPE_VARBINARY = 'RELATIONAL_DATATYPE_VARBINARY',
  RELATIONAL_DATATYPE_BINARY = 'RELATIONAL_DATATYPE_BINARY',
  RELATIONAL_DATATYPE_BIT = 'RELATIONAL_DATATYPE_BIT',
  RELATIONAL_DATATYPE_INTEGER = 'RELATIONAL_DATATYPE_INTEGER',
  RELATIONAL_DATATYPE_BIGINT = 'RELATIONAL_DATATYPE_BIGINT',
  RELATIONAL_DATATYPE_SMALLINT = 'RELATIONAL_DATATYPE_SMALLINT',
  RELATIONAL_DATATYPE_TINYINT = 'RELATIONAL_DATATYPE_TINYINT',
  RELATIONAL_DATATYPE_NUMERIC = 'RELATIONAL_DATATYPE_NUMERIC',
  RELATIONAL_DATATYPE_DECIMAL = 'RELATIONAL_DATATYPE_DECIMAL',
  RELATIONAL_DATATYPE_DOUBLE = 'RELATIONAL_DATATYPE_DOUBLE',
  RELATIONAL_DATATYPE_FLOAT = 'RELATIONAL_DATATYPE_FLOAT',
  RELATIONAL_DATATYPE_REAL = 'RELATIONAL_DATATYPE_REAL',
  RELATIONAL_DATATYPE_DATE = 'RELATIONAL_DATATYPE_DATE',
  RELATIONAL_DATATYPE_TIMESTAMP = 'RELATIONAL_DATATYPE_TIMESTAMP',
  RELATIONAL_DATATYPE_OTHER = 'RELATIONAL_DATATYPE_OTHER',
  RELATIONAL_DATATYPE_SEMISTRUCTURED = 'RELATIONAL_DATATYPE_SEMISTRUCTURED',
  // relational mapping
  ROOT_RELATIONAL_INSTANCE_SET_IMPLEMENTATION = 'ROOT_RELATIONAL_INSTANCE_SET_IMPLEMENTATION',
  RELATIONAL_INSTANCE_SET_IMPLEMENTATION = 'RELATIONAL_INSTANCE_SET_IMPLEMENTATION',
  REALTIONAL_PROPERTY_MAPPING = 'REALTIONAL_PROPERTY_MAPPING',
  EMBEDDED_REALTIONAL_PROPERTY_MAPPING = 'EMBEDDED_REALTIONAL_PROPERTY_MAPPING',
  INLINE_EMBEDDED_REALTIONAL_PROPERTY_MAPPING = 'INLINE_EMBEDDED_REALTIONAL_PROPERTY_MAPPING',
  OTHERWISE_EMBEDDED_REALTIONAL_PROPERTY_MAPPING = 'OTHERWISE_EMBEDDED_REALTIONAL_PROPERTY_MAPPING',
  // aggregation aware mapping
  AGGREGATION_AWARE_MAPPING = 'AGGREGATION_AWARE_MAPPING',
  AGGREGATION_AWARE_SPECIFICATION = 'AGGREGATION_AWARE_SPECIFICATION',
  AGGREGATION_AWARE_SET_IMPLEMENTATION_CONTAINER = 'AGGREGATION_AWARE_SET_IMPLEMENTATION_CONTAINER',
  AGGREGATE_FUNCTION = 'AGGREGATE_FUNCTION',
  GROUP_BY_FUNCTION = 'GROUP_BY_FUNCTION',
  // milestoning
  BUSINESS_MILESTONING = 'BUSINESS_MILESTONING',
  BUSINESS_SNAPSHOT_MILESTONING = 'BUSINESS_SNAPSHOT_MILESTONING',
  PROCESSING_MILESTONING = 'PROCESSING_MILESTONING',
  // relational database connection datasource specification
  STATIC_DATASOURCE_SPECIFICATION = 'STATIC_DATASOURCE_SPECIFICATION',
  LOCAL_H2_DATASOURCE_SPECIFICATION = 'LOCAL_H2_DATASOURCE_SPECIFICATION',
  EMBEDDED_H2_DATASOURCE_SPECIFICATION = 'EMBEDDED_H2_DATASOURCE_SPECIFICATION',
  SNOWFLAKE_DATASOURCE_SPECIFICATION = 'SNOWFLAKE_DATASOURCE_SPECIFICATION',
  REDSHIFT_DATASOURCE_SPECIFICATION = 'REDSHIFT_DATASOURCE_SPECIFICATION',
  BIGQUERY_DATASOURCE_SPECIFICATION = 'BIGQUERY_DATASOURCE_SPECIFICATION',
  // relational database connection authentication strategy
  DELEGRATED_KEREBEROS_AUTHENTICATION_STRATEGY = 'DELEGRATED_KEREBEROS_AUTHENTICATION_STRATEGY',
  DEFAULT_H2_AUTHENTICATION_STRATEGY = 'DEFAULT_H2_AUTHENTICATION_STRATEGY',
  SNOWFLAKE_PUBLIC_AUTHENTICATION_STRATEGY = 'SNOWFLAKE_PUBLIC_AUTHENTICATION_STRATEGY',
  GCP_APPLICATION_DEFAULT_CREDENTIALS_AUTHENTICATION_STRATEGY = 'GCP_APPLICATION_DEFAULT_CREDENTIALS_AUTHENTICATION_STRATEGY',
  USERNAME_PASSWORD_AUTHENTICATION_STRATEGY = 'USERNAME_PASSWORD_AUTHENTICATION_STRATEGY',
  TEST_DATABASE_AUTHENTICATION_STRATEGY = 'TEST_DATABASE_AUTHENTICATION_STRATEGY',
  OAUTH_AUTHENTICATION_STRATEGY = 'OAUTH_AUTHENTICATION_STRATEGY',
  USER_PASSWORD_AUTHENTICATION_STRATEGY = 'USER_PASSWORD_AUTHENTICATION_STRATEGY',
  // relational database connection post processors
  MAPPER_POST_PROCESSOR = 'MAPPER_POST_PROCESSOR',
  SCHEMA_MAPPER = 'SCHEMA_MAPPER',
  TABLE_MAPPER = 'TABLE_MAPPER',
  // mapping
  MAPPING = 'MAPPING',
  MAPPING_INCLUDE = 'MAPPING_INCLUDE',
  ASSOCIATION_IMPLEMENTATION = 'ASSOCIATION_IMPLEMENTATION',
  RELATIONAL_ASSOCIATION_IMPLEMENTATION = 'RELATIONAL_ASSOCIATION_IMPLEMENTATION',
  XSTORE_ASSOCIATION_IMPLEMENTATION = 'XSTORE_ASSOCIATION_IMPLEMENTATION',
  ENUMERATION_MAPPING = 'ENUMERATION_MAPPING',
  ENUM_VALUE_MAPPING = 'ENUM_VALUE_MAPPING',
  SET_IMPLEMENTATION = 'SET_IMPLEMENTATION',
  OPERATION_SET_IMPLEMENTATION = 'OPERATION_SET_IMPLEMENTATION',
  PURE_INSTANCE_SET_IMPLEMENTATION = 'PURE_INSTANCE_SET_IMPLEMENTATION',
  PROPERTY_MAPPING = 'PROPERTY_MAPPING',
  LOCAL_MAPPING_PROPERTY = 'LOCAL_MAPPING_PROPERTY',
  PURE_PROPERTY_MAPPING = 'PURE_PROPERTY_MAPPING',
  XSTORE_PROPERTY_MAPPING = 'XSTORE_PROPERTY_MAPPING',
  MAPPING_TEST = 'MAPPING_TEST',
  INPUT_DATA = 'INPUT_DATA',
  FLAT_DATA_INPUT_DATA = 'FLAT_DATA_INPUT_DATA',
  RELATIONAL_INPUT_DATA = 'RELATIONAL_INPUT_DATA',
  OBJECT_INPUT_DATA = 'OBJECT_INPUT_DATA',
  MAPPING_TEST_ASSERT = 'MAPPING_TEST_ASSERT',
  EXPECTED_OUTPUT_MAPPING_TEST_ASSERT = 'EXPECTED_OUTPUT_MAPPING_TEST_ASSERT',
  FILTER_MAPPING = 'FILTER_MAPPING',
  COLUMN_MAPPING = 'COLUMN_MAPPING',
  GROUP_BY_MAPPING = 'GROUP_BY_MAPPING',
  // service
  SERVICE = 'SERVICE',
  SERVICE_PURE_EXECUTION = 'SERVICE_PURE_EXECUTION',
  SERVICE_PURE_SINGLE_EXECUTION = 'SERVICE_PURE_SINGLE_EXECUTION',
  SERVICE_KEYED_EXECUTION_PARAMETER = 'SERVICE_KEYED_EXECUTION_PARAMETER',
  SERVICE_PURE_MULTI_EXECUTION = 'SERVICE_PURE_MULTI_EXECUTION',
  SERVICE_TEST_CONTAINER = 'SERVICE_TEST_CONTAINER',
  SERVICE_SINGLE_EXECUTION_TEST = 'SERVICE_SINGLE_EXECUTION_TEST',
  SERVICE_KEYED_SINGLE_EXECUTION_TEST = 'SERVICE_KEYED_SINGLE_EXECUTION_TEST',
  SERVICE_MULTI_EXECUTION_TEST = 'SERVICE_MULTI_EXECUTION_TEST',
  // generation specification
  GENERATION_TREE = 'GENERATION_TREE',
  GENERATION_TREE_NODE = 'GENERATION_TREE_NODE',
  // file generation
  FILE_GENERATION = 'FILE_GENERATION',
  CONFIGURATION_PROPERTY = 'CONFIGURATION_PROPERTY',
  // section index
  SECTION_INDEX = 'SECTION_INDEX',
  SECTION = 'SECTION',
  IMPORT_AWARE_CODE_SECTION = 'IMPORT_AWARE_CODE_SECTION',
  DEFAULT_CODE_SECTION = 'DEFAULT_CODE_SECTION',
  // raw value specification
  RAW_LAMBDA = 'RAW_LAMBDA',
  RAW_VARIABLE = 'RAW_VARIABLE',
  RAW_INSTANCE_VALUE = 'RAW_INSTANCE_VALUE',
  BINDING_TRANSFORMER = 'BINDING_TRANSFORMER',
}

export enum MILESTONING_STEROTYPES {
  BUSINESS_TEMPORAL = 'businesstemporal',
  PROCESSING_TEMPORAL = 'processingtemporal',
  BITEMPORAL = 'bitemporal',
}

export const LATEST_DATE = '%latest';
