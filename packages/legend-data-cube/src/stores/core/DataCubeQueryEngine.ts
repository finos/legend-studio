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

import { TailwindCSSPalette } from '@finos/legend-art';
import {
  DATE_FORMAT,
  PRIMITIVE_TYPE,
  type V1_AppliedFunction,
} from '@finos/legend-graph';
import {
  guaranteeNonNullable,
  IllegalStateError,
  UnsupportedOperationError,
  formatDate,
} from '@finos/legend-shared';
import type { DataCubeQueryFilterOperation } from './filter/DataCubeQueryFilterOperation.js';
import type { DataCubeQueryAggregateOperation } from './aggregation/DataCubeQueryAggregateOperation.js';

export enum DataCubeFunction {
  // relation
  EXTEND = 'meta::pure::functions::relation::extend',
  FILTER = 'meta::pure::functions::relation::filter',
  GROUP_BY = 'meta::pure::functions::relation::groupBy',
  LIMIT = 'meta::pure::functions::relation::limit',
  PIVOT = 'meta::pure::functions::relation::pivot',
  SELECT = 'meta::pure::functions::relation::select',
  SLICE = 'meta::pure::functions::relation::slice',
  SORT = 'meta::pure::functions::relation::sort',
  OVER = 'meta::pure::functions::relation::over',

  // generic
  CAST = 'meta::pure::functions::lang::cast',
  FROM = 'meta::pure::mapping::from',
  TO_ONE = 'meta::pure::functions::multiplicity::toOne',

  // sort
  ASCENDING = 'meta::pure::functions::relation::ascending',
  DESCENDING = 'meta::pure::functions::relation::descending',
  ABS = 'meta::pure::functions::math::abs',

  // filter
  AND = 'meta::pure::functions::boolean::and',
  OR = 'meta::pure::functions::boolean::or',
  NOT = 'meta::pure::functions::boolean::not',
  TO_LOWERCASE = 'meta::pure::functions::string::toLower',

  CONTAINS = 'meta::pure::functions::string::contains',
  ENDS_WITH = 'meta::pure::functions::string::endsWith',
  EQUAL = 'meta::pure::functions::boolean::equal',
  GREATER_THAN = 'meta::pure::functions::boolean::greaterThan',
  GREATER_THAN_OR_EQUAL = 'meta::pure::functions::boolean::greaterThanEqual',
  IN = 'meta::pure::functions::collection::in',
  IS_EMPTY = 'meta::pure::functions::collection::isEmpty',
  LESS_THAN = 'meta::pure::functions::boolean::lessThan',
  LESS_THAN_OR_EQUAL = 'meta::pure::functions::boolean::lessThanEqual',
  STARTS_WITH = 'meta::pure::functions::string::startsWith',

  // aggregate
  AVERAGE = 'meta::pure::functions::math::average',
  COUNT = 'meta::pure::functions::collection::count',
  DISTINCT = 'meta::pure::functions::collection::distinct',
  FIRST = 'meta::pure::functions::collection::first',
  JOIN_STRINGS = 'meta::pure::functions::string::joinStrings',
  LAST = 'meta::pure::functions::collection::last',
  MAX = 'meta::pure::functions::collection::max',
  MIN = 'meta::pure::functions::collection::min',
  SUM = 'meta::pure::functions::math::sum',
  STANDARD_DEVIATION_POPULATION = 'meta::pure::functions::math::stdDevPopulation',
  STANDARD_DEVIATION_SAMPLE = 'meta::pure::functions::math::stdDevSample',
  UNIQUE_VALUE_ONLY = 'meta::pure::functions::collection::uniqueValueOnly',
  VARIANCE_POPULATION = 'meta::pure::functions::math::variancePopulation',
  VARIANCE_SAMPLE = 'meta::pure::functions::math::varianceSample',
  // PERCENTILE = 'meta::pure::functions::math::percentile',
}

export type DataCubeQueryFunctionMap = {
  leafExtend?: V1_AppliedFunction[] | undefined;
  filter?: V1_AppliedFunction | undefined;
  pivotSort?: V1_AppliedFunction | undefined;
  pivot?: V1_AppliedFunction | undefined;
  pivotCast?: V1_AppliedFunction | undefined;
  groupBy?: V1_AppliedFunction | undefined;
  groupBySort?: V1_AppliedFunction | undefined;
  groupExtend?: V1_AppliedFunction[] | undefined;
  select?: V1_AppliedFunction | undefined;
  sort?: V1_AppliedFunction | undefined;
  limit?: V1_AppliedFunction | undefined;
};

