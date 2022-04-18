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

import { computed, makeObservable, observable, override } from 'mobx';
import type { ExternalFormatConnection } from '../../../models/metamodels/pure/packageableElements/externalFormat/connection/DSLExternalFormat_ExternalFormatConnection';
import type { UrlStream } from '../../../models/metamodels/pure/packageableElements/externalFormat/connection/DSLExternalFormat_UrlStream';
import type { Schema } from '../../../models/metamodels/pure/packageableElements/externalFormat/schemaSet/DSLExternalFormat_Schema';
import type { SchemaSet } from '../../../models/metamodels/pure/packageableElements/externalFormat/schemaSet/DSLExternalFormat_SchemaSet';
import type { Binding } from '../../../models/metamodels/pure/packageableElements/externalFormat/store/DSLExternalFormat_Binding';
import type { BindingTransformer } from '../../../models/metamodels/pure/packageableElements/externalFormat/store/DSLExternalFormat_BindingTransformer';
import type { ModelUnit } from '../../../models/metamodels/pure/packageableElements/externalFormat/store/DSLExternalFormat_ModelUnit';
import {
  observe_PackageableElementReference,
  skipObserved,
  observe_OptionalPackageableElementReference,
  observe_Abstract_PackageableElement,
} from './CoreObserverHelper';
import {
  observe_Abstract_Connection,
  observe_Abstract_Store,
} from './DSLMapping_ObserverHelper';

// ------------------------------------- Store -------------------------------------

export const observe_ModelUnit = skipObserved(
  (metamodel: ModelUnit): ModelUnit => {
    makeObservable(metamodel, {
      packageableElementIncludes: observable,
      packageableElementExcludes: observable,
      hashCode: computed,
    });

    metamodel.packageableElementIncludes.forEach(
      observe_PackageableElementReference,
    );
    metamodel.packageableElementExcludes.forEach(
      observe_PackageableElementReference,
    );

    return metamodel;
  },
);

export const observe_Binding = skipObserved((metamodel: Binding): Binding => {
  observe_Abstract_Store(metamodel);

  makeObservable<Binding, '_elementHashCode'>(metamodel, {
    schemaSet: observable,
    schemaId: observable,
    contentType: observable,
    modelUnit: observable,
    _elementHashCode: override,
  });

  observe_OptionalPackageableElementReference(metamodel.schemaSet);
  observe_ModelUnit(metamodel.modelUnit);

  return metamodel;
});

// ------------------------------------- Mapping -------------------------------------

export const observe_BindingTransformer = skipObserved(
  (metamodel: BindingTransformer): BindingTransformer => {
    makeObservable(metamodel, {
      binding: observable,
      hashCode: computed,
    });

    observe_PackageableElementReference(metamodel.binding);

    return metamodel;
  },
);

// ------------------------------------- Connection -------------------------------------

export const observe_UrlStream = skipObserved(
  (metamodel: UrlStream): UrlStream => {
    makeObservable(metamodel, {
      url: observable,
      hashCode: computed,
    });

    return metamodel;
  },
);

export const observe_ExternalFormatConnection = skipObserved(
  (metamodel: ExternalFormatConnection): ExternalFormatConnection => {
    observe_Abstract_Connection(metamodel);

    makeObservable(metamodel, {
      externalSource: observable,
      hashCode: computed,
    });

    observe_UrlStream(metamodel.externalSource);

    return metamodel;
  },
);

// ------------------------------------- Element -------------------------------------

export const observe_ExternalFormatSchema = skipObserved(
  (metamodel: Schema): Schema =>
    makeObservable(metamodel, {
      id: observable,
      location: observable,
      content: observable,
      hashCode: computed,
    }),
);

export const observe_SchemaSet = skipObserved(
  (metamodel: SchemaSet): SchemaSet => {
    observe_Abstract_PackageableElement(metamodel);

    makeObservable<SchemaSet, '_elementHashCode'>(metamodel, {
      format: observable,
      schemas: observable,
      _elementHashCode: override,
    });

    metamodel.schemas.forEach(observe_ExternalFormatSchema);

    return metamodel;
  },
);
