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

export const MULTIPLICITY_INFINITE = '*';
export const ELEMENT_PATH_DELIMITER = '::';
export const MULTIPLICITY_RANGE_OPERATOR = '..';
export const PROPERTY_ACCESSOR = '.';
export const UNIT_PATH_DELIMITER = '~';
export const LAMBDA_PIPE = '|';
export const DEFAULT_SOURCE_PARAMETER_NAME = 'src';
export const DEFAULT_DATABASE_SCHEMA_NAME = 'default';
export const SECTION_INDEX_ELEMENT_PATH = '__internal__::SectionIndex';
export const VARIABLE_REFERENCE_TOKEN = '$';
export const TYPE_CAST_TOKEN = '@';
export const ARROW_FUNCTION_TOKEN = '->';
export const LATEST_DATE = '%latest';
export const PARSER_SECTION_MARKER = '###';
export const FUNCTION_SIGNATURE_MULTIPLICITY_INFINITE_TOKEN = 'MANY';
export const DIRECTORY_PATH_DELIMITER = '/';
export const SOURCE_INFORMATION_PROPERTY_KEY_SUFFIX = 'sourceInformation';

export const RESERVERD_PACKAGE_NAMES = ['$implicit'];

export enum ROOT_PACKAGE_NAME {
  CORE = 'CORE',
  MAIN = 'ROOT',
  MODEL_GENERATION = 'MODEL_GENERATION_ROOT',
  SYSTEM = 'SYSTEM_ROOT',
  PROJECT_DEPENDENCY_ROOT = 'PROJECT_DEPENDENCY_ROOT',
}

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
  BYTE = 'Byte',
}

export enum ATOMIC_TEST_TYPE {
  Service_Test = 'serviceTest',
  Mapping_Test = 'mappingTest',
  Function_Test = 'functionTest',
}

// NOTE: the list of auto-import are kept in `m3.pure` file in `finos/legend-pure`,
// this includes a more extensive list of packages which contain native functions, classes, etc.
// See https://github.com/finos/legend-pure/blob/master/legend-pure-core/legend-pure-m3-core/src/main/resources/platform/pure/grammar/m3.pure
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
  'meta::pure::functions::date',
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
  // type
  ANY = 'meta::pure::metamodel::type::Any',
  NIL = 'meta::pure::metamodel::type::Nil',
  RELATION = 'meta::pure::metamodel::relation::Relation',

  // profile
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
  EXECUTION_ENVIRONMENT = 'meta::legend::service::metamodel::ExecutionEnvironmentInstance',
  FILE_GENERATION = 'meta::pure::generation::metamodel::GenerationConfiguration',
  GENERATION_SPECIFICATION = 'meta::pure::generation::metamodel::GenerationSpecification',
  SECTION_INDEX = 'meta::pure::metamodel::section::SectionIndex',
  DATA_ELEMENT = 'meta::pure::data::DataElement',
  SNOWFLAKE_APP = 'meta::external::function::activator::snowflakeApp::SnowflakeApp',
  HOSTED_SERVICE = 'meta::external::function::activator::hostedService::HostedService',
  TABULAR_RESULT = 'meta::pure::mapping::Result',
}

export const PURE_DOC_TAG = 'doc';
export const PURE_DEPRECATED_STEREOTYPE = 'deprecated';

export enum MILESTONING_STEREOTYPE {
  BUSINESS_TEMPORAL = 'businesstemporal',
  PROCESSING_TEMPORAL = 'processingtemporal',
  BITEMPORAL = 'bitemporal',
}

export enum MILESTONING_VERSION_PROPERTY_SUFFIX {
  ALL_VERSIONS = 'AllVersions',
  ALL_VERSIONS_IN_RANGE = 'AllVersionsInRange',
}

export const MILESTONING_START_DATE_PARAMETER_NAME = 'startDate';
export const MILESTONING_END_DATE_PARAMETER_NAME = 'endDate';
export const PROCESSING_DATE_MILESTONING_PROPERTY_NAME = 'processingDate';
export const BUSINESS_DATE_MILESTONING_PROPERTY_NAME = 'businessDate';

export enum PackageableElementPointerType {
  CLASS = 'CLASS',
  STORE = 'STORE',
  MAPPING = 'MAPPING',
  RUNTIME = 'RUNTIME',
  FUNCTION = 'FUNCTION',
  FILE_GENERATION = 'FILE_GENERATION',
  SERVICE = 'SERVICE',
  DATA = 'DATA',
  ENUMERATION = 'ENUMERATION',
  ASSOCIATION = 'ASSOCIATION',
  BINDING = 'BINDING',
}

export enum SUPPORTED_FUNCTIONS {
  LET = 'meta::pure::functions::lang::letFunction',
  NEW = 'meta::pure::functions::meta::new',
  // from
  FROM = 'meta::pure::mapping::from',
}

export const DATE_TIME_FORMAT_WITH_MILLISECONDS =
  "yyyy-MM-dd'T'HH:mm:ss.SSSxxxx";
export const DATE_TIME_FORMAT = "yyyy-MM-dd'T'HH:mm:ssxxxx";
export const DATE_FORMAT = 'yyyy-MM-dd';

// Generation Const
export const DEFAULT_GENERATION_PACKAGE = 'generated';
// Query
export const QUERY_PROFILE_TAG_CLASS = 'class';
export const QUERY_PROFILE_PATH = 'meta::pure::profiles::query';
