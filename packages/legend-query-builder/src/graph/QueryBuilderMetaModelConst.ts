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

export enum QUERY_BUILDER_PURE_PATH {
  // TDS
  TDS_ROW = 'meta::pure::tds::TDSRow',
  TDS_COLUMN = 'meta::pure::tds::TDSColumn',
  TDS_TABULAR_DATASET = 'meta::pure::tds::TabularDataSet',

  // time
  DURATION_UNIT = 'meta::pure::functions::date::DurationUnit',
  DAY_OF_WEEK = 'meta::pure::functions::date::DayOfWeek',

  // RELATION
  RELATION = 'meta::pure::metamodel::relation::Relation',
  // serialization
  SERIALIZE_CONFIG = 'meta::pure::graphFetch::execution::AlloySerializationConfig',
}

export enum QUERY_BUILDER_SUPPORTED_CALENDAR_AGGREGATION_FUNCTIONS {
  CALENDAR_ANNUALIZED = 'meta::pure::functions::date::calendar::annualized',
  CALENDAR_CME = ' meta::pure::functions::date::calendar::cme',

  CALENDAR_CW = 'meta::pure::functions::date::calendar::cw',
  CALENDAR_CW_FM = 'meta::pure::functions::date::calendar::cw_fm',
  CALENDAR_CY_MINUS2 = 'meta::pure::functions::date::calendar::CYMinus2',
  CALENDAR_CY_MINUS3 = 'meta::pure::functions::date::calendar::CYMinus3',
  CALENDAR_MTD = 'meta::pure::functions::date::calendar::mtd',
  CALENDAR_P12WA = 'meta::pure::functions::date::calendar::p12wa',
  CALENDAR_P12WTD = 'meta::pure::functions::date::calendar::p12wtd',
  CALENDAR_P4WA = 'meta::pure::functions::date::calendar::p4wa',
  CALENDAR_P4WTD = 'meta::pure::functions::date::calendar::p4wtd',
  CALENDAR_P52WTD = 'meta::pure::functions::date::calendar::p52wtd',
  CALENDAR_P52WA = 'meta::pure::functions::date::calendar::p52wa',
  CALENDAR_PMA = 'meta::pure::functions::date::calendar::pma',
  CALENDAR_PMTD = 'meta::pure::functions::date::calendar::pmtd',
  CALENDAR_PQTD = 'meta::pure::functions::date::calendar::pqtd',
  CALENDAR_PRIOR_DAY = 'meta::pure::functions::date::calendar::priorDay',
  CALENDAR_PRIOR_YEAR = 'meta::pure::functions::date::calendar::priorYear',
  CALENDAR_PW = 'meta::pure::functions::date::calendar::pw',
  CALENDAR_PW_FM = 'meta::pure::functions::date::calendar::pw_fm',
  CALENDAR_PWA = 'meta::pure::functions::date::calendar::pwa',
  CALENDAR_PWTD = 'meta::pure::functions::date::calendar::pwtd',
  CALENDAR_PYMTD = 'meta::pure::functions::date::calendar::pymtd',
  CALENDAR_PYQTD = 'meta::pure::functions::date::calendar::pyqtd',
  CALENDAR_PYTD = 'meta::pure::functions::date::calendar::pytd',
  CALENDAR_PYWA = 'meta::pure::functions::date::calendar::pywa',
  CALENDAR_PYWTD = 'meta::pure::functions::date::calendar::pywtd',
  CALENDAR_QTD = 'meta::pure::functions::date::calendar::qtd',
  CALENDAR_REPORT_END_DAY = 'meta::pure::functions::date::calendar::reportEndDay',
  CALENDAR_WTD = 'meta::pure::functions::date::calendar::wtd',
  CALENDAR_YTD = 'meta::pure::functions::date::calendar::ytd',
}