export enum DataCubeNumberScale {
  BASIS_POINT = 'Basis Points (bp)',
  PERCENT = 'Percent (%)',
  THOUSANDS = 'Thousands (k)',
  MILLIONS = 'Millions (m)',
  BILLIONS = 'Billions (b)',
  TRILLIONS = 'Trillions (t)',
  AUTO = 'Auto (k/m/b/t)',
}

export enum DataCubeFont {
  // sans-serif
  ARIAL = 'Arial',
  ROBOTO = 'Roboto',
  ROBOTO_CONDENSED = 'Roboto Condensed',

  // serif
  TIMES_NEW_ROMAN = 'Times New Roman',
  GEORGIA = 'Georgia',
  ROBOTO_SERIF = 'Roboto Serif',

  // monospace
  JERBRAINS_MONO = 'Jetbrains Mono',
  ROBOTO_MONO = 'Roboto Mono',
  UBUNTU_MONO = 'Ubuntu Mono',
}

export enum DataCubeFontTextAlignment {
  CENTER = 'center',
  LEFT = 'left',
  RIGHT = 'right',
}

export enum DataCubeFontCase {
  LOWERCASE = 'lowercase',
  UPPERCASE = 'uppercase',
  CAPITALIZE = 'capitalize',
}

export enum DataCubeFontFormatUnderlineVariant {
  SOLID = 'solid',
  DASHED = 'dashed',
  DOTTED = 'dotted',
  DOUBLE = 'double',
  WAVY = 'wavy',
}

export enum DataCubeColumnKind {
  MEASURE = 'Measure',
  DIMENSION = 'Dimension',
}

export enum DataCubeOperationAdvancedValueType {
  COLUMN = 'COLUMN',
  VOID = 'VOID',
  // PARAMETER
}

export type DataCubeOperationValue = {
  value?: unknown;
  type: string;
};

export enum DataCubeQueryAggregateOperator {
  SUM = 'sum',
  AVERAGE = 'avg',
  COUNT = 'count',
  MIN = 'min',
  MAX = 'max',
  UNIQUE = 'uniq',
  FIRST = 'first',
  LAST = 'last',
  // MEDIAN = 'median',
  VARIANCE_POPULATION = 'var',
  VARIANCE_SAMPLE = 'var_sample',
  STANDARD_DEVIATION_POPULATION = 'std',
  STANDARD_DEVIATION_SAMPLE = 'std_sample',
  // STANDARD_ERROR = 'stderr',
  // NULL = 'null',
  // ssq
  // countvalid
  // countnull
  // uniqunstrict
  // minmagnitude
  // maxmagnitude
  // commonprefix
  // commonprefixunstrict
  JOIN_STRINGS = 'strjoin',
  // strjoinuniq
  // splitjoin
  // daterange
  // wavg
  // wstderr
  // wsum
  // custom
}

export enum DataCubeQueryClientSideAggregateOperator {
  SUM = 'sum',
  AVERAGE = 'avg',
  MEDIAN = 'median',
  COUNT = 'count',
  MIN = 'min',
  MAX = 'max',
  VARIANCE_POPULATION = 'var',
  VARIANCE_SAMPLE = 'var_sample',
  STANDARD_DEVIATION_POPULATION = 'std',
  STANDARD_DEVIATION_SAMPLE = 'std_sample',
}

export enum DataCubeQueryFilterOperator {
  LESS_THAN = '<',
  LESS_THAN_OR_EQUAL = '<=',
  EQUAL = '=',
  NOT_EQUAL = '!=',
  GREATER_THAN = '>',
  GREATER_THAN_OR_EQUAL = '>=',
  IN = 'in',
  NOT_IN = 'not in',
  IS_NULL = 'is null',
  IS_NOT_NULL = 'is not null',
  // string ONLY
  EQUAL_CASE_INSENSITIVE = '= (case-insensitive)',
  NOT_EQUAL_CASE_INSENSITIVE = '!= (case-insensitive)',
  IN_CASE_INSENSITIVE = 'in (case-insensitive)',
  NOT_IN_CASE_INSENSITIVE = 'not in (case-insensitive)',
  CONTAIN = 'contains',
  CONTAIN_CASE_INSENSITIVE = 'contains (case-insensitive)',
  NOT_CONTAIN = 'does not contain',
  START_WITH = 'starts with',
  START_WITH_CASE_INSENSITIVE = 'starts with (case-insensitive)',
  NOT_START_WITH = 'does not start with',
  END_WITH = 'ends with',
  END_WITH_CASE_INSENSITIVE = 'ends with (case-insensitive)',
  NOT_END_WITH = 'does not end with',
  // column
  LESS_THAN_COLUMN = '< value in column',
  LESS_THAN_OR_EQUAL_COLUMN = '<= value in column',
  EQUAL_COLUMN = '= value in column',
  EQUAL_CASE_INSENSITIVE_COLUMN = '= (case-insensitive) value in column',
  NOT_EQUAL_COLUMN = '!= value in column',
  NOT_EQUAL_CASE_INSENSITIVE_COLUMN = '!= (case-insensitive) value in column',
  GREATER_THAN_COLUMN = '> value in column',
  GREATER_THAN_OR_EQUAL_COLUMN = '>= value in column',
  // TODO?: having, having in aggregate, between
}

