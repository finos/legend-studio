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

import packageJson from '../package.json';
import type {
  EditorExtensionState,
  EditorExtensionStateCreator,
  EditorStore,
  LambdaEditorHotkeyConfiguration,
  LambdaEditorState,
  PackageableElement,
  PluginManager,
  EditorExtensionComponentRendererConfiguration,
  ExplorerContextMenuItemRendererConfiguration,
  TEMP__ServiceQueryEditorRendererConfiguration,
  ServicePureExecutionState,
  MappingExecutionQueryEditorRendererConfiguration,
  MappingExecutionState,
  MappingTestQueryEditorRendererConfiguration,
  MappingTestState,
} from '@finos/legend-studio';
import { Class, EditorPlugin } from '@finos/legend-studio';
import { MenuContentItem } from '@finos/legend-studio-components';
import { QueryBuilderDialog } from './components/QueryBuilderDialog';
import { ServiceQueryBuilder } from './components/ServiceQueryBuilder';
import { MappingExecutionQueryBuilder } from './components/MappingExecutionQueryBuilder';
import { MappingTestQueryBuilder } from './components/MappingTestQueryBuilder';
import { QueryBuilderState } from './stores/QueryBuilderState';
import { flowResult } from 'mobx';
import type { IKeyboardEvent } from 'monaco-editor';
import { KeyCode } from 'monaco-editor';

export class QueryBuilderPlugin extends EditorPlugin {
  constructor() {
    super(packageJson.name, packageJson.version);
  }

  install(pluginManager: PluginManager): void {
    pluginManager.registerEditorPlugin(this);
  }

  configure(_configData: object): QueryBuilderPlugin {
    return this;
  }

  getExtraEditorExtensionComponentRendererConfigurations(): EditorExtensionComponentRendererConfiguration[] {
    return [
      {
        key: 'query-builder-dialog',
        renderer: function QueryBuilderDialogRenderer(
          editorStore: EditorStore,
        ): React.ReactNode | undefined {
          return <QueryBuilderDialog />;
        },
      },
    ];
  }

  getExtraEditorExtensionStateCreators(): EditorExtensionStateCreator[] {
    return [
      (editorStore: EditorStore): EditorExtensionState | undefined =>
        new QueryBuilderState(editorStore),
    ];
  }

  getExtraExplorerContextMenuItemRendererConfigurations(): ExplorerContextMenuItemRendererConfiguration[] {
    return [
      {
        key: 'build-query-context-menu-action',
        renderer: (
          editorStore: EditorStore,
          element: PackageableElement | undefined,
        ): React.ReactNode | undefined => {
          if (element instanceof Class) {
            const buildQuery = async (): Promise<void> => {
              const queryBuilderState =
                editorStore.getEditorExtensionState(QueryBuilderState);
              await flowResult(queryBuilderState.setOpenQueryBuilder(true));
              if (queryBuilderState.openQueryBuilder) {
                queryBuilderState.querySetupState.setClass(element);
                queryBuilderState.resetData();
              }
            };
            return (
              <MenuContentItem onClick={buildQuery}>
                Build Query (WIP)...
              </MenuContentItem>
            );
          }
          return undefined;
        },
      },
    ];
  }

  getExtraLambdaEditorHotkeyConfigurations(): LambdaEditorHotkeyConfiguration[] {
    return [
      {
        eventMatcher: (event: IKeyboardEvent): boolean =>
          event.keyCode === KeyCode.F9,
        skipGlobalAction: true,
        action: (
          editorStore: EditorStore,
          lambdaEditorState: LambdaEditorState,
          checkParseringError: boolean,
        ): void => {
          const queryBuilderState =
            editorStore.getEditorExtensionState(QueryBuilderState);
          if (queryBuilderState.isEditingInTextMode()) {
            editorStore.graphState
              .checkLambdaParsingError(
                lambdaEditorState,
                checkParseringError,
                () => queryBuilderState.compileQuery(),
              )
              .catch(editorStore.applicationStore.alertIllegalUnhandledError);
          }
        },
      },
    ];
  }

  getExtraMappingExecutionQueryEditorRendererConfigurations(): MappingExecutionQueryEditorRendererConfiguration[] {
    return [
      {
        key: 'build-query-context-menu-action',
        renderer: function MappingExecutionQueryBuilderRenderer(
          executionState: MappingExecutionState,
        ): React.ReactNode | undefined {
          return (
            <MappingExecutionQueryBuilder executionState={executionState} />
          );
        },
      },
    ];
  }

  getExtraMappingTestQueryEditorRendererConfigurations(): MappingTestQueryEditorRendererConfiguration[] {
    return [
      {
        key: 'build-query-context-menu-action',
        renderer: function MappingTestQueryBuilderRenderer(
          testState: MappingTestState,
        ): React.ReactNode | undefined {
          return <MappingTestQueryBuilder testState={testState} />;
        },
      },
    ];
  }

  TEMP__getExtraServiceQueryEditorRendererConfigurations(): TEMP__ServiceQueryEditorRendererConfiguration[] {
    return [
      {
        key: 'build-query-context-menu-action',
        renderer: function ServiceQueryBuilderRenderer(
          executionState: ServicePureExecutionState,
        ): React.ReactNode | undefined {
          return <ServiceQueryBuilder executionState={executionState} />;
        },
      },
    ];
  }
}
