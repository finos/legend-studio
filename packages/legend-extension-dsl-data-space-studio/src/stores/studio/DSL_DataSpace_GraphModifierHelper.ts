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

import { action } from 'mobx';
import {
  type DataSpace,
  type DataSpaceDiagram,
  type DataSpaceElementPointer,
  type DataSpaceExecutable,
  type DataSpaceExecutionContext,
  type DataSpaceSupportInfo,
  observe_DataSpaceExecutionContext,
} from '@finos/legend-extension-dsl-data-space/graph';
import type {
  PackageableElementReference,
  Mapping,
  PackageableRuntime,
  DataElementReference,
} from '@finos/legend-graph';
import { addUniqueEntry } from '@finos/legend-shared';

// Basic properties
export const dataSpace_setTitle = action(
  (dataSpace: DataSpace, type: string | undefined): void => {
    dataSpace.title = type;
  },
);

export const dataSpace_setDescription = action(
  (dataSpace: DataSpace, content: string | undefined): void => {
    dataSpace.description = content;
  },
);

// Array properties
export const dataSpace_setExecutionContexts = action(
  (
    dataSpace: DataSpace,
    executionContexts: DataSpaceExecutionContext[],
  ): void => {
    dataSpace.executionContexts = executionContexts;
  },
);

export const dataSpace_setDefaultExecutionContext = action(
  (
    dataSpace: DataSpace,
    defaultExecutionContext: DataSpaceExecutionContext,
  ): void => {
    dataSpace.defaultExecutionContext = defaultExecutionContext;
  },
);

export const dataSpace_setElements = action(
  (
    dataSpace: DataSpace,
    elements: DataSpaceElementPointer[] | undefined,
  ): void => {
    dataSpace.elements = elements;
  },
);

export const dataSpace_setExecutables = action(
  (
    dataSpace: DataSpace,
    executables: DataSpaceExecutable[] | undefined,
  ): void => {
    dataSpace.executables = executables;
  },
);

export const dataSpace_setDiagrams = action(
  (dataSpace: DataSpace, diagrams: DataSpaceDiagram[] | undefined): void => {
    dataSpace.diagrams = diagrams;
  },
);

export const dataSpace_setSupportInfo = action(
  (
    dataSpace: DataSpace,
    supportInfo: DataSpaceSupportInfo | undefined,
  ): void => {
    dataSpace.supportInfo = supportInfo;
  },
);

// Array item management
export const dataSpace_addExecutionContext = action(
  (dataSpace: DataSpace, executionContext: DataSpaceExecutionContext): void => {
    addUniqueEntry(
      dataSpace.executionContexts,
      observe_DataSpaceExecutionContext(executionContext),
    );
  },
);

export const dataSpace_removeExecutionContext = action(
  (
    dataSpace: DataSpace,
    dataSpaceExecutionContext: DataSpaceExecutionContext,
  ): void => {
    const index = dataSpace.executionContexts.indexOf(
      dataSpaceExecutionContext,
    );
    dataSpace.executionContexts.splice(index, 1);
  },
);

export const dataSpace_addElement = action(
  (dataSpace: DataSpace, element: DataSpaceElementPointer): void => {
    if (!dataSpace.elements) {
      dataSpace.elements = [];
    }
    dataSpace.elements.push(element);
  },
);

export const dataSpace_removeElement = action(
  (dataSpace: DataSpace, index: number): void => {
    if (dataSpace.elements) {
      dataSpace.elements.splice(index, 1);
    }
  },
);

export const dataSpace_setElementExclude = action(
  'DATA_SPACE_SET_ELEMENT_EXCLUDE',
  (dataSpace: DataSpace, index: number, exclude: boolean | undefined): void => {
    if (dataSpace.elements && index >= 0 && index < dataSpace.elements.length) {
      const element = dataSpace.elements[index];
      if (element) {
        element.exclude = exclude;
      }
    }
  },
);

export const dataSpace_addExecutable = action(
  (dataSpace: DataSpace, executable: DataSpaceExecutable): void => {
    if (!dataSpace.executables) {
      dataSpace.executables = [];
    }
    dataSpace.executables.push(executable);
  },
);

export const dataSpace_removeExecutable = action(
  (dataSpace: DataSpace, index: number): void => {
    if (dataSpace.executables) {
      dataSpace.executables.splice(index, 1);
    }
  },
);

export const dataSpace_addDiagram = action(
  (dataSpace: DataSpace, diagram: DataSpaceDiagram): void => {
    if (!dataSpace.diagrams) {
      dataSpace.diagrams = [];
    }
    dataSpace.diagrams.push(diagram);
  },
);

export const dataSpace_removeDiagram = action(
  (dataSpace: DataSpace, index: number): void => {
    if (dataSpace.diagrams) {
      dataSpace.diagrams.splice(index, 1);
    }
  },
);

// Nested object properties
export const dataSpace_setExecutionContextName = action(
  (executionContext: DataSpaceExecutionContext, name: string): void => {
    executionContext.name = name;
  },
);

export const dataSpace_setExecutionContextTitle = action(
  (
    executionContext: DataSpaceExecutionContext,
    title: string | undefined,
  ): void => {
    executionContext.title = title;
  },
);

export const dataSpace_setExecutionContextDescription = action(
  (
    executionContext: DataSpaceExecutionContext,
    description: string | undefined,
  ): void => {
    executionContext.description = description;
  },
);

export const dataSpace_setExecutionContextMapping = action(
  (
    executionContext: DataSpaceExecutionContext,
    mapping: PackageableElementReference<Mapping>,
  ): void => {
    executionContext.mapping = mapping;
  },
);

export const dataSpace_setExecutionContextDefaultRuntime = action(
  (
    executionContext: DataSpaceExecutionContext,
    defaultRuntime: PackageableElementReference<PackageableRuntime>,
  ): void => {
    executionContext.defaultRuntime = defaultRuntime;
  },
);

export const dataSpace_setExecutionContextTestData = action(
  (
    executionContext: DataSpaceExecutionContext,
    testData: DataElementReference | undefined,
  ): void => {
    executionContext.testData = testData;
  },
);
