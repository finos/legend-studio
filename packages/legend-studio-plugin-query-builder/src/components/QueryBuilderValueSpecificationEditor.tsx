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

import type { Enum, ValueSpecification } from '@finos/legend-studio';
import {
  EnumValueExplicitReference,
  EnumValueInstanceValue,
  PrimitiveInstanceValue,
  PRIMITIVE_TYPE,
} from '@finos/legend-studio';
import { FaCheckSquare, FaSquare } from 'react-icons/fa';
import { observer } from 'mobx-react-lite';
import { clsx, CustomSelectorInput } from '@finos/legend-studio-components';
import { guaranteeNonNullable } from '@finos/legend-studio-shared';

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
          className="query-builder__projection__options__sort__dropdown"
          options={options}
          onChange={changeValue}
          value={{ value: enumValue, label: enumValue.name }}
          darkMode={true}
        />
      </div>
    );
  },
);

export const QueryBuilderValueSpecificationEditor: React.FC<{
  valueSpecification: ValueSpecification;
}> = (props) => {
  const { valueSpecification } = props;
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
        return <div>(unsupported)</div>;
    }
  } else if (valueSpecification instanceof EnumValueInstanceValue) {
    return (
      <EnumValueInstanceValueEditor valueSpecification={valueSpecification} />
    );
  }
  // property expression
  // variable expression
  return <div>(unsupported)</div>;
};
