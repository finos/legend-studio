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
import {
  Checkbox,
  CustomSelectorInput,
  ListEditor,
  PanelContentLists,
  PanelForm,
  PanelFormSection,
  PanelFormTextField,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { DataSpaceEditorState } from '../../stores/DataSpaceEditorState.js';
import {
  dataSpace_addElement,
  dataSpace_addExecutable,
  dataSpace_combined_addEmail,
  dataSpace_combined_deleteEmail,
  dataSpace_combined_setFaqUrl,
  dataSpace_combined_setSupportUrl,
  dataSpace_combined_setWebsite,
  dataSpace_email_setSupportInfoEmail,
  dataSpace_removeElement,
  dataSpace_removeExecutable,
  dataSpace_setDescription,
  dataSpace_setDocumentationUrl,
  dataSpace_setElementExclude,
  dataSpace_setSupportInfo,
  dataSpace_setTitle,
} from '../../stores/studio/DSL_DataSpace_GraphModifierHelper.js';
import {
  type DataSpaceElement,
  DataSpaceElementPointer,
  DataSpacePackageableElementExecutable,
  DataSpaceSupportCombinedInfo,
  DataSpaceSupportEmail,
} from '@finos/legend-extension-dsl-data-space/graph';
import { PackageableElementExplicitReference } from '@finos/legend-graph';
import { useState } from 'react';
import { DataSpaceDefaultExecutionContextSection } from './DataSpaceDefaultExecutionContextSection.js';
import { DataSpaceDiagramsSection } from './DataSpaceDiagramsSection.js';

export const DataSpaceGeneralEditor = observer(() => {
  const editorStore = useEditorStore();

  const dataSpaceState =
    editorStore.tabManagerState.getCurrentEditorState(DataSpaceEditorState);
  const dataSpace = dataSpaceState.dataSpace;

  // Basic properties handlers
  const handleTitleChange = (value: string | undefined): void => {
    dataSpace_setTitle(dataSpace, value);
  };

  const handleDescriptionChange = (value: string | undefined): void => {
    dataSpace_setDescription(dataSpace, value);
  };

  // Elements handlers
  const handleAddElement = (option: {
    label: string;
    value: DataSpaceElement;
  }): void => {
    if (option && option.value && typeof option.value === 'object') {
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

  // Executables handlers
  const handleAddExecutable = (): void => {
    const newExecutable = new DataSpacePackageableElementExecutable();
    newExecutable.title = `Executable ${dataSpace.executables?.length ?? 0 + 1}`;
    dataSpace_addExecutable(dataSpace, newExecutable);
  };

  const handleRemoveExecutable = (index: number): void => {
    dataSpace_removeExecutable(dataSpace, index);
  };

  // SupportInfo handlers
  const handleSupportInfoTypeChange = (option: { value: string }): void => {
    if (!option || typeof option !== 'object' || !('value' in option)) {
      return;
    }
    const type = option.value;
    if (
      type === 'email' &&
      !(dataSpace.supportInfo instanceof DataSpaceSupportEmail)
    ) {
      const supportInfo = new DataSpaceSupportEmail();
      if (dataSpace.supportInfo instanceof DataSpaceSupportCombinedInfo) {
        supportInfo.address = dataSpace.supportInfo.emails?.[0] ?? '';
      }
      dataSpace_setSupportInfo(dataSpace, supportInfo);
    } else if (
      type === 'combined' &&
      !(dataSpace.supportInfo instanceof DataSpaceSupportCombinedInfo)
    ) {
      const supportInfo = new DataSpaceSupportCombinedInfo();
      if (
        dataSpace.supportInfo instanceof DataSpaceSupportEmail &&
        dataSpace.supportInfo.address
      ) {
        supportInfo.emails = [dataSpace.supportInfo.address];
      }
      dataSpace_setSupportInfo(dataSpace, supportInfo);
    } else {
      dataSpace_setSupportInfo(dataSpace, undefined);
    }
  };

  const handleSupportInfoEmailAdd = (email: string): void => {
    if (dataSpace.supportInfo instanceof DataSpaceSupportCombinedInfo) {
      dataSpace_combined_addEmail(dataSpace.supportInfo, email);
    }
  };

  const handleSupportInfoEmailRemove = (email: string): void => {
    if (dataSpace.supportInfo instanceof DataSpaceSupportCombinedInfo) {
      dataSpace_combined_deleteEmail(dataSpace.supportInfo, email);
    }
  };

  const ElementComponent = observer(
    (props: { item: DataSpaceElementPointer }): React.ReactElement => {
      const { item } = props;

      return (
        <div className="panel__content__form__section__list__item__content">
          <div className="panel__content__form__section__list__item__content__label">
            {item.element?.value?.path ?? 'Unknown Element'}
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

  const SupportEmailComponent = observer(
    (props: { item: string }): React.ReactElement => {
      const { item } = props;

      return (
        <div className="panel__content__form__section__list__item__content">
          <div className="panel__content__form__section__header__label">
            {item}
          </div>
        </div>
      );
    },
  );

  const NewSupportEmailComponent = observer(
    (props: { onFinishEditing: () => void }) => {
      const { onFinishEditing } = props;
      const [email, setEmail] = useState('');

      return (
        <div className="dataSpace-editor__general__support-info__new-email">
          <div className="panel__content__form__section__list__new-item__input">
            <input
              className="input input-group__input panel__content__form__section__input input--dark"
              type="email"
              placeholder="Enter email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value ?? '');
              }}
            />
          </div>
          <button
            className="panel__content__form__section__list__new-item__add-btn btn btn--dark"
            onClick={() => {
              handleSupportInfoEmailAdd(email);
              setEmail('');
              onFinishEditing();
            }}
          >
            Save
          </button>
        </div>
      );
    },
  );

  return (
    <PanelContentLists className="dataSpace-editor__general">
      <PanelForm>
        {/* Basic Properties Section */}
        <PanelFormSection>
          <PanelFormTextField
            name="Data Space Title"
            value={dataSpace.title ?? ''}
            prompt="Data Space title is the unique identifier for this Data Space."
            update={handleTitleChange}
            placeholder="Enter title"
          />
        </PanelFormSection>

        <PanelFormSection>
          <PanelFormTextField
            name="Data Space Description"
            value={dataSpace.description ?? ''}
            prompt="Provide a description for this Data Space."
            update={handleDescriptionChange}
            placeholder="Enter description"
          />
        </PanelFormSection>
        <DataSpaceDefaultExecutionContextSection />
        {/* Elements Section */}
        <PanelFormSection className="dataSpace-editor__general__elements">
          <ListEditor
            title="Elements"
            prompt="Add elements to include in this Data Space. Use the exclude checkbox to exclude elements."
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
        </PanelFormSection>
        {/* Executables Section */}
        {/* <PanelFormListItems title="Executables">
            {formElement.executables?.map((executable, index) => (
              <div
                key={index}
                className="panel__content__form__section__list__item"
              >
                <PanelFormTextField
                  name={`Executable ${index + 1} Title`}
                  value={executable.title}
                  update={(value) => {
                    if (
                      formElement.executables &&
                      formElement.executables[index]
                    ) {
                      formElement.executables[index].title = value ?? '';
                    }
                  }}
                  placeholder="Enter title"
                />
                <PanelFormTextField
                  name={`Executable ${index + 1} Description`}
                  value={executable.description ?? ''}
                  update={(value) => {
                    if (
                      formElement.executables &&
                      formElement.executables[index]
                    ) {
                      formElement.executables[index].description = value;
                    }
                  }}
                  placeholder="Enter description"
                />
                <button
                  className="panel__content__form__section__button"
                  onClick={() => handleRemoveExecutable(index)}
                >
                  Remove
                </button>
              </div>
            )) ?? <div>No executables defined</div>}
            <button
              className="panel__content__form__section__button"
              onClick={handleAddExecutable}
            >
              Add Executable
            </button>
          </PanelFormListItems> */}
        <DataSpaceDiagramsSection />
        {/* Support Info Section */}
        <PanelFormSection className="dataSpace-editor__general__support-info">
          <div className="panel__content__form__section__header__label">
            Support Information
          </div>
          <div className="panel__content__form__section__header__prompt">
            Configure support information for this Data Space.
          </div>
          <CustomSelectorInput
            options={[
              { label: 'None', value: 'none' },
              { label: 'Email', value: 'email' },
              { label: 'Combined', value: 'combined' },
            ]}
            onChange={(option: { label: string; value: string }) =>
              handleSupportInfoTypeChange(option)
            }
            value={{
              label: dataSpace.supportInfo
                ? dataSpace.supportInfo instanceof DataSpaceSupportEmail
                  ? 'Email'
                  : 'Combined'
                : 'None',
              value: dataSpace.supportInfo
                ? dataSpace.supportInfo instanceof DataSpaceSupportEmail
                  ? 'email'
                  : 'combined'
                : 'none',
            }}
            darkMode={true}
          />
          {dataSpace.supportInfo ? (
            dataSpace.supportInfo instanceof DataSpaceSupportEmail ? (
              <PanelFormSection className="dataSpace-editor__general__support-info__content">
                <PanelFormTextField
                  name="Email Address"
                  value={dataSpace.supportInfo.address}
                  update={(value) => {
                    if (
                      dataSpace.supportInfo instanceof DataSpaceSupportEmail
                    ) {
                      dataSpace_email_setSupportInfoEmail(
                        dataSpace.supportInfo,
                        value ?? '',
                      );
                    }
                  }}
                  placeholder="Enter email address"
                />
                <PanelFormTextField
                  name="Documentation URL"
                  value={dataSpace.supportInfo.documentationUrl}
                  update={(value) => {
                    if (dataSpace.supportInfo) {
                      dataSpace_setDocumentationUrl(
                        dataSpace.supportInfo,
                        value ?? '',
                      );
                    }
                  }}
                  placeholder="Enter documentation URL"
                />
              </PanelFormSection>
            ) : dataSpace.supportInfo instanceof
              DataSpaceSupportCombinedInfo ? (
              <PanelFormSection className="dataSpace-editor__general__support-info__content">
                <ListEditor
                  title="Emails"
                  items={dataSpace.supportInfo.emails}
                  keySelector={(element: string) => element}
                  ItemComponent={SupportEmailComponent}
                  NewItemComponent={NewSupportEmailComponent}
                  handleRemoveItem={handleSupportInfoEmailRemove}
                  isReadOnly={dataSpaceState.isReadOnly}
                  emptyMessage="No emails specified"
                />
                <PanelFormTextField
                  name="Documentation URL"
                  value={dataSpace.supportInfo.documentationUrl}
                  update={(value) => {
                    if (dataSpace.supportInfo) {
                      dataSpace_setDocumentationUrl(
                        dataSpace.supportInfo,
                        value ?? '',
                      );
                    }
                  }}
                  placeholder="Enter documentation URL"
                />
                <PanelFormTextField
                  name="Website"
                  value={dataSpace.supportInfo.website}
                  update={(value) => {
                    if (
                      dataSpace.supportInfo instanceof
                      DataSpaceSupportCombinedInfo
                    ) {
                      dataSpace_combined_setWebsite(
                        dataSpace.supportInfo,
                        value ?? '',
                      );
                    }
                  }}
                  placeholder="Enter website URL"
                />
                <PanelFormTextField
                  name="FAQ URL"
                  value={dataSpace.supportInfo.faqUrl}
                  update={(value) => {
                    if (
                      dataSpace.supportInfo instanceof
                      DataSpaceSupportCombinedInfo
                    ) {
                      dataSpace_combined_setFaqUrl(
                        dataSpace.supportInfo,
                        value ?? '',
                      );
                    }
                  }}
                  placeholder="Enter FAQ URL"
                />
                <PanelFormTextField
                  name="Support URL"
                  value={dataSpace.supportInfo.supportUrl}
                  update={(value) => {
                    if (
                      dataSpace.supportInfo instanceof
                      DataSpaceSupportCombinedInfo
                    ) {
                      dataSpace_combined_setSupportUrl(
                        dataSpace.supportInfo,
                        value ?? '',
                      );
                    }
                  }}
                  placeholder="Enter support URL"
                />
              </PanelFormSection>
            ) : (
              <div>Unknown support info type</div>
            )
          ) : null}
        </PanelFormSection>
      </PanelForm>
    </PanelContentLists>
  );
});
