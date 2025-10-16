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

import { makeObservable, observable, override } from 'mobx';
import {
  type AccessPoint,
  type AccessPointGroup,
  type DataProduct,
  type DataProductIcon,
  type DataProductLink,
  ModelAccessPointGroup,
  type DataProductElementScope,
  type DataProductDiagram,
  type Email,
  type SupportInfo,
  DataProductEmbeddedImageIcon,
  DataProductLibraryIcon,
  type DataProductRuntimeInfo,
  LakehouseAccessPoint,
  UnknownDataProductIcon,
  type Expertise,
} from '../../../graph/metamodel/pure/dataProduct/DataProduct.js';
import {
  observe_Abstract_PackageableElement,
  observe_PackageableElementReference,
  skipObserved,
} from './CoreObserverHelper.js';
import {
  observe_StereotypeReference,
  observe_TaggedValue,
} from './DomainObserverHelper.js';

export const observe_AccessPoint = skipObserved(
  (metamodel: AccessPoint): AccessPoint => {
    if (metamodel instanceof LakehouseAccessPoint) {
      makeObservable(metamodel, {
        id: observable,
        targetEnvironment: observable,
        classification: observable,
        func: observable.ref,
        description: observable,
        reproducible: observable,
      });
    }
    // TODO others
    return metamodel;
  },
);

export const observe_Email = skipObserved((metamodel: Email): Email => {
  makeObservable(metamodel, {
    title: observable,
    address: observable,
  });
  return metamodel;
});

export const observer_DataProductLink = skipObserved(
  (metamodel: DataProductLink): DataProductLink => {
    makeObservable(metamodel, {
      label: observable,
      url: observable,
    });
    return metamodel;
  },
);
export const observe_SupportInfo = skipObserved(
  (metamodel: SupportInfo): SupportInfo => {
    makeObservable(metamodel, {
      documentation: observable,
      website: observable,
      faqUrl: observable,
      supportUrl: observable,
      emails: observable,
    });
    metamodel.emails.forEach(observe_Email);
    if (metamodel.documentation) {
      observer_DataProductLink(metamodel.documentation);
    }
    if (metamodel.website) {
      observer_DataProductLink(metamodel.website);
    }
    if (metamodel.faqUrl) {
      observer_DataProductLink(metamodel.faqUrl);
    }
    if (metamodel.supportUrl) {
      observer_DataProductLink(metamodel.supportUrl);
    }
    return metamodel;
  },
);

export const observe_DataProductRuntimeInfo = skipObserved(
  (metamodel: DataProductRuntimeInfo): DataProductRuntimeInfo => {
    makeObservable(metamodel, {
      id: observable,
      description: observable,
      runtime: observable,
    });
    return metamodel;
  },
);

export const observe_DataProductElementScope = skipObserved(
  (metamodel: DataProductElementScope): DataProductElementScope => {
    makeObservable(metamodel, {
      exclude: observable,
      element: observable,
    });
    return metamodel;
  },
);

export const observe_DataProductDiagram = skipObserved(
  (metamodel: DataProductDiagram): DataProductDiagram => {
    makeObservable(metamodel, {
      title: observable,
      description: observable,
      diagram: observable,
    });
    return metamodel;
  },
);

export const observe_AccessPointGroup = skipObserved(
  (metamodel: AccessPointGroup): AccessPointGroup => {
    makeObservable(metamodel, {
      id: observable,
      description: observable,
      accessPoints: observable,
      stereotypes: observable,
      taggedValues: observable,
    });
    metamodel.stereotypes.forEach(observe_StereotypeReference);
    metamodel.taggedValues.forEach(observe_TaggedValue);
    metamodel.accessPoints.forEach(observe_AccessPoint);

    return metamodel;
  },
);

export const observe_ModelAccessPointGroup = skipObserved(
  (metamodel: ModelAccessPointGroup): ModelAccessPointGroup => {
    observe_AccessPointGroup(metamodel);

    makeObservable(metamodel, {
      mapping: observable,
      defaultRuntime: observable,
      compatibleRuntimes: observable,
      featuredElements: observable,
      diagrams: observable,
    });
    observe_PackageableElementReference(metamodel.mapping);
    observe_DataProductRuntimeInfo(metamodel.defaultRuntime);
    metamodel.compatibleRuntimes.forEach(observe_DataProductRuntimeInfo);
    metamodel.featuredElements.forEach(observe_DataProductElementScope);
    metamodel.diagrams.forEach(observe_DataProductDiagram);

    return metamodel;
  },
);

export const observe_APG = (metamodel: AccessPointGroup): AccessPointGroup => {
  if (metamodel instanceof ModelAccessPointGroup) {
    return observe_ModelAccessPointGroup(metamodel);
  } else {
    return observe_AccessPointGroup(metamodel);
  }
};

export const observe_DataProductIcon = skipObserved(
  (metamodel: DataProductIcon): DataProductIcon => {
    if (metamodel instanceof DataProductLibraryIcon) {
      makeObservable(metamodel, {
        libraryId: observable,
        iconId: observable,
      });
    } else if (metamodel instanceof DataProductEmbeddedImageIcon) {
      makeObservable(metamodel, {
        imageUrl: observable,
      });
    } else if (metamodel instanceof UnknownDataProductIcon) {
      makeObservable(metamodel, {
        content: observable,
      });
    }
    return metamodel;
  },
);

export const observe_Expertise = skipObserved(
  (metamodel: Expertise): Expertise => {
    makeObservable(metamodel, {
      description: observable,
      expertIds: observable,
    });
    return metamodel;
  },
);

export const observe_DataProduct = skipObserved(
  (metamodel: DataProduct): DataProduct => {
    observe_Abstract_PackageableElement(metamodel);

    makeObservable<DataProduct, '_elementHashCode'>(metamodel, {
      accessPointGroups: observable,
      _elementHashCode: override,
      title: observable,
      description: observable,
      supportInfo: observable,
      icon: observable,
      expertise: observable,
    });

    if (metamodel.supportInfo) {
      observe_SupportInfo(metamodel.supportInfo);
    }
    if (metamodel.icon) {
      observe_DataProductIcon(metamodel.icon);
    }
    metamodel.expertise?.forEach(observe_Expertise);
    metamodel.accessPointGroups.forEach(observe_APG);
    return metamodel;
  },
);
