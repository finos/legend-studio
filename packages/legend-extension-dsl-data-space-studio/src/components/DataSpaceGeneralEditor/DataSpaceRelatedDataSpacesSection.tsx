/**
 * Copyright (c) 2026-present, Goldman Sachs
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
import { ListEditor, CustomSelectorInput } from '@finos/legend-art';
import { type ResolvedDataSpaceEntityWithOrigin } from '@finos/legend-extension-dsl-data-space/application';
import { observer } from 'mobx-react-lite';
import {
  DataSpaceEditorState,
  type RelatedDataSpaceRow,
} from '../../stores/DataSpaceEditorState.js';

export const DataSpaceRelatedDataSpacesSection = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = editorStore.applicationStore;
  const darkMode =
    !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled;

  const dataSpaceState =
    editorStore.tabManagerState.getCurrentEditorState(DataSpaceEditorState);

  const handleAddRelatedDataSpace = (option: {
    label: string;
    value: ResolvedDataSpaceEntityWithOrigin;
  }): void => {
    dataSpaceState.addRelatedDataSpace(option.value);
  };

  const handleRemoveRelatedDataSpace = (row: RelatedDataSpaceRow): void => {
    dataSpaceState.removeRelatedDataSpaceRow(row);
  };

  const RelatedDataSpaceComponent = observer(
    (props: { item: RelatedDataSpaceRow }): React.ReactElement => {
      const { item } = props;

      return (
        <div className="panel__content__form__section__list__item__content">
          <div className="panel__content__form__section__list__item__content__label">
            {item.label}
          </div>
        </div>
      );
    },
  );

  const NewRelatedDataSpaceComponent = observer(
    (props: { onFinishEditing: () => void }) => {
      const { onFinishEditing } = props;

      return (
        <div className="panel__content__form__section__list__new-item__input">
          <CustomSelectorInput
            options={dataSpaceState.getRelatedDataSpaceOptions()}
            onChange={(option: {
              label: string;
              value: ResolvedDataSpaceEntityWithOrigin;
            }) => {
              onFinishEditing();
              handleAddRelatedDataSpace(option);
            }}
            placeholder={
              dataSpaceState.loadRelatedDataSpacesState.isInProgress
                ? 'Loading Data Spaces...'
                : 'Select a Data Space to add...'
            }
            isLoading={dataSpaceState.loadRelatedDataSpacesState.isInProgress}
            darkMode={darkMode}
          />
        </div>
      );
    },
  );

  return (
    <ListEditor
      title="Related Data Spaces"
      prompt="Add Data Spaces to display under Related Data Spaces."
      items={dataSpaceState.relatedDataSpaceRows}
      keySelector={(row: RelatedDataSpaceRow) => row.id}
      ItemComponent={RelatedDataSpaceComponent}
      NewItemComponent={NewRelatedDataSpaceComponent}
      handleRemoveItem={handleRemoveRelatedDataSpace}
      isReadOnly={dataSpaceState.isReadOnly}
      emptyMessage="No related Data Spaces specified"
    />
  );
});