export enum DataCubeQueryFilterGroupOperator {
  AND = 'and',
  OR = 'or',
}

export enum DataCubeQuerySortDirection {
  ASCENDING = 'Ascending',
  DESCENDING = 'Descending',
}

export enum DataCubeColumnPinPlacement {
  LEFT = 'Left',
  RIGHT = 'Right',
}

export enum DataCubeColumnDataType {
  NUMBER = 'Numeric',
  TEXT = 'Text',
  DATE = 'Date',
  TIME = 'Time',
}

export enum DataCubeGridMode {
  STANDARD = 'Standard',
  MULTIDIMENSIONAL = 'Multidimensional',
}

export enum DataCubeClientModelOption {
  ROW_DATA = 'rowData',
  COLUMN_DEFS = 'columnDefs',
  LOADING = 'loading',
}

export enum DataCubeTitleBarMenuItems {
  VIEW_SOURCE = 'View Source',
  RESET_TO_LATEST_SAVE = 'Reset to Latest Save',
  UPDATE_INFO = 'Update Info...',
  DELETE_DATACUBE = 'Delete DataCube...',
  SEE_DOCUMENTATION = 'See Documentation',
  ABOUT = 'About',
  UNDO = 'Undo',
  REDO = 'Redo',
  SETTINGS = 'Settings...',
}

export enum DataCubeOpenEditorSource {
  STATUS_BAR = 'Status Bar',
  GRID_MENU = 'Grid Menu',
}

export const PIVOT_COLUMN_NAME_VALUE_SEPARATOR = '__|__';

export const TREE_COLUMN_VALUE_SEPARATOR = '__/__';
export const DEFAULT_LAMBDA_VARIABLE_NAME = 'x';

export const DEFAULT_REPORT_NAME = 'New Report';
export const DEFAULT_TREE_COLUMN_SORT_DIRECTION =
  DataCubeQuerySortDirection.ASCENDING;
export const DEFAULT_PIVOT_STATISTIC_COLUMN_NAME = 'Total';
export const DEFAULT_PIVOT_COLUMN_SORT_DIRECTION =
  DataCubeQuerySortDirection.ASCENDING;
export const DEFAULT_ROOT_AGGREGATION_COLUMN_VALUE = '[ROOT]';

export const DEFAULT_URL_LABEL_QUERY_PARAM = 'dataCube.linkLabel';
export const DEFAULT_MISSING_VALUE_DISPLAY_TEXT = '';

export const DEFAULT_GRID_LINE_COLOR = TailwindCSSPalette.neutral[300];
export const DEFAULT_ROW_HIGHLIGHT_BACKGROUND_COLOR = '#d7e0eb';

export const DEFAULT_COLUMN_WIDTH = 300;
export const DEFAULT_COLUMN_MIN_WIDTH = 50;
export const DEFAULT_COLUMN_MAX_WIDTH = undefined;

export const DEFAULT_GRID_MODE = DataCubeGridMode.STANDARD;
export const DEFAULT_FONT_FAMILY = DataCubeFont.ROBOTO;
export const DEFAULT_FONT_SIZE = 11;
export const DEFAULT_FONT_BOLD = false;
export const DEFAULT_FONT_ITALIC = false;
export const DEFAULT_FONT_CASE = undefined;
export const DEFAULT_FONT_UNDERLINED = undefined;
export const DEFAULT_FONT_STRIKETHROUGH = false;
export const DEFAULT_TEXT_ALIGN = DataCubeFontTextAlignment.LEFT;
export const DEFAULT_FOREGROUND_COLOR = TailwindCSSPalette.black;
export const DEFAULT_BACKGROUND_COLOR = TailwindCSSPalette.transparent;
export const DEFAULT_ROW_BACKGROUND_COLOR = TailwindCSSPalette.white;
export const DEFAULT_NEGATIVE_FOREGROUND_COLOR = TailwindCSSPalette.red[500];
export const DEFAULT_ZERO_FOREGROUND_COLOR = TailwindCSSPalette.neutral[400];
export const DEFAULT_ERROR_FOREGROUND_COLOR = TailwindCSSPalette.blue[600];

