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

import { isEmpty } from '@finos/legend-shared';
import type { RawRelationalOperationElement } from '../../../models/metamodels/pure/packageableElements/store/relational/model/RawRelationalOperationElement';
import { Database } from '../../../StoreRelational_Exports';

export const stub_RawRelationalOperationElement =
  (): RawRelationalOperationElement => ({});

export const isStubbed_RawRelationalOperationElement = (
  operation: RawRelationalOperationElement,
): boolean => isEmpty(operation);

export const stub_Database = (): Database => new Database('');
