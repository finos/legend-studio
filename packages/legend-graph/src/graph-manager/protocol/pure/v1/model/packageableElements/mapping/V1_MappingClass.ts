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

import type { V1_ClassMapping } from './V1_ClassMapping.js';
import type { V1_Property } from '../../../model/packageableElements/domain/V1_Property.js';
import { V1_Class } from '../../../model/packageableElements/domain/V1_Class.js';

export class V1_MappingClass extends V1_Class {
  setImplementation?: V1_ClassMapping | undefined;
  rootClass?: V1_Class | undefined;
  localProperties!: V1_Property;
}
