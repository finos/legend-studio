import { observer } from 'mobx-react-lite';
import { useEditorStore } from '@finos/legend-application-studio';
import { DataSpaceEditorState } from '../stores/DataSpaceEditorState.js';
import React, { useRef, useEffect } from 'react';
import { PanelFormTextField, PanelFormSection } from '@finos/legend-art';

export const FormTextEditor = observer(() => {
  const editorStore = useEditorStore();
  const currentTabState = editorStore.tabManagerState.currentTab;
  const typeNameRef = useRef<HTMLInputElement>(null);

  if (!(currentTabState instanceof DataSpaceEditorState)) {
    return null;
  }

  const formEditorState =
    editorStore.tabManagerState.getCurrentEditorState(DataSpaceEditorState);

  const formElement = formEditorState.dataSpace;
  const isReadOnly = formEditorState.isReadOnly;

  useEffect(() => {
    if (!isReadOnly) {
      typeNameRef.current?.focus();
    }
  }, [isReadOnly]);

  const handleTitleChange = (value: string | undefined) => {
    formEditorState.setTitle(value ?? '');
  };

  const handleDescriptionChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    formEditorState.setDescription(e.target.value);
  };

  return (
    <div className="form-text-editor panel text-element-editor">
      <div className="panel__header text-element-editor__header">
        <div
          className="text-element-editor__header__configs"
          style={{ position: 'relative', top: '200px', height: '200px' }}
        >
          <div className="panel__content">
            <PanelFormSection>
              <div>
                <PanelFormTextField
                  name="Title"
                  value={formElement.title ?? ''}
                  update={handleTitleChange}
                  placeholder="Enter title"
                />
              </div>
              <div>
                {/* <PanelFormTextField
                  name="Description"
                  value={formElement.description ?? ''}
                  update={handleDescriptionChange}
                  placeholder="Enter description"
                /> */}
                <textarea
                  className="panel__content__form__section__textarea service-editor__documentation__input"
                  spellCheck={false}
                  disabled={isReadOnly}
                  value={formElement.title ?? ''}
                  onChange={handleDescriptionChange}
                />
              </div>
            </PanelFormSection>
          </div>
        </div>
      </div>
    </div>
  );
});
