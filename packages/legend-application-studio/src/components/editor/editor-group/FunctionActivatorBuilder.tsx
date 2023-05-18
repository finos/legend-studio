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
import { type FunctionEditorState } from '../../../stores/editor/editor-state/element-editor-state/FunctionEditorState.js';
import {
  getClassProperty,
  type FunctionActivatorConfiguration,
  extractAnnotatedElementDocumentation,
} from '@finos/legend-graph';
import { useEditorStore } from '../EditorStoreProvider.js';
import { BlankPanelContent, CustomSelectorInput } from '@finos/legend-art';
import { ProtocolValueBuilder } from './ProtocolValueBuilder.js';
import { returnUndefOnError } from '@finos/legend-shared';
import type { ProtocolValueBuilderState } from '../../../stores/editor/editor-state/element-editor-state/ProtocolValueBuilderState.js';
import { useEffect, useRef } from 'react';
import { flowResult } from 'mobx';
import { useApplicationStore } from '@finos/legend-application';

const FunctionActivatorContentBuilder = observer(
  (props: {
    functionEditorState: FunctionEditorState;
    valueBuilderState: ProtocolValueBuilderState;
  }) => {
    const { functionEditorState, valueBuilderState } = props;
    const builderState = functionEditorState.activatorBuilderState;

    // name
    const nameInputRef = useRef<HTMLInputElement>(null);
    const nameValidationErrorMessage =
      builderState.activatorName.length === 0
        ? 'Element name cannot be empty'
        : builderState.isDuplicated
        ? `Element of the same path already existed`
        : undefined;
    useEffect(() => {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }, [valueBuilderState]);

    // function
    const functionFieldProperty = returnUndefOnError(() =>
      getClassProperty(valueBuilderState.type, 'function'),
    );
    const functionFieldDocumentation = functionFieldProperty
      ? extractAnnotatedElementDocumentation(functionFieldProperty)
      : undefined;

    return (
      <>
        <div className="panel__content__form">
          <div className="panel__content__form__section">
            <div className="panel__content__form__section__header__label">
              Name
            </div>
            <div className="input-group">
              <input
                className="panel__content__form__section__input"
                spellCheck={false}
                ref={nameInputRef}
                value={builderState.activatorName}
                onChange={(event) =>
                  builderState.setActivatorName(event.target.value)
                }
              />
              {nameValidationErrorMessage && (
                <div className="input-group__error-message">
                  {nameValidationErrorMessage}
                </div>
              )}
            </div>
          </div>
          <div className="panel__content__form__section">
            <div className="panel__content__form__section__header__label">
              Function
            </div>
            {functionFieldDocumentation && (
              <div className="panel__content__form__section__header__prompt">
                {functionFieldDocumentation}
              </div>
            )}
            <input
              className="panel__content__form__section__input"
              spellCheck={false}
              disabled={true}
              value={functionEditorState.functionElement.path}
            />
          </div>
          <div className="panel__content__form__section">
            <div className="panel__content__form__section__divider"></div>
          </div>
        </div>
        <ProtocolValueBuilder builderState={valueBuilderState} />
      </>
    );
  },
);

type FunctionActivatorOption = {
  label: React.ReactNode;
  value: FunctionActivatorConfiguration;
};
const buildFunctionActivatorOption = (
  value: FunctionActivatorConfiguration,
): FunctionActivatorOption => ({
  label: (
    <div
      className="function-activator-builder__activator__selector__option"
      title={value.description}
    >
      <div className="function-activator-builder__activator__selector__option__name">
        {value.name}
      </div>
      <div className="function-activator-builder__activator__selector__option__description">
        {value.description}
      </div>
    </div>
  ),
  value,
});

export const FunctionActivatorBuilder = observer(
  (props: { functionEditorState: FunctionEditorState }) => {
    const { functionEditorState } = props;
    const builderState = functionEditorState.activatorBuilderState;
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const activatorOptions =
      editorStore.graphState.functionActivatorConfigurations.map(
        buildFunctionActivatorOption,
      );
    const currentActivatorOption = builderState.currentActivatorConfiguration
      ? buildFunctionActivatorOption(builderState.currentActivatorConfiguration)
      : null;
    const onActivatorOptionChange = (val: FunctionActivatorOption): void => {
      if (val.value !== builderState.currentActivatorConfiguration) {
        builderState.setCurrentActivatorConfiguration(val.value);
      }
    };
    const activate = (): void => {
      flowResult(builderState.activate()).catch(
        applicationStore.alertUnhandledError,
      );
    };

    return (
      <div className="function-activator-builder">
        <div className="function-activator-builder__header">
          <div className="panel__content__form">
            <div className="panel__content__form__section">
              <div className="panel__content__form__section__header__label">
                Function Activator Type
              </div>
              <CustomSelectorInput
                className="panel__content__form__section__dropdown function-activator-builder__activator__selector"
                options={activatorOptions}
                onChange={onActivatorOptionChange}
                value={currentActivatorOption}
                placeholder="Choose an activator..."
                darkMode={true}
                optionCustomization={{ rowHeight: 68 }}
              />
            </div>
          </div>
        </div>
        <div className="function-activator-builder__body">
          {builderState.functionActivatorProtocolValueBuilderState && (
            <FunctionActivatorContentBuilder
              functionEditorState={functionEditorState}
              valueBuilderState={
                builderState.functionActivatorProtocolValueBuilderState
              }
            />
          )}
          {!builderState.functionActivatorProtocolValueBuilderState && (
            <BlankPanelContent>No activator chosen</BlankPanelContent>
          )}
        </div>
        <div className="function-activator-builder__footer">
          <button
            className="btn--wide btn--dark"
            disabled={!builderState.isValid}
            onClick={activate}
          >
            Activate
          </button>
        </div>
      </div>
    );
  },
);
