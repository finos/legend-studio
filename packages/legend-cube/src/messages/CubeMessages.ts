/**
 * Copyright (c) 2026-present, Goldman Sachs
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

/**
 * The validation messages users read, kept verbatim from the spec's message
 * catalogue (`docs/design/WIP-CUBE-SPEC.md` §16), plus the messages Cube adds.
 * Keep them in this one file.
 */

const quote = (value: string): string => `"${value}"`;

// ---------------------------------------- Generic ----------------------------------------

export const MESSAGE_CANNOT_BE_EMPTY = (label: string): string =>
  `${label} cannot be empty.`;

export const MESSAGE_CANNOT_HAVE_DUPLICATES = (label: string): string =>
  `${label} cannot have duplicates.`;

export const MESSAGE_MUST_BE_A_COLLECTION = (label: string): string =>
  `${label} must be a collection.`;

export const MESSAGE_DOES_NOT_HAVE_A_NAME = (label: string): string =>
  `${label} does not have a name.`;

export const MESSAGE_NOT_IN_INPUT_SCHEMA = (
  label: string,
  name: string,
): string => `${label} ${quote(name)} is not present in the input schema.`;

export const MESSAGE_ALREADY_IN_INPUT_SCHEMA = (
  label: string,
  name: string,
): string => `${label} ${quote(name)} is already present in the input schema.`;

export const MESSAGE_ALREADY_IN_OUTPUT_SCHEMA = (
  label: string,
  name: string,
): string => `${label} ${quote(name)} is already present in the output schema.`;

export const MESSAGE_SIZE_MUST_BE_POSITIVE_WHOLE_NUMBER =
  'Size must be a positive whole number.';

export const MESSAGE_MUST_BE_WHOLE_NUMBER = (
  label: 'Row index' | 'Start row index' | 'Stop row index',
): string => `${label} must be a whole number.`;

export const MESSAGE_START_ROW_INDEX_MUST_BE_LESS_THAN_STOP =
  'Start row index must be less than stop row index.';

// ---------------------------------------- Graph-level ----------------------------------------

/** The node has an empty input port */
export const ERR_INCOMPLETE =
  'This node requires more inputs. Please drag and drop another input to associate.';

/** An input of the node is invalid: the problem is upstream */
export const ERR_SCHEMAS =
  'This node depends on some invalid inputs. Please correct these first.';

/** The node is invalid but gave no reason */
export const ERR_OTHER = 'This graph node is invalid.';

// ---------------------------------------- Sources ----------------------------------------

export const MESSAGE_SOURCE_INFO_UNRESOLVED =
  'Required information about this source could not be resolved.';

export const MESSAGE_SOURCE_SCHEMA_UNRESOLVED =
  'Required schema of this source could not be resolved.';

export const MESSAGE_PARAMETER_WITHOUT_VALUE = (name: string): string =>
  `Required parameter ${quote(name)} does not have a value.`;

/** Added by Cube: v1 queries read from one Database element */
export const MESSAGE_DIFFERENT_DATABASES = (
  database: string,
  firstDatabase: string,
): string =>
  `Sources from different databases are not supported yet; ${quote(database)} differs from ${quote(firstDatabase)}.`;

// ---------------------------------------- Join / Difference ----------------------------------------

export const MESSAGE_LEFT_JOIN_COLUMNS_EMPTY =
  'Left join columns cannot be empty.';

export const MESSAGE_RIGHT_JOIN_COLUMNS_EMPTY =
  'Right join columns cannot be empty.';

export const MESSAGE_JOIN_COLUMN_COUNTS_DIFFER =
  'Number of left join columns must be the same as number of right join columns.';

export const MESSAGE_JOIN_COLUMNS_INCOMPATIBLE = (
  left: string,
  right: string,
): string =>
  `Join columns ${quote(left)} and ${quote(right)} must be of compatible types.`;

export const MESSAGE_DUPLICATE_COLUMNS_BETWEEN_INPUTS = (
  names: readonly string[],
): string =>
  `Duplicate column names between inputs are not supported if they are not part of the join columns: ${names.map(quote).join(', ')}`;

export const MESSAGE_DIFFERENCE_COLUMN_TYPE_DIFFERS = (name: string): string =>
  `Difference column ${quote(name)} must have same type in both input schemas.`;

export const MESSAGE_DIFFERENCE_COLUMN_NOT_NUMERIC = (name: string): string =>
  `Difference column ${quote(name)} must be of numeric type.`;

export const MESSAGE_INPUT_SCHEMAS_DIFFER =
  'Both input schemas must be identical.';

// ---------------------------------------- Aggregations / sorts ----------------------------------------

export const MESSAGE_AGGREGATION_FUNCTION_EMPTY =
  'Aggregation function cannot be empty.';

export const MESSAGE_AGGREGATION_FUNCTION_UNKNOWN = (
  aggregation: string,
): string => `Aggregation function ${quote(aggregation)} is unknown.`;

export const MESSAGE_AGGREGATION_FUNCTION_DISALLOWS_COLUMN = (
  aggregation: string,
): string =>
  `Aggregation function ${quote(aggregation)} does not allow column.`;

