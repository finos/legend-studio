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

import { useEditorStore } from '@finos/legend-application-studio';
import { ListEditor, Checkbox, CustomSelectorInput } from '@finos/legend-art';
import {
  type DataSpaceElement,
  DataSpaceElementPointer,
} from '@finos/legend-extension-dsl-data-space/graph';
import { observer } from 'mobx-react-lite';
import { DataSpaceEditorState } from '../../stores/DataSpaceEditorState.js';
import { PackageableElementExplicitReference } from '@finos/legend-graph';
import {
  dataSpace_addElement,
  dataSpace_removeElement,
  dataSpace_setElementExclude,
} from '../../stores/studio/DSL_DataSpace_GraphModifierHelper.js';

export const DataSpaceElementsSection = observer(() => {
  const editorStore = useEditorStore();

  const dataSpaceState =
    editorStore.tabManagerState.getCurrentEditorState(DataSpaceEditorState);
  const dataSpace = dataSpaceState.dataSpace;

  // Event handlers
  const handleAddElement = (option: {
    label: string;
    value: DataSpaceElement;
  }): void => {
    if (typeof option.value === 'object') {
      const element = option.value;
      const elementPointer = new DataSpaceElementPointer();
      elementPointer.element =
        PackageableElementExplicitReference.create(element);
      dataSpace_addElement(dataSpace, elementPointer);
    }
  };

  const handleRemoveElement = (element: DataSpaceElementPointer): void => {
    dataSpace_removeElement(dataSpace, element);
  };

  const handleElementExcludeChange = (
    element: DataSpaceElementPointer,
    event: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    dataSpace_setElementExclude(element, event.target.checked);
  };

  // ListEditor component renderers
  const ElementComponent = observer(
    (props: { item: DataSpaceElementPointer }): React.ReactElement => {
      const { item } = props;

      return (
        <div className="panel__content__form__section__list__item__content">
          <div className="panel__content__form__section__list__item__content__label">
            {item.element.value.path}
          </div>
          <div className="panel__content__form__section__list__item__content__actions">
            <div className="panel__content__form__section__list__item__content__actions-exclude">
              <Checkbox
                disabled={dataSpaceState.isReadOnly}
                checked={item.exclude ?? false}
                onChange={(event) => handleElementExcludeChange(item, event)}
                size="small"
                className="panel__content__form__section__list__item__content__actions-exclude__btn"
              />
              <span className="panel__content__form__section__list__item__content__actions__label">
                Exclude
              </span>
            </div>
          </div>
        </div>
      );
    },
  );

  const NewElementComponent = observer(
    (props: { onFinishEditing: () => void }) => {
      const { onFinishEditing } = props;

      return (
        <div className="panel__content__form__section__list__new-item__input">
          <CustomSelectorInput
            options={dataSpaceState.getDataSpaceElementOptions()}
            onChange={(event: { label: string; value: DataSpaceElement }) => {
              onFinishEditing();
              handleAddElement(event);
            }}
            placeholder="Select an element to add..."
            darkMode={true}
          />
        </div>
      );
    },
  );

  return (
    <ListEditor
      title="Elements"
      prompt="Add classes and associations to display under Models Documentation. Use the exclude checkbox to exclude certain elements from this Data Product entirely."
      items={dataSpace.elements}
      keySelector={(element: DataSpaceElementPointer) =>
        element.element.value.path
      }
      ItemComponent={ElementComponent}
      NewItemComponent={NewElementComponent}
      handleRemoveItem={handleRemoveElement}
      isReadOnly={dataSpaceState.isReadOnly}
      emptyMessage="No elements specified"
    />
  );
});
