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

import { InstanceValue } from '../../model/valueSpecification/InstanceValue';

export class AlloySerializationConfig {
  typeKeyName: string;
  includeType?: boolean;
  includeEnumType?: boolean;
  removePropertiesWithNullValues?: boolean;
  removePropertiesWithEmptySets?: boolean;
  fullyQualifiedTypePath?: boolean;
  includeObjectReference?: boolean;

  constructor(typeKeyName: string) {
    this.typeKeyName = typeKeyName;
  }
}

export class AlloySerializationConfigInstanceValue extends InstanceValue {
  override values: AlloySerializationConfig[] = [];
}
