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

import type { Hashable } from '@finos/legend-shared';
import {
  ContentType,
  createUrlStringFromData,
  guaranteeType,
  hashArray,
} from '@finos/legend-shared';
import type {
  ConnectionVisitor,
  PackageableElementReference,
} from '@finos/legend-graph';
import { Connection } from '@finos/legend-graph';
import { action, computed, makeObservable, observable } from 'mobx';
import { Binding } from '../store/Binding';
import { UrlStream } from './UrlStream';
import { DSL_SERIALIZER_HASH_STRUCTURE } from '../../../../../DSLSerializer_ModelUtils';

export class ExternalFormatConnection extends Connection implements Hashable {
  static readonly CONTENT_TYPE = ContentType.TEXT_PLAIN;
  externalSource: UrlStream;

  constructor(
    store: PackageableElementReference<Binding>,
    externalSource = new UrlStream(
      createUrlStringFromData('', ExternalFormatConnection.CONTENT_TYPE, false),
    ),
  ) {
    super(store);

    makeObservable(this, {
      externalSource: observable,
      setSource: action,
      bindingStore: computed,
      hashCode: computed,
    });

    this.externalSource = externalSource;
  }

  get bindingStore(): Binding {
    return guaranteeType(
      this.store.value,
      Binding,
      'External Format connection must have a binding store',
    );
  }

  setSource(value: UrlStream): void {
    this.externalSource = value;
  }

  get hashCode(): string {
    return hashArray([
      DSL_SERIALIZER_HASH_STRUCTURE.EXTERNAL_FORMAT_CONNECTION,
      this.store.hashValue,
      this.externalSource,
    ]);
  }

  accept_ConnectionVisitor<T>(visitor: ConnectionVisitor<T>): T {
    return visitor.visit_Connection(this);
  }
}
