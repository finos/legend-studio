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
  action,
  computed,
  isObservable,
  makeObservable,
  observable,
} from 'mobx';
import type { PackageableElement } from '../../../models/metamodels/pure/packageableElements/PackageableElement';
import type {
  OptionalPackageableElementReference,
  PackageableElementReference,
} from '../../../models/metamodels/pure/packageableElements/PackageableElementReference';
import type { Multiplicity } from '../../../models/metamodels/pure/packageableElements/domain/Multiplicity';
import type { InferableValue } from '../../../models/metamodels/pure/InferableValue';
import type { PureGraphManagerPlugin } from '../../PureGraphManagerPlugin';

export class ObserverContext {
  plugins: PureGraphManagerPlugin[] = [];

  constructor(plugins: PureGraphManagerPlugin[]) {
    this.plugins = plugins;
  }
}

export const skipObserved =
  <T>(observer: (metamodel: T) => T): ((metamodel: T) => T) =>
  (metamodel: T) =>
    isObservable(metamodel) ? metamodel : observer(metamodel);

export const skipObservedWithContext =
  <T>(
    observer: (metamodel: T, context: ObserverContext) => T,
  ): ((metamodel: T, context: ObserverContext) => T) =>
  (metamodel: T, context: ObserverContext) =>
    isObservable(metamodel) ? metamodel : observer(metamodel, context);

export const observe_Abstract_PackageableElement = (
  metamodel: PackageableElement,
): void => {
  makeObservable<
    PackageableElement,
    '_isDeleted' | '_isDisposed' | '_isImmutable' | '_elementHashCode'
  >(metamodel, {
    _isDeleted: observable,
    _isDisposed: observable, // TO BE REMOVED
    _isImmutable: observable, // TO BE REMOVED
    name: observable,
    package: observable,
    isReadOnly: computed, // TO BE REMOVED
    isDeleted: computed,
    path: computed,
    _elementHashCode: computed,
    // NOTE: we need to enable `keepAlive` to facillitate precomputation of element hash code
    hashCode: computed({ keepAlive: true }),
    setIsDeleted: action,
    dispose: action, // TO BE REMOVED
    freeze: action, // TO BE REMOVED
  });
};

export const observe_PackageableElementReference = skipObserved(
  <T extends PackageableElement>(
    metamodel: PackageableElementReference<T>,
  ): PackageableElementReference<T> =>
    makeObservable(metamodel, {
      value: observable,
      valueForSerialization: computed,
    }),
);

export const observe_OptionalPackageableElementReference = skipObserved(
  <T extends PackageableElement>(
    metamodel: OptionalPackageableElementReference<T>,
  ): OptionalPackageableElementReference<T> =>
    makeObservable(metamodel, {
      value: observable,
      setValue: action,
      valueForSerialization: computed,
    }),
);

export const observe_Multiplicity = skipObserved(
  (metamodel: Multiplicity): Multiplicity =>
    makeObservable(metamodel, {
      lowerBound: observable,
      upperBound: observable,
      str: computed,
      hashCode: computed,
    }),
);

export const observe_Abstract_InferableValue = <T, V>(
  metamodel: InferableValue<T, V>,
): void => {
  makeObservable(metamodel, {
    value: observable,
    setValue: action,
  });
};
