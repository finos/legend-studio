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

import { type GenerationProperty, isValidFullPath } from '@finos/legend-graph';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useMemo } from 'react';
import type { SchemaSetModelGenerationState } from '../../../../stores/editor-state/element-editor-state/external-format/DSL_ExternalFormat_SchemaSetEditorState.js';
import { debounce } from '@finos/legend-shared';
import {
  clsx,
  InputWithInlineValidation,
  PanelContent,
  PanelLoadingIndicator,
  RefreshIcon,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
} from '@finos/legend-art';
import { GenerationPropertyEditor } from '../element-generation-editor/FileGenerationEditor.js';
import { StudioTextInputEditor } from '../../../shared/StudioTextInputEditor.js';
import { EDITOR_LANGUAGE } from '@finos/legend-application';

enum HIDDEN_CONFIGURATION_PROPERTIES {
  FORMAT = 'format',
}

export const SchemaSetModelGenerationEditor = observer(
  (props: {
    modelGenerationState: SchemaSetModelGenerationState;
    isReadOnly: boolean;
  }) => {
    const { modelGenerationState, isReadOnly } = props;
    const applicationStore = modelGenerationState.editorStore.applicationStore;
    const format = modelGenerationState.schemaSet.format;
    const description = modelGenerationState.description;
    const properties = description?.modelGenerationProperties ?? [];
    const debouncedRegenerate = useMemo(
      () =>
        debounce(() => flowResult(modelGenerationState.generateModel()), 500),
      [modelGenerationState],
    );
    const update = (
      generationProperty: GenerationProperty,
      newValue: object,
    ): void => {
      debouncedRegenerate.cancel();
      modelGenerationState.updateGenerationParameters(
        generationProperty,
        newValue,
      );
      debouncedRegenerate()?.catch(applicationStore.alertUnhandledError);
    };
    const regenerate = (): void => {
      modelGenerationState.generateModel();
    };
    const getConfigValue = (name: string): unknown | undefined =>
      modelGenerationState.getConfigValue(name);
    const targetBindingPathValidationMessage =
      Boolean(modelGenerationState.targetBinding) &&
      !isValidFullPath(modelGenerationState.targetBinding)
        ? 'Invalid target binding path'
        : undefined;

    const changeTargetBindingPath: React.ChangeEventHandler<
      HTMLInputElement
    > = (event) => {
      modelGenerationState.setTargetBindingPath(event.target.value);
      if (
        !modelGenerationState.targetBinding ||
        (modelGenerationState.targetBinding &&
          isValidFullPath(modelGenerationState.targetBinding))
      ) {
        modelGenerationState.handleTargetBindingPathChange();
        debouncedRegenerate()?.catch(applicationStore.alertUnhandledError);
      }
    };
    const importGeneratedElements = (): void => {
      modelGenerationState.importGeneratedModelsIntoGraph();
    };

    return (
      <div className="panel__content file-generation-editor__content">
        <ResizablePanelGroup orientation="vertical">
          <ResizablePanel size={250} minSize={50}>
            <div className="panel file-generation-editor__configuration">
              <div className="panel__header">
                <div className="panel__header__title">
                  <div className="panel__header__title__label">{`${format} configuration`}</div>
                </div>
                <div className="panel__header__actions">
                  <button
                    className="panel__header__action file-generation-editor__configuration__reset-btn"
                    tabIndex={-1}
                    disabled={isReadOnly || !properties.length}
                    onClick={regenerate}
                    title="Reset to default configuration"
                  >
                    <RefreshIcon />
                  </button>
                </div>
              </div>
              <PanelContent>
                <div className="file-generation-editor__configuration__content">
                  <div className="panel__content__form__section">
                    <div className="panel__content__form__section__header__label">
                      {'Target Binding Path'}
                    </div>
                    <div className="panel__content__form__section__header__prompt">
                      {
                        'If path is provided, a binding will be generated alongside the models. The binding will ensure the schema and models are compatible through compile time validations.'
                      }
                    </div>
                    <InputWithInlineValidation
                      className="query-builder__parameters__parameter__name__input input-group__input"
                      spellCheck={false}
                      value={modelGenerationState.targetBinding}
                      onChange={changeTargetBindingPath}
                      placeholder="Target binding path"
                      validationErrorMessage={
                        targetBindingPathValidationMessage
                      }
                    />
                  </div>

                  {modelGenerationState.modelGenerationProperties
                    .filter(
                      (property) =>
                        !Object.values(
                          HIDDEN_CONFIGURATION_PROPERTIES,
                        ).includes(
                          property.name as HIDDEN_CONFIGURATION_PROPERTIES,
                        ),
                    )
                    .map((abstractGenerationProperty) => (
                      <GenerationPropertyEditor
                        key={abstractGenerationProperty.name}
                        update={update}
                        isReadOnly={isReadOnly}
                        getConfigValue={getConfigValue}
                        property={abstractGenerationProperty}
                      />
                    ))}
                </div>
              </PanelContent>
            </div>
          </ResizablePanel>
          <ResizablePanelSplitter>
            <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
          </ResizablePanelSplitter>
          <ResizablePanel>
            <div className="panel generation-result-viewer__file">
              <div className="panel__header">
                <div className="panel__header__title">
                  <div className="panel__header__title__label">result</div>
                </div>
                <div className="panel__header__actions">
                  <button
                    className={clsx(
                      'panel__header__action  generation-result-viewer__regenerate-btn',
                      {
                        ' generation-result-viewer__regenerate-btn--loading':
                          modelGenerationState.generatingModelsState
                            .isInProgress ||
                          modelGenerationState.importGeneratedElementsState
                            .isInProgress,
                      },
                    )}
                    tabIndex={-1}
                    disabled={
                      modelGenerationState.generatingModelsState.isInProgress ||
                      modelGenerationState.importGeneratedElementsState
                        .isInProgress
                    }
                    onClick={regenerate}
                    title="Regenerate"
                  >
                    <RefreshIcon />
                  </button>
                  {!modelGenerationState.isolatedGraph && (
                    <button
                      className="btn--dark model-loader__header__load-btn"
                      onClick={importGeneratedElements}
                      disabled={modelGenerationState.generationValue === ''}
                      tabIndex={-1}
                      title="Import generated elements"
                    >
                      Import
                    </button>
                  )}
                </div>
              </div>
              <PanelContent>
                <PanelLoadingIndicator
                  isLoading={
                    modelGenerationState.generatingModelsState.isInProgress ||
                    modelGenerationState.importGeneratedElementsState
                      .isInProgress
                  }
                />
                <StudioTextInputEditor
                  inputValue={modelGenerationState.generationValue}
                  isReadOnly={true}
                  language={EDITOR_LANGUAGE.PURE}
                />
              </PanelContent>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    );
  },
);
