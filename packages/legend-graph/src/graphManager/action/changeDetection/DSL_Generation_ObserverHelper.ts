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
import type {
  ConfigurationProperty,
  FileGenerationSpecification,
  GenerationSpecification,
  GenerationTreeNode,
  SchemaGenerationSpecification,
} from '../../../DSL_Generation_Exports.js';
import { PackageableElementReference } from '../../../graph/metamodel/pure/packageableElements/PackageableElementReference.js';
import {
  observe_Abstract_PackageableElement,
  observe_PackageableElementReference,
  skipObserved,
} from './CoreObserverHelper.js';
import { observe_ModelUnit } from './DSL_ExternalFormat_ObserverHelper.js';

export const observer_SchemaGenerationSpecification = skipObserved(
  (metamodel: SchemaGenerationSpecification): SchemaGenerationSpecification => {
    observe_Abstract_PackageableElement(metamodel);
    makeObservable<SchemaGenerationSpecification, '_elementHashCode'>(
      metamodel,
      {
        format: observable,
        config: observable,
        _elementHashCode: override,
      },
    );
    observe_ModelUnit(metamodel.modelUnit);
    return metamodel;
  },
);

export const observe_ConfigurationProperty = skipObserved(
  (metamodel: ConfigurationProperty): ConfigurationProperty =>
    makeObservable(metamodel, {
      name: observable,
      value: observable.ref,
      hashCode: computed,
    }),
);

export const observe_FileGenerationSpecification = skipObserved(
  (metamodel: FileGenerationSpecification): FileGenerationSpecification => {
    observe_Abstract_PackageableElement(metamodel);

    makeObservable<FileGenerationSpecification, '_elementHashCode'>(metamodel, {
      type: observable,
      generationOutputPath: observable,
      scopeElements: observable,
      configurationProperties: observable,
      _elementHashCode: override,
    });

    metamodel.scopeElements.forEach((scopeElement) => {
      if (scopeElement instanceof PackageableElementReference) {
        observe_PackageableElementReference(scopeElement);
      }
    });
    metamodel.configurationProperties.forEach(observe_ConfigurationProperty);

    return metamodel;
  },
);

export const observe_GenerationTreeNode = skipObserved(
  (metamodel: GenerationTreeNode): GenerationTreeNode => {
    makeObservable(metamodel, {
      id: observable,
      hashCode: computed,
    });

    observe_PackageableElementReference(metamodel.generationElement);

    return metamodel;
  },
);

export const observe_GenerationSpecification = skipObserved(
  (metamodel: GenerationSpecification): GenerationSpecification => {
    observe_Abstract_PackageableElement(metamodel);

    makeObservable<GenerationSpecification, '_elementHashCode'>(metamodel, {
      generationNodes: observable,
      fileGenerations: observable,
      _elementHashCode: override,
    });

    metamodel.generationNodes.forEach(observe_GenerationTreeNode);
    metamodel.fileGenerations.forEach(observe_PackageableElementReference);

    return metamodel;
  },
);
