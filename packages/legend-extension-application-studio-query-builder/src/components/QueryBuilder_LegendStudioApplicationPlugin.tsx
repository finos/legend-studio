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
  DSLDiagram_LegendStudioApplicationPlugin_Extension,
} from '@finos/legend-extension-dsl-diagram';
import {
  type EditorExtensionState,
  type EditorExtensionStateCreator,
  type EditorStore,
  type EditorExtensionComponentRendererConfiguration,
  type ExplorerContextMenuItemRendererConfiguration,
  type ServicePureExecutionState,
  type MappingExecutionQueryEditorActionConfiguration,
  type MappingExecutionState,
  type MappingTestQueryEditorActionConfiguration,
  type MappingTestState,
  type DSLService_LegendStudioApplicationPlugin_Extension,
  type ServiceQueryEditorActionConfiguration,
  NewServiceModal,
  useEditorStore,
  LegendStudioApplicationPlugin,
  service_initNewService,
  service_setExecution,
} from '@finos/legend-application-studio';
import { MenuContentItem } from '@finos/legend-art';
import { EmbeddedQueryBuilder } from './EmbeddedQueryBuilder.js';
import { ServiceQueryBuilder } from './ServiceQueryBuilder.js';
import { MappingExecutionQueryBuilder } from './MappingExecutionQueryBuilder.js';
import { MappingTestQueryBuilder } from './MappingTestQueryBuilder.js';
import { flowResult } from 'mobx';
import {
  type PackageableElement,
  Class,
  PackageableElementExplicitReference,
  PureSingleExecution,
  Service,
} from '@finos/legend-graph';
import { QueryBuilder_EditorExtensionState } from '../stores/QueryBuilder_EditorExtensionState.js';
import {
  type QueryBuilderState,
  setupLegendQueryUILibrary,
  ClassQueryBuilderState,
} from '@finos/legend-application-query';
import { assertErrorThrown, guaranteeNonNullable } from '@finos/legend-shared';
import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import type { LegendApplicationSetup } from '@finos/legend-application';
import { QUERY_BUILDER_LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../stores/QueryBuilder_LegendStudioApplicationNavigationContext.js';

const promoteQueryToService = async (
  packagePath: string,
  serviceName: string,
  queryBuilderExtensionState: QueryBuilder_EditorExtensionState,
  queryBuilderState: QueryBuilderState,
): Promise<void> => {
  const editorStore = queryBuilderExtensionState.editorStore;
  const applicationStore = editorStore.applicationStore;
  try {
    const mapping = guaranteeNonNullable(
      queryBuilderState.mapping,
      'Mapping is required to create service execution',
    );
    const runtime = guaranteeNonNullable(
      queryBuilderState.runtimeValue,
      'Runtime is required to create service execution',
    );
    const query = queryBuilderState.buildQuery();
    const service = new Service(serviceName);
    service_initNewService(service);
    service_setExecution(
      service,
      new PureSingleExecution(
        query,
        service,
        PackageableElementExplicitReference.create(mapping),
        runtime,
      ),
      editorStore.changeDetectionState.observerContext,
    );
    await flowResult(editorStore.addElement(service, packagePath, true));
    await flowResult(
      queryBuilderExtensionState.setEmbeddedQueryBuilderConfiguration(
        undefined,
      ),
    ).catch(applicationStore.alertUnhandledError);
    applicationStore.notifySuccess(`Service '${service.name}' created`);
  } catch (error) {
    assertErrorThrown(error);
    applicationStore.notifyError(error);
  }
};

const PromoteToServiceQueryBuilderAction = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const editorStore = useEditorStore();
    const queryBuilderExtension = editorStore.getEditorExtensionState(
      QueryBuilder_EditorExtensionState,
    );
    const [openNewServiceModal, setOpenNewServiceModal] = useState(false);
    const showNewServiceModal = (): void => setOpenNewServiceModal(true);
    const closeNewServiceModal = (): void => setOpenNewServiceModal(false);
    const allowPromoteToService = Boolean(
      queryBuilderState.mapping && queryBuilderState.runtimeValue,
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
          queryBuilderState,
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
        {queryBuilderState.mapping && (
          <NewServiceModal
            mapping={queryBuilderState.mapping}
            close={closeNewServiceModal}
            showModal={openNewServiceModal}
            promoteToService={promoteToService}
          />
        )}
      </>
    );
  },
);

