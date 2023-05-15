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

import { UnsupportedOperationError } from '@finos/legend-shared';
import { InstanceSetImplementation } from './InstanceSetImplementation.js';
import type { SetImplementationVisitor } from './SetImplementation.js';
import { InferableMappingElementIdExplicitValue } from './InferableMappingElementId.js';
import { PackageableElementExplicitReference } from '../PackageableElementReference.js';
import { InferableMappingElementRootExplicitValue } from './InferableMappingElementRoot.js';
import { INTERNAL__PseudoClass } from '../domain/INTERNAL__PseudoClass.js';
import { INTERNAL__PseudoMapping } from './INTERNAL__PseudoMapping.js';

export class INTERNAL__PseudoInstanceSetImplementation extends InstanceSetImplementation {
  static readonly NAME = 'INTERNAL__PseudoInstanceSetImplementation';
  static readonly INSTANCE = new INTERNAL__PseudoInstanceSetImplementation();

  private constructor() {
    super(
      InferableMappingElementIdExplicitValue.create(
        '',
        INTERNAL__PseudoClass.INSTANCE.path,
      ),
      INTERNAL__PseudoMapping.INSTANCE,
      PackageableElementExplicitReference.create(
        INTERNAL__PseudoClass.INSTANCE,
      ),
      InferableMappingElementRootExplicitValue.create(false),
    );
  }

  accept_SetImplementationVisitor<T>(visitor: SetImplementationVisitor<T>): T {
    throw new UnsupportedOperationError();
  }
}
