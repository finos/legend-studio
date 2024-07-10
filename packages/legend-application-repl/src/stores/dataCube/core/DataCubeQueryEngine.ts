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
import { PRIMITIVE_TYPE, type V1_AppliedFunction } from '@finos/legend-graph';

export enum DataCubeFunction {
  // relation
  EXTEND = 'meta::pure::functions::relation::extend',
  FILTER = 'meta::pure::functions::relation::filter',
  GROUP_BY = 'meta::pure::functions::relation::groupBy',
  LIMIT = 'meta::pure::functions::relation::limit',
  PIVOT = 'meta::pure::functions::relation::pivot',
  // RENAME = 'meta::pure::functions::relation::rename',
  SELECT = 'meta::pure::functions::relation::select',
  SLICE = 'meta::pure::functions::relation::slice',
  SORT = 'meta::pure::functions::relation::sort',

  // generic
  CAST = 'meta::pure::functions::lang::cast',
  FROM = 'meta::pure::mapping::from',

  // sort
  ASC = 'meta::pure::functions::relation::ascending',
  DESC = 'meta::pure::functions::relation::descending',

  // filter
  AND = 'meta::pure::functions::boolean::and',
  NOT = 'meta::pure::functions::boolean::not',
  OR = 'meta::pure::functions::boolean::or',

  CONTAINS = 'meta::pure::functions::string::contains',
  ENDS_WITH = 'meta::pure::functions::string::endsWith',
  EQUAL = 'meta::pure::functions::boolean::equal',
  GREATER_THAN = 'meta::pure::functions::boolean::greaterThan',
  GREATER_THAN_EQUAL = 'meta::pure::functions::boolean::greaterThanEqual',
  IN = 'meta::pure::functions::collection::in',
  IS_EMPTY = 'meta::pure::functions::collection::isEmpty',
  LESS_THAN = 'meta::pure::functions::boolean::lessThan',
  LESS_THAN_EQUAL = 'meta::pure::functions::boolean::lessThanEqual',
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
  STDDEV_POP = 'meta::pure::functions::math::stdDevPopulation',
  STDDEV_SAMP = 'meta::pure::functions::math::stdDevSample',
  VAR_POP = 'meta::pure::functions::math::variancePopulation',
  VAR_SAMP = 'meta::pure::functions::math::varianceSample',
  // UNIQUE_VALUE_ONLY = 'meta::pure::functions::collection::uniqueValueOnly',
  // PERCENTILE = 'meta::pure::functions::math::percentile',
}

export const DEFAULT_REPORT_NAME = 'New Report';
export const DEFAULT_LAMBDA_VARIABLE_NAME = 'x';
export const PIVOT_COLUMN_NAME_VALUE_SEPARATOR = '__|__';

// NOTE: this is the column name used for the dummy count() aggregate
// when no aggregate is specified in groupBy() or pivot()
export const INTERNAL__FILLER_COUNT_AGG_COLUMN_NAME =
  'INTERNAL__filler_count_agg_column';
export const DEFAULT_ROW_BUFFER = 20;

export type DataCubeQueryFunctionMap = {
  leafExtend?: V1_AppliedFunction | undefined;
  filter?: V1_AppliedFunction | undefined;
  groupBy?: V1_AppliedFunction | undefined;
  groupByExtend?: V1_AppliedFunction | undefined; // used to populate empty columns erased by groupBy()
  pivotExtend?: V1_AppliedFunction | undefined; // used to populate columns erased by pivot()
  pivot?: V1_AppliedFunction | undefined;
  pivotCast?: V1_AppliedFunction | undefined; // used to set the relation type post pivot() to make compilation works properly
  groupExtend?: V1_AppliedFunction | undefined;
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

export enum DataCubeSelectionStat {
  COUNT = 'Count',
  SUM = 'Sum',
  MIN = 'Min',
  MAX = 'Max',
  AVERAGE = 'Average',
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

export enum DataCubeAggregateFunction {
  SUM = 'sum',
  AVERAGE = 'avg',
  COUNT = 'count',
  MIN = 'min',
  MAX = 'max',
  // UNIQUE = 'uniq',
  FIRST = 'first',
  LAST = 'last',
  MEDIAN = 'median',
  VAR_POP = 'var_samp',
  VAR_SAMP = 'var_pop',
  STDDEV_POP = 'stddev_pop',
  STDDEV_SAMP = 'stddev_samp',
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
  // strjoin
  // strjoinuniq
  // splitjoin
  // daterange
  // wavg
  // wstderr
  // wsum
  // custom
}

export enum DataCubeQueryFilterOperation {
  EQUAL = 'equal',
  NOT_EQUAL = 'notEqual',
  GREATER_THAN = 'greaterThan',
  GREATER_THAN_OR_EQUAL = 'greaterThanOrEqual',
  LESS_THAN = 'lessThan',
  LESS_THAN_OR_EQUAL = 'lessThanOrEqual',
  BLANK = 'isEmpty',
  NOT_BLANK = 'isNotEmpty',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'notContains',
  STARTS_WITH = 'startsWith',
  ENDS_WITH = 'endsWith',
}

export enum DataCubeQueryFilterGroupOperation {
  AND = 'and',
  OR = 'or',
}

export enum DataCubeQuerySortOperation {
  ASCENDING = 'ascending',
  DESCENDING = 'descending',
}

export enum DataCubeColumnPinPlacement {
  LEFT = 'Left',
  RIGHT = 'Right',
}

export enum DataCubeColumnDataType {
  NUMBER = 'number',
  DATE = 'date',
  TEXT = 'text',
}

export function getDataType(type: string): DataCubeColumnDataType {
  switch (type) {
    case PRIMITIVE_TYPE.NUMBER:
    case PRIMITIVE_TYPE.INTEGER:
    case PRIMITIVE_TYPE.DECIMAL:
    case PRIMITIVE_TYPE.FLOAT:
      return DataCubeColumnDataType.NUMBER;
    case PRIMITIVE_TYPE.DATE:
    case PRIMITIVE_TYPE.DATETIME:
    case PRIMITIVE_TYPE.STRICTDATE:
      return DataCubeColumnDataType.DATE;
    case PRIMITIVE_TYPE.STRING:
    default:
      return DataCubeColumnDataType.TEXT;
  }
}

export const DEFAULT_URL_LABEL_QUERY_PARAM = 'dataCube.linkLabel';

export const DEFAULT_GRID_LINE_COLOR = TailwindCSSPalette.neutral[200];
export const DEFAULT_ROW_HIGHLIGHT_BACKGROUND_COLOR =
  TailwindCSSPalette.sky[100];

export const DEFAULT_COLUMN_WIDTH = 300;
export const DEFAULT_COLUMN_MIN_WIDTH = 50;
export const DEFAULT_COLUMN_MAX_WIDTH = undefined;

export const DEFAULT_FONT_FAMILY = DataCubeFont.ROBOTO;
export const DEFAULT_FONT_SIZE = 12;
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