export const MESSAGE_AGGREGATION_FUNCTION_INCOMPATIBLE = (
  aggregation: string,
  column: string,
): string =>
  `Aggregation function ${quote(aggregation)} is incompatible with column ${quote(column)}.`;

export const MESSAGE_AGGREGATION_OUTPUT_NAME_EMPTY =
  'Aggregation output name cannot be empty.';

export const MESSAGE_AGGREGATION_OUTPUT_NAME_IS_INPUT_COLUMN = (
  name: string,
): string =>
  `Aggregation output name ${quote(name)} cannot be the same as input column name.`;

export const MESSAGE_SORT_DIRECTION_EMPTY = 'Sort direction cannot be empty.';

export const MESSAGE_SORT_DIRECTION_UNKNOWN = (direction: string): string =>
  `Sort direction ${quote(direction)} is unknown.`;

// ---------------------------------------- Rename / Extend / Filter ----------------------------------------

export const MESSAGE_NEW_COLUMN_NAME_EMPTY = 'New column name cannot be empty.';

export const MESSAGE_NEW_COLUMN_NAME_INVALID =
  'New column name is not valid column name.';

export const MESSAGE_NEW_COLUMN_NAME_SAME_AS_OLD = (name: string): string =>
  `New column name ${quote(name)} cannot be the same as old column name.`;

export const MESSAGE_NEW_COLUMN_NAME_SAME_AS_OTHER = (name: string): string =>
  `New column name ${quote(name)} cannot be the same as other column name.`;

export const MESSAGE_NO_EXPRESSION = (name: string): string =>
  `${quote(name)} does not have an expression.`;

export const MESSAGE_NO_VALID_TYPE = (name: string): string =>
  `${quote(name)} does not have a valid type.`;

export const MESSAGE_FILTER_EMPTY = 'Filter cannot be empty.';

/** Spec §8.5: a filter this version can't read, kept as it was saved */
export const MESSAGE_FILTER_UNSUPPORTED = 'This filter is not supported yet.';

export const MESSAGE_FILTER_VALUE_REQUIRED = 'Filter value is required.';

export const MESSAGE_COMPOSITE_FILTER_EMPTY =
  'Composite filter cannot be empty.';

/** Added by Cube: operators are offered per type family */
export const MESSAGE_FILTER_OPERATOR_UNSUPPORTED = (
  operator: string,
  column: string,
  type: string,
): string =>
  `Filter operator ${quote(operator)} is not supported for column ${quote(column)} of type ${type}.`;

/** Added by Cube: filter values are checked against the column type */
export const MESSAGE_FILTER_VALUE_INVALID = (
  value: string,
  type: string,
): string => `Filter value ${quote(value)} is not a valid ${type}.`;

/** Added by Cube: filter values are checked against the column type */
export const MESSAGE_FILTER_VALUE_OUT_OF_RANGE = (
  value: string,
  type: string,
): string => `Filter value ${quote(value)} is out of range for ${type}.`;

/** Added by Cube: Variant and unknown types can't be compared, so not sorted either (PLAN §11.4) */
export const MESSAGE_SORT_COLUMN_NOT_SORTABLE = (
  column: string,
  typeName: string,
): string =>
  `Sort column ${quote(column)} of type ${typeName} cannot be sorted.`;

/**
 * Added by Cube: a Sort whose order is lost before it is used, as a Join loses
 * it; a warning, never a validation error (PLAN §11.4). The node is named by
 * its id, which its tooltip and editor show.
 */
export const MESSAGE_SORT_ORDER_LOST = (nodeId: string): string =>
  `This sort has no effect: ${nodeId} does not keep the row order. A sort only orders the query's output, or the rows a later Drop, Limit or Slice takes.`;

/** Added by Cube: a Sort some of whose columns a later Restrict removes before the order is used (PLAN §11.4) */
export const MESSAGE_SORT_COLUMNS_DROPPED = (
  columns: readonly string[],
  nodeId: string,
): string =>
  `Sorting by ${columns.map(quote).join(', ')} has no effect: ${nodeId} removes ${
    columns.length === 1 ? 'that column' : 'those columns'
  } before the order is used.`;

/** Added by Cube: a Sort's columns a later node keeps, but no longer orders by, as they came after a removed one (PLAN §11.4) */
export const MESSAGE_SORT_COLUMNS_CUT = (columns: readonly string[]): string =>
  `Sorting by ${columns.map(quote).join(', ')} has no effect either: ${
    columns.length === 1 ? 'it comes' : 'they come'
  } after a removed column.`;

/** Added by Cube: the engine does not escape `\` in `LIKE` patterns yet (PLAN Appendix B) */
export const MESSAGE_FILTER_VALUE_BACKSLASH = (operator: string): string =>
  `Filter values for ${quote(operator)} cannot contain a backslash (\\) yet.`;

// ---------------------------------------- Display ----------------------------------------

/** The placeholder for any missing value anywhere in the UI */
export const BLANK_PLACEHOLDER = '(blank)';
