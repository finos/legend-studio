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

import { uuid } from '@finos/legend-shared';
import type { PureModel } from '../../../graph/PureModel.js';
import type { Class } from '../../../graph/metamodel/pure/packageableElements/domain/Class.js';

export class FunctionActivatorConfiguration {
  uuid = uuid();
  name!: string;
  description!: string;
  packageableElementJSONType!: string;
  configurationType!: Class;
  graph!: PureModel;
}
