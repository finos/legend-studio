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

import { observer } from 'mobx-react-lite';
import { useEditorStore } from '../../EditorStoreProvider.js';
import type { EmbeddedDataEditorState } from '../../../../stores/editor-state/element-editor-state/data/DataEditorState.js';
import {
  CaretDownIcon,
  clsx,
  CustomSelectorInput,
  DropdownMenu,
  LockIcon,
  LongArrowRightIcon,
  MenuContent,
  MenuContentItem,
  PanelContent,
  PURE_DataIcon,
  WrenchIcon,
} from '@finos/legend-art';
import { useEffect, useRef } from 'react';
import { UnsupportedEditorPanel } from '../UnsupportedElementEditor.js';
import {
  externalFormatData_setContentType,
  externalFormatData_setData,
} from '../../../../stores/shared/modifier/DSL_Data_GraphModifierHelper.js';
import type { DSL_Data_LegendStudioApplicationPlugin_Extension } from '../../../../stores/extensions/DSL_Data_LegendStudioApplicationPlugin_Extension.js';
import { getEditorLanguageForFormat } from '../../../../stores/editor-state/FileGenerationViewerState.js';
import {
  type EmbeddedDataState,
  DataElementReferenceState,
  ExternalFormatDataState,
  RelationalCSVDataState,
} from '../../../../stores/editor-state/element-editor-state/data/EmbeddedDataState.js';
import type { DataElement } from '@finos/legend-graph';
import { buildElementOption, TextInputEditor } from '@finos/legend-application';
import { RelationalCSVDataEditor } from './RelationalCSVDataEditor.js';

export const ExternalFormatDataEditor = observer(
  (props: {
    externalFormatDataState: ExternalFormatDataState;
    isReadOnly: boolean;
  }) => {
    const { externalFormatDataState, isReadOnly } = props;
    const editorStore = useEditorStore();
    const typeNameRef = useRef<HTMLInputElement>(null);
    const changeData = (val: string): void =>
      externalFormatData_setData(externalFormatDataState.embeddedData, val);
    useEffect(() => {
      if (!isReadOnly) {
        typeNameRef.current?.focus();
      }
    }, [isReadOnly]);
    const contentTypeOptions =
      editorStore.graphState.graphGenerationState.externalFormatState
        .formatContentTypes;
    const onContentTypeChange = (val: string): void =>
      externalFormatData_setContentType(
        externalFormatDataState.embeddedData,
        val,
      );
    const language = getEditorLanguageForFormat(
      editorStore.graphState.graphGenerationState.externalFormatState.getFormatTypeForContentType(
        externalFormatDataState.embeddedData.contentType,
      ),
    );
    const format = (): void => externalFormatDataState.format();
    return (
      <div className="panel external-format-data-editor">
        <div className="external-format-data-editor__header">
          <div className="external-format-data-editor__header__title">
            {isReadOnly && (
              <div className="external-format-editor-editor__header__lock">
                <LockIcon />
              </div>
            )}
            <div className="external-format-data-editor__header__title__label">
              {externalFormatDataState.label()}
            </div>
          </div>
          <div className="external-format-data-editor__header__actions">
            <button
              className="panel__header__action"
              disabled={
                !externalFormatDataState.supportsFormatting || isReadOnly
              }
              tabIndex={-1}
              onClick={format}
              title="Format External Format"
            >
              <WrenchIcon />
            </button>
            <DropdownMenu
              className="external-format-data-editor__type"
              disabled={isReadOnly}
              content={
                <MenuContent className="external-format-data-editor__dropdown">
                  {contentTypeOptions.map((contentType) => (
                    <MenuContentItem
                      key={contentType}
                      className="external-format-data-editor__option"
                      onClick={(): void => onContentTypeChange(contentType)}
                    >
                      {contentType}
                    </MenuContentItem>
                  ))}
                </MenuContent>
              }
              menuProps={{
                anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
                transformOrigin: { vertical: 'top', horizontal: 'right' },
              }}
            >
              <div className="external-format-data-editor__type__label">
                {externalFormatDataState.embeddedData.contentType}
              </div>
              <div className="external-format-data-editor__type__icon">
                <CaretDownIcon />
              </div>
            </DropdownMenu>
          </div>
        </div>
        <div className={clsx('external-format-data-editor__content')}>
          <div className="external-format-data-editor__content__input">
            <TextInputEditor
              language={language}
              inputValue={externalFormatDataState.embeddedData.data}
              updateInput={changeData}
              hideGutter={true}
            />
          </div>
        </div>
      </div>
    );
  },
);

