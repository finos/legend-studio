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
  EditorPluginSetup,
} from '@finos/legend-studio';
import { Class, EditorPlugin } from '@finos/legend-studio';
import { MenuContentItem } from '@finos/legend-studio-components';
import { QueryBuilderDialog } from './QueryBuilderDialog';
import { ServiceQueryBuilder } from './ServiceQueryBuilder';
import { MappingExecutionQueryBuilder } from './MappingExecutionQueryBuilder';
import { MappingTestQueryBuilder } from './MappingTestQueryBuilder';
import { QueryBuilderState } from '../stores/QueryBuilderState';
import { flowResult } from 'mobx';
import type { IKeyboardEvent } from 'monaco-editor';
import { KeyCode } from 'monaco-editor';
import { ModuleRegistry as agGrid_ModuleRegistry } from '@ag-grid-community/core';
import { ClientSideRowModelModule } from '@ag-grid-community/client-side-row-model';

export class QueryBuilder_EditorPlugin extends EditorPlugin {
  constructor() {
    super(packageJson.name, packageJson.version);
  }

  install(pluginManager: PluginManager): void {
    pluginManager.registerEditorPlugin(this);
  }

  override getExtraEditorPluginSetups(): EditorPluginSetup[] {
    return [
      async (pluginManager: PluginManager): Promise<void> => {
        // Register module extensions for `ag-grid`
        agGrid_ModuleRegistry.registerModules([ClientSideRowModelModule]);
      },
    ];
  }

  override getExtraEditorExtensionComponentRendererConfigurations(): EditorExtensionComponentRendererConfiguration[] {
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

  override getExtraEditorExtensionStateCreators(): EditorExtensionStateCreator[] {
    return [
      (editorStore: EditorStore): EditorExtensionState | undefined =>
        new QueryBuilderState(editorStore),
    ];
  }

  override getExtraExplorerContextMenuItemRendererConfigurations(): ExplorerContextMenuItemRendererConfiguration[] {
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
              <MenuContentItem onClick={buildQuery}>Execute...</MenuContentItem>
            );
          }
          return undefined;
        },
      },
    ];
  }

  override getExtraLambdaEditorHotkeyConfigurations(): LambdaEditorHotkeyConfiguration[] {
    return [
      {
        eventMatcher: (
          editorStore: EditorStore,
          event: IKeyboardEvent,
        ): boolean =>
          editorStore.getEditorExtensionState(QueryBuilderState)
            .openQueryBuilder && event.keyCode === KeyCode.F9,
        skipGlobalAction: true,
        action: (
          editorStore: EditorStore,
          lambdaEditorState: LambdaEditorState,
          checkParseringError: boolean,
        ): void => {
          const queryBuilderState =
            editorStore.getEditorExtensionState(QueryBuilderState);
          flowResult(
            editorStore.graphState.checkLambdaParsingError(
              lambdaEditorState,
              checkParseringError,
              () => flowResult(queryBuilderState.compileQuery()),
            ),
          ).catch(editorStore.applicationStore.alertIllegalUnhandledError);
        },
      },
    ];
  }

  override getExtraMappingExecutionQueryEditorRendererConfigurations(): MappingExecutionQueryEditorRendererConfiguration[] {
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

  override getExtraMappingTestQueryEditorRendererConfigurations(): MappingTestQueryEditorRendererConfiguration[] {
    return [
      {
        key: 'build-query-context-menu-action',
        renderer: function MappingTestQueryBuilderRenderer(
          testState: MappingTestState,
          isReadOnly: boolean,
        ): React.ReactNode | undefined {
          return (
            <MappingTestQueryBuilder
              testState={testState}
              isReadOnly={isReadOnly}
            />
          );
        },
      },
    ];
  }

  override TEMP__getExtraServiceQueryEditorRendererConfigurations(): TEMP__ServiceQueryEditorRendererConfiguration[] {
    return [
      {
        key: 'build-query-context-menu-action',
        renderer: function ServiceQueryBuilderRenderer(
          executionState: ServicePureExecutionState,
          isReadOnly: boolean,
        ): React.ReactNode | undefined {
          return (
            <ServiceQueryBuilder
              executionState={executionState}
              isReadOnly={isReadOnly}
            />
          );
        },
      },
    ];
  }
}
