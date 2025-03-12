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
  clsx,
  CustomSelectorInput,
  LockIcon,
  PanelContent,
  PanelForm,
  PanelFormSection,
  PanelFormTextField,
  TimesIcon,
} from '@finos/legend-art';
import { type Column } from '@finos/legend-graph';
import { LEGEND_STUDIO_TEST_ID } from '../../../../__lib__/LegendStudioTesting.js';

export const ColumnEditor = observer(
  (props: { column: Column; isReadOnly: boolean; onClose: () => void }) => {
    const { column, isReadOnly, onClose } = props;
    const [columnName, setColumnName] = useState(column.name);
    const [columnType, setColumnType] = useState(String(column.type));

    const updateColumnName = (value: string | undefined): void => {
      if (!isReadOnly && value !== undefined) {
        setColumnName(value);
        column.name = value;
      }
    };

    const updateColumnType = (value: string | undefined): void => {
      if (!isReadOnly && value !== undefined) {
        setColumnType(value);
        // Note: In a real implementation, we would need to convert the string to the proper RelationalDataType
        // For now, we're just updating the UI state
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
                <PanelFormTextField
                  name="columnType"
                  value={columnType}
                  isReadOnly={isReadOnly}
                  update={updateColumnType}
                />
              </PanelFormSection>
            </PanelForm>
          </PanelContent>
        </div>
      </div>
    );
  },
);
