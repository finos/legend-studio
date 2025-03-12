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
  observe_DataElementReference,
  observe_PackageableElementReference,
  observe_RawLambda,
  observe_StereotypeReference,
  observe_TaggedValue,
  skipObserved,
  skipObservedWithContext,
} from '@finos/legend-graph';
import { makeObservable, override, observable, computed } from 'mobx';
import {
  type DataSpace,
  type DataSpaceDiagram,
  type DataSpaceElementPointer,
  type DataSpaceExecutable,
  type DataSpaceExecutionContext,
  type DataSpaceSupportInfo,
  DataSpaceExecutableTemplate,
  DataSpacePackageableElementExecutable,
  DataSpaceSupportCombinedInfo,
  DataSpaceSupportEmail,
} from '../../../graph/metamodel/pure/model/packageableElements/dataSpace/DSL_DataSpace_DataSpace.js';

export const observe_DataSpaceExecutionContext = skipObserved(
  (metamodel: DataSpaceExecutionContext): DataSpaceExecutionContext => {
    makeObservable(metamodel, {
      name: observable,
      title: observable,
      description: observable,
      mapping: observable,
      defaultRuntime: observable,
      testData: observable,
      hashCode: computed,
    });

    observe_PackageableElementReference(metamodel.mapping);
    observe_PackageableElementReference(metamodel.defaultRuntime);
    if (metamodel.testData) {
      observe_DataElementReference(metamodel.testData);
    }

    return metamodel;
  },
);

export const observe_DataSpaceElementPointer = skipObserved(
  (metamodel: DataSpaceElementPointer): DataSpaceElementPointer => {
    makeObservable(metamodel, {
      element: observable,
      exclude: observable,
      hashCode: computed,
    });

    observe_PackageableElementReference(metamodel.element);

    return metamodel;
  },
);

const observe_Abstract_DataSpaceExecutable = (
  metamodel: DataSpaceExecutable,
): void => {
  makeObservable(metamodel, {
    id: observable,
    executionContextKey: observable,
    title: observable,
    description: observable,
  });
};

const observe_DataSpacePackageableElementExecutable = skipObserved(
  (
    metamodel: DataSpacePackageableElementExecutable,
  ): DataSpacePackageableElementExecutable => {
    observe_Abstract_DataSpaceExecutable(metamodel);

    makeObservable(metamodel, {
      executable: observable,
      hashCode: computed,
    });

    observe_PackageableElementReference(metamodel.executable);

    return metamodel;
  },
);

const observe_DataSpaceExecutableTemplate = skipObserved(
  (metamodel: DataSpaceExecutableTemplate): DataSpaceExecutableTemplate => {
    observe_Abstract_DataSpaceExecutable(metamodel);

    makeObservable(metamodel, {
      query: observable,
      hashCode: computed,
    });

    observe_RawLambda(metamodel.query);

    return metamodel;
  },
);

export const observe_DataSpaceExecutable = (
  metamodel: DataSpaceExecutable,
): DataSpaceExecutable => {
  if (metamodel instanceof DataSpacePackageableElementExecutable) {
    return observe_DataSpacePackageableElementExecutable(metamodel);
  } else if (metamodel instanceof DataSpaceExecutableTemplate) {
    return observe_DataSpaceExecutableTemplate(metamodel);
  }
  return metamodel;
};

export const observe_DataSpaceDiagram = skipObserved(
  (metamodel: DataSpaceDiagram): DataSpaceDiagram => {
    makeObservable(metamodel, {
      title: observable,
      description: observable,
      diagram: observable,
      hashCode: computed,
    });

    observe_PackageableElementReference(metamodel.diagram);

    return metamodel;
  },
);

const observe_Abstract_DataSpaceSupportInfo = (
  metamodel: DataSpaceSupportInfo,
): void => {
  makeObservable(metamodel, {
    documentationUrl: observable,
  });
};

const observe_DataSpaceSupportEmail = skipObserved(
  (metamodel: DataSpaceSupportEmail): DataSpaceSupportEmail => {
    observe_Abstract_DataSpaceSupportInfo(metamodel);

    makeObservable(metamodel, {
      address: observable,
      hashCode: computed,
    });

    return metamodel;
  },
);

const observe_DataSpaceSupportCombinedInfo = skipObserved(
  (metamodel: DataSpaceSupportCombinedInfo): DataSpaceSupportCombinedInfo => {
    observe_Abstract_DataSpaceSupportInfo(metamodel);

    makeObservable(metamodel, {
      emails: observable,
      website: observable,
      faqUrl: observable,
      supportUrl: observable,
      hashCode: computed,
    });

    return metamodel;
  },
);

export const observe_DataSpaceSupportInfo = (
  metamodel: DataSpaceSupportInfo,
): DataSpaceSupportInfo => {
  if (metamodel instanceof DataSpaceSupportEmail) {
    return observe_DataSpaceSupportEmail(metamodel);
  } else if (metamodel instanceof DataSpaceSupportCombinedInfo) {
    return observe_DataSpaceSupportCombinedInfo(metamodel);
  }
  return metamodel;
};

export const observe_DataSpace = skipObservedWithContext(
  (metamodel: DataSpace, context): DataSpace => {
    observe_Abstract_PackageableElement(metamodel);

    makeObservable<DataSpace, '_elementHashCode'>(metamodel, {
      title: observable,
      description: observable,
      executionContexts: observable,
      defaultExecutionContext: observable,
      elements: observable,
      executables: observable,
      diagrams: observable,
      supportInfo: observable,
      _elementHashCode: override,
    });

    metamodel.stereotypes.forEach(observe_StereotypeReference);
    metamodel.taggedValues.forEach(observe_TaggedValue);

    metamodel.executionContexts.forEach(observe_DataSpaceExecutionContext);
    observe_DataSpaceExecutionContext(metamodel.defaultExecutionContext);
    if (metamodel.elements) {
      metamodel.elements.forEach(observe_DataSpaceElementPointer);
    }
    if (metamodel.executables) {
      metamodel.executables.forEach(observe_DataSpaceExecutable);
    }
    if (metamodel.diagrams) {
      metamodel.diagrams.forEach(observe_DataSpaceDiagram);
    }
    if (metamodel.supportInfo) {
      observe_DataSpaceSupportInfo(metamodel.supportInfo);
    }

    return metamodel;
  },
);
