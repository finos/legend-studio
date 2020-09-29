/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { observable, computed, action } from 'mobx';
import { hashArray } from 'Utilities/HashUtil';
import { Hashable } from 'MetaModelUtility';
import { HASH_STRUCTURE } from 'MetaModelConst';
import { tryToMinifyJSONString } from 'Utilities/FormatterUtil';
import { ContentType } from 'API/NetworkClient';
import { ConnectionVisitor } from 'MM/model/packageableElements/connection/Connection';
import { Class } from 'MM/model/packageableElements/domain/Class';
import { ModelStore } from 'MM/model/packageableElements/store/modelToModel/model/ModelStore';
import { PureModelConnection } from './PureModelConnection';
import { PackageableElementReference } from 'MM/model/packageableElements/PackageableElementReference';

export class JsonModelConnection extends PureModelConnection implements Hashable {
  class: PackageableElementReference<Class>;
  @observable url: string;

  constructor(store: PackageableElementReference<ModelStore>, _class: PackageableElementReference<Class>, url = JsonModelConnection.createUrlStringFromData('{}')) {
    super(store);
    this.class = _class;
    this.url = url;
  }

  static createUrlStringFromData(data: string): string { return `data:${ContentType.APPLICATION_JSON};base64,${btoa(tryToMinifyJSONString(data))}` }

  @action setClass(value: Class): void { this.class.setValue(value) }
  @action setUrl(value: string): void { this.url = value }

  @computed get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.JSON_MODEL_CONNECTION,
      super.hashCode,
      this.class.valueForSerialization,
      this.url,
    ]);
  }

  accept_ConnectionVisitor<T>(visitor: ConnectionVisitor<T>): T {
    return visitor.visit_JsonModelConnection(this);
  }
}
