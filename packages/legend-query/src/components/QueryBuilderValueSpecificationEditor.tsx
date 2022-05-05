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

import { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import {
  clsx,
  type TooltipPlacement,
  Tooltip,
  CustomSelectorInput,
  InfoCircleIcon,
  PencilIcon,
  DollarIcon,
  CheckSquareIcon,
  SquareIcon,
  SaveIcon,
  RefreshIcon,
} from '@finos/legend-art';
import {
  guaranteeNonNullable,
  isNonNullable,
  returnUndefOnError,
  uniq,
} from '@finos/legend-shared';
import CSVParser from 'papaparse';
import {
  type PureModel,
  type Enum,
  type Type,
  type ValueSpecification,
  Enumeration,
  GenericType,
  GenericTypeExplicitReference,
  PrimitiveType,
  CollectionInstanceValue,
  EnumValueExplicitReference,
  EnumValueInstanceValue,
  PrimitiveInstanceValue,
  PRIMITIVE_TYPE,
  TYPICAL_MULTIPLICITY_TYPE,
  VariableExpression,
  INTERNAL__PropagatedValue,
  SimpleFunctionExpression,
} from '@finos/legend-graph';
import { getMultiplicityDescription } from './shared/QueryBuilderUtils';
import {
  instanceValue_changeValue,
  instanceValue_changeValues,
} from '../stores/QueryBuilderValueSpecificationModifierHelper';
import { QueryBuilderCustomDatePicker } from './QueryBuilderCustomDatePicker';

type TypeCheckOption = {
  expectedType: Type;
  /**
   * Indicates if a strict type-matching will happen.
   * Sometimes, auto-boxing allow some rooms to wiggle,
   * for example we can assign a Float to an Integer, a
   * Date to a DateTime. With this flag set to `true`
   * we will not allow this.
   */
  match?: boolean;
};

const QueryBuilderParameterInfoTooltip: React.FC<{
  variable: VariableExpression;
  children: React.ReactElement;
  placement?: TooltipPlacement | undefined;
}> = (props) => {
  const { variable, children, placement } = props;
  const type = variable.genericType?.value.rawType;
  return (
    <Tooltip
      arrow={true}
      {...(placement !== undefined ? { placement } : {})}
      classes={{
        tooltip: 'query-builder__tooltip',
        arrow: 'query-builder__tooltip__arrow',
        tooltipPlacementRight: 'query-builder__tooltip--right',
      }}
      TransitionProps={{
        // disable transition
        // NOTE: somehow, this is the only workaround we have, if for example
        // we set `appear = true`, the tooltip will jump out of position
        timeout: 0,
      }}
      title={
        <div className="query-builder__tooltip__content">
          <div className="query-builder__tooltip__item">
            <div className="query-builder__tooltip__item__label">Type</div>
            <div className="query-builder__tooltip__item__value">
              {type?.name ?? ''}
            </div>
          </div>
          <div className="query-builder__tooltip__item">
            <div className="query-builder__tooltip__item__label">Var Name</div>
            <div className="query-builder__tooltip__item__value">
              {variable.name}
            </div>
          </div>
          <div className="query-builder__tooltip__item">
            <div className="query-builder__tooltip__item__label">
              Multiplicity
            </div>
            <div className="query-builder__tooltip__item__value">
              {getMultiplicityDescription(variable.multiplicity)}
            </div>
          </div>
        </div>
      }
    >
      {children}
    </Tooltip>
  );
};

const VariableExpressionParameterEditor = observer(
  (props: {
    valueSpecification: VariableExpression;
    className?: string | undefined;
    resetValue: () => void;
  }) => {
    const { valueSpecification, className } = props;
    const varName = valueSpecification.name;
    return (
      <div
        className={clsx(
          'query-builder-value-spec-editor__parameter',
          className,
        )}
      >
        <div className="query-builder-value-spec-editor__parameter__icon">
          <DollarIcon />
        </div>
        <div className="query-builder-value-spec-editor__parameter__label">
          <div className="query-builder-value-spec-editor__parameter__text">
            {varName}
          </div>
          <QueryBuilderParameterInfoTooltip variable={valueSpecification}>
            <div className="query-builder-value-spec-editor__parameter__info">
              <InfoCircleIcon />
            </div>
          </QueryBuilderParameterInfoTooltip>
        </div>
      </div>
    );
  },
);

const StringPrimitiveInstanceValueEditor = observer(
  (props: {
    valueSpecification: PrimitiveInstanceValue;
    className?: string | undefined;
    resetValue: () => void;
  }) => {
    const { valueSpecification, className, resetValue } = props;
    const value = valueSpecification.values[0] as string;
    const changeValue: React.ChangeEventHandler<HTMLInputElement> = (event) =>
      instanceValue_changeValue(valueSpecification, event.target.value, 0);

    return (
      <div className={clsx('query-builder-value-spec-editor', className)}>
        <input
          className="panel__content__form__section__input query-builder-value-spec-editor__input"
          spellCheck={false}
          value={value}
          placeholder={value === '' ? '(empty)' : undefined}
          onChange={changeValue}
        />
        <button
          className="query-builder-value-spec-editor__reset-btn"
          title="Reset"
          onClick={resetValue}
        >
          <RefreshIcon />
        </button>
      </div>
    );
  },
);

const BooleanPrimitiveInstanceValueEditor = observer(
  (props: {
    valueSpecification: PrimitiveInstanceValue;
    className?: string | undefined;
    resetValue: () => void;
  }) => {
    const { valueSpecification, className, resetValue } = props;
    const value = valueSpecification.values[0] as boolean;
    const toggleValue = (): void =>
      instanceValue_changeValue(valueSpecification, !value, 0);

    return (
      <div className={clsx('query-builder-value-spec-editor', className)}>
        <button
          className={clsx('query-builder-value-spec-editor__toggler__btn', {
            'query-builder-value-spec-editor__toggler__btn--toggled': value,
          })}
          onClick={toggleValue}
        >
          {value ? <CheckSquareIcon /> : <SquareIcon />}
        </button>
        <button
          className="query-builder-value-spec-editor__reset-btn"
          title="Reset"
          onClick={resetValue}
        >
          <RefreshIcon />
        </button>
      </div>
    );
  },
);

const NumberPrimitiveInstanceValueEditor = observer(
  (props: {
    valueSpecification: PrimitiveInstanceValue;
    isInteger: boolean;
    className?: string | undefined;
    resetValue: () => void;
  }) => {
    const { valueSpecification, isInteger, className, resetValue } = props;
    const value = valueSpecification.values[0] as number;
    const changeValue: React.ChangeEventHandler<HTMLInputElement> = (event) => {
      let inputVal = isInteger
        ? parseInt(event.target.value, 10)
        : parseFloat(event.target.value);
      inputVal = isNaN(inputVal) ? 0 : inputVal;
      instanceValue_changeValue(valueSpecification, inputVal, 0);
    };

    return (
      <div className={clsx('query-builder-value-spec-editor', className)}>
        <input
          className="panel__content__form__section__input query-builder-value-spec-editor__input"
          spellCheck={false}
          type="number"
          value={value}
          onChange={changeValue}
        />
        <button
          className="query-builder-value-spec-editor__reset-btn"
          title="Reset"
          onClick={resetValue}
        >
          <RefreshIcon />
        </button>
      </div>
    );
  },
);

const EnumValueInstanceValueEditor = observer(
  (props: {
    valueSpecification: EnumValueInstanceValue;
    className?: string | undefined;
    resetValue: () => void;
  }) => {
    const { valueSpecification, className, resetValue } = props;
    const enumValueRef = guaranteeNonNullable(valueSpecification.values[0]);
    const enumValue = enumValueRef.value;
    const options = enumValue.owner.values.map((value) => ({
      label: value.name,
      value: value,
    }));
    const changeValue = (val: { value: Enum; label: string }): void => {
      instanceValue_changeValue(
        valueSpecification,
        EnumValueExplicitReference.create(val.value),
        0,
      );
    };

    return (
      <div className={clsx('query-builder-value-spec-editor', className)}>
        <CustomSelectorInput
          className="query-builder-value-spec-editor__enum-selector"
          options={options}
          onChange={changeValue}
          value={{ value: enumValue, label: enumValue.name }}
          darkMode={true}
        />
        <button
          className="query-builder-value-spec-editor__reset-btn"
          title="Reset"
          onClick={resetValue}
        >
          <RefreshIcon />
        </button>
      </div>
    );
  },
);

const stringifyValue = (values: ValueSpecification[]): string => {
  if (values.length === 0) {
    return '';
  }
  return CSVParser.unparse([
    values
      .map((val) => {
        if (val instanceof PrimitiveInstanceValue) {
          return val.values[0];
        } else if (val instanceof EnumValueInstanceValue) {
          return guaranteeNonNullable(val.values[0]).value.name;
        }
        return undefined;
      })
      .filter(isNonNullable),
  ]).trim();
};

/**
 * NOTE: We attempt to be less disruptive here by not throwing errors left and right, instead
 * we silently remove values which are not valid or parsable. But perhaps, we can consider
 * passing in logger or notifier to show give the users some idea of what went wrong instead
 * of silently swallow parts of their inputs like this.
 */
const setCollectionValue = (
  valueSpecification: CollectionInstanceValue,
  graph: PureModel,
  expectedType: Type,
  value: string,
): void => {
  if (value.trim().length === 0) {
    instanceValue_changeValues(valueSpecification, []);
    return;
  }
  const multiplicityOne = graph.getTypicalMultiplicity(
    TYPICAL_MULTIPLICITY_TYPE.ONE,
  );
  let result: unknown[] = [];
  const parseResult = CSVParser.parse<string[]>(value.trim(), {
    delimiter: ',',
  });
  const parseData = parseResult.data[0] as string[]; // only take the first line
  if (parseResult.errors.length) {
    if (
      parseResult.errors[0] &&
      parseResult.errors[0].code === 'UndetectableDelimiter' &&
      parseResult.errors[0].type === 'Delimiter' &&
      parseResult.data.length === 1
    ) {
      // NOTE: this happens when the user only put one item in the value input
      // we can go the other way by ensure the input has a comma but this is arguably neater
      // as it tinkers with the parser
    } else {
      // there were some parsing error, escape
      // NOTE: ideally, we could show a warning here
      return;
    }
  } else if (expectedType instanceof PrimitiveType) {
    switch (expectedType.path) {
      case PRIMITIVE_TYPE.STRING: {
        result = uniq(parseData)
          .map((item): PrimitiveInstanceValue | undefined => {
            const primitiveInstanceValue = new PrimitiveInstanceValue(
              GenericTypeExplicitReference.create(
                new GenericType(expectedType),
              ),
              multiplicityOne,
            );
            primitiveInstanceValue.values = [item.toString()];
            return primitiveInstanceValue;
          })
          .filter(isNonNullable);
        break;
      }
      case PRIMITIVE_TYPE.NUMBER:
      case PRIMITIVE_TYPE.FLOAT:
      case PRIMITIVE_TYPE.DECIMAL:
      case PRIMITIVE_TYPE.INTEGER: {
        result = uniq(
          parseData
            .filter((val) => !isNaN(Number(val)))
            .map((val) => Number(val)),
        )
          .map((item): PrimitiveInstanceValue | undefined => {
            const primitiveInstanceValue = new PrimitiveInstanceValue(
              GenericTypeExplicitReference.create(
                new GenericType(expectedType),
              ),
              multiplicityOne,
            );
            primitiveInstanceValue.values = [item];
            return primitiveInstanceValue;
          })
          .filter(isNonNullable);
        break;
      }
      default:
        // unsupported expected type, just escape
        return;
    }
  } else if (expectedType instanceof Enumeration) {
    result = uniq(parseData.map((item) => item.trim()))
      .map((item): EnumValueInstanceValue | undefined => {
        const _enum = returnUndefOnError(() => expectedType.getValue(item));
        if (!_enum) {
          return undefined;
        }
        const enumValueInstanceValue = new EnumValueInstanceValue(
          GenericTypeExplicitReference.create(new GenericType(expectedType)),
          multiplicityOne,
        );
        enumValueInstanceValue.values = [
          EnumValueExplicitReference.create(_enum),
        ];
        return enumValueInstanceValue;
      })
      .filter(isNonNullable);
  }
  instanceValue_changeValues(valueSpecification, result);
};

const COLLECTION_PREVIEW_CHAR_LIMIT = 50;

const CollectionValueInstanceValueEditor = observer(
  (props: {
    valueSpecification: CollectionInstanceValue;
    graph: PureModel;
    expectedType: Type;
    className?: string | undefined;
    resetValue: () => void;
  }) => {
    const { valueSpecification, graph, expectedType, className, resetValue } =
      props;
    const inputRef = useRef<HTMLInputElement>(null);
    const [text, setText] = useState(stringifyValue(valueSpecification.values));
    const [editable, setEditable] = useState(false);
    const valueText = stringifyValue(valueSpecification.values);
    const previewText = `List(${
      valueSpecification.values.length === 0
        ? 'empty'
        : valueSpecification.values.length
    })${
      valueSpecification.values.length === 0
        ? ''
        : `: ${
            valueText.length > COLLECTION_PREVIEW_CHAR_LIMIT
              ? `${valueText.substring(0, COLLECTION_PREVIEW_CHAR_LIMIT)}...`
              : valueText
          }`
    }`;
    const enableEdit = (): void => setEditable(true);
    const saveEdit = (): void => {
      setEditable(false);
      setCollectionValue(valueSpecification, graph, expectedType, text);
      setText(stringifyValue(valueSpecification.values));
    };
    const changeValue: React.ChangeEventHandler<HTMLInputElement> = (event) =>
      setText(event.target.value);

    // focus the input box when edit is enabled
    useEffect(() => {
      if (editable) {
        inputRef.current?.focus();
      }
    }, [editable]);

    if (editable) {
      return (
        <div className={clsx('query-builder-value-spec-editor', className)}>
          <input
            ref={inputRef}
            className="panel__content__form__section__input query-builder-value-spec-editor__input"
            spellCheck={false}
            value={text}
            placeholder={text === '' ? '(empty)' : undefined}
            onChange={changeValue}
          />
          <button
            className="query-builder-value-spec-editor__list-editor__save-button btn--dark"
            onClick={saveEdit}
          >
            <SaveIcon />
          </button>
          <button
            className="query-builder-value-spec-editor__reset-btn"
            title="Reset"
            onClick={resetValue}
          >
            <RefreshIcon />
          </button>
        </div>
      );
    }
    return (
      <div
        className={clsx('query-builder-value-spec-editor', className)}
        onClick={enableEdit}
        title="Click to edit"
      >
        <input
          className="query-builder-value-spec-editor__list-editor__preview"
          spellCheck={false}
          value={previewText}
          disabled={true}
        />
        <button className="query-builder-value-spec-editor__list-editor__edit-icon">
          <PencilIcon />
        </button>
      </div>
    );
  },
);

const QueryBuilderUnsupportedValueSpecificationEditor: React.FC = () => (
  <div className="query-builder-value-spec-editor--unsupported">
    unsupported
  </div>
);

const DateInstanceValueEditor = observer(
  (props: {
    valueSpecification: PrimitiveInstanceValue | SimpleFunctionExpression;
    graph: PureModel;
    typeCheckOption: TypeCheckOption;
    className?: string | undefined;
    updateValue: (val: ValueSpecification) => void;
    resetValue: () => void;
  }) => {
    const {
      valueSpecification,
      updateValue,
      graph,
      typeCheckOption,
      resetValue,
    } = props;

    return (
      <div className="query-builder-value-spec-editor">
        <QueryBuilderCustomDatePicker
          valueSpecification={valueSpecification}
          graph={graph}
          typeCheckOption={typeCheckOption}
          updateValue={updateValue}
        />
        <button
          className="query-builder-value-spec-editor__reset-btn"
          title="Reset"
          onClick={resetValue}
        >
          <RefreshIcon />
        </button>
      </div>
    );
  },
);

/**
 * TODO we should pass in the props `setValueSpecification` and `resetValueSpecification`. Reset
 * should be part of this editor. Also through here we can call `observe_` accordingly.
 *
 * See https://github.com/finos/legend-studio/pull/1021
 */
export const QueryBuilderValueSpecificationEditor: React.FC<{
  valueSpecification: ValueSpecification;
  graph: PureModel;
  typeCheckOption: TypeCheckOption;
  className?: string | undefined;
  updateValue: (val: ValueSpecification) => void;
  resetValue: () => void;
}> = (props) => {
  const {
    className,
    valueSpecification,
    graph,
    typeCheckOption,
    updateValue,
    resetValue,
  } = props;
  if (valueSpecification instanceof PrimitiveInstanceValue) {
    const _type = valueSpecification.genericType.value.rawType;
    switch (_type.path) {
      case PRIMITIVE_TYPE.STRING:
        return (
          <StringPrimitiveInstanceValueEditor
            valueSpecification={valueSpecification}
            className={className}
            resetValue={resetValue}
          />
        );
      case PRIMITIVE_TYPE.BOOLEAN:
        return (
          <BooleanPrimitiveInstanceValueEditor
            valueSpecification={valueSpecification}
            className={className}
            resetValue={resetValue}
          />
        );
      case PRIMITIVE_TYPE.NUMBER:
      case PRIMITIVE_TYPE.FLOAT:
      case PRIMITIVE_TYPE.DECIMAL:
      case PRIMITIVE_TYPE.INTEGER:
        return (
          <NumberPrimitiveInstanceValueEditor
            valueSpecification={valueSpecification}
            isInteger={_type.path === PRIMITIVE_TYPE.INTEGER}
            className={className}
            resetValue={resetValue}
          />
        );
      case PRIMITIVE_TYPE.DATE:
      case PRIMITIVE_TYPE.STRICTDATE:
      case PRIMITIVE_TYPE.DATETIME:
      case PRIMITIVE_TYPE.LATESTDATE:
        return (
          <DateInstanceValueEditor
            valueSpecification={valueSpecification}
            graph={graph}
            typeCheckOption={typeCheckOption}
            className={className}
            updateValue={updateValue}
            resetValue={resetValue}
          />
        );
      default:
        return <QueryBuilderUnsupportedValueSpecificationEditor />;
    }
  } else if (valueSpecification instanceof EnumValueInstanceValue) {
    return (
      <EnumValueInstanceValueEditor
        valueSpecification={valueSpecification}
        className={className}
        resetValue={resetValue}
      />
    );
  } else if (
    valueSpecification instanceof CollectionInstanceValue &&
    valueSpecification.genericType
  ) {
    // NOTE: since when we fill in the arguments, `[]` (or `nullish` value in Pure)
    // is used for parameters we don't handle, we should not attempt to support empty collection
    // without generic type here as that  is equivalent to `[]`
    return (
      <CollectionValueInstanceValueEditor
        valueSpecification={valueSpecification}
        graph={graph}
        expectedType={typeCheckOption.expectedType}
        className={className}
        resetValue={resetValue}
      />
    );
  }
  // property expression
  else if (valueSpecification instanceof VariableExpression) {
    return (
      <VariableExpressionParameterEditor
        valueSpecification={valueSpecification}
        className={className}
        resetValue={resetValue}
      />
    );
  } else if (valueSpecification instanceof INTERNAL__PropagatedValue) {
    return (
      <QueryBuilderValueSpecificationEditor
        valueSpecification={valueSpecification.getValue()}
        graph={graph}
        typeCheckOption={typeCheckOption}
        updateValue={updateValue}
        resetValue={resetValue}
      />
    );
  } else if (
    valueSpecification instanceof SimpleFunctionExpression &&
    [
      PRIMITIVE_TYPE.DATE.toString(),
      PRIMITIVE_TYPE.STRICTDATE.toString(),
      PRIMITIVE_TYPE.DATETIME.toString(),
      PRIMITIVE_TYPE.LATESTDATE.toString(),
    ].includes(typeCheckOption.expectedType.path)
  ) {
    return (
      <DateInstanceValueEditor
        valueSpecification={valueSpecification}
        graph={graph}
        typeCheckOption={typeCheckOption}
        className={className}
        updateValue={updateValue}
        resetValue={resetValue}
      />
    );
  }
  return <QueryBuilderUnsupportedValueSpecificationEditor />;
};
