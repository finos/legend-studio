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

import {
  type DataSpaceExecutable,
  DataSpacePackageableElementExecutable,
} from '@finos/legend-extension-dsl-data-space/graph';
import { observer } from 'mobx-react-lite';
import {
  dataSpace_addExecutable,
  dataSpace_removeExecutable,
} from '../../stores/studio/DSL_DataSpace_GraphModifierHelper.js';
import { useEditorStore } from '@finos/legend-application-studio';
import { DataSpaceEditorState } from '../../stores/DataSpaceEditorState.js';
import { CustomSelectorInput, ListEditor } from '@finos/legend-art';
import {
  type PackageableElement,
  PackageableElementExplicitReference,
} from '@finos/legend-graph';

export const DataspaceExecutablesSection = observer(() => {
  const editorStore = useEditorStore();

  const dataSpaceState =
    editorStore.tabManagerState.getCurrentEditorState(DataSpaceEditorState);
  const dataSpace = dataSpaceState.dataSpace;

  // Event handlers
  const handleAddExecutable = (option: {
    label: string;
    value: PackageableElement;
  }): void => {
    if (typeof option.value === 'object') {
      const element = option.value;
      const executablePointer = new DataSpacePackageableElementExecutable();
      executablePointer.executable =
        PackageableElementExplicitReference.create(element);
      executablePointer.title = element.name;
      dataSpace_addExecutable(dataSpace, executablePointer);
    }
  };

  const handleRemoveExecutable = (executable: DataSpaceExecutable): void => {
    dataSpace_removeExecutable(dataSpace, executable);
  };

  // ListEditor component renderers
  const ExecutableComponent = observer(
    (props: { item: DataSpaceExecutable }): React.ReactElement => {
      const { item } = props;

      return (
        <div className="panel__content__form__section__list__item__content">
          <div className="panel__content__form__section__list__item__content__label">
            {item.title}
          </div>
        </div>
      );
    },
  );

  const NewExecutableComponent = observer(
    (props: { onFinishEditing: () => void }) => {
      const { onFinishEditing } = props;

      return (
        <div className="panel__content__form__section__list__new-item__input">
          <CustomSelectorInput
            options={dataSpaceState.getDataSpaceExecutableOptions()}
            onChange={(event: { label: string; value: PackageableElement }) => {
              onFinishEditing();
              handleAddExecutable(event);
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
      title="Executables"
      prompt="Add functions and services to display under Quick Start for users to see how this Data Product can be used."
      items={dataSpace.executables}
      keySelector={(element: DataSpaceExecutable) => element.hashCode}
      ItemComponent={ExecutableComponent}
      NewItemComponent={NewExecutableComponent}
      handleRemoveItem={handleRemoveExecutable}
      isReadOnly={dataSpaceState.isReadOnly}
      emptyMessage="No executables specified"
    />
  );
});
