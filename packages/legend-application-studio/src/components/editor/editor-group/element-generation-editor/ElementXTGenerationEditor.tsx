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

import { useApplicationStore } from '@finos/legend-application';
import {
  ArrowCircleLeftIcon,
  PanelContent,
  PanelHeader,
  PanelHeaderActionItem,
  PanelHeaderActions,
  RefreshIcon,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
} from '@finos/legend-art';
import type { GenerationProperty } from '@finos/legend-graph';
import { debounce } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo } from 'react';
import type { ElementEditorState } from '../../../../stores/editor/editor-state/element-editor-state/ElementEditorState.js';
import type { ElementXTSchemaGenerationState } from '../../../../stores/editor/editor-state/element-editor-state/ElementExternalFormatGenerationState.js';
import { ModelUnitEditor } from '../external-format-editor/DSL_ExternalFormat_BindingElementEditor.js';
import { GenerationPropertyEditor } from './FileGenerationEditor.js';
import { FileSystemViewer } from './FileSystemViewer.js';

enum HIDDEN_CONFIGURATION_PROPERTIES {
  FORMAT = 'format',
  TARGET_SCHEMA_SET = 'targetSchemaSet',
}

export const ExternalFormatGeneratioConfigEditor = observer(
  (props: {
    isReadOnly: boolean;
    elementEditorState: ElementEditorState;
    xtState: ElementXTSchemaGenerationState;
  }) => {
    const { isReadOnly, xtState } = props;
    const xtGenerationState = xtState.xtGenerationState;
    const editorStore = xtState.editorStore;
    const applicationStore = editorStore.applicationStore;
    const configSpecification = xtState.xtGenerationState.configSpecification;
    const schemaGenerationProperties =
      xtState.description.schemaGenerationProperties;
    const debouncedRegenerate = useMemo(
      () =>
        debounce(() => flowResult(xtState.xtGenerationState.generate()), 500),
      [xtState],
    );
    const update = (
      generationProperty: GenerationProperty,
      newValue: object,
    ): void => {
      debouncedRegenerate.cancel();
      xtGenerationState.updateFileGenerationParameters(
        configSpecification,
        generationProperty,
        newValue,
      );
      debouncedRegenerate()?.catch(applicationStore.alertUnhandledError);
    };
    const resetDefaultConfiguration = (): void => {
      debouncedRegenerate.cancel();
      xtGenerationState.resetGenerator();
      debouncedRegenerate()?.catch(applicationStore.alertUnhandledError);
    };

    const getConfigValue = (name: string): unknown =>
      xtState.xtGenerationState.configSpecification.configurationProperties.find(
        (e) => e.name === name,
      )?.value;

    return (
      <div className="panel file-generation-editor__configuration">
        <PanelHeader title={`${xtState.description.name} configuration`}>
          <PanelHeaderActions>
            <PanelHeaderActionItem
              className="file-generation-editor__configuration__reset-btn"
              disabled={
                isReadOnly ||
                !configSpecification.configurationProperties.length
              }
              onClick={resetDefaultConfiguration}
              title="Reset to default configuration"
            >
              <RefreshIcon />
            </PanelHeaderActionItem>
          </PanelHeaderActions>
        </PanelHeader>
        <PanelContent>
          <div className="file-generation-editor__configuration__content">
            <ModelUnitEditor
              isReadOnly={isReadOnly}
              modelUnit={configSpecification.modelUnit}
            />
            {schemaGenerationProperties

              .filter(
                (property) =>
                  !Object.values(HIDDEN_CONFIGURATION_PROPERTIES).includes(
                    property.name as HIDDEN_CONFIGURATION_PROPERTIES,
                  ),
              )
              .map((abstractGenerationProperty) => (
                <GenerationPropertyEditor
                  key={
                    abstractGenerationProperty.name +
                    abstractGenerationProperty.type
                  }
                  update={update}
                  isReadOnly={isReadOnly}
                  getConfigValue={getConfigValue}
                  property={abstractGenerationProperty}
                />
              ))}
          </div>
        </PanelContent>
      </div>
    );
  },
);

export const ElementXTGenerationEditor = observer(
  (props: {
    currentElementState: ElementEditorState;
    elementXTState: ElementXTSchemaGenerationState;
  }) => {
    const { elementXTState, currentElementState } = props;
    const xtGenerationState = elementXTState.xtGenerationState;
    const applicationStore = useApplicationStore();
    const leaveElementGenerationView = (): void =>
      currentElementState.setGenerationModeState(undefined);
    useEffect(() => {
      flowResult(elementXTState.regenerate()).catch(
        applicationStore.alertUnhandledError,
      );
    }, [applicationStore, currentElementState, elementXTState]);

    return (
      <div className="panel element-generation-editor">
        <div className="panel__header element-generation-editor__header">
          <div className="panel__header__title">
            <button
              className="panel__header__action element-generation-editor__leave-btn"
              tabIndex={-1}
              onClick={leaveElementGenerationView}
              title="Leave element generation view mode"
            >
              <ArrowCircleLeftIcon /> exit generation view
            </button>
          </div>
        </div>
        <div className="panel__content element-generation-editor__content">
          <div className="file-generation-editor">
            <ResizablePanelGroup orientation="vertical">
              <ResizablePanel
                size={300}
                minSize={300}
                className="file-generation-editor__split-pane"
              >
                <ExternalFormatGeneratioConfigEditor
                  isReadOnly={currentElementState.isReadOnly}
                  elementEditorState={currentElementState}
                  xtState={elementXTState}
                />
              </ResizablePanel>
              <ResizablePanelSplitter>
                <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
              </ResizablePanelSplitter>
              <ResizablePanel>
                <FileSystemViewer generatedFileState={xtGenerationState} />
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </div>
      </div>
    );
  },
);
