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
import { hashArray, ContentType } from '@finos/legend-studio-shared';
import type { Hashable } from '@finos/legend-studio-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../MetaModelConst';
import type { ConnectionVisitor } from '../../../../../model/packageableElements/connection/Connection';
import type { Class } from '../../../../../model/packageableElements/domain/Class';
import type { ModelStore } from '../../../../../model/packageableElements/store/modelToModel/model/ModelStore';
import { PureModelConnection } from './PureModelConnection';
import type { PackageableElementReference } from '../../../../../model/packageableElements/PackageableElementReference';

export class XmlModelConnection
  extends PureModelConnection
  implements Hashable
{
  public static readonly CONTENT_TYPE = ContentType.APPLICATION_XML;

  class: PackageableElementReference<Class>;
  url: string;

  constructor(
    store: PackageableElementReference<ModelStore>,
    _class: PackageableElementReference<Class>,
    url: string,
  ) {
    super(store);

    makeObservable(this, {
      url: observable,
      setClass: action,
      setUrl: action,
      hashCode: computed,
    });

    this.class = _class;
    this.url = url;
  }

  setClass(value: Class): void {
    this.class.setValue(value);
  }
  setUrl(value: string): void {
    this.url = value;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.XML_MODEL_CONNECTION,
      this.class.valueForSerialization,
      this.url,
    ]);
  }

  accept_ConnectionVisitor<T>(visitor: ConnectionVisitor<T>): T {
    return visitor.visit_XmlModelConnection(this);
  }
}
