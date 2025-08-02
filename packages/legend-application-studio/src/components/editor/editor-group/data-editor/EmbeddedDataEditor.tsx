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
import type { EmbeddedDataEditorState } from '../../../../stores/editor/editor-state/element-editor-state/data/DataEditorState.js';
import {
  CaretDownIcon,
  clsx,
  CustomSelectorInput,
  ControlledDropdownMenu,
  LockIcon,
  LongArrowRightIcon,
  MenuContent,
  MenuContentItem,
  PanelContent,
  PURE_ClassIcon,
  PURE_DataIcon,
  WrenchIcon,
  type SelectComponent,
  createFilter,
} from '@finos/legend-art';
import React, { useEffect, useRef } from 'react';
import { UnsupportedEditorPanel } from '../UnsupportedElementEditor.js';
import {
  externalFormatData_setContentType,
  externalFormatData_setData,
  modelStoreData_setDataModelModel,
} from '../../../../stores/graph-modifier/DSL_Data_GraphModifierHelper.js';
import type { DSL_Data_LegendStudioApplicationPlugin_Extension } from '../../../../stores/extensions/DSL_Data_LegendStudioApplicationPlugin_Extension.js';
import {
  type EmbeddedDataState,
  DataElementReferenceState,
  ExternalFormatDataState,
  RelationalCSVDataState,
  RelationalTestDataState,
  ModelStoreDataState,
  ModelEmbeddedDataState,
} from '../../../../stores/editor/editor-state/element-editor-state/data/EmbeddedDataState.js';
import {
  PackageableElementExplicitReference,
  type Type,
  type DataElement,
} from '@finos/legend-graph';
import {
  buildElementOption,
  getPackageableElementOptionFormatter,
  type PackageableElementOption,
} from '@finos/legend-lego/graph-editor';
import { RelationalCSVDataEditor } from './RelationalCSVDataEditor.js';
import { RelationalTestDataEditor } from './RelationalTestDataEditor.js';
import { CodeEditor } from '@finos/legend-lego/code-editor';
import { getEditorLanguageForFormat } from '../../../../stores/editor/editor-state/ArtifactGenerationViewerState.js';
import { useApplicationNavigationContext } from '@finos/legend-application';
import { LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../../../../__lib__/LegendStudioApplicationNavigationContext.js';

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
    useApplicationNavigationContext(
      LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.EMBEDDED_DATA_EXTERNAL_FORMAT_EDITOR,
    );
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
            <ControlledDropdownMenu
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
            </ControlledDropdownMenu>
          </div>
        </div>
        <PanelContent className="model-loader__editor">
          <CodeEditor
            language={language}
            inputValue={externalFormatDataState.embeddedData.data}
            updateInput={changeData}
            hideGutter={true}
          />
        </PanelContent>
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
    const applicationStore = editorStore.applicationStore;
    const options =
      editorStore.graphManagerState.usableDataElements.map(buildElementOption);
    const selectedOption = buildElementOption(
      dataElement,
    ) as PackageableElementOption<DataElement>;
    const onDataElementChange = (
      val: PackageableElementOption<DataElement>,
    ): void => {
      if (val.value !== selectedOption.value) {
        dataElementReferenceState.setDataElement(val.value);
      }
    };
    const visitData = (): void =>
      editorStore.graphEditorMode.openElement(dataElement);
    useApplicationNavigationContext(
      LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.EMBEDDED_DATA_DATA_ELEMENT_REFERENCE_EDITOR,
    );
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
              darkMode={
                !applicationStore.layoutService
                  .TEMPORARY__isLightColorThemeEnabled
              }
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

export const ModelEmbeddedDataEditor = observer(
  (props: {
    modelDataState: ModelEmbeddedDataState;
    modelStoreDataState: ModelStoreDataState;
    isReadOnly: boolean;
  }) => {
    const { isReadOnly, modelStoreDataState, modelDataState } = props;
    const modelData = modelDataState.modelData;
    const hideClass = modelStoreDataState.hideClass;
    const classSelectorRef = useRef<SelectComponent>(null);
    const elementFilterOption = createFilter({
      ignoreCase: true,
      ignoreAccents: false,
      stringify: (option: { data: PackageableElementOption<Type> }): string =>
        option.data.value.path,
    });
    const editorStore = modelStoreDataState.editorStore;
    const applicationStore = editorStore.applicationStore;
    const _class = modelData.model.value;
    const classOptions = editorStore.graphManagerState.usableClasses.map(
      (_cl) => ({
        value: _cl,
        label: _cl.name,
      }),
    );

    const selectedClassOption = {
      value: _class,
      label: _class.name,
    };

    const changeClass = (val: PackageableElementOption<Type> | null): void => {
      if (val?.value) {
        modelStoreData_setDataModelModel(
          modelData,
          PackageableElementExplicitReference.create(val.value),
        );
      }
    };

    return (
      <>
        {!hideClass && (
          <div className="sample-data-generator__controller">
            <div
              className="sample-data-generator__controller__icon"
              title="class"
            >
              <PURE_ClassIcon />
            </div>
            <CustomSelectorInput
              inputRef={classSelectorRef}
              className="sample-data-generator__controller__class-selector"
              options={classOptions}
              onChange={changeClass}
              value={selectedClassOption}
              darkMode={
                !applicationStore.layoutService
                  .TEMPORARY__isLightColorThemeEnabled
              }
              filterOption={elementFilterOption}
              formatOptionLabel={getPackageableElementOptionFormatter({
                darkMode:
                  !applicationStore.layoutService
                    .TEMPORARY__isLightColorThemeEnabled,
              })}
            />
          </div>
        )}

        {renderEmbeddedDataEditor(modelDataState.embeddedDataState, isReadOnly)}
      </>
    );
  },
);

export const ModelStoreDataEditor = observer(
  (props: {
    modelStoreDataState: ModelStoreDataState;
    isReadOnly: boolean;
  }) => {
    const { isReadOnly, modelStoreDataState } = props;
    useApplicationNavigationContext(
      LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.EMBEDDED_DATA_MODEL_STORE_EDITOR,
    );
    return (
      <div className="panel connection-editor">
        {modelStoreDataState.modelDataStates.map((_modelDataState) => {
          if (_modelDataState instanceof ModelEmbeddedDataState) {
            return (
              <ModelEmbeddedDataEditor
                key={_modelDataState.uuid}
                modelDataState={_modelDataState}
                modelStoreDataState={modelStoreDataState}
                isReadOnly={isReadOnly}
              />
            );
          }

          return (
            <UnsupportedEditorPanel
              key={_modelDataState.uuid}
              text={'Unsuppored Model Data Type'}
              isReadOnly={false}
            />
          );
        })}
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
  } else if (embeddedDataState instanceof RelationalTestDataState) {
    return (
      <RelationalTestDataEditor
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
  } else if (embeddedDataState instanceof ModelStoreDataState) {
    return (
      <ModelStoreDataEditor
        modelStoreDataState={embeddedDataState}
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