// settings
export const TAB_SIZE = 2;
export const DATE_TIME_FORMAT = "yyyy-MM-dd'T'HH:mm:ss";
export const TYPEAHEAD_SEARCH_MINIMUM_SEARCH_LENGTH = 3;
export const TYPEAHEAD_SEARCH_LIMIT = 10;
export const EMPTY_VALUE_PLACEHOLDER = '(None)';

// --------------------------------- UTILITIES ---------------------------------

export function _defaultPrimitiveTypeValue(type: string): unknown {
  switch (type) {
    case PRIMITIVE_TYPE.STRING:
      return '';
    case PRIMITIVE_TYPE.BOOLEAN:
      return false;
    case PRIMITIVE_TYPE.BYTE:
      return btoa('');
    case PRIMITIVE_TYPE.NUMBER:
    case PRIMITIVE_TYPE.DECIMAL:
    case PRIMITIVE_TYPE.FLOAT:
    case PRIMITIVE_TYPE.INTEGER:
    case PRIMITIVE_TYPE.BINARY:
      return 0;
    case PRIMITIVE_TYPE.DATE:
    case PRIMITIVE_TYPE.STRICTDATE:
      return formatDate(new Date(Date.now()), DATE_FORMAT);
    case PRIMITIVE_TYPE.DATETIME:
      return formatDate(new Date(Date.now()), DATE_TIME_FORMAT);
    default:
      throw new UnsupportedOperationError(
        `Can't generate value for type '${type}'`,
      );
  }
}

export function getFilterOperation(
  operator: string,
  operators: DataCubeQueryFilterOperation[],
) {
  return guaranteeNonNullable(
    operators.find((op) => op.operator === operator),
    `Can't find filter operation '${operator}'`,
  );
}

export function getAggregateOperation(
  operator: string,
  aggregateOperations: DataCubeQueryAggregateOperation[],
) {
  return guaranteeNonNullable(
    aggregateOperations.find((op) => op.operator === operator),
    `Can't find aggregate operation '${operator}'`,
  );
}

export function getDataType(type: string): DataCubeColumnDataType {
  switch (type) {
    case PRIMITIVE_TYPE.NUMBER:
    case PRIMITIVE_TYPE.INTEGER:
    case PRIMITIVE_TYPE.DECIMAL:
    case PRIMITIVE_TYPE.FLOAT:
      return DataCubeColumnDataType.NUMBER;
    case PRIMITIVE_TYPE.DATE:
    case PRIMITIVE_TYPE.STRICTDATE:
      return DataCubeColumnDataType.DATE;
    case PRIMITIVE_TYPE.DATETIME:
      return DataCubeColumnDataType.TIME;
    case PRIMITIVE_TYPE.STRING:
    default:
      return DataCubeColumnDataType.TEXT;
  }
}

export function ofDataType(
  type: string,
  dataTypes: DataCubeColumnDataType[],
): boolean {
  return dataTypes.includes(getDataType(type));
}

export function isDimensionalGridMode(gridMode: DataCubeGridMode) {
  return gridMode === DataCubeGridMode.MULTIDIMENSIONAL;
}

export function isPrimitiveType(type: string) {
  return (
    [
      PRIMITIVE_TYPE.NUMBER,
      PRIMITIVE_TYPE.INTEGER,
      PRIMITIVE_TYPE.DECIMAL,
      PRIMITIVE_TYPE.FLOAT,
      PRIMITIVE_TYPE.DATE,
      PRIMITIVE_TYPE.STRICTDATE,
      PRIMITIVE_TYPE.DATETIME,
      PRIMITIVE_TYPE.STRING,
      PRIMITIVE_TYPE.BOOLEAN,
    ] as string[]
  ).includes(type);
}
export function isPivotResultColumnName(columnName: string) {
  return columnName.includes(PIVOT_COLUMN_NAME_VALUE_SEPARATOR);
}
export function getPivotResultColumnBaseColumnName(columnName: string) {
  if (!isPivotResultColumnName(columnName)) {
    throw new IllegalStateError(
      `Column '${columnName}' is not a pivot result column`,
    );
  }
  return columnName.substring(
    columnName.lastIndexOf(PIVOT_COLUMN_NAME_VALUE_SEPARATOR) +
      PIVOT_COLUMN_NAME_VALUE_SEPARATOR.length,
  );
}
