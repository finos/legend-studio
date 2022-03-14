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

import { hashArray, type Hashable } from '@finos/legend-shared';
import { DSL_EXTERNAL_FORMAT_HASH_STRUCTURE } from '../../../../../../../DSLExternalFormat_ModelUtils';
import {
  V1_Connection,
  type V1_ConnectionVisitor,
} from '../../connection/V1_Connection';
import type { V1_UrlStream } from './V1_UrlStream';

export class V1_ExternalFormatConnection
  extends V1_Connection
  implements Hashable
{
  externalSource!: V1_UrlStream;

  get hashCode(): string {
    return hashArray([
      DSL_EXTERNAL_FORMAT_HASH_STRUCTURE.EXTERNAL_FORMAT_CONNECTION,
      this.store ?? '',
      this.externalSource,
    ]);
  }

  accept_ConnectionVisitor<T>(visitor: V1_ConnectionVisitor<T>): T {
    return visitor.visit_Connection(this);
  }
}
