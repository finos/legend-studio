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
  ModelLoaderState,
  MODEL_UPDATER_INPUT_TYPE,
} from '../../../stores/editor-state/ModelLoaderState';
import { prettyCONSTName } from '@finos/legend-shared';
import {
  DropdownMenu,
  MenuContent,
  MenuContentItem,
  CaretDownIcon,
  CheckSquareIcon,
  TruckLoadingIcon,
  EmptySquareIcon,
} from '@finos/legend-art';
import { flowResult } from 'mobx';
import { useEditorStore } from '../EditorStoreProvider';
import {
  ActionAlertType,
  ActionAlertActionType,
  useApplicationStore,
  EDITOR_LANGUAGE,
} from '@finos/legend-application';
import { StudioTextInputEditor } from '../../shared/StudioTextInputEditor';
import type { ModelLoaderExtensionConfiguration } from '../../../stores/LegendStudioPlugin';

export const ModelLoader = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const modelLoaderState = editorStore.getCurrentEditorState(ModelLoaderState);
  const nativeInputTypes = Object.values(MODEL_UPDATER_INPUT_TYPE);
  const externalFormatInputTypes = modelLoaderState.modelImportDescriptions;
  const extraModelLoaderExtensionsConfigs =
    modelLoaderState.modelLoaderExtensionConfigurations;
  // input type
  const currentModelLoadType = modelLoaderState.currentModelLoadType;
  // replace flag
  const replace = modelLoaderState.replace;
  const toggleReplace = (): void => modelLoaderState.setReplaceFlag(!replace);
  // actions
  const loadCurrentProjectEntities = applicationStore.guardUnhandledError(() =>
    flowResult(modelLoaderState.loadCurrentProjectEntities()),
  );
  const setCurrentInputType =
    (inputType: string | MODEL_UPDATER_INPUT_TYPE): (() => void) =>
    (): void => {
      modelLoaderState.setCurrentModelLoadType(inputType);
    };
  const loaderExtensionConfig =
    modelLoaderState.getLoaderExtensionConfiguration(currentModelLoadType);
  const label =
    modelLoaderState.getImportConfigurationDescription(currentModelLoadType)
      ?.label ??
    loaderExtensionConfig?.modelGenerationConfig.label ??
    loaderExtensionConfig?.modelGenerationConfig.key ??
    currentModelLoadType;
  const allowHardReplace =
    !loaderExtensionConfig || loaderExtensionConfig.allowHardReplace;
  const isNativeInput = Object.values(MODEL_UPDATER_INPUT_TYPE).includes(
    currentModelLoadType as MODEL_UPDATER_INPUT_TYPE,
  );
  const loadModel = (): void => {
    if (loaderExtensionConfig) {
      loaderExtensionConfig
        .load(editorStore)
        .catch(applicationStore.alertUnhandledError);
    } else if (editorStore.hasUnpushedChanges) {
      editorStore.setActionAltertInfo({
        message: 'You have unpushed changes',
        prompt:
          'This action will discard these changes and refresh the application',
        type: ActionAlertType.CAUTION,
        onEnter: (): void => editorStore.setBlockGlobalHotkeys(true),
        onClose: (): void => editorStore.setBlockGlobalHotkeys(false),
        actions: [
          {
            label: 'Proceed to load model',
            type: ActionAlertActionType.PROCEED_WITH_CAUTION,
            handler: (): void => {
              editorStore.setIgnoreNavigationBlocking(true);
              flowResult(modelLoaderState.loadModel()).catch(
                applicationStore.alertUnhandledError,
              );
            },
          },
          {
            label: 'Abort',
            type: ActionAlertActionType.PROCEED,
            default: true,
          },
        ],
      });
    } else {
      flowResult(modelLoaderState.loadModel()).catch(
        applicationStore.alertUnhandledError,
      );
    }
  };
  const updateModel = (val: string): void => modelLoaderState.setModelText(val);

  return (
    <div className="panel model-loader">
      <div className="panel__header model-loader__header">
        <div className="model-loader__header__configs">
          <DropdownMenu
            className="edit-panel__element-view"
            content={
              <MenuContent className="model-loader__header__configs__types">
                <div className="model-loader__header__configs__type-option__group model-loader__header__configs__type-option__group--native">
                  <div className="model-loader__header__configs__type-option__group__name">
                    native
                  </div>
                  <div className="model-loader__header__configs__type-option__group__options">
                    {nativeInputTypes.map((inputType) => (
                      <MenuContentItem
                        key={inputType}
                        className="model-loader__header__configs__type-option__group__option"
                        onClick={setCurrentInputType(inputType)}
                      >
                        {prettyCONSTName(inputType)}
                      </MenuContentItem>
                    ))}
                  </div>
                </div>
                {Boolean(externalFormatInputTypes) && (
                  <>
                    <div className="model-loader__header__configs__type-option__group__separator" />
                    <div className="model-loader__header__configs__type-option__group model-loader__header__configs__type-option__group--external">
                      <div className="model-loader__header__configs__type-option__group__name">
                        external
                      </div>
                      <div className="model-loader__header__configs__type-option__group__options">
                        {externalFormatInputTypes.map((inputType) => (
                          <MenuContentItem
                            key={inputType.key}
                            className="model-loader__header__configs__type-option__group__option"
                            onClick={setCurrentInputType(inputType.key)}
                          >
                            {inputType.label}
                          </MenuContentItem>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                {Boolean(extraModelLoaderExtensionsConfigs.length > 0) && (
                  <>
                    <div className="model-loader__header__configs__type-option__group__separator" />
                    <div className="model-loader__header__configs__type-option__group model-loader__header__configs__type-option__group--extension">
                      <div className="model-loader__header__configs__type-option__group__name">
                        extensions
                      </div>
                      <div className="model-loader__header__configs__type-option__group__options">
                        {extraModelLoaderExtensionsConfigs.map(
                          (config: ModelLoaderExtensionConfiguration) => (
                            <MenuContentItem
                              key={config.modelGenerationConfig.key}
                              className="model-loader__header__configs__type-option__group__option"
                              onClick={setCurrentInputType(
                                config.modelGenerationConfig.key,
                              )}
                            >
                              {config.modelGenerationConfig.label ??
                                prettyCONSTName(
                                  config.modelGenerationConfig.key,
                                )}
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
            <div className="model-loader__header__configs__type">
              <div className="model-loader__header__configs__type__label">
                {prettyCONSTName(label)}
              </div>
              <div className="model-loader__header__configs__type__icon">
                <CaretDownIcon />
              </div>
            </div>
          </DropdownMenu>
          {allowHardReplace && (
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
          {isNativeInput && (
            <button
              className="model-loader__header__configs__load-project-entities-btn"
              tabIndex={-1}
              onClick={loadCurrentProjectEntities}
              title="Load current project entities"
            >
              <TruckLoadingIcon />
            </button>
          )}
        </div>
        <div className="model-loader__header__action">
          <button
            className="btn--dark model-loader__header__load-btn"
            onClick={loadModel}
            disabled={modelLoaderState.isLoadingModel}
            tabIndex={-1}
            title="Load model"
          >
            Load
          </button>
        </div>
      </div>
      <div className="panel__content model-loader__editor">
        {loaderExtensionConfig?.renderer(editorStore) ?? (
          <StudioTextInputEditor
            language={EDITOR_LANGUAGE.JSON}
            inputValue={modelLoaderState.modelText}
            updateInput={updateModel}
            showMiniMap={true}
          />
        )}
      </div>
    </div>
  );
});
