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

import type { DSL_StudioPlugin_Extension } from './StudioPlugin';
import type { ConnectionValueState } from './editor-state/element-editor-state/connection/ConnectionEditorState';
import type { EditorStore } from './EditorStore';
import type { Store, Connection } from '@finos/legend-graph';

export type RuntimeConnectionTooltipTextBuilder = (
  connection: Connection,
) => string | undefined;

export type DefaultConnectionValueBuilder = (
  store: Store,
) => Connection | undefined;

export type ConnectionValueEditorStateBuilder = (
  editorStore: EditorStore,
  connection: Connection,
) => ConnectionValueState | undefined;

export type ConnectionEditorRenderer = (
  connectionValueState: ConnectionValueState,
  isReadOnly: boolean,
) => React.ReactNode | undefined;

export interface DSLMapping_StudioPlugin_Extension
  extends DSL_StudioPlugin_Extension {
  /**
   * Get the list of the default connection type given the stores.
   */
  getExtraDefaultConnectionValueBuilders?(): DefaultConnectionValueBuilder[];

  /**
   * Get the list of the connection editor state builders for connections.
   */
  getExtraConnectionValueEditorStateBuilders?(): ConnectionValueEditorStateBuilder[];

  /**
   * Get the list of the connection editor state renderers for connections.
   */
  getExtraConnectionEditorRenderers?(): ConnectionEditorRenderer[];

  /**
   * Get the list of the runtime connection tool tip text builders given the connection type.
   */
  getExtraRuntimeConnectionTooltipTextBuilders?(): RuntimeConnectionTooltipTextBuilder[];
}
