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

import { CustomSelectorInput } from '@finos/legend-art';
import { SchemaSet } from '@finos/legend-graph';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { makeObservable, observable, action } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useEditorStore } from '../../EditorStoreProvider.js';
import type { EditorStore } from '../../../../stores/editor/EditorStore.js';
import { externalFormat_schemaSet_setFormat } from '../../../../stores/graph-modifier/DSL_ExternalFormat_GraphModifierHelper.js';
import { NewElementDriver } from '../../../../stores/editor/NewElementState.js';
import type { ExternalFormatTypeOption } from '../../../../stores/editor/editor-state/ExternalFormatState.js';

export class NewSchemaSetDriver extends NewElementDriver<SchemaSet> {
  formatOption?: ExternalFormatTypeOption | undefined;

  constructor(editorStore: EditorStore) {
    super(editorStore);

    makeObservable(this, {
      formatOption: observable,
      setFormatOption: action,
    });

    this.formatOption = editorStore.graphState.graphGenerationState
      .externalFormatState.formatTypeOptions.length
      ? editorStore.graphState.graphGenerationState.externalFormatState
          .formatTypeOptions[0]
      : undefined;
  }

  setFormatOption(typeOption: ExternalFormatTypeOption | undefined): void {
    this.formatOption = typeOption;
  }

  get isValid(): boolean {
    return Boolean(this.formatOption);
  }

  createElement(name: string): SchemaSet {
    const schemaSet = new SchemaSet(name);
    externalFormat_schemaSet_setFormat(
      schemaSet,
      guaranteeNonNullable(this.formatOption).value,
    );
    return schemaSet;
  }
}

export const NewSchemaSetDriverEditor = observer(() => {
  const editorStore = useEditorStore();
  const newConnectionDriver =
    editorStore.newElementState.getNewElementDriver(NewSchemaSetDriver);
  const options =
    editorStore.graphState.graphGenerationState.externalFormatState
      .formatTypeOptions;
  const onTypeSelectionChange = (
    val: ExternalFormatTypeOption | null,
  ): void => {
    if (!val) {
      newConnectionDriver.setFormatOption(undefined);
    } else {
      newConnectionDriver.setFormatOption(val);
    }
  };
  return (
    <>
      <div className="panel__content__form__section__header__label">
        Schema Type
      </div>
      <div className="explorer__new-element-modal__driver">
        <CustomSelectorInput
          className="sub-panel__content__form__section__dropdown"
          options={options}
          onChange={onTypeSelectionChange}
          value={newConnectionDriver.formatOption}
        />
      </div>
    </>
  );
});
