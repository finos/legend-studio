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
  type PackageableElementVisitor,
  PackageableElement,
} from '@finos/legend-graph';
import { MASTERY_HASH_STRUCTURE } from '../../../../../DSL_Mastery_HashUtils.js';
import type { AuthenticationStrategy } from './DSL_Mastery_AuthenticationStrategy.js';

export abstract class Connection
  extends PackageableElement
  implements Hashable
{
  authentication?: AuthenticationStrategy | undefined;

  override get hashCode(): string {
    return hashArray([
      MASTERY_HASH_STRUCTURE.MASTERY_CONNECTION,
      this.authentication ?? '',
    ]);
  }
}

export abstract class FileConnection extends Connection {
  override get hashCode(): string {
    return hashArray([MASTERY_HASH_STRUCTURE.FILE_CONNECTION, super.hashCode]);
  }
}

export class KafkaConnection extends Connection {
  topicName!: string;
  topicUrls!: string[];

  override get hashCode(): string {
    return hashArray([MASTERY_HASH_STRUCTURE.KAFKA_CONNECTION, super.hashCode]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_PackageableElement(this);
  }
}

export class FTPConnection extends FileConnection {
  host!: string;
  port!: number;
  secure!: boolean;

  override get hashCode(): string {
    return hashArray([MASTERY_HASH_STRUCTURE.FTP_CONNECTION, super.hashCode]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_PackageableElement(this);
  }
}

export class HTTPConnection extends FileConnection {
  url!: string;
  proxy: ProxyConfiguration | undefined;

  override get hashCode(): string {
    return hashArray([MASTERY_HASH_STRUCTURE.HTTP_CONNECTION, super.hashCode]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_PackageableElement(this);
  }
}

export class ProxyConfiguration implements Hashable {
  authentication?: AuthenticationStrategy | undefined;
  host!: string;
  port!: number;

  get hashCode(): string {
    return hashArray([
      MASTERY_HASH_STRUCTURE.PROXY_CONFIGURATION,
      this.host,
      this.port,
      this.authentication ?? '',
    ]);
  }
}
