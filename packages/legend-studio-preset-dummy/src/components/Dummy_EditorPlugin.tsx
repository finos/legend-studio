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

import packageJson from '../../package.json';
import type {
  ApplicationPageRenderEntry,
  DSL_EditorPlugin_Extension,
  EditorExtensionComponentRendererConfiguration,
  EditorExtensionStateCreator,
  EditorPluginSetup,
  ElementEditorCreator,
  ElementEditorPostCreationAction,
  ElementEditorStateCreator,
  ElementIconGetter,
  ElementProjectExplorerDnDTypeGetter,
  ElementTypeGetter,
  ElementTypeLabelGetter,
  ExplorerContextMenuItemRendererConfiguration,
  LambdaEditorHotkeyConfiguration,
  MappingExecutionQueryEditorRendererConfiguration,
  MappingTestQueryEditorRendererConfiguration,
  NewElementDriverCreator,
  NewElementDriverEditorCreator,
  NewElementFromStateCreator,
  PluginManager,
  PureGrammarElementLabeler,
  TEMP__ServiceQueryEditorRendererConfiguration,
} from '@finos/legend-studio';
import { EditorPlugin } from '@finos/legend-studio';

export class Dummy_EditorPlugin
  extends EditorPlugin
  // NOTE: we do this so we are reminded to add new plugin methods to this class every time we introduce a new one
  implements Required<DSL_EditorPlugin_Extension>
{
  constructor() {
    super(`${packageJson.pluginPrefix}-editor`, packageJson.version);
  }

  install(pluginManager: PluginManager): void {
    pluginManager.registerEditorPlugin(this);
  }

  getExtraEditorPluginSetups(): EditorPluginSetup[] {
    return [];
  }
  getExtraApplicationPageRenderEntries(): ApplicationPageRenderEntry[] {
    return [];
  }
  getExtraExplorerContextMenuItemRendererConfigurations(): ExplorerContextMenuItemRendererConfiguration[] {
    return [];
  }
  getExtraEditorExtensionStateCreators(): EditorExtensionStateCreator[] {
    return [];
  }
  getExtraEditorExtensionComponentRendererConfigurations(): EditorExtensionComponentRendererConfiguration[] {
    return [];
  }
  getExtraLambdaEditorHotkeyConfigurations(): LambdaEditorHotkeyConfiguration[] {
    return [];
  }
  getExtraMappingExecutionQueryEditorRendererConfigurations(): MappingExecutionQueryEditorRendererConfiguration[] {
    return [];
  }
  TEMP__getExtraServiceQueryEditorRendererConfigurations(): TEMP__ServiceQueryEditorRendererConfiguration[] {
    return [];
  }
  getExtraMappingTestQueryEditorRendererConfigurations(): MappingTestQueryEditorRendererConfiguration[] {
    return [];
  }
  getExtraSupportedElementTypes(): string[] {
    return [];
  }
  getExtraElementTypeGetters(): ElementTypeGetter[] {
    return [];
  }
  getExtraElementTypeLabelGetters(): ElementTypeLabelGetter[] {
    return [];
  }
  getExtraElementIconGetters(): ElementIconGetter[] {
    return [];
  }
  getExtraNewElementFromStateCreators(): NewElementFromStateCreator[] {
    return [];
  }
  getExtraNewElementDriverCreators(): NewElementDriverCreator[] {
    return [];
  }
  getExtraNewElementDriverEditorCreators(): NewElementDriverEditorCreator[] {
    return [];
  }
  getExtraElementEditorPostCreationActions(): ElementEditorPostCreationAction[] {
    return [];
  }
  getExtraElementEditorCreators(): ElementEditorCreator[] {
    return [];
  }
  getExtraElementEditorStateCreators(): ElementEditorStateCreator[] {
    return [];
  }
  getExtraElementProjectExplorerDnDTypeGetters(): ElementProjectExplorerDnDTypeGetter[] {
    return [];
  }
  getExtraPureGrammarElementLabelers(): PureGrammarElementLabeler[] {
    return [];
  }
  getExtraPureGrammarParserNames(): string[] {
    return [];
  }
  getExtraPureGrammarKeywords(): string[] {
    return [];
  }
  getExtraGrammarTextEditorDnDTypes(): string[] {
    return [];
  }
}
