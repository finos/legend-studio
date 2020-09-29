/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, { useRef, useState, useEffect } from 'react';
import { Dialog } from '@material-ui/core';
import SplitPane from 'react-split-pane';
import { observer } from 'mobx-react-lite';
import { useEditorStore } from 'Stores/EditorStore';
import { ENTITY_PATH_DELIMITER } from 'MetaModelConst';
import { resolvePackageNameAndElementName } from 'MetaModelUtility';
import { ElementFileGenerationState } from 'Stores/editor-state/element-editor-state/ElementFileGenerationState';
import { ElementEditorState } from 'Stores/editor-state/element-editor-state/ElementEditorState';
import { guaranteeType } from 'Utilities/GeneralUtil';
import { GenerationResultViewer, FileGenerationConfigurationEditor } from 'Components/editor/edit-panel/element-generation-editor/FileGenerationEditor';
import { FaArrowAltCircleLeft } from 'react-icons/fa';
import { useApplicationStore } from 'Stores/ApplicationStore';
import { Package } from 'MM/model/packageableElements/domain/Package';

const NewFileGenerationModal = observer((props: {
  currentElementState: ElementEditorState;
  elementGenerationState: ElementFileGenerationState;
}) => {
  const { elementGenerationState, currentElementState } = props;
  const isReadOnly = currentElementState.isReadOnly;
  const element = currentElementState.element;
  const mappingPackage = guaranteeType(element.package, Package);
  const nameRef = useRef<HTMLInputElement>(null);
  const editorStore = useEditorStore();
  const defaultFileGenerationName = `${element.path}_${elementGenerationState.fileGenerationType}`;
  const [fileGenerationPath, setFileGenerationPath] = useState<string>(defaultFileGenerationName);
  const [packageName, fileGenerationName] = resolvePackageNameAndElementName(mappingPackage.path, fileGenerationPath);
  const close = (): void => elementGenerationState.setShowNewFileGenerationModal(false);
  const handleEnter = (): void => nameRef.current?.focus();
  const handleSubmit = (): void => {
    if (fileGenerationPath && !isReadOnly) {
      elementGenerationState.promoteToFileGeneration(packageName, fileGenerationName);
      close();
    }
  };
  const onSubmit = (event: React.FormEvent<HTMLFormElement>): void => { event.preventDefault(); handleSubmit() };
  const changeValue: React.ChangeEventHandler<HTMLInputElement> = event => setFileGenerationPath(event.target.value);
  const elementAlreadyExists = editorStore.graphState.graph.allElements.map(s => s.path).includes(packageName + ENTITY_PATH_DELIMITER + fileGenerationName);

  return (
    <Dialog
      open={elementGenerationState.showNewFileGenerationModal}
      onClose={close}
      onEnter={handleEnter}
      PaperProps={{
        classes: {
          root: 'search-modal__inner-container'
        }
      }}
    >
      <form onSubmit={onSubmit} className="modal search-modal modal--dark">
        <div className="modal__title">Promote to file Generation</div>
        <input
          ref={nameRef}
          className="input mapping-execution-panel__service__modal__service-path"
          disabled={isReadOnly}
          value={fileGenerationPath}
          spellCheck={false}
          onChange={changeValue}
          placeholder={`Enter a name, use ${ENTITY_PATH_DELIMITER} to create new package(s) for the service`}
        />
        {elementAlreadyExists && <div>Element with same path already exists</div>}
        <button className="btn btn--primary u-pull-right" disabled={isReadOnly || elementAlreadyExists} color="primary">Create</button>
      </form>
    </Dialog>
  );
});

export const ElementGenerationEditor = observer((props: {
  currentElementState: ElementEditorState;
  elementGenerationState: ElementFileGenerationState;
}) => {
  const { elementGenerationState, currentElementState } = props;
  const applicationStore = useApplicationStore();
  const isReadOnly = currentElementState.isReadOnly;
  const leaveElementGenerationView = (): void => currentElementState.setGenerationViewMode(undefined);

  useEffect(() => { elementGenerationState.regenerate().catch(applicationStore.alertIllegalUnhandledError) }, [applicationStore, currentElementState, elementGenerationState]);

  return (
    <div className="panel element-generation-editor">
      <div className="panel__header element-generation-editor__header">
        <div className="panel__header__title">
          <button
            className="panel__header__action element-generation-editor__leave-btn"
            tabIndex={-1}
            onClick={leaveElementGenerationView}
            title={'Leave element generation view mode'}
          ><FaArrowAltCircleLeft /> exit generation view</button>
        </div>
      </div>
      <div className="panel__content element-generation-editor__content">
        <div className="file-generation-editor">
          <SplitPane className="file-generation-editor__split-pane" split="vertical" defaultSize={300} minSize={300} maxSize={-550}>
            <FileGenerationConfigurationEditor fileGenerationState={elementGenerationState.fileGenerationState} isReadOnly={isReadOnly} elementGenerationState={elementGenerationState} />
            <GenerationResultViewer fileGenerationState={elementGenerationState.fileGenerationState} />
          </SplitPane>
          <NewFileGenerationModal elementGenerationState={elementGenerationState} currentElementState={currentElementState} />
        </div>
      </div>
    </div>
  );
});
