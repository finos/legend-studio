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

import { observable, computed, action, makeObservable } from 'mobx';
import {
  hashArray,
  ContentType,
  guaranteeType,
  createUrlStringFromData,
} from '@finos/legend-studio-shared';
import type { Hashable } from '@finos/legend-studio-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../MetaModelConst';
import { FlatData } from '../../../../../model/packageableElements/store/flatData/model/FlatData';
import type { ConnectionVisitor } from '../../../../../model/packageableElements/connection/Connection';
import { Connection } from '../../../../../model/packageableElements/connection/Connection';
import type { PackageableElementReference } from '../../../../../model/packageableElements/PackageableElementReference';

export class FlatDataConnection extends Connection implements Hashable {
  public static readonly CONTENT_TYPE = ContentType.TEXT_PLAIN;

  url: string;

  constructor(
    flatData: PackageableElementReference<FlatData>,
    url = createUrlStringFromData('', FlatDataConnection.CONTENT_TYPE, false),
  ) {
    super(flatData);

    makeObservable(this, {
      url: observable,
      flatDataStore: computed,
      setUrl: action,
      hashCode: computed,
    });

    this.url = url;
  }

  get flatDataStore(): FlatData {
    return guaranteeType(
      this.store.value,
      FlatData,
      'Flat-data connection must have a flat-data store',
    );
  }

  setUrl(url: string): void {
    this.url = url;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.FLAT_DATA_CONNECTION,
      this.store.valueForSerialization,
      this.url,
    ]);
  }

  accept_ConnectionVisitor<T>(visitor: ConnectionVisitor<T>): T {
    return visitor.visit_FlatDataConnection(this);
  }
}