export enum QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS {
  GET_ALL = 'meta::pure::functions::collection::getAll',
  GET_ALL_VERSIONS = 'meta::pure::functions::collection::getAllVersions',
  GET_ALL_VERSIONS_IN_RANGE = 'meta::pure::functions::collection::getAllVersionsInRange',
}

export enum QUERY_BUILDER_SUPPORTED_FUNCTIONS {
  AND = 'meta::pure::functions::boolean::and',
  EXISTS = 'meta::pure::functions::collection::exists',
  FILTER = 'meta::pure::functions::collection::filter',
  NOT = 'meta::pure::functions::boolean::not',
  OR = 'meta::pure::functions::boolean::or',
  TAKE = 'meta::pure::functions::collection::take',
  SUBTYPE = 'meta::pure::functions::lang::subType',
  MINUS = 'meta::pure::functions::math::minus',

  // time
  ADJUST = 'meta::pure::functions::date::adjust',
  TODAY = 'meta::pure::functions::date::today',
  NOW = 'meta::pure::functions::date::now',
  FIRST_DAY_OF_WEEK = 'meta::pure::functions::date::firstDayOfThisWeek',
  FIRST_DAY_OF_THIS_MONTH = 'meta::pure::functions::date::firstDayOfThisMonth',
  FIRST_DAY_OF_MONTH = 'meta::pure::functions::date::firstDayOfMonth',
  FIRST_DAY_OF_QUARTER = 'meta::pure::functions::date::firstDayOfThisQuarter',
  FIRST_DAY_OF_THIS_YEAR = 'meta::pure::functions::date::firstDayOfThisYear',
  FIRST_DAY_OF_YEAR = 'meta::pure::functions::date::firstDayOfYear',
  PREVIOUS_DAY_OF_WEEK = 'meta::pure::functions::date::previousDayOfWeek',
  IS_ON_DAY = 'meta::pure::functions::date::isOnDay',
  IS_ON_OR_AFTER_DAY = 'meta::pure::functions::date::isOnOrAfterDay',
  IS_AFTER_DAY = 'meta::pure::functions::date::isAfterDay',
  IS_ON_OR_BEFORE_DAY = 'meta::pure::functions::date::isOnOrBeforeDay',
  IS_BEFORE_DAY = 'meta::pure::functions::date::isBeforeDay',

  // graph-fetch
  GRAPH_FETCH = 'meta::pure::graphFetch::execution::graphFetch',
  GRAPH_FETCH_CHECKED = 'meta::pure::graphFetch::execution::graphFetchChecked',
  SERIALIZE = 'meta::pure::graphFetch::execution::serialize',
  EXTERNALIZE = 'meta::external::shared::format::functions::externalize',

  // TDS
  TDS_FILTER = 'meta::pure::tds::filter',
  TDS_ASC = 'meta::pure::tds::asc',
  TDS_DESC = 'meta::pure::tds::desc',
  TDS_AGG = 'meta::pure::tds::agg',
  TDS_DISTINCT = 'meta::pure::tds::distinct',
  TDS_PROJECT = 'meta::pure::tds::project',
  TDS_GROUP_BY = 'meta::pure::tds::groupBy',
  TDS_SORT = 'meta::pure::tds::sort',
  TDS_TAKE = 'meta::pure::tds::take',
  TDS_RESTRICT = 'meta::pure::tds::restrict',
  TDS_FUNC = 'meta::pure::tds::func',
  TDS_COL = 'meta::pure::tds::col',

