import { PRIMITIVE_TYPE } from '@finos/legend-graph';
import {
  DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS,
  DATA_QUALITY_TERMINAL_ASSERTION_HELPER_FUNCTIONS,
  PARAMETER_COMPONENTS,
  SUPPORTED_TYPES,
} from '../constants/DataQualityConstants.js';

export type colSpecType = {
  name: string;
};

export type colSpecArrayType = { colSpecs: colSpecType[] };

export type LambdaBody = {
  function?: string;
  name?: string;
  parameters: LambdaBody[];
  _type: string;
  type?: string;
  value?: string | number | boolean | colSpecType | colSpecArrayType;
};

export interface ValidationParameters {
  relationalRef?:
    | {
        value: string;
        type: string;
      }
    | undefined;
  columns: { value?: string[] | string; type: string };
  otherParams: {
    value?: string | number | boolean | undefined;
    type: string;
  }[];
}

export class DataQualityValidationHelperUtils {
  static getHelperFunctionDetails(functionName: string): {
    description: string;
    defaultParams: ValidationParameters;
  } {
    switch (functionName) {
      case DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS.ROWS_WITH_EMPTY_COLUMN:
        return {
          description: 'Expect [column] not to be null',
          defaultParams: {
            columns: {
              type: SUPPORTED_TYPES.COL_SPEC,
            },
            otherParams: [],
          },
        };

      case DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS.ROWS_WITH_NON_EMPTY_COLUMN:
        return {
          description: 'Expect [column] to be null',
          defaultParams: {
            columns: {
              type: SUPPORTED_TYPES.COL_SPEC,
            },
            otherParams: [],
          },
        };
      case DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS.ROWS_WITH_COLUMN_LONGER_THAN:
        return {
          description: 'Expect [column] to have length [param-1]',
          defaultParams: {
            columns: {
              type: SUPPORTED_TYPES.COL_SPEC,
            },
            otherParams: [
              {
                type: SUPPORTED_TYPES.INTEGER,
              },
            ],
          },
        };
      case DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS.ROWS_WITH_NEGATIVE_VALUE:
        return {
          description: 'Expect [column] to be positive',
          defaultParams: {
            columns: {
              type: SUPPORTED_TYPES.COL_SPEC,
            },
            otherParams: [],
          },
        };
      case DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS.ROWS_WITH_COLUMN_DIFFERS_FROM_PATTERN:
        return {
          description: 'Expect [column] to satisfy the specified pattern',
          defaultParams: {
            columns: {
              type: SUPPORTED_TYPES.COL_SPEC,
            },
            otherParams: [
              {
                type: SUPPORTED_TYPES.STRING,
              },
            ],
          },
        };
      case DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS.ROWS_WITH_VALUE_OUTSIDE_RANGE:
        return {
          description: 'Expect [column] to be between [param-1] and [param-2]',
          defaultParams: {
            columns: {
              type: SUPPORTED_TYPES.COL_SPEC,
            },
            otherParams: [
              {
                type: SUPPORTED_TYPES.INTEGER,
              },
              {
                type: SUPPORTED_TYPES.INTEGER,
              },
            ],
          },
        };
      case DATA_QUALITY_TERMINAL_ASSERTION_HELPER_FUNCTIONS.ASSERT_RELATION_EMPTY:
        return {
          description: '',
          defaultParams: {
            columns: {
              type: SUPPORTED_TYPES.COL_SPEC_ARRAY,
            },
            otherParams: [],
          },
        };
      default:
        return {
          description: '',
          defaultParams: {
            columns: {
              type: SUPPORTED_TYPES.COL_SPEC,
            },
            otherParams: [],
          },
        };
    }
  }

  static processFunctionParameter(params: LambdaBody[]): ValidationParameters {
    let columns: ValidationParameters['columns'] =
      {} as ValidationParameters['columns'];
    const otherParams: ValidationParameters['otherParams'] = [];
    let relationalRef: ValidationParameters['relationalRef'];

    const createColValue = (
      cols: colSpecType[] | colSpecType,
      type: SUPPORTED_TYPES,
    ) => {
      return {
        value: Array.isArray(cols) ? cols.map(({ name }) => name) : cols.name,
        type,
      };
    };

    const createOtherValue = (
      type: string,
      value: string | number | boolean | undefined,
    ) => {
      return {
        value,
        type,
      };
    };

    params.forEach((param) => {
      const { _type, type, name, value } = param;

      switch (_type) {
        case SUPPORTED_TYPES.CLASS_INSTANCE:
          switch (type) {
            case SUPPORTED_TYPES.COL_SPEC:
              columns = createColValue(value as colSpecType, type);
              break;
            case SUPPORTED_TYPES.COL_SPEC_ARRAY:
              columns = createColValue(
                (value as colSpecArrayType).colSpecs,
                type,
              );
              break;
            default:
              break;
          }
          break;
        case SUPPORTED_TYPES.STRING:
        case SUPPORTED_TYPES.BOOLEAN:
        case SUPPORTED_TYPES.INTEGER:
        case SUPPORTED_TYPES.FLOAT:
        case SUPPORTED_TYPES.DECIMAL:
        case SUPPORTED_TYPES.FUNCTION:
          otherParams.push(
            createOtherValue(
              _type,
              value as string | number | boolean | undefined,
            ),
          );
          break;
        case SUPPORTED_TYPES.VAR:
          relationalRef = createOtherValue(
            _type,
            name as string,
          ) as ValidationParameters['relationalRef'];
          break;
        default:
          break;
      }
    });

    return {
      columns,
      otherParams,
      relationalRef,
    };
  }

  static getRequiredOtherParamsCount(name: string): number {
    switch (name) {
      case DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS.ROWS_WITH_COLUMN_LONGER_THAN:
      case DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS.ROWS_WITH_COLUMN_DIFFERS_FROM_PATTERN:
        return 1;
      case DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS.ROWS_WITH_VALUE_OUTSIDE_RANGE:
        return 2;
      default:
        return 0;
    }
  }

  static getComponentType(type: string) {
    switch (type) {
      case SUPPORTED_TYPES.STRING:
        return PARAMETER_COMPONENTS.STRING;
      case SUPPORTED_TYPES.INTEGER:
      case SUPPORTED_TYPES.FLOAT:
      case SUPPORTED_TYPES.DECIMAL:
        return PARAMETER_COMPONENTS.NUMBER;
      case SUPPORTED_TYPES.COL_SPEC:
        return PARAMETER_COMPONENTS.COLUMN;
      case SUPPORTED_TYPES.COL_SPEC_ARRAY:
        return PARAMETER_COMPONENTS.COLUMN_LIST;
      default:
        return PARAMETER_COMPONENTS.NONE;
    }
  }

  static getValidationFunctionsByColumnType(
    columnType: string,
  ): DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS[] {
    switch (columnType) {
      case PRIMITIVE_TYPE.STRING:
        return [
          DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS.ROWS_WITH_COLUMN_LONGER_THAN,
          DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS.ROWS_WITH_COLUMN_DIFFERS_FROM_PATTERN,
        ];

      case PRIMITIVE_TYPE.NUMBER:
        return [
          DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS.ROWS_WITH_NEGATIVE_VALUE,
          DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS.ROWS_WITH_VALUE_OUTSIDE_RANGE,
        ];

      default:
        return [
          DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS.ROWS_WITH_EMPTY_COLUMN,
          DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS.ROWS_WITH_NON_EMPTY_COLUMN,
        ];
    }
  }
}
