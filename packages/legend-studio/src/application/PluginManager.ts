/**
 * Copyright Goldman Sachs
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

import { AbstractPluginManager } from '@finos/legend-studio-shared';
import type { PureGraphManagerPlugin } from '../models/metamodels/pure/graph/PureGraphManagerPlugin';
import type { PureProtocolProcessorPlugin } from '../models/protocols/pure/PureProtocolProcessorPlugin';
import type { EditorPlugin } from '../stores/EditorPlugin';
import type {
  TelemetryServicePlugin,
  TracerServicePlugin,
} from '@finos/legend-studio-network';

export class PluginManager extends AbstractPluginManager {
  private telemetryServicePlugins: TelemetryServicePlugin[] = [];
  private tracerServicePlugins: TracerServicePlugin<unknown>[] = [];
  private pureProtocolProcessorPlugins: PureProtocolProcessorPlugin[] = [];
  private pureGraphManagerPlugins: PureGraphManagerPlugin[] = [];
  private editorPlugins: EditorPlugin[] = [];

  private constructor() {
    super();
  }

  static create(): PluginManager {
    return new PluginManager();
  }

  registerTelemetryServicePlugin(plugin: TelemetryServicePlugin): void {
    this.telemetryServicePlugins.push(plugin);
  }

  registerTracerServicePlugin(plugin: TracerServicePlugin<unknown>): void {
    this.tracerServicePlugins.push(plugin);
  }

  registerPureProtocolProcessorPlugin(
    plugin: PureProtocolProcessorPlugin,
  ): void {
    this.pureProtocolProcessorPlugins.push(plugin);
  }

  registerPureGraphManagerPlugin(plugin: PureGraphManagerPlugin): void {
    this.pureGraphManagerPlugins.push(plugin);
  }

  registerEditorPlugin(plugin: EditorPlugin): void {
    this.editorPlugins.push(plugin);
  }

  getTelemetryServicePlugins(): TelemetryServicePlugin[] {
    return [...this.telemetryServicePlugins];
  }

  getTracerServicePlugins(): TracerServicePlugin<unknown>[] {
    return [...this.tracerServicePlugins];
  }

  getPureGraphManagerPlugins(): PureGraphManagerPlugin[] {
    return [...this.pureGraphManagerPlugins];
  }

  getPureProtocolProcessorPlugins(): PureProtocolProcessorPlugin[] {
    return [...this.pureProtocolProcessorPlugins];
  }

  getEditorPlugins(): EditorPlugin[] {
    return [...this.editorPlugins];
  }
}
