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

import { computed, action } from 'mobx';
import { EditorStore } from 'Stores/EditorStore';
import { guaranteeType, uuid } from 'Utilities/GeneralUtil';
import { ElementEditorState } from './ElementEditorState';
import { CompilationError } from 'EXEC/ExecutionServerError';
import { PackageableElement } from 'MM/model/packageableElements/PackageableElement';
import { PackageableConnection } from 'MM/model/packageableElements/connection/PackageableConnection';
import { Connection } from 'MM/model/packageableElements/connection/Connection';

export class ConnectionEditorState {
  uuid = uuid(); // NOTE: used to force component remount on state change
  editorStore: EditorStore;
  connection: Connection;

  constructor(editorStore: EditorStore, connection: Connection) {
    this.editorStore = editorStore;
    this.connection = connection;
  }
}

export class PackageableConnectionEditorState extends ElementEditorState {
  connectionState: ConnectionEditorState;
  @computed get connection(): PackageableConnection { return guaranteeType(this.element, PackageableConnection, `Element inside connection editor state must be a packageable connection`) }

  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore, element);
    this.connectionState = new ConnectionEditorState(editorStore, this.connection.connectionValue);
  }

  revealCompilationError(compilationError: CompilationError): boolean { return false }

  @action reprocess(newElement: PackageableElement, editorStore: EditorStore): ElementEditorState {
    const editorState = new PackageableConnectionEditorState(editorStore, newElement);
    return editorState;
  }
}
