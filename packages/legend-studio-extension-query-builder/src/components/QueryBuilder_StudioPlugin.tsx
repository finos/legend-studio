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
  StudioPlugin,
} from '@finos/legend-studio';
import { MenuContentItem } from '@finos/legend-art';
import { QueryBuilderDialog } from './QueryBuilderDialog';
import { ServiceQueryBuilder } from './ServiceQueryBuilder';
import { MappingExecutionQueryBuilder } from './MappingExecutionQueryBuilder';
import { MappingTestQueryBuilder } from './MappingTestQueryBuilder';
import { flowResult } from 'mobx';
import {
  Class,
  GenericType,
  GenericTypeExplicitReference,
  Multiplicity,
  PRIMITIVE_TYPE,
  TYPICAL_MULTIPLICITY_TYPE,
  VariableExpression,
  PackageableElementExplicitReference,
  PureSingleExecution,
  Service,
} from '@finos/legend-graph';
import type { PackageableElement } from '@finos/legend-graph';
import { QueryBuilder_EditorExtensionState } from '../stores/QueryBuilder_EditorExtensionState';
import {
  QueryParameterState,
  buildGetAllFunction,
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
                queryBuilderExtension.queryBuilderState.querySetupState.setClass(
                  element,
                );
                queryBuilderExtension.queryBuilderState.resetData();
                if (element.stereotypes.length !== 0) {
                  const parmaterState = new QueryParameterState(
                    queryBuilderExtension.queryBuilderState.queryParametersState,
                    new VariableExpression(
                      'businessDate',
                      new Multiplicity(1, 1),
                      GenericTypeExplicitReference.create(
                        new GenericType(
                          queryBuilderExtension.queryBuilderState.queryParametersState.queryBuilderState.graphManagerState.graph.getPrimitiveType(
                            PRIMITIVE_TYPE.STRICTDATE,
                          ),
                        ),
                      ),
                    ),
                  );
                  parmaterState.mockParameterValues();
                  queryBuilderExtension.queryBuilderState.queryParametersState.addParameter(
                    parmaterState,
                  );
                  const getAllFunction = buildGetAllFunction(
                    element,
                    queryBuilderExtension.queryBuilderState.graphManagerState.graph.getTypicalMultiplicity(
                      TYPICAL_MULTIPLICITY_TYPE.ONE,
                    ),
                  );
                  getAllFunction.parametersValues.push(
                    guaranteeNonNullable(
                      queryBuilderExtension.queryBuilderState
                        .queryParametersState.parameters[0],
                      'Milestoning class should have a parameter',
                    ).parameter,
                  );
                  queryBuilderExtension.queryBuilderState.getAllFunctionState =
                    getAllFunction;
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
