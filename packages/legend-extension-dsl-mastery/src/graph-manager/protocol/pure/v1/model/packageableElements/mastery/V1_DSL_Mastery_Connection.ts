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

import { type Hashable, hashArray } from '@finos/legend-shared';
import {
  type V1_PackageableElementVisitor,
  V1_PackageableElement,
} from '@finos/legend-graph';
import { MASTERY_HASH_STRUCTURE } from '../../../../../../../graph/DSL_Mastery_HashUtils.js';
import type { V1_AuthenticationStrategy } from './V1_DSL_Mastery_AuthenticationStrategy.js';

export abstract class V1_Connection
  extends V1_PackageableElement
  implements Hashable
{
  authenticationStrategy?: V1_AuthenticationStrategy | undefined;

  override get hashCode(): string {
    return hashArray([
      MASTERY_HASH_STRUCTURE.MASTERY_CONNECTION,
      this.authenticationStrategy ?? '',
    ]);
  }
}

export abstract class V1_FileConnection extends V1_Connection {
  override get hashCode(): string {
    return hashArray([MASTERY_HASH_STRUCTURE.FILE_CONNECTION, super.hashCode]);
  }
}

export class V1_KafkaConnection extends V1_Connection {
  topicName!: string;
  topicUrls!: string[];

  override get hashCode(): string {
    return hashArray([MASTERY_HASH_STRUCTURE.KAFKA_CONNECTION, super.hashCode]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: V1_PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_PackageableElement(this);
  }
}

export class V1_FTPConnection extends V1_FileConnection {
  host!: string;
  port!: number;
  secure!: boolean;

  override get hashCode(): string {
    return hashArray([MASTERY_HASH_STRUCTURE.FTP_CONNECTION, super.hashCode]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: V1_PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_PackageableElement(this);
  }
}

export class V1_HTTPConnection extends V1_FileConnection {
  url!: string;
  proxy: V1_ProxyConfiguration | undefined;

  override get hashCode(): string {
    return hashArray([MASTERY_HASH_STRUCTURE.HTTP_CONNECTION, super.hashCode]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: V1_PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_PackageableElement(this);
  }
}

export class V1_ProxyConfiguration implements Hashable {
  authenticationStrategy?: V1_AuthenticationStrategy | undefined;
  host!: string;
  port!: number;

  get hashCode(): string {
    return hashArray([
      MASTERY_HASH_STRUCTURE.PROXY_CONFIGURATION,
      this.host,
      this.port,
      this.authenticationStrategy ?? '',
    ]);
  }
}
