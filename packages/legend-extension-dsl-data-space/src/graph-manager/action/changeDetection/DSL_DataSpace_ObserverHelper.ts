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

import {
  observe_Abstract_PackageableElement,
  observe_StereotypeReference,
  observe_TaggedValue,
  skipObserved,
} from '@finos/legend-graph';
import { makeObservable, override, observable } from 'mobx';
import {
  DataSpaceSupportCombinedInfo,
  DataSpaceSupportEmail,
  type DataSpaceSupportInfo,
  type DataSpace,
<<<<<<< HEAD
  DataSpaceExecutionContext,
  // type DataSpaceExecutionContext,
=======
  type DataSpaceExecutionContext,
  type DataSpaceDiagram,
  type DataSpaceElementPointer,
  type DataSpaceExecutable,
  DataSpacePackageableElementExecutable,
  DataSpaceExecutableTemplate,
} from '../../../graph/metamodel/pure/model/packageableElements/dataSpace/DSL_DataSpace_DataSpace.js';

export const observe_DataSpaceSupportInfo = (
  supportInfo: DataSpaceSupportInfo,
) => {
  if (supportInfo instanceof DataSpaceSupportEmail) {
    makeObservable(supportInfo, {
      address: observable,
      documentationUrl: observable,
    });
  } else if (supportInfo instanceof DataSpaceSupportCombinedInfo) {
    makeObservable(supportInfo, {
      emails: observable,
      website: observable,
      faqUrl: observable,
      supportUrl: observable,
      documentationUrl: observable,
    });
  }
};

export const observe_DataSpaceExecutionContext = (
  executionContext: DataSpaceExecutionContext,
): DataSpaceExecutionContext => {
  makeObservable(executionContext, {
    name: observable,
    title: observable,
    description: observable,
    mapping: observable,
    defaultRuntime: observable,
    testData: observable, // TODO: add support for test data
  });
  return executionContext;
};

<<<<<<< HEAD
=======
export const observe_DataSpaceDiagram = (
  dataSpaceDiagram: DataSpaceDiagram,
): DataSpaceDiagram => {
  makeObservable(dataSpaceDiagram, {
    title: observable,
    description: observable,
    diagram: observable,
  });
  return dataSpaceDiagram;
};

export const observe_DataSpaceElementPointer = (
  elementPointer: DataSpaceElementPointer,
): DataSpaceElementPointer => {
  makeObservable(elementPointer, {
    element: observable,
    exclude: observable,
  });
  return elementPointer;
};

// export const observe_DataSpaceExecutable = (
//   executable: DataSpaceExecutable,
// ): DataSpaceExecutable => {
//   makeObservable(executable, {
//     title: observable,
//     description: observable,
//   });
//   return executable;
// };

export const observe_DataSpaceExecutable = (
  executable: DataSpaceExecutable,
): DataSpaceExecutable => {
  if (executable instanceof DataSpacePackageableElementExecutable) {
    makeObservable(executable, {
      title: observable,
      description: observable,
      executable: observable,
    });
  } else if (executable instanceof DataSpaceExecutableTemplate) {
    makeObservable(executable, {
      title: observable,
      description: observable,
      id: observable,
      query: observable,
      executionContextKey: observable,
    });
  } else {
    makeObservable(executable, {
      title: observable,
      description: observable,
    });
  }
  return executable;
};

>>>>>>> elements and executable finished
export const observe_DataSpace = skipObserved(
  (metamodel: DataSpace): DataSpace => {
    observe_Abstract_PackageableElement(metamodel);

    makeObservable<DataSpace, '_elementHashCode'>(metamodel, {
      title: observable,
      description: observable,
      supportInfo: observable,
      executionContexts: observable,
      defaultExecutionContext: observable,
<<<<<<< HEAD
=======
      diagrams: observable,
      elements: observable,
      executables: observable,
>>>>>>> elements and executable finished
      _elementHashCode: override,
    });

    metamodel.executionContexts.forEach(observe_DataSpaceExecutionContext);
<<<<<<< HEAD
=======

    metamodel.diagrams?.forEach(observe_DataSpaceDiagram);

    metamodel.elements?.forEach(observe_DataSpaceElementPointer);

    metamodel.executables?.forEach(observe_DataSpaceExecutable);

>>>>>>> elements and executable finished
    if (metamodel.supportInfo) {
      observe_DataSpaceSupportInfo(metamodel.supportInfo);
    }
    metamodel.stereotypes.forEach(observe_StereotypeReference);
    metamodel.taggedValues.forEach(observe_TaggedValue);

    return metamodel;
  },
);
