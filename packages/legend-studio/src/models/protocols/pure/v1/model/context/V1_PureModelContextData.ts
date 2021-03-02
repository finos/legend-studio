/**
 * Copyright 2020 Goldman Sachs
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

import type { GenericClazz } from '@finos/legend-studio-shared';
import { V1_PureModelContext } from '../../model/context/V1_PureModelContext';
import type { V1_PackageableElement } from '../../model/packageableElements/V1_PackageableElement';
import type { V1_PureModelContextPointer } from '../../model/context/V1_PureModelContextPointer';
import type { V1_Protocol } from '../../model/V1_Protocol';

export class V1_PureModelContextData extends V1_PureModelContext {
  origin?: V1_PureModelContextPointer;
  serializer?: V1_Protocol;
  elements: V1_PackageableElement[] = [];

  getElementsOfType<T extends V1_PackageableElement>(
    clazz: GenericClazz<T>,
  ): T[] {
    return this.elements.filter(
      (type: V1_PackageableElement): type is T => type instanceof clazz,
    );
  }
}
