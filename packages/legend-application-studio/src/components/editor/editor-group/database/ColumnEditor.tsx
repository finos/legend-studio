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

import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import {
  LockIcon,
  PanelContent,
  PanelForm,
  PanelFormSection,
  PanelFormTextField,
  TimesIcon,
  CustomSelectorInput,
} from '@finos/legend-art';
import {
  type Column,
  type RelationalDataType,
  BigInt,
  SmallInt,
  TinyInt,
  Integer,
  Float,
  Double,
  VarChar,
  Char,
  VarBinary,
  Decimal,
  Numeric,
  Timestamp,
  Date,
  Other,
  Bit,
  Binary,
  Real,
  SemiStructured,
  Json,
} from '@finos/legend-graph';
import { LEGEND_STUDIO_TEST_ID } from '../../../../__lib__/LegendStudioTesting.js';
import {} from '@finos/legend-shared';

type RelationalDataTypeOption = {
  label: string;
  value: string;
  create: () => RelationalDataType;
};

const RELATIONAL_DATA_TYPE_OPTIONS: RelationalDataTypeOption[] = [
  {
    label: 'BigInt',
    value: 'BigInt',
    create: () => new BigInt(),
  },
  {
    label: 'SmallInt',
    value: 'SmallInt',
    create: () => new SmallInt(),
  },
  {
    label: 'TinyInt',
    value: 'TinyInt',
    create: () => new TinyInt(),
  },
  {
    label: 'Integer',
    value: 'Integer',
    create: () => new Integer(),
  },
  {
    label: 'Float',
    value: 'Float',
    create: () => new Float(),
  },
  {
    label: 'Double',
    value: 'Double',
    create: () => new Double(),
  },
  {
    label: 'VarChar',
    value: 'VarChar',
    create: () => new VarChar(255),
  },
  {
    label: 'Char',
    value: 'Char',
    create: () => new Char(255),
  },
  {
    label: 'VarBinary',
    value: 'VarBinary',
    create: () => new VarBinary(255),
  },
  {
    label: 'Decimal',
    value: 'Decimal',
    create: () => new Decimal(10, 2),
  },
  {
    label: 'Numeric',
    value: 'Numeric',
    create: () => new Numeric(10, 2),
  },
  {
    label: 'Timestamp',
    value: 'Timestamp',
    create: () => new Timestamp(),
  },
  {
    label: 'Date',
    value: 'Date',
    create: () => new Date(),
  },
  {
    label: 'Other',
    value: 'Other',
    create: () => new Other(),
  },
  {
    label: 'Bit',
    value: 'Bit',
    create: () => new Bit(),
  },
  {
    label: 'Binary',
    value: 'Binary',
    create: () => new Binary(255),
  },
  {
    label: 'Real',
    value: 'Real',
    create: () => new Real(),
  },
  {
    label: 'SemiStructured',
    value: 'SemiStructured',
    create: () => new SemiStructured(),
  },
  {
    label: 'Json',
    value: 'Json',
    create: () => new Json(),
  },
];

const getRelationalDataTypeOption = (
  type: RelationalDataType,
): RelationalDataTypeOption | undefined => {
  const typeName = type.constructor.name;
  return RELATIONAL_DATA_TYPE_OPTIONS.find(
    (option) => option.value === typeName,
  );
};
export const ColumnEditor = observer(
  (props: { column: Column; isReadOnly: boolean; onClose: () => void }) => {
    const { column, isReadOnly, onClose } = props;
    const [columnName, setColumnName] = useState(column.name);
    const [, setColumnType] = useState(String(column.type));

    const updateColumnName = (value: string | undefined): void => {
      if (!isReadOnly && value !== undefined) {
        setColumnName(value);
        column.name = value;
      }
    };

    const updateColumnType = (
      option: RelationalDataTypeOption | null,
    ): void => {
      if (!isReadOnly && option) {
        setColumnType(option.label);
        column.type = option.create();
      }
    };

    return (
      <div className="column-editor">
        <div data-testid={LEGEND_STUDIO_TEST_ID.PANEL} className="panel">
          <div className="panel__header">
            <div className="panel__header__title">
              {isReadOnly && (
                <div className="column-editor__header__lock">
                  <LockIcon />
                </div>
              )}
              <div className="panel__header__title__label">column</div>
              <div className="panel__header__title__content">{column.name}</div>
            </div>
            <div className="panel__header__actions">
              <button
                className="panel__header__action"
                onClick={onClose}
                tabIndex={-1}
                title="Close"
              >
                <TimesIcon />
              </button>
            </div>
          </div>
          <PanelContent>
            <PanelForm>
              <PanelFormSection>
                <div className="panel__content__form__section__header__label">
                  Name
                </div>
                <PanelFormTextField
                  name="columnName"
                  value={columnName}
                  isReadOnly={isReadOnly}
                  update={updateColumnName}
                />
              </PanelFormSection>
              <PanelFormSection>
                <div className="panel__content__form__section__header__label">
                  Type
                </div>
                <CustomSelectorInput
                  className="panel__content__form__section__dropdown"
                  options={RELATIONAL_DATA_TYPE_OPTIONS}
                  onChange={updateColumnType}
                  value={getRelationalDataTypeOption(column.type) ?? null}
                  isClearable={false}
                  isDisabled={isReadOnly}
                />
              </PanelFormSection>
            </PanelForm>
          </PanelContent>
        </div>
      </div>
    );
  },
);
