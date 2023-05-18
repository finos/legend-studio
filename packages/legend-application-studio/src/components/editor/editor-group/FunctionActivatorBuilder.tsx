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
import { type FunctionActivatorConfiguration } from '@finos/legend-graph';
import { useEditorStore } from '../EditorStoreProvider.js';
import { BlankPanelContent, CustomSelectorInput } from '@finos/legend-art';
import { ProtocolValueBuilder } from './ProtocolValueBuilder.js';

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
      // do something
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
            <ProtocolValueBuilder
              builderState={
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
            disabled={false}
            onClick={activate}
          >
            Activate
          </button>
        </div>
        <div className="function-activator-builder__content"></div>
      </div>
    );
  },
);