export class QueryBuilder_LegendStudioApplicationPlugin
  extends LegendStudioApplicationPlugin
  implements
    DSLDiagram_LegendStudioApplicationPlugin_Extension,
    DSLService_LegendStudioApplicationPlugin_Extension
{
  constructor() {
    super(packageJson.extensions.applicationStudioPlugin, packageJson.version);
  }

  override getExtraApplicationSetups(): LegendApplicationSetup[] {
    return [
      async (pluginManager): Promise<void> => {
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
          return <EmbeddedQueryBuilder />;
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
            const buildQuery = editorStore.applicationStore.guardUnhandledError(
              async () => {
                const queryBuilderExtension =
                  editorStore.getEditorExtensionState(
                    QueryBuilder_EditorExtensionState,
                  );
                await flowResult(
                  queryBuilderExtension.setEmbeddedQueryBuilderConfiguration({
                    setupQueryBuilderState: () => {
                      const queryBuilderState = new ClassQueryBuilderState(
                        queryBuilderExtension.editorStore.applicationStore,
                        queryBuilderExtension.editorStore.graphManagerState,
                      );
                      queryBuilderState.changeClass(element);
                      queryBuilderState.propagateClassChange(element);
                      return queryBuilderState;
                    },
                    actionConfigs: [
                      {
                        key: 'promote-to-service-btn',
                        renderer: (
                          queryBuilderState: QueryBuilderState,
                        ): React.ReactNode => (
                          <PromoteToServiceQueryBuilderAction
                            queryBuilderState={queryBuilderState}
                          />
                        ),
                      },
                    ],
                  }),
                );
              },
            );

            return (
              <MenuContentItem onClick={buildQuery}>Query...</MenuContentItem>
            );
          }
          return undefined;
        },
      },
    ];
  }

  override getExtraAccessEventLoggingApplicationContextKeys(): string[] {
    return [
      QUERY_BUILDER_LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.EMBEDDED_QUERY_BUILDER,
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

  getExtraServiceQueryEditorActionConfigurations(): ServiceQueryEditorActionConfiguration[] {
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
            const buildQuery =
              diagramEditorState.editorStore.applicationStore.guardUnhandledError(
                async () => {
                  const queryBuilderExtension =
                    diagramEditorState.editorStore.getEditorExtensionState(
                      QueryBuilder_EditorExtensionState,
                    );
                  await flowResult(
                    queryBuilderExtension.setEmbeddedQueryBuilderConfiguration({
                      setupQueryBuilderState: () => {
                        const queryBuilderState = new ClassQueryBuilderState(
                          queryBuilderExtension.editorStore.applicationStore,
                          queryBuilderExtension.editorStore.graphManagerState,
                        );
                        queryBuilderState.changeClass(classView.class.value);
                        queryBuilderState.propagateClassChange(
                          classView.class.value,
                        );
                        return queryBuilderState;
                      },
                      actionConfigs: [
                        {
                          key: 'promote-to-service-btn',
                          renderer: (
                            queryBuilderState: QueryBuilderState,
                          ): React.ReactNode => (
                            <PromoteToServiceQueryBuilderAction
                              queryBuilderState={queryBuilderState}
                            />
                          ),
                        },
                      ],
                    }),
                  );
                },
              );

            return (
              <MenuContentItem onClick={buildQuery}>Query...</MenuContentItem>
            );
          }
          return undefined;
        },
      },
    ];
  }
}
