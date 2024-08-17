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

import React from 'react';
import { observer } from 'mobx-react-lite';
import {
  BlankPanelPlaceholder,
  clsx,
  CustomSelectorInput,
  Panel,
  PanelContent,
  PanelFormListItems,
  PanelFormTextField,
  PanelHeader,
  PanelHeaderActionItem,
  PanelHeaderActions,
  PlusIcon,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
  TrashIcon,
} from '@finos/legend-art';
import type { DataSpaceEditorState } from '../stores/DataSpaceEditorState.js';
import {
  PackageableElementExplicitReference,
  type PackageableElement,
  type PackageableElementReference,
} from '@finos/legend-graph';
import {
  DataSpacePackageableElementExecutable,
  type DataSpaceExecutable,
} from '@finos/legend-extension-dsl-data-space/graph';
import { useApplicationStore } from '@finos/legend-application';

interface DataSpaceExecutablesTabProps {
  dataSpaceEditorState: DataSpaceEditorState;
}

interface ExecutableItemProps {
  executable: DataSpaceExecutable;
  dataSpaceEditorState: DataSpaceEditorState;
  idx: number;
}

const ExecutableItem: React.FC<ExecutableItemProps> = observer((props) => {
  const { executable, dataSpaceEditorState, idx } = props;
  // const applicationStore = useApplicationStore();

  const isActive = dataSpaceEditorState.selectedExecutable === executable;

  const openExecutable = (): void => {
    dataSpaceEditorState.setSelectedExecutable(executable);
  };

  const deleteExecutable = (): void => {
    dataSpaceEditorState.removeExecutable(executable);
  };

  return (
    <div
      className={clsx('executable-item', {
        'executable-item--active': isActive,
      })}
      onClick={openExecutable}
    >
      <button
        className={clsx('executable-item__label')}
        onClick={openExecutable}
        tabIndex={-1}
      >
        <div className="executable-item__label__text">
          {executable.title || `Executable ${idx + 1}`}
        </div>
      </button>
      <div className="executable-item__actions">
        <button
          className="executable-item__action executable-item-delete-btn"
          onClick={deleteExecutable}
          tabIndex={-1}
          title={`Delete ${executable.title || `Executable ${idx + 1}`}`}
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  );
});

export const DataSpaceExecutablesTab: React.FC<DataSpaceExecutablesTabProps> =
  observer(({ dataSpaceEditorState }) => {
    const executableOptions =
      dataSpaceEditorState.editorStore.graphManagerState.usableServices.map(
        (executable) => ({
          label: executable.path,
          value: PackageableElementExplicitReference.create(executable),
        }),
      );

    const handleExecutableChange = (option: {
      value: PackageableElementReference<PackageableElement>;
    }) => {
      const selectedExecutable = dataSpaceEditorState.selectedExecutable;

      if (selectedExecutable instanceof DataSpacePackageableElementExecutable) {
        selectedExecutable.executable = option.value;

        dataSpaceEditorState.setSelectedExecutable(selectedExecutable);
      }
    };

    const handleAddExecutable = (): void => {
      dataSpaceEditorState.addExecutable();
    };

    const handleTitleChange = (value: string | undefined): void => {
      if (dataSpaceEditorState.selectedExecutable) {
        dataSpaceEditorState.selectedExecutable.title = value ?? '';
      }
    };

    const handleDescriptionChange = (value: string | undefined): void => {
      if (dataSpaceEditorState.selectedExecutable) {
        dataSpaceEditorState.selectedExecutable.description = value ?? '';
      }
    };

    return (
      <div className="data-space-executables-editor">
        <PanelHeader title="Executables" className="half-width-panel-header">
          <PanelHeaderActions>
            <PanelHeaderActionItem
              onClick={handleAddExecutable}
              title="Add Executable"
              className="data-space-executables-editor executable-item__action"
            >
              <PlusIcon />
            </PanelHeaderActionItem>
          </PanelHeaderActions>
        </PanelHeader>
        <div className="data-space-executables__content">
          <ResizablePanelGroup orientation="vertical">
            <ResizablePanel minSize={100} size={300}>
              <PanelContent>
                {dataSpaceEditorState.dataSpace.executables?.map(
                  (executable, index) => (
                    <ExecutableItem
                      key={executable.hashCode}
                      executable={executable}
                      dataSpaceEditorState={dataSpaceEditorState}
                      idx={index}
                    />
                  ),
                )}
                {!dataSpaceEditorState.dataSpace.executables?.length && (
                  <BlankPanelPlaceholder
                    text="Add Executable"
                    onClick={handleAddExecutable}
                    clickActionType="add"
                    tooltipText="Click to add executable"
                  />
                )}
              </PanelContent>
            </ResizablePanel>
            <ResizablePanelSplitter>
              <ResizablePanelSplitterLine color="var(--color-dark-grey-400)" />
            </ResizablePanelSplitter>
            <ResizablePanel>
              <Panel className="data-space-executable-details">
                {dataSpaceEditorState.dataSpace.executables?.length ? (
                  <>
                    <div>
                      <PanelFormTextField
                        name="Executable Title"
                        value={dataSpaceEditorState.selectedExecutable?.title}
                        update={handleTitleChange}
                        placeholder="Enter title"
                      />
                    </div>
                    <div>
                      <PanelFormTextField
                        name="Executable Description"
                        value={
                          dataSpaceEditorState.selectedExecutable?.description
                        }
                        update={handleDescriptionChange}
                        placeholder="Enter description"
                      />
                    </div>
                    <PanelFormListItems title="Executable">
                      <CustomSelectorInput
                        options={executableOptions}
                        onChange={handleExecutableChange}
                        value={{
                          label:
                            dataSpaceEditorState.selectedExecutable instanceof
                            DataSpacePackageableElementExecutable
                              ? dataSpaceEditorState.selectedExecutable
                                  .executable.value.path
                              : '',
                          value:
                            dataSpaceEditorState.selectedExecutable instanceof
                            DataSpacePackageableElementExecutable
                              ? dataSpaceEditorState.selectedExecutable
                                  .executable
                              : undefined,
                        }}
                        placeholder="Select Executable"
                      />
                    </PanelFormListItems>
                  </>
                ) : (
                  <BlankPanelPlaceholder
                    text="Select an Executable to view details"
                    tooltipText="Select an executable"
                  />
                )}
              </Panel>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    );
  });
