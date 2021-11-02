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
  ClassView,
  ClassViewContextMenuItemRendererConfiguration,
  DiagramEditorState,
  DSLDiagram_StudioPlugin_Extension,
} from '@finos/legend-extension-dsl-diagram';
import type {
  EditorExtensionState,
  EditorExtensionStateCreator,
  EditorStore,
  StudioPluginManager,
  EditorExtensionComponentRendererConfiguration,
  ExplorerContextMenuItemRendererConfiguration,
  TEMP__ServiceQueryEditorRendererConfiguration,
  ServicePureExecutionState,
  MappingExecutionQueryEditorRendererConfiguration,
  MappingExecutionState,
  MappingTestQueryEditorRendererConfiguration,
  MappingTestState,
  ApplicationSetup,
} from '@finos/legend-studio';
import { StudioPlugin } from '@finos/legend-studio';
import { MenuContentItem } from '@finos/legend-art';
import { QueryBuilderDialog } from './QueryBuilderDialog';
import { ServiceQueryBuilder } from './ServiceQueryBuilder';
import { MappingExecutionQueryBuilder } from './MappingExecutionQueryBuilder';
import { MappingTestQueryBuilder } from './MappingTestQueryBuilder';
import { flowResult } from 'mobx';
import { Class } from '@finos/legend-graph';
import type { PackageableElement } from '@finos/legend-graph';
import { QueryBuilder_EditorExtensionState } from '../stores/QueryBuilder_EditorExtensionState';
import { setupLegendQueryUILibrary } from '@finos/legend-query';

export class QueryBuilder_StudioPlugin
  extends StudioPlugin
  implements DSLDiagram_StudioPlugin_Extension
{
  constructor() {
    super(packageJson.extensions.studioPlugin, packageJson.version);
  }

  install(pluginManager: StudioPluginManager): void {
    pluginManager.registerStudioPlugin(this);
  }

  override getExtraApplicationSetups(): ApplicationSetup[] {
    return [
      async (pluginManager: StudioPluginManager): Promise<void> => {
        await setupLegendQueryUILibrary();
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
        new QueryBuilder_EditorExtensionState(editorStore),
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
              const queryBuilderExtension = editorStore.getEditorExtensionState(
                QueryBuilder_EditorExtensionState,
              );
              await flowResult(queryBuilderExtension.setOpenQueryBuilder(true));
              if (queryBuilderExtension.openQueryBuilder) {
                queryBuilderExtension.queryBuilderState.querySetupState.setClass(
                  element,
                );
                queryBuilderExtension.queryBuilderState.resetData();
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

  TEMP__getExtraServiceQueryEditorRendererConfigurations(): TEMP__ServiceQueryEditorRendererConfiguration[] {
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

  getExtraClassViewContextMenuItemRendererConfigurations(): ClassViewContextMenuItemRendererConfiguration[] {
    return [
      {
        key: 'build-query-context-menu-action',
        renderer: (
          diagramEditorState: DiagramEditorState,
          classView: ClassView | undefined,
        ): React.ReactNode | undefined => {
          if (classView) {
            const buildQuery = async (): Promise<void> => {
              const queryBuilderExtension =
                diagramEditorState.editorStore.getEditorExtensionState(
                  QueryBuilder_EditorExtensionState,
                );
              await flowResult(queryBuilderExtension.setOpenQueryBuilder(true));
              if (queryBuilderExtension.openQueryBuilder) {
                queryBuilderExtension.queryBuilderState.querySetupState.setClass(
                  classView.class.value,
                );
                queryBuilderExtension.queryBuilderState.resetData();
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
}
