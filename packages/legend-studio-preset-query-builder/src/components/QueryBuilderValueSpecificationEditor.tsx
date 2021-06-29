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
import type {
  Enum,
  PureModel,
  Type,
  ValueSpecification,
} from '@finos/legend-studio';
import {
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
} from '@finos/legend-studio';
import { FaCheckSquare, FaSquare, FaSave } from 'react-icons/fa';
import { observer } from 'mobx-react-lite';
import {
  clsx,
  CustomSelectorInput,
  PencilIcon,
} from '@finos/legend-studio-components';
import {
  guaranteeNonNullable,
  isNonNullable,
  returnUndefOnError,
  uniq,
} from '@finos/legend-studio-shared';
import CSVParser from 'papaparse';

const StringPrimitiveInstanceValueEditor = observer(
  (props: { valueSpecification: PrimitiveInstanceValue }) => {
    const { valueSpecification } = props;
    const value = valueSpecification.values[0] as string;
    const changeValue: React.ChangeEventHandler<HTMLInputElement> = (event) =>
      valueSpecification.changeValue(event.target.value, 0);

    return (
      <div className="query-builder-value-spec-editor">
        <input
          className="panel__content__form__section__input query-builder-value-spec-editor__input"
          spellCheck={false}
          value={value}
          placeholder={value === '' ? '(empty)' : undefined}
          onChange={changeValue}
        />
      </div>
    );
  },
);

const BooleanPrimitiveInstanceValueEditor = observer(
  (props: { valueSpecification: PrimitiveInstanceValue }) => {
    const { valueSpecification } = props;
    const value = valueSpecification.values[0] as boolean;
    const toggleValue = (): void => valueSpecification.changeValue(!value, 0);

    return (
      <div className="query-builder-value-spec-editor">
        <button
          className={clsx('query-builder-value-spec-editor__toggler__btn', {
            'query-builder-value-spec-editor__toggler__btn--toggled': value,
          })}
          onClick={toggleValue}
        >
          {value ? <FaCheckSquare /> : <FaSquare />}
        </button>
      </div>
    );
  },
);

const NumberPrimitiveInstanceValueEditor = observer(
  (props: {
    valueSpecification: PrimitiveInstanceValue;
    isInteger: boolean;
  }) => {
    const { valueSpecification, isInteger } = props;
    const value = valueSpecification.values[0] as number;
    const changeValue: React.ChangeEventHandler<HTMLInputElement> = (event) => {
      let inputVal = isInteger
        ? parseInt(event.target.value, 10)
        : parseFloat(event.target.value);
      inputVal = isNaN(inputVal) ? 0 : inputVal;
      valueSpecification.changeValue(inputVal, 0);
    };

    return (
      <div className="query-builder-value-spec-editor">
        <input
          className="panel__content__form__section__input query-builder-value-spec-editor__input"
          spellCheck={false}
          type="number"
          value={value}
          onChange={changeValue}
        />
      </div>
    );
  },
);

const DatePrimitiveInstanceValueEditor = observer(
  (props: { valueSpecification: PrimitiveInstanceValue }) => {
    const { valueSpecification } = props;
    const value = valueSpecification.values[0] as string;
    const changeValue: React.ChangeEventHandler<HTMLInputElement> = (event) =>
      valueSpecification.changeValue(event.target.value, 0);

    return (
      <div className="query-builder-value-spec-editor">
        <input
          className="panel__content__form__section__input query-builder-value-spec-editor__input"
          type="date"
          spellCheck={false}
          value={value}
          onChange={changeValue}
        />
      </div>
    );
  },
);

const EnumValueInstanceValueEditor = observer(
  (props: { valueSpecification: EnumValueInstanceValue }) => {
    const { valueSpecification } = props;
    const enumValueRef = guaranteeNonNullable(valueSpecification.values[0]);
    const enumValue = enumValueRef.value;
    const options = enumValue.owner.values.map((value) => ({
      label: value.name,
      value: value,
    }));
    const changeValue = (val: { value: Enum; label: string }): void => {
      valueSpecification.changeValue(
        EnumValueExplicitReference.create(val.value),
        0,
      );
    };

    return (
      <div className="query-builder-value-spec-editor">
        <CustomSelectorInput
          className="u-full-width"
          options={options}
          onChange={changeValue}
          value={{ value: enumValue, label: enumValue.name }}
          darkMode={true}
        />
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
    valueSpecification.changeValues([]);
    return;
  }
  const multiplicityOne = graph.getTypicalMultiplicity(
    TYPICAL_MULTIPLICITY_TYPE.ONE,
  );
  let result: unknown[] = [];
  const parseResult = CSVParser.parse<string[]>(value.trim(), {
    delimiter: ',',
  });
  const parseData = parseResult.data[0]; // only take the first line
  if (parseResult.errors.length) {
    if (
      parseResult.errors.length === 1 &&
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
  valueSpecification.changeValues(result);
};

const COLLECTION_PREVIEW_CHAR_LIMIT = 50;

const CollectionValueInstanceValueEditor = observer(
  (props: {
    valueSpecification: CollectionInstanceValue;
    graph: PureModel;
    expectedType: Type;
  }) => {
    const { valueSpecification, graph, expectedType } = props;
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
        <div className="query-builder-value-spec-editor">
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
            <FaSave />
          </button>
        </div>
      );
    }
    return (
      <div
        className="query-builder-value-spec-editor"
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

export const QueryBuilderUnsupportedValueSpecificationEditor: React.FC<{}> =
  () => (
    <div className="query-builder-value-spec-editor--unsupported">
      unsupported
    </div>
  );

export const QueryBuilderValueSpecificationEditor: React.FC<{
  valueSpecification: ValueSpecification;
  graph: PureModel;
  expectedType: Type;
}> = (props) => {
  const { valueSpecification, graph, expectedType } = props;
  if (valueSpecification instanceof PrimitiveInstanceValue) {
    const _type = valueSpecification.genericType.value.rawType;
    switch (_type.path) {
      case PRIMITIVE_TYPE.STRING:
        return (
          <StringPrimitiveInstanceValueEditor
            valueSpecification={valueSpecification}
          />
        );
      case PRIMITIVE_TYPE.BOOLEAN:
        return (
          <BooleanPrimitiveInstanceValueEditor
            valueSpecification={valueSpecification}
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
          />
        );
      case PRIMITIVE_TYPE.STRICTDATE:
        return (
          <DatePrimitiveInstanceValueEditor
            valueSpecification={valueSpecification}
          />
        );
      default:
        return <QueryBuilderUnsupportedValueSpecificationEditor />;
    }
  } else if (valueSpecification instanceof EnumValueInstanceValue) {
    return (
      <EnumValueInstanceValueEditor valueSpecification={valueSpecification} />
    );
  } else if (valueSpecification instanceof CollectionInstanceValue) {
    return (
      <CollectionValueInstanceValueEditor
        valueSpecification={valueSpecification}
        graph={graph}
        expectedType={expectedType}
      />
    );
  }
  // property expression
  // variable expression
  return <QueryBuilderUnsupportedValueSpecificationEditor />;
};
