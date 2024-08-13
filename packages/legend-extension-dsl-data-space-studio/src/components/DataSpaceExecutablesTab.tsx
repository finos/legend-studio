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
  CustomSelectorInput,
  PanelFormSection,
  PanelFormTextField,
} from '@finos/legend-art';
import type { DataSpaceEditorState } from '../stores/DataSpaceEditorState.js';
import {
  PackageableElementExplicitReference,
  type PackageableElement,
  type PackageableElementReference,
} from '@finos/legend-graph';
import type { DataSpacePackageableElementExecutable } from '@finos/legend-extension-dsl-data-space/graph';

interface DataSpaceExecutablesTabProps {
  dataSpaceEditorState: DataSpaceEditorState;
}

type OptionType = {
  label: string;
  value: PackageableElementReference<PackageableElement>;
};

export const DataSpaceExecutablesTab: React.FC<DataSpaceExecutablesTabProps> =
  observer(({ dataSpaceEditorState }) => {
    const executableOptions =
      dataSpaceEditorState.editorStore.graphManagerState.usableServices.map(
        (executable) => ({
          label: executable.path,
          value: PackageableElementExplicitReference.create(executable),
        }),
      );

    // const { selectedExecutable } = dataSpaceEditorState;

    // const handleTitleChange = (value: string | undefined): void => {
    //   if (dataSpaceEditorState.selectedExecutable) {
    //     dataSpaceEditorState.selectedExecutable.title = value ?? '';
    //   }
    // };

    // const handleDescriptionChange = (value: string | undefined): void => {
    //   if (dataSpaceEditorState.selectedExecutable) {
    //     dataSpaceEditorState.selectedExecutable.description = value ?? '';
    //   }
    // };

    // const handleExecutableChange = (option: {
    //   value: PackageableElementReference<PackageableElement>;
    // }) => {
    //   if (dataSpaceEditorState.selectedExecutable) {
    //     dataSpaceEditorState.selectedExecutable.executable = option.value;
    //   }
    // };

    const handleExecutableChange = (
      index: number,
      option: { value: PackageableElementReference<PackageableElement> },
    ) => {
      const updatedExecutables = [...dataSpaceEditorState.executables];
      (
        updatedExecutables[index] as DataSpacePackageableElementExecutable
      ).executable = option.value;
      dataSpaceEditorState.setExecutables(updatedExecutables);
    };

    // const serviceOptions =
    //   dataSpaceEditorState.editorStore.graphManagerState.graph.ownServices.map(
    //     (service) => ({
    //       label: service.path,
    //       value: PackageableElementExplicitReference.create(service),
    //     }),
    //   );

    // const handleAddExecutable = (): void => {
    //   dataSpaceEditorState.addExecutable();
    // };

    // const handleDeleteExecutable = (
    //   executable: DataSpacePackageableElementExecutable,
    // ): void => {
    //   dataSpaceEditorState.removeExecutable(executable);
    // };

    // const handleTitleChange = (value: string | undefined): void => {
    //   if (selectedExecutable) {
    //     selectedExecutable.title = value ?? '';
    //   }
    // };

    // const handleDescriptionChange = (value: string | undefined): void => {
    //   if (selectedExecutable) {
    //     selectedExecutable.description = value ?? '';
    //   }
    // };

    return (
      <div className="data-space-executables-tab">
        {dataSpaceEditorState.executables.map((executable, index) => (
          <PanelFormSection key={executable.hashCode}>
            <PanelFormTextField
              name="Title"
              value={executable.title}
              update={(value) => {
                const updatedExecutables = [
                  ...dataSpaceEditorState.executables,
                ];
                if (updatedExecutables[index]) {
                  updatedExecutables[index].title = value ?? '';
                  dataSpaceEditorState.setExecutables(updatedExecutables);
                }
              }}
              placeholder="Enter title"
            />
            <PanelFormTextField
              name="Description"
              value={executable.description}
              update={(value) => {
                const updatedExecutables = [
                  ...dataSpaceEditorState.executables,
                ];
                if (updatedExecutables[index]) {
                  updatedExecutables[index].description = value ?? '';
                  dataSpaceEditorState.setExecutables(updatedExecutables);
                }
              }}
              placeholder="Enter description"
            />
            <CustomSelectorInput
              options={executableOptions}
              onChange={(option: OptionType) =>
                handleExecutableChange(index, option)
              }
              value={{
                label: (executable as DataSpacePackageableElementExecutable)
                  .executable.value.path,
                value: (executable as DataSpacePackageableElementExecutable)
                  .executable,
              }}
            />
          </PanelFormSection>
        ))}
      </div>

      // <div className="data-space-executables-tab">
      //   {dataSpaceEditorState.dataSpace.executables?.map(
      //     (executable, index) => (
      //       <PanelFormSection key={executable.hashCode}>
      //         <PanelFormTextField
      //           name={`Executable ${index + 1}`}
      //           value={executable.title}
      //           update={handleTitleChange}
      //           placeholder="Enter executable title"
      //         />
      //         <PanelFormTextField
      //           name="Description"
      //           value={executable.description}
      //           update={handleDescriptionChange}
      //           placeholder="Enter executable description"
      //         />
      //       </PanelFormSection>
      //     ),
      //   )}
      // </div>

      // <div className="data-space-executables-tab">
      //   <PanelFormSection>
      //     <button onClick={handleAddExecutable}>Add Executable</button>
      //   </PanelFormSection>
      //   {dataSpaceEditorState.executables.map((executable) => (
      //     <PanelFormSection key={executable.hashCode}>
      //       <PanelFormTextField
      //         name="Executable Title"
      //         value={executable.title}
      //         update={handleTitleChange}
      //       />
      //       <PanelFormTextField
      //         name="Executable Description"
      //         value={executable.description ?? ''}
      //         update={handleDescriptionChange}
      //       />
      //       <CustomSelectorInput
      //         options={serviceOptions}
      //         onChange={handleExecutableChange}
      //         value={{
      //           label: executable.title,
      //           value: executable.description,
      //         }}
      //         placeholder="Select a Service"
      //       />
      //       {/* <button onClick={() => handleDeleteExecutable(executable)}>
      //         Delete
      //       </button> */}
      //     </PanelFormSection>
      //   ))}
      // </div>
    );
  });
