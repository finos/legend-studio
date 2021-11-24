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
  DSLDiagram_LegendStudioPlugin_Extension,
} from '@finos/legend-extension-dsl-diagram';
import type {
  EditorExtensionState,
  EditorExtensionStateCreator,
  EditorStore,
  LegendStudioPluginManager,
  EditorExtensionComponentRendererConfiguration,
  ExplorerContextMenuItemRendererConfiguration,
  TEMP__ServiceQueryEditorActionConfiguration,
  ServicePureExecutionState,
  MappingExecutionQueryEditorActionConfiguration,
  MappingExecutionState,
  MappingTestQueryEditorActionConfiguration,
  MappingTestState,
  ApplicationSetup,
} from '@finos/legend-studio';
import {
  NewServiceModal,
  useEditorStore,
  LegendStudioPlugin,
} from '@finos/legend-studio';
import { MenuContentItem } from '@finos/legend-art';
import { QueryBuilderDialog } from './QueryBuilderDialog';
import { ServiceQueryBuilder } from './ServiceQueryBuilder';
import { MappingExecutionQueryBuilder } from './MappingExecutionQueryBuilder';
import { MappingTestQueryBuilder } from './MappingTestQueryBuilder';
import { flowResult } from 'mobx';
import {
  Class,
  PackageableElementExplicitReference,
  PureSingleExecution,
  Service,
  isMilestonedClass,
} from '@finos/legend-graph';
import type { PackageableElement } from '@finos/legend-graph';
import { QueryBuilder_EditorExtensionState } from '../stores/QueryBuilder_EditorExtensionState';
import {
  setupLegendQueryUILibrary,
  StandardQueryBuilderMode,
} from '@finos/legend-query';
import { assertErrorThrown, guaranteeNonNullable } from '@finos/legend-shared';
import { useState } from 'react';
import { observer } from 'mobx-react-lite';

const promoteQueryToService = async (
  packageName: string,
  serviceName: string,
  queryBuilderExtension: QueryBuilder_EditorExtensionState,
): Promise<void> => {
  const editorStore = queryBuilderExtension.editorStore;
  const queryBuilderState = queryBuilderExtension.queryBuilderState;
  try {
    const mapping = guaranteeNonNullable(
      queryBuilderState.querySetupState.mapping,
      'Mapping is required to create service execution',
    );
    const runtime = guaranteeNonNullable(
      queryBuilderState.querySetupState.runtime,
      'Runtime is required to create service execution',
    );
    const query = queryBuilderState.getQuery();
    const service = new Service(serviceName);
    service.initNewService();
    service.setExecution(
      new PureSingleExecution(
        query,
        service,
        PackageableElementExplicitReference.create(mapping),
        runtime,
      ),
    );
    const servicePackage =
      editorStore.graphManagerState.graph.getOrCreatePackage(packageName);
    servicePackage.addElement(service);
    editorStore.graphManagerState.graph.addElement(service);
    editorStore.openElement(service);
    await flowResult(
      queryBuilderExtension.setEmbeddedQueryBuilderMode(undefined),
    ).catch(editorStore.applicationStore.alertIllegalUnhandledError);
    editorStore.applicationStore.notifySuccess(
      `Service '${service.name}' created`,
    );
  } catch (error) {
    assertErrorThrown(error);
    editorStore.applicationStore.notifyError(error);
  }
};

const PromoteToServiceQueryBuilderAction = observer(() => {
  const editorStore = useEditorStore();
  const queryBuilderExtension = editorStore.getEditorExtensionState(
    QueryBuilder_EditorExtensionState,
  );
  const [openNewServiceModal, setOpenNewServiceModal] = useState(false);
  const showNewServiceModal = (): void => setOpenNewServiceModal(true);
  const closeNewServiceModal = (): void => setOpenNewServiceModal(false);
  const allowPromoteToService = Boolean(
    queryBuilderExtension.queryBuilderState.querySetupState.mapping &&
      queryBuilderExtension.queryBuilderState.querySetupState.runtime,
  );
  const promoteToService = async (
    packagePath: string,
    serviceName: string,
  ): Promise<void> => {
    if (allowPromoteToService) {
      await promoteQueryToService(
        packagePath,
        serviceName,
        queryBuilderExtension,
      );
    }
  };
  return (
    <>
      <button
        className="query-builder__dialog__header__custom-action"
        tabIndex={-1}
        onClick={showNewServiceModal}
        disabled={!allowPromoteToService}
      >
        Promote to Service
      </button>
      {queryBuilderExtension.queryBuilderState.querySetupState.mapping && (
        <NewServiceModal
          mapping={
            queryBuilderExtension.queryBuilderState.querySetupState.mapping
          }
          close={closeNewServiceModal}
          showModal={openNewServiceModal}
          promoteToService={promoteToService}
        />
      )}
    </>
  );
});

export class QueryBuilder_LegendStudioPlugin
  extends LegendStudioPlugin
  implements DSLDiagram_LegendStudioPlugin_Extension
{
  constructor() {
    super(packageJson.extensions.studioPlugin, packageJson.version);
  }

  install(pluginManager: LegendStudioPluginManager): void {
    pluginManager.registerStudioPlugin(this);
  }

  override getExtraApplicationSetups(): ApplicationSetup[] {
    return [
      async (pluginManager: LegendStudioPluginManager): Promise<void> => {
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
              await flowResult(
                queryBuilderExtension.setEmbeddedQueryBuilderMode({
                  actionConfigs: [
                    {
                      key: 'promote-to-service-btn',
                      renderer: (): React.ReactNode => (
                        <PromoteToServiceQueryBuilderAction />
                      ),
                    },
                  ],
                  queryBuilderMode: new StandardQueryBuilderMode(),
                }),
              );
              if (queryBuilderExtension.mode) {
                queryBuilderExtension.queryBuilderState.changeClass(element);
                if (
                  isMilestonedClass(
                    element,
                    queryBuilderExtension.queryBuilderState.graphManagerState
                      .graph,
                  )
                ) {
                  queryBuilderExtension.queryBuilderState.buildClassMilestoningValue(
                    element,
                  );
                }
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

  getExtraMappingExecutionQueryEditorActionConfigurations(): MappingExecutionQueryEditorActionConfiguration[] {
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

  getExtraMappingTestQueryEditorActionConfigurations(): MappingTestQueryEditorActionConfiguration[] {
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

  TEMP__getExtraServiceQueryEditorActionConfigurations(): TEMP__ServiceQueryEditorActionConfiguration[] {
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
              await flowResult(
                queryBuilderExtension.setEmbeddedQueryBuilderMode({
                  actionConfigs: [
                    {
                      key: 'promote-to-service-btn',
                      renderer: (): React.ReactNode => (
                        <PromoteToServiceQueryBuilderAction />
                      ),
                    },
                  ],
                  queryBuilderMode: new StandardQueryBuilderMode(),
                }),
              );
              if (queryBuilderExtension.mode) {
                queryBuilderExtension.queryBuilderState.changeClass(
                  classView.class.value,
                );
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
