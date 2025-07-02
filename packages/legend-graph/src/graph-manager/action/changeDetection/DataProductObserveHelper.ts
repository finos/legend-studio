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
  LakehouseAccessPoint,
  type Email,
  type SupportInfo,
  type AccessPoint,
  type AccessPointGroup,
  type DataProduct,
} from '../../../graph/metamodel/pure/dataProduct/DataProduct.js';
import {
  observe_Abstract_PackageableElement,
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

export const observe_SupportInfo = skipObserved(
  (metamodel: SupportInfo): SupportInfo => {
    makeObservable(metamodel, {
      documentationUrl: observable,
      website: observable,
      faqUrl: observable,
      supportUrl: observable,
      emails: observable,
    });
    metamodel.emails.forEach(observe_Email);
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

export const observe_DataProduct = skipObserved(
  (metamodel: DataProduct): DataProduct => {
    observe_Abstract_PackageableElement(metamodel);

    makeObservable<DataProduct, '_elementHashCode'>(metamodel, {
      accessPointGroups: observable,
      _elementHashCode: override,
      title: observable,
      description: observable,
      supportInfo: observable,
    });

    if (metamodel.supportInfo) {
      observe_SupportInfo(metamodel.supportInfo);
    }
    metamodel.accessPointGroups.forEach(observe_AccessPointGroup);
    return metamodel;
  },
);
