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
import type { SchemaSetModelGenerationState } from '../../../../stores/editor/editor-state/element-editor-state/external-format/DSL_ExternalFormat_SchemaSetEditorState.js';
import { debounce } from '@finos/legend-shared';
import {
  InputWithInlineValidation,
  Panel,
  PanelContent,
  PanelHeader,
  PanelHeaderActionItem,
  PanelHeaderActions,
  PanelLoadingIndicator,
  RefreshIcon,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
} from '@finos/legend-art';
import { GenerationPropertyEditor } from '../element-generation-editor/FileGenerationEditor.js';
import { CODE_EDITOR_LANGUAGE } from '@finos/legend-code-editor';
import { CodeEditor } from '@finos/legend-lego/code-editor';
import { useApplicationNavigationContext } from '@finos/legend-application';
import { LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../../../../__lib__/LegendStudioApplicationNavigationContext.js';

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
      () => debounce(() => flowResult(modelGenerationState.generate()), 500),
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
      modelGenerationState.generate();
    };
    const resetProperties = (): void => {
      modelGenerationState.setConfigurationProperty([]);
    };
    const getConfigValue = (name: string): unknown =>
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

    useApplicationNavigationContext(
      LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.SCHEMA_SET_MODEL_GENERATION,
    );

    return (
      <PanelContent className="file-generation-editor__content">
        <ResizablePanelGroup orientation="vertical">
          <ResizablePanel size={250} minSize={50}>
            <Panel className="file-generation-editor__configuration">
              <PanelHeader title={`${format} configuration`}>
                <PanelHeaderActions>
                  <PanelHeaderActionItem
                    className="file-generation-editor__configuration__reset-btn"
                    disabled={isReadOnly || !properties.length}
                    onClick={resetProperties}
                    title="Reset to default configuration"
                  >
                    <RefreshIcon />
                  </PanelHeaderActionItem>
                </PanelHeaderActions>
              </PanelHeader>
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
                      className="query-builder__variables__variable__name__input input-group__input"
                      spellCheck={false}
                      value={modelGenerationState.targetBinding}
                      onChange={changeTargetBindingPath}
                      placeholder="Target binding path"
                      error={targetBindingPathValidationMessage}
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
            </Panel>
          </ResizablePanel>
          <ResizablePanelSplitter>
            <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
          </ResizablePanelSplitter>
          <ResizablePanel>
            <Panel className="generation-result-viewer__file">
              <PanelHeader title="result">
                <PanelHeaderActions>
                  <PanelHeaderActionItem
                    className="generation-result-viewer__generate-btn"
                    onClick={regenerate}
                    disabled={
                      modelGenerationState.generatingModelsState.isInProgress ||
                      modelGenerationState.importGeneratedElementsState
                        .isInProgress
                    }
                    title="Regenerate"
                  >
                    <div className="generation-result-viewer__generate-btn__label">
                      <RefreshIcon className="generation-result-viewer__generate-btn__label__icon" />
                      <div className="generation-result-viewer__generate-btn__label__title">
                        Generate
                      </div>
                    </div>
                  </PanelHeaderActionItem>

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
                </PanelHeaderActions>
              </PanelHeader>
              <PanelContent>
                <PanelLoadingIndicator
                  isLoading={
                    modelGenerationState.generatingModelsState.isInProgress ||
                    modelGenerationState.importGeneratedElementsState
                      .isInProgress
                  }
                />
                <CodeEditor
                  inputValue={modelGenerationState.generationValue}
                  isReadOnly={true}
                  language={CODE_EDITOR_LANGUAGE.PURE}
                />
              </PanelContent>
            </Panel>
          </ResizablePanel>
        </ResizablePanelGroup>
      </PanelContent>
    );
  },
);
