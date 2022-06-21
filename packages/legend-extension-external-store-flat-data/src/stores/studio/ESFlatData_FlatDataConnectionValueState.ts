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

import { PackageableElementExplicitReference } from '@finos/legend-graph';
import {
  ConnectionValueState,
  NewConnectionValueDriver,
  type EditorStore,
} from '@finos/legend-application-studio';
import { makeObservable, computed } from 'mobx';
import { FlatDataConnection } from '../../models/metamodels/pure/model/store/flatData/connection/ESFlatData_FlatDataConnection.js';
import type { FlatData } from '../../models/metamodels/pure/model/store/flatData/model/ESFlatData_FlatData.js';

export class FlatDataConnectionValueState extends ConnectionValueState {
  override connection: FlatDataConnection;

  constructor(editorStore: EditorStore, connection: FlatDataConnection) {
    super(editorStore, connection);
    this.connection = connection;
  }

  label(): string {
    return 'flat-data connection';
  }
}

export class NewFlatDataConnectionDriver extends NewConnectionValueDriver<FlatDataConnection> {
  constructor(editorStore: EditorStore) {
    super(editorStore);

    makeObservable(this, {
      isValid: computed,
    });
  }

  get isValid(): boolean {
    return true;
  }

  createConnection(store: FlatData): FlatDataConnection {
    return new FlatDataConnection(
      PackageableElementExplicitReference.create(store),
    );
  }
}