export const DataElementReferenceDataEditor = observer(
  (props: {
    dataElementReferenceState: DataElementReferenceState;
    isReadOnly: boolean;
  }) => {
    const { dataElementReferenceState, isReadOnly } = props;
    const dataElement =
      dataElementReferenceState.embeddedData.dataElement.value;
    const editorStore = dataElementReferenceState.editorStore;
    const options =
      editorStore.graphManagerState.usableDataElements.map(buildElementOption);
    const selectedOption = buildElementOption(dataElement);
    const onDataElementChange = (val: {
      label: string;
      value?: DataElement;
    }): void => {
      if (val.value !== selectedOption.value && val.value) {
        dataElementReferenceState.setDataElement(val.value);
      }
    };
    const visitData = (): void =>
      editorStore.graphEditorMode.openElement(dataElement);
    return (
      <div className="panel data-element-reference-editor">
        <div className="data-element-reference-editor__header">
          <div className="data-element-reference-editor__header__title">
            {isReadOnly && (
              <div className="external-format-editor-editor__header__lock">
                <LockIcon />
              </div>
            )}
            <div className="data-element-reference-editor__header__title__label">
              {dataElementReferenceState.label()}
            </div>
          </div>
        </div>
        <div className={clsx('data-element-reference-editor__content')}>
          <div className="data-element-reference-editor__value">
            <div className="btn--sm data-element-reference-editor__value__label">
              <PURE_DataIcon />
            </div>
            <CustomSelectorInput
              className="panel__content__form__section__dropdown data-element-reference-editor__value__dropdown"
              disabled={isReadOnly}
              options={options}
              onChange={onDataElementChange}
              value={selectedOption}
              darkMode={true}
            />
            <button
              className="btn--dark btn--sm data-element-reference-editor__value-btn"
              onClick={visitData}
              tabIndex={-1}
              title="See data element"
            >
              <LongArrowRightIcon />
            </button>
          </div>
          <div className="data-element-reference-editor__content__value">
            {renderEmbeddedDataEditor(
              dataElementReferenceState.embeddedDataValueState,
              isReadOnly,
            )}
          </div>
        </div>
      </div>
    );
  },
);

export const EmbeddedDataEditor = observer(
  (props: {
    embeddedDataEditorState: EmbeddedDataEditorState;
    isReadOnly: boolean;
  }) => {
    const { embeddedDataEditorState, isReadOnly } = props;
    return (
      <div className="panel connection-editor">
        {renderEmbeddedDataEditor(
          embeddedDataEditorState.embeddedDataState,
          isReadOnly,
        )}
      </div>
    );
  },
);

export function renderEmbeddedDataEditor(
  embeddedDataState: EmbeddedDataState,
  isReadOnly: boolean,
): React.ReactNode {
  if (embeddedDataState instanceof ExternalFormatDataState) {
    return (
      <ExternalFormatDataEditor
        externalFormatDataState={embeddedDataState}
        isReadOnly={isReadOnly}
      />
    );
  } else if (embeddedDataState instanceof RelationalCSVDataState) {
    return (
      <RelationalCSVDataEditor
        dataState={embeddedDataState}
        isReadOnly={isReadOnly}
      />
    );
  } else if (embeddedDataState instanceof DataElementReferenceState) {
    return (
      <DataElementReferenceDataEditor
        dataElementReferenceState={embeddedDataState}
        isReadOnly={isReadOnly}
      />
    );
  } else {
    const extraEmbeddedDataEditorRenderers =
      embeddedDataState.editorStore.pluginManager
        .getApplicationPlugins()
        .flatMap(
          (plugin) =>
            (
              plugin as DSL_Data_LegendStudioApplicationPlugin_Extension
            ).getExtraEmbeddedDataEditorRenderers?.() ?? [],
        );
    for (const editorRenderer of extraEmbeddedDataEditorRenderers) {
      const editor = editorRenderer(embeddedDataState, isReadOnly);
      if (editor) {
        return editor;
      }
    }
    return (
      <div className="panel connection-editor">
        <div className="data-editor__header">
          <div className="data-editor__header__title">
            {isReadOnly && (
              <div className="element-editor__header__lock">
                <LockIcon />
              </div>
            )}
            <div className="data-editor__header__title__label">
              {embeddedDataState.label()}
            </div>
          </div>
        </div>
        <PanelContent>
          <UnsupportedEditorPanel
            text="Can't display this embedded data in form-mode"
            isReadOnly={isReadOnly}
          />
        </PanelContent>
      </div>
    );
  }
}
