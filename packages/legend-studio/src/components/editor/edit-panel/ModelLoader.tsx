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
import { useEditorStore } from '../../../stores/EditorStore';
import {
  ModelLoaderState,
  MODEL_UPDATER_INPUT_TYPE,
} from '../../../stores/editor-state/ModelLoaderState';
import {
  FaCaretDown,
  FaRegSquare,
  FaCheckSquare,
  FaTruckLoading,
} from 'react-icons/fa';
import { prettyCONSTName } from '@finos/legend-studio-shared';
import { EDITOR_LANGUAGE } from '../../../stores/EditorConfig';
import { TextInputEditor } from '../../shared/TextInputEditor';
import {
  ActionAlertType,
  ActionAlertActionType,
  useApplicationStore,
} from '../../../stores/ApplicationStore';
import {
  DropdownMenu,
  MenuContent,
  MenuContentItem,
} from '@finos/legend-studio-components';
import type { ImportConfigurationDescription } from '../../../models/metamodels/pure/action/generation/ImportConfigurationDescription';

export const ModelLoader = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const modelLoaderState = editorStore.getCurrentEditorState(ModelLoaderState);
  const nativeInputTypes = Object.values(MODEL_UPDATER_INPUT_TYPE);
  const externalFormatInputTypes = modelLoaderState.modelImportDescriptions;
  // input type
  const currentInputType = modelLoaderState.currentInputType;
  const currentExternalInputType = modelLoaderState.currentExternalInputType;
  const currentExternalInputLabel = currentExternalInputType
    ? modelLoaderState.getImportConfiguration(currentExternalInputType).label
    : undefined;
  const setCurrentInputType =
    (inputType: MODEL_UPDATER_INPUT_TYPE): (() => void) =>
    (): void =>
      modelLoaderState.setCurrentInputType(inputType);
  const setCurrentExternalInput =
    (inputType: ImportConfigurationDescription): (() => void) =>
    (): void =>
      modelLoaderState.setCurrentExternalFormatInputType(inputType);
  // replace flag
  const replace = modelLoaderState.replace;
  const toggleReplace = (): void => modelLoaderState.setReplaceFlag(!replace);
  // actions
  const loadCurrentProjectEntities = (): void =>
    modelLoaderState.loadCurrentProjectEntities();
  const loadModel = (): void => {
    if (editorStore.hasUnsyncedChanges) {
      editorStore.setActionAltertInfo({
        message: 'You have unsynced changes',
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
              modelLoaderState
                .loadModel()
                .catch(applicationStore.alertIllegalUnhandledError);
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
      modelLoaderState
        .loadModel()
        .catch(applicationStore.alertIllegalUnhandledError);
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
                            onClick={setCurrentExternalInput(inputType)}
                          >
                            {inputType.label}
                          </MenuContentItem>
                        ))}
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
                {currentExternalInputType
                  ? currentExternalInputLabel
                  : prettyCONSTName(currentInputType)}
              </div>
              <div className="model-loader__header__configs__type__icon">
                <FaCaretDown />
              </div>
            </div>
          </DropdownMenu>
          <div
            className="model-loader__header__configs__edit-mode"
            onClick={toggleReplace}
          >
            <div className="model-loader__header__configs__edit-mode__icon">
              {replace ? <FaCheckSquare /> : <FaRegSquare />}
            </div>
            <div className="model-loader__header__configs__edit-mode__label">
              replace
            </div>
          </div>
          {!modelLoaderState.currentExternalInputType && (
            <button
              className="model-loader__header__configs__load-project-entities-btn"
              tabIndex={-1}
              onClick={loadCurrentProjectEntities}
              title="Load current project entities"
            >
              <FaTruckLoading />
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
        <TextInputEditor
          language={EDITOR_LANGUAGE.JSON}
          inputValue={modelLoaderState.modelText}
          updateInput={updateModel}
          showMiniMap={true}
        />
      </div>
    </div>
  );
});