  // Relation
  RELATION_PROJECT = 'meta::pure::functions::relation::project',
  RELATION_LIMIT = 'meta::pure::functions::relation::limit',
  RELATION_ASC = 'meta::pure::functions::relation::ascending',
  RELATION_DESC = 'meta::pure::functions::relation::descending',
  RELATION_DISTINCT = 'meta::pure::functions::relation::distinct',
  RELATION_SORT = 'meta::pure::functions::relation::sort',
  RELATION_SLICE = 'meta::pure::functions::relation::slice',
  RELATION_GROUP_BY = 'meta::pure::functions::relation::groupBy',
  // filter
  CONTAINS = 'meta::pure::functions::string::contains',
  ENDS_WITH = 'meta::pure::functions::string::endsWith',
  EQUAL = 'meta::pure::functions::boolean::equal',
  GREATER_THAN = 'meta::pure::functions::lang::tests::greaterThan',
  GREATER_THAN_EQUAL = 'meta::pure::functions::lang::tests::greaterThanEqual',
  IN = 'meta::pure::functions::collection::in',
  IS_EMPTY = 'meta::pure::functions::collection::isEmpty',
  LESS_THAN = 'meta::pure::functions::lang::tests::lessThan',
  LESS_THAN_EQUAL = 'meta::pure::functions::lang::tests::lessThanEqual',
  STARTS_WITH = 'meta::pure::functions::string::startsWith',

  // aggregation
  AVERAGE = 'meta::pure::functions::math::average',
  COUNT = 'meta::pure::functions::collection::count',
  JOIN_STRINGS = 'meta::pure::functions::string::joinStrings',
  DISTINCT = 'meta::pure::functions::collection::distinct',
  DATE_MAX = 'meta::pure::functions::date::max',
  DATE_MIN = 'meta::pure::functions::date::min',
  MAX = 'meta::pure::functions::math::max',
  MIN = 'meta::pure::functions::math::min',
  STD_DEV_POPULATION = 'meta::pure::functions::math::stdDevPopulation',
  STD_DEV_SAMPLE = 'meta::pure::functions::math::stdDevSample',
  SUM = 'meta::pure::functions::math::sum',
  UNIQUE_VALUE_ONLY = 'meta::pure::functions::collection::uniqueValueOnly',
  WAVG = 'meta::pure::functions::math::wavg',
  WAVG_ROW_MAPPER = 'meta::pure::functions::math::wavgUtility::wavgRowMapper',

  // watermark
  WATERMARK = 'meta::datalake::functions::forWatermark',

  // OLAP
  OLAP_GROUPBY = 'meta::pure::tds::olapGroupBy',
  OLAP_RANK = 'meta::pure::functions::math::olap::rank',
  OLAP_AVERAGE_RANK = 'meta::pure::functions::math::olap::averageRank',
  OLAP_DENSE_RANK = 'meta::pure::functions::math::olap::denseRank',
  OLAP_ROW_NUMBER = 'meta::pure::functions::math::olap::rowNumber',

  // External Format
  INTERNALIZE = 'meta::external::shared::format::functions::internalize',
  GET_RUNTIME_WITH_MODEL_QUERY_CONNECTION = 'meta::pure::runtime::getRuntimeWithModelQueryConnection',
  FROM = 'meta::pure::mapping::from',
  CHECKED = 'meta::pure::dataQuality::checked',
  MERGERUNTIMES = 'meta::pure::runtime::mergeRuntimes',
  PERCENTILE = 'meta::pure::functions::math::percentile',

  // TOTDS
  TABLE_TO_TDS = 'meta::pure::tds::tableToTDS',
  TABLE_REFERENCE = 'meta::relational::functions::database::tableReference',

  // SLICE
  SLICE = 'meta::pure::functions::collection::slice',
}

export enum TDS_COLUMN_GETTER {
  GET_STRING = 'getString',
  GET_NUMBER = 'getNumber',
  GET_INTEGER = 'getInteger',
  GET_FLOAT = 'getFloat',
  GET_DECIMAL = 'getDecimal',
  GET_DATE = 'getDate',
  GET_DATETIME = 'getDateTime',
  GET_STRICTDATE = 'getStrictDate',
  GET_BOOLEAN = 'getBoolean',
  GET_ENUM = 'getEnum',
  IS_NULL = 'isNull',
  IS_NOT_NULL = 'isNotNull',
}

export enum COLUMN_SORT_TYPE {
  ASC = 'ASC',
  DESC = 'DESC',
}
