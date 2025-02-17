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
import {
  type ModelImporterEditorState,
  ModelImporterState,
  ExtensionModelImporterEditorState,
  MODEL_IMPORT_NATIVE_INPUT_TYPE,
  NativeModelImporterEditorState,
  ExternalFormatModelImporterState,
  ExecuteInputDebugModelImporterEditorState,
} from '../../../stores/editor/editor-state/ModelImporterState.js';
import { prettyCONSTName } from '@finos/legend-shared';
import {
  ControlledDropdownMenu,
  MenuContent,
  MenuContentItem,
  CaretDownIcon,
  CheckSquareIcon,
  TruckLoadingIcon,
  EmptySquareIcon,
  BlankPanelContent,
  PanelLoadingIndicator,
  clsx,
  Button,
  Panel,
  PanelHeader,
  PanelContent,
} from '@finos/legend-art';
import { flowResult } from 'mobx';
import { useEditorStore } from '../EditorStoreProvider.js';
import {
  useApplicationStore,
  useApplicationNavigationContext,
} from '@finos/legend-application';
import type { ModelImporterExtensionConfiguration } from '../../../stores/LegendStudioApplicationPlugin.js';
import { LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../../../__lib__/LegendStudioApplicationNavigationContext.js';
import { SCHEMA_SET_TAB_TYPE } from '../../../stores/editor/editor-state/element-editor-state/external-format/DSL_ExternalFormat_SchemaSetEditorState.js';
import { SchemaSetModelGenerationEditor } from './external-format-editor/DSL_ExternalFormat_SchemaSetModelGenerationEditor.js';
import { SchemaSetGeneralEditor } from './external-format-editor/DSL_ExternalFormat_SchemaSetElementEditor.js';
import { CODE_EDITOR_LANGUAGE } from '@finos/legend-code-editor';
import { CodeEditor } from '@finos/legend-lego/code-editor';

const ExternalFormatModelImporterEditor = observer(
  (props: { externalFormatState: ExternalFormatModelImporterState }) => {
    const { externalFormatState } = props;
    const schemaSetEditorState = externalFormatState.schemaSetEditorState;
    const editorStore = schemaSetEditorState.editorStore;
    const schemaSet = schemaSetEditorState.schemaSet;
    const currentTab = schemaSetEditorState.selectedTab;
    const isFetchingDescriptions =
      editorStore.graphState.graphGenerationState.externalFormatState
        .fetchingDescriptionsState.isInProgress;
    const changeTab =
      (tab: SCHEMA_SET_TAB_TYPE): (() => void) =>
      (): void =>
        schemaSetEditorState.setSelectedTab(tab);
    const renderMainEditPanel = (): React.ReactNode => {
      if (isFetchingDescriptions) {
        return (
          <BlankPanelContent>Fetching format descriptions</BlankPanelContent>
        );
      }
      if (currentTab === SCHEMA_SET_TAB_TYPE.SCHEMAS) {
        return (
          <SchemaSetGeneralEditor
            schemaSetEditorState={schemaSetEditorState}
            isReadOnly={false}
          />
        );
      }
      const supportsModelGeneraiton =
        schemaSetEditorState.schemaSetModelGenerationState.description
          ?.supportsModelGeneration;
      return supportsModelGeneraiton ? (
        <SchemaSetModelGenerationEditor
          modelGenerationState={
            schemaSetEditorState.schemaSetModelGenerationState
          }
          isReadOnly={false}
        />
      ) : (
        <BlankPanelContent>
          Format {schemaSet.format} does not support Model Generation
        </BlankPanelContent>
      );
    };

    useApplicationNavigationContext(
      LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.MODEL_LOADER_EXTERNAL_FORMAT_IMPORTER,
    );
    return (
      <Panel className="schema-set-panel">
        <PanelContent className="model-loader">
          <PanelLoadingIndicator isLoading={isFetchingDescriptions} />
          <PanelHeader>
            <div className="uml-element-editor__tabs">
              {Object.values(SCHEMA_SET_TAB_TYPE).map((tab) => (
                <div
                  key={tab}
                  onClick={changeTab(tab)}
                  className={clsx('relational-connection-editor__tab', {
                    'relational-connection-editor__tab--active':
                      tab === currentTab,
                  })}
                >
                  {prettyCONSTName(tab)}
                </div>
              ))}
            </div>
          </PanelHeader>
          <PanelContent className="file-generation-editor__content">
            {currentTab === SCHEMA_SET_TAB_TYPE.SCHEMAS && (
              <SchemaSetGeneralEditor
                schemaSetEditorState={schemaSetEditorState}
                isReadOnly={false}
              />
            )}

            {currentTab === SCHEMA_SET_TAB_TYPE.GENERATE_MODEL &&
              renderMainEditPanel()}
          </PanelContent>
        </PanelContent>
      </Panel>
    );
  },
);

export const ModelImporter = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const modelImporterState =
    editorStore.tabManagerState.getCurrentEditorState(ModelImporterState);
  const nativeInputTypes = Object.values(MODEL_IMPORT_NATIVE_INPUT_TYPE);
  const extraModelImporterExtensionsConfigs =
    modelImporterState.extensionConfigs;
  const externalFormatDescriptions =
    modelImporterState.editorStore.graphState.graphGenerationState
      .externalFormatState.externalFormatDescriptionsWithModelGenerationSupport;
  // replace flag
  const replace = modelImporterState.replace;
  const toggleReplace = (): void => modelImporterState.setReplaceFlag(!replace);
  const label = modelImporterState.modelImportEditorState.label;
  const modelImportEditorState = modelImporterState.modelImportEditorState;
  const loadModel = (): void => {
    editorStore.localChangesState.alertUnsavedChanges((): void => {
      modelImporterState.modelImportEditorState
        .loadModel()
        .catch(applicationStore.alertUnhandledError);
    });
  };
  useApplicationNavigationContext(
    LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.MODEL_LOADER,
  );
  const renderExtraActions = (): React.ReactNode => {
    if (modelImportEditorState instanceof NativeModelImporterEditorState) {
      // actions
      const loadCurrentProjectEntities = applicationStore.guardUnhandledError(
        () => flowResult(modelImportEditorState.loadCurrentProjectEntities()),
      );
      return (
        <div
          className="model-loader__header__configs__load-project-entities-btn"
          onClick={loadCurrentProjectEntities}
          title="Load current project entities"
        >
          <div className="model-loader__header__configs__edit-mode__icon">
            <TruckLoadingIcon />
          </div>
          <div className="model-loader__header__configs__edit-mode__label">
            Load from Graph
          </div>
        </div>
      );
    }
    return null;
  };
  const renderModelImporterEditor = (): React.ReactNode => {
    if (modelImportEditorState instanceof ExtensionModelImporterEditorState) {
      return modelImportEditorState.config.renderer(
        modelImportEditorState.rendererState,
      );
    } else if (
      modelImportEditorState instanceof NativeModelImporterEditorState
    ) {
      const updateModel = (val: string): void =>
        modelImportEditorState.setModelText(val);
      return (
        <PanelContent className="model-loader__editor">
          <CodeEditor
            language={
              modelImportEditorState.nativeType ===
              MODEL_IMPORT_NATIVE_INPUT_TYPE.PURE_GRAMMAR
                ? CODE_EDITOR_LANGUAGE.PURE
                : CODE_EDITOR_LANGUAGE.JSON
            }
            inputValue={modelImportEditorState.modelText}
            updateInput={updateModel}
          />
        </PanelContent>
      );
    } else if (
      modelImportEditorState instanceof ExternalFormatModelImporterState
    ) {
      return (
        <ExternalFormatModelImporterEditor
          externalFormatState={modelImportEditorState}
        />
      );
    } else if (
      modelImportEditorState instanceof
      ExecuteInputDebugModelImporterEditorState
    ) {
      return (
        <PanelContent className="model-loader__editor">
          <div className="model-loader__debugger__function-path">
            <div className="model-loader__debugger__function-path__label">
              Debug Executable:
            </div>
            <input
              className="panel__content__form__section__input"
              value={modelImportEditorState.executablePath}
              onChange={(event) =>
                modelImportEditorState.setExecutablePath(event.target.value)
              }
            />
          </div>
          <div className="model-loader__debugger__execute-input">
            <CodeEditor
              language={CODE_EDITOR_LANGUAGE.JSON}
              inputValue={modelImportEditorState.executeInput}
              updateInput={(val) => modelImportEditorState.setExecuteInput(val)}
            />
          </div>
        </PanelContent>
      );
    }
    return null;
  };

  return (
    <Panel className="model-loader">
      <PanelHeader className="model-loader__header">
        <div className="model-loader__header__configs">
          <ControlledDropdownMenu
            className="model-loader__header__configs__type"
            content={
              <MenuContent className="model-loader__header__configs__type__menu">
                <div className="model-loader__header__configs__type-option__group model-loader__header__configs__type-option__group--native">
                  <div className="model-loader__header__configs__type-option__group__name">
                    native
                  </div>
                  <div className="model-loader__header__configs__type-option__group__options">
                    {nativeInputTypes.map((inputType) => (
                      <MenuContentItem
                        key={inputType}
                        className="model-loader__header__configs__type-option__group__option"
                        onClick={(): ModelImporterEditorState =>
                          modelImporterState.setNativeImportType(inputType)
                        }
                      >
                        {prettyCONSTName(inputType)}
                      </MenuContentItem>
                    ))}
                    <MenuContentItem
                      className="model-loader__header__configs__type-option__group__option"
                      onClick={() =>
                        modelImporterState.setExecuteInputDebugModelImporter()
                      }
                    >
                      {`Execute Input (DEBUG)`}
                    </MenuContentItem>
                  </div>
                </div>
                {Boolean(externalFormatDescriptions.length) && (
                  <>
                    <div className="model-loader__header__configs__type-option__group__separator" />
                    <div className="model-loader__header__configs__type-option__group model-loader__header__configs__type-option__group--external">
                      <div className="model-loader__header__configs__type-option__group__name">
                        external
                      </div>
                      <div className="model-loader__header__configs__type-option__group__options">
                        {externalFormatDescriptions.map((inputType) => (
                          <MenuContentItem
                            key={inputType.name}
                            className="model-loader__header__configs__type-option__group__option"
                            onClick={() =>
                              modelImporterState.setExternalFormatImportFormat(
                                inputType,
                              )
                            }
                          >
                            {inputType.name}
                          </MenuContentItem>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                {Boolean(extraModelImporterExtensionsConfigs.length > 0) && (
                  <>
                    <div className="model-loader__header__configs__type-option__group__separator" />
                    <div className="model-loader__header__configs__type-option__group model-loader__header__configs__type-option__group--extension">
                      <div className="model-loader__header__configs__type-option__group__name">
                        extensions
                      </div>
                      <div className="model-loader__header__configs__type-option__group__options">
                        {extraModelImporterExtensionsConfigs.map(
                          (config: ModelImporterExtensionConfiguration) => (
                            <MenuContentItem
                              key={config.key}
                              className="model-loader__header__configs__type-option__group__option"
                              onClick={() =>
                                modelImporterState.setModelImporterExtension(
                                  config,
                                )
                              }
                            >
                              {config.label ?? prettyCONSTName(config.key)}
                            </MenuContentItem>
                          ),
                        )}
                      </div>
                    </div>
                  </>
                )}
              </MenuContent>
            }
            menuProps={{
              anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
              transformOrigin: { vertical: 'top', horizontal: 'right' },
            }}
          >
            <div className="model-loader__header__configs__type__label">
              {prettyCONSTName(label)}
            </div>
            <div className="model-loader__header__configs__type__icon">
              <CaretDownIcon />
            </div>
          </ControlledDropdownMenu>
          {modelImportEditorState.allowHardReplace && (
            <div
              className="model-loader__header__configs__edit-mode"
              onClick={toggleReplace}
            >
              <div className="model-loader__header__configs__edit-mode__icon">
                {replace ? <CheckSquareIcon /> : <EmptySquareIcon />}
              </div>
              <div className="model-loader__header__configs__edit-mode__label">
                replace
              </div>
            </div>
          )}
          {renderExtraActions()}
        </div>
        <div className="model-loader__header__action">
          <Button
            className="model-loader__header__load-btn"
            onClick={loadModel}
            disabled={
              modelImportEditorState.loadModelActionState.isInProgress ||
              modelImportEditorState.isLoadingDisabled
            }
            title="Load model"
            text="Load"
          />
        </div>
      </PanelHeader>

      {renderModelImporterEditor()}
    </Panel>
  );
});
