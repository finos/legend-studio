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

import { useRef, useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import {
  ELEMENT_PATH_DELIMITER,
  resolvePackagePathAndElementName,
  Package,
} from '@finos/legend-graph';
import type { ElementFileGenerationState } from '../../../../stores/editor/editor-state/element-editor-state/ElementFileGenerationState.js';
import type { ElementEditorState } from '../../../../stores/editor/editor-state/element-editor-state/ElementEditorState.js';
import { guaranteeType } from '@finos/legend-shared';
import { FileGenerationConfigurationEditor } from './FileGenerationEditor.js';
import { flowResult } from 'mobx';
import {
  Dialog,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
  ArrowCircleLeftIcon,
} from '@finos/legend-art';
import { useEditorStore } from '../../EditorStoreProvider.js';
import { useApplicationStore } from '@finos/legend-application';
import { FileSystemViewer } from './FileSystemViewer.js';

const NewFileGenerationModal = observer(
  (props: {
    currentElementState: ElementEditorState;
    elementGenerationState: ElementFileGenerationState;
  }) => {
    const { elementGenerationState, currentElementState } = props;
    const applicationStore = useApplicationStore();
    const isReadOnly = currentElementState.isReadOnly;
    const element = currentElementState.element;
    const mappingPackage = guaranteeType(element.package, Package);
    const nameRef = useRef<HTMLInputElement>(null);
    const editorStore = useEditorStore();
    const defaultFileGenerationName = `${element.path}_${elementGenerationState.fileGenerationType}`;
    const [servicePath, setServicePath] = useState<string>(
      defaultFileGenerationName,
    );
    const [packagePath, serviceName] = resolvePackagePathAndElementName(
      servicePath,
      mappingPackage.path,
    );
    const close = (): void =>
      elementGenerationState.setShowNewFileGenerationModal(false);
    const handleEnter = (): void => nameRef.current?.focus();
    const elementAlreadyExists =
      editorStore.graphManagerState.graph.allOwnElements
        .map((el) => el.path)
        .includes(packagePath + ELEMENT_PATH_DELIMITER + serviceName);
    const promoteToFileGeneration = async (): Promise<void> => {
      if (servicePath && !isReadOnly && !elementAlreadyExists) {
        await flowResult(
          elementGenerationState.promoteToFileGeneration(
            packagePath,
            serviceName,
          ),
        );
        close();
      }
    };
    const changeValue: React.ChangeEventHandler<HTMLInputElement> = (event) =>
      setServicePath(event.target.value);

    return (
      <Dialog
        open={elementGenerationState.showNewFileGenerationModal}
        onClose={close}
        slotProps={{
          transition: {
            onEnter: handleEnter,
          },
          paper: {
            classes: {
              root: 'search-modal__inner-container',
            },
          },
        }}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            promoteToFileGeneration().catch(
              applicationStore.alertUnhandledError,
            );
          }}
          className="modal search-modal modal--dark"
        >
          <div className="modal__title">
            Promote file generation specification
          </div>
          <div className="input-group">
            <input
              ref={nameRef}
              className="input input--dark input-group__input"
              disabled={isReadOnly}
              value={servicePath}
              spellCheck={false}
              onChange={changeValue}
              placeholder={`Enter a name, use ${ELEMENT_PATH_DELIMITER} to create new package(s) for the service`}
            />
            {elementAlreadyExists && (
              <div className="input-group__error-message">
                Element with same path already exists
              </div>
            )}
          </div>
          <div className="search-modal__actions">
            <button
              className="btn btn--dark"
              disabled={isReadOnly || elementAlreadyExists}
            >
              Create
            </button>
          </div>
        </form>
      </Dialog>
    );
  },
);

export const ElementGenerationEditor = observer(
  (props: {
    currentElementState: ElementEditorState;
    elementGenerationState: ElementFileGenerationState;
  }) => {
    const { elementGenerationState, currentElementState } = props;
    const applicationStore = useApplicationStore();
    const isReadOnly = currentElementState.isReadOnly;
    const leaveElementGenerationView = (): void =>
      currentElementState.setGenerationModeState(undefined);

    useEffect(() => {
      flowResult(elementGenerationState.regenerate()).catch(
        applicationStore.alertUnhandledError,
      );
    }, [applicationStore, currentElementState, elementGenerationState]);

    return (
      <div className="panel element-generation-editor">
        <div className="panel__header element-generation-editor__header">
          <div className="panel__header__title">
            <button
              className="panel__header__action element-generation-editor__leave-btn"
              tabIndex={-1}
              onClick={leaveElementGenerationView}
              title="Leave element generation view mode"
            >
              <ArrowCircleLeftIcon /> exit generation view
            </button>
          </div>
        </div>
        <div className="panel__content element-generation-editor__content">
          <div className="file-generation-editor">
            <ResizablePanelGroup orientation="vertical">
              <ResizablePanel
                size={300}
                minSize={300}
                className="file-generation-editor__split-pane"
              >
                <FileGenerationConfigurationEditor
                  fileGenerationState={
                    elementGenerationState.fileGenerationState
                  }
                  isReadOnly={isReadOnly}
                  elementGenerationState={elementGenerationState}
                />
              </ResizablePanel>
              <ResizablePanelSplitter>
                <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
              </ResizablePanelSplitter>
              <ResizablePanel>
                <FileSystemViewer
                  generatedFileState={
                    elementGenerationState.fileGenerationState
                  }
                />
              </ResizablePanel>
            </ResizablePanelGroup>
            <NewFileGenerationModal
              elementGenerationState={elementGenerationState}
              currentElementState={currentElementState}
            />
          </div>
        </div>
      </div>
    );
  },
);
