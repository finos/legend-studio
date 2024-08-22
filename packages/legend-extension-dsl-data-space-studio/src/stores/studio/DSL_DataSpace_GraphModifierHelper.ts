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
  DataSpaceSupportEmail,
  type DataSpace,
  DataSpaceSupportCombinedInfo,
  type DataSpaceSupportInfo,
  type DataSpaceExecutionContext,
  observe_DataSpaceSupportInfo,
  observe_DataSpaceExecutionContext,
  observe_DataSpaceDiagram,
  observe_DataSpaceElementPointer,
  type DataSpaceDiagram,
  type DataSpaceElementPointer,
  type DataSpaceExecutable,
  observe_DataSpaceExecutable,
  type DataSpacePackageableElementExecutable,
} from '@finos/legend-extension-dsl-data-space/graph';
<<<<<<< HEAD
import {
  DataElementReference,
  type Mapping,
  type PackageableElementReference,
  type PackageableRuntime,
=======
import type {
  PackageableElement,
  Mapping,
  PackageableElementReference,
  PackageableRuntime,
>>>>>>> styling WIP, form created
} from '@finos/legend-graph';
<<<<<<< HEAD
import { addUniqueEntry } from '@finos/legend-shared';
// import type { PackageableElementReference } from '../../../../../../../../graph/metamodel/pure/packageableElements/PackageableElementReference.js';
// import type { Mapping } from '../../../../legend-graph/src/graph/metamodel/pure/packageableElements/mapping/Mapping.js';
// import type { PackageableRuntime } from '../../../../legend-graph/src/graph/metamodel/pure/packageableElements/runtime/PackageableRuntime.js';
// import type { DataElementReference } from '../../../../legend-graph/src/graph/metamodel/pure/data/EmbeddedData.js';
=======
import type { Diagram } from '@finos/legend-extension-dsl-diagram/graph';
import { SUPPORT_INFO_TYPE } from '../DataSpaceEditorState.js';
>>>>>>> elements finished

// DATASPACE

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

// SUPPORT INFO
export const set_email = action(
  (supportInfo: DataSpaceSupportEmail, email: string): void => {
    supportInfo.address = email;
  },
);

export const set_documentationUrl = action(
  (supportInfo: DataSpaceSupportInfo, url: string) => {
    supportInfo.documentationUrl = url;
  },
);

export const set_emails = action(
  (supportInfo: DataSpaceSupportCombinedInfo, emails: string[]) => {
    supportInfo.emails = emails.length ? emails : undefined;
  },
);

export const set_website = action(
  (supportInfo: DataSpaceSupportCombinedInfo, website: string) => {
    supportInfo.website = website;
  },
);

export const set_supportUrl = action(
  (supportInfo: DataSpaceSupportCombinedInfo, supportUrl: string) => {
    supportInfo.supportUrl = supportUrl;
  },
);

export const set_faqUrl = action(
  (supportInfo: DataSpaceSupportCombinedInfo, faqUrl: string) => {
    supportInfo.faqUrl = faqUrl;
  },
);

export const set_supportInfotype = action(
  (dataSpace: DataSpace, type: SUPPORT_INFO_TYPE) => {
    switch (type) {
      case SUPPORT_INFO_TYPE.EMAIL:
        dataSpace.supportInfo = new DataSpaceSupportEmail();
        break;
      case SUPPORT_INFO_TYPE.COMBINED_INFO:
        dataSpace.supportInfo = new DataSpaceSupportCombinedInfo();
        break;
      default:
        dataSpace.supportInfo = new DataSpaceSupportEmail();
        break;
    }
    observe_DataSpaceSupportInfo(dataSpace.supportInfo);
  },
);

// EXECUTION CONTEXT

export const set_executionContexts = action(
  (dataSpace: DataSpace, contexts: DataSpaceExecutionContext[]): void => {
    dataSpace.executionContexts = contexts;
    contexts.forEach((context) => observe_DataSpaceExecutionContext(context));
  },
);

export const set_defaultExecutionContext = action(
  (dataSpace: DataSpace, context: DataSpaceExecutionContext): void => {
    dataSpace.defaultExecutionContext = context;
    observe_DataSpaceExecutionContext(context);
  },
);

export const set_executionContextName = action(
  (executionContext: DataSpaceExecutionContext, name: string): void => {
    executionContext.name = name;
  },
);

export const set_executionContextTitle = action(
  (
    executionContext: DataSpaceExecutionContext,
    title: string | undefined,
  ): void => {
    executionContext.title = title;
  },
);

export const set_executionContextDescription = action(
  (
    executionContext: DataSpaceExecutionContext,
    description: string | undefined,
  ): void => {
    executionContext.description = description;
  },
);

export const set_runtime = action(
  (
    executionContext: DataSpaceExecutionContext,
    runtime: PackageableElementReference<PackageableRuntime>,
  ) => {
    executionContext.defaultRuntime = runtime;
  },
);

export const set_mapping = action(
  (
    executionContext: DataSpaceExecutionContext,
    mapping: PackageableElementReference<Mapping>,
  ) => {
    executionContext.mapping = mapping;
  },
);

export const dataSpace_addExecutionContext = action(
  (dataSpace: DataSpace, executionContext: DataSpaceExecutionContext): void => {
    const observedContext = observe_DataSpaceExecutionContext(executionContext);
    dataSpace.executionContexts.push(observedContext);
  },
);

// DIAGRAMS

export const set_dataSpaceDiagram = action(
  (
    dataSpaceDiagram: DataSpaceDiagram,
    diagram: PackageableElementReference<Diagram>,
  ): void => {
    dataSpaceDiagram.diagram = diagram;
  },
);

export const set_dataSpaceDiagramDescription = action(
  (dataSpaceDiagram: DataSpaceDiagram, description: string): void => {
    dataSpaceDiagram.description = description;
  },
);

export const set_dataSpaceDiagramTitle = action(
  (dataSpaceDiagram: DataSpaceDiagram, title: string): void => {
    dataSpaceDiagram.title = title;
  },
);

export const addDataSpaceDiagram = action(
  (dataSpace: DataSpace, diagram: DataSpaceDiagram): void => {
    dataSpace.diagrams = dataSpace.diagrams ?? [];
    dataSpace.diagrams.push(observe_DataSpaceDiagram(diagram));
  },
);

export const removeDataSpaceDiagram = action(
  (dataSpace: DataSpace, diagram: DataSpaceDiagram): void => {
    dataSpace.diagrams = dataSpace.diagrams?.filter((d) => d !== diagram);
  },
);

// ELEMENTS

export const setElementExclude = action(
  (element: DataSpaceElementPointer, exclude: boolean): void => {
    element.exclude = exclude;
  },
);

export const set_dataSpaceElements = action(
  (dataSpace: DataSpace, elements: DataSpaceElementPointer[]): void => {
    dataSpace.elements = elements;
    elements.forEach(observe_DataSpaceElementPointer);
  },
);

// EXECUTABLES

export const set_dataSpaceExecutable = action(
  (
    executable: DataSpacePackageableElementExecutable,
    newExecutable: PackageableElementReference<PackageableElement>,
  ): void => {
    executable.executable = newExecutable;
  },
);

export const add_dataSpaceExecutable = action(
  (dataSpace: DataSpace, executable: DataSpaceExecutable): void => {
    dataSpace.executables = dataSpace.executables ?? [];
    dataSpace.executables.push(observe_DataSpaceExecutable(executable));
  },
);

export const remove_dataSpaceExecutable = action(
  (dataSpace: DataSpace, executable: DataSpaceExecutable): void => {
    if (dataSpace.executables) {
      dataSpace.executables = dataSpace.executables.filter(
        (ex) => ex !== executable,
      );
    }
  },
);
