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
import type {
  DataSpace,
  DataSpaceExecutionContext,
  DataSpaceElementPointer,
  DataSpaceExecutable,
  DataSpaceDiagram,
  DataSpaceSupportInfo,
} from '@finos/legend-extension-dsl-data-space/graph';
import type {
  PackageableElementReference,
  Mapping,
  PackageableRuntime,
  DataElementReference,
} from '@finos/legend-graph';

// Basic properties
export const set_title = action(
  (dataSpace: DataSpace, type: string | undefined): void => {
    dataSpace.title = type;
  },
);

export const set_description = action(
  (dataSpace: DataSpace, content: string | undefined): void => {
    dataSpace.description = content;
  },
);

// Array properties
export const set_executionContexts = action(
  (
    dataSpace: DataSpace,
    executionContexts: DataSpaceExecutionContext[],
  ): void => {
    dataSpace.executionContexts = executionContexts;
  },
);

export const set_defaultExecutionContext = action(
  (
    dataSpace: DataSpace,
    defaultExecutionContext: DataSpaceExecutionContext,
  ): void => {
    dataSpace.defaultExecutionContext = defaultExecutionContext;
  },
);

export const set_elements = action(
  (
    dataSpace: DataSpace,
    elements: DataSpaceElementPointer[] | undefined,
  ): void => {
    dataSpace.elements = elements;
  },
);

export const set_executables = action(
  (
    dataSpace: DataSpace,
    executables: DataSpaceExecutable[] | undefined,
  ): void => {
    dataSpace.executables = executables;
  },
);

export const set_diagrams = action(
  (dataSpace: DataSpace, diagrams: DataSpaceDiagram[] | undefined): void => {
    dataSpace.diagrams = diagrams;
  },
);

export const set_supportInfo = action(
  (
    dataSpace: DataSpace,
    supportInfo: DataSpaceSupportInfo | undefined,
  ): void => {
    dataSpace.supportInfo = supportInfo;
  },
);

// Array item management
export const add_executionContext = action(
  (dataSpace: DataSpace, executionContext: DataSpaceExecutionContext): void => {
    dataSpace.executionContexts.push(executionContext);
  },
);

export const remove_executionContext = action(
  (dataSpace: DataSpace, index: number): void => {
    dataSpace.executionContexts.splice(index, 1);
  },
);

export const add_element = action(
  (dataSpace: DataSpace, element: DataSpaceElementPointer): void => {
    if (!dataSpace.elements) {
      dataSpace.elements = [];
    }
    dataSpace.elements.push(element);
  },
);

export const remove_element = action(
  (dataSpace: DataSpace, index: number): void => {
    if (dataSpace.elements) {
      dataSpace.elements.splice(index, 1);
    }
  },
);

export const add_executable = action(
  (dataSpace: DataSpace, executable: DataSpaceExecutable): void => {
    if (!dataSpace.executables) {
      dataSpace.executables = [];
    }
    dataSpace.executables.push(executable);
  },
);

export const remove_executable = action(
  (dataSpace: DataSpace, index: number): void => {
    if (dataSpace.executables) {
      dataSpace.executables.splice(index, 1);
    }
  },
);

export const add_diagram = action(
  (dataSpace: DataSpace, diagram: DataSpaceDiagram): void => {
    if (!dataSpace.diagrams) {
      dataSpace.diagrams = [];
    }
    dataSpace.diagrams.push(diagram);
  },
);

export const remove_diagram = action(
  (dataSpace: DataSpace, index: number): void => {
    if (dataSpace.diagrams) {
      dataSpace.diagrams.splice(index, 1);
    }
  },
);

// Nested object properties
export const set_executionContext_name = action(
  (executionContext: DataSpaceExecutionContext, name: string): void => {
    executionContext.name = name;
  },
);

export const set_executionContext_title = action(
  (
    executionContext: DataSpaceExecutionContext,
    title: string | undefined,
  ): void => {
    executionContext.title = title;
  },
);

export const set_executionContext_description = action(
  (
    executionContext: DataSpaceExecutionContext,
    description: string | undefined,
  ): void => {
    executionContext.description = description;
  },
);

export const set_executionContext_mapping = action(
  (
    executionContext: DataSpaceExecutionContext,
    mapping: PackageableElementReference<Mapping>,
  ): void => {
    executionContext.mapping = mapping;
  },
);

export const set_executionContext_defaultRuntime = action(
  (
    executionContext: DataSpaceExecutionContext,
    defaultRuntime: PackageableElementReference<PackageableRuntime>,
  ): void => {
    executionContext.defaultRuntime = defaultRuntime;
  },
);

export const set_executionContext_testData = action(
  (
    executionContext: DataSpaceExecutionContext,
    testData: DataElementReference | undefined,
  ): void => {
    executionContext.testData = testData;
  },
);
