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

import { flowResult } from 'mobx';
import { guaranteeType } from '@finos/legend-shared';
import { isStubbed_RawLambda, RuntimePointer } from '@finos/legend-graph';
import type { EditorStore } from '@finos/legend-application-studio';
import {
  DataSpace,
  type DataSpaceExecutableTemplate,
  getExecutionContextFromDataspaceExecutable,
  resolveExecutionContextMapping,
  resolveUsableDataSpaceClasses,
} from '@finos/legend-extension-dsl-data-space/graph';
import {
  DataSpaceQueryBuilderState,
  type ResolvedDataSpaceEntityWithOrigin,
} from '@finos/legend-extension-dsl-data-space/application';
import {
  QueryBuilderActionConfig,
  QueryBuilderAdvancedWorkflowState,
} from '@finos/legend-query-builder';
import type { DataSpaceExecutableTemplateLambdaState } from '../stores/DataSpaceExecutableTemplateState.js';

export const editDataSpaceExecutableTemplateInQueryBuilder = async (
  dataSpace: DataSpace,
  executableTemplate: DataSpaceExecutableTemplate,
  lambdaState: DataSpaceExecutableTemplateLambdaState,
  editorStore: EditorStore,
): Promise<void> => {
  const executionContext = getExecutionContextFromDataspaceExecutable(
    dataSpace,
    executableTemplate,
  );
  const mapping = executionContext
    ? resolveExecutionContextMapping(executionContext)
    : undefined;
  if (!executionContext || !mapping) {
    editorStore.applicationStore.notificationService.notifyWarning(
      `Can't open query builder for this executable: no execution context with a resolvable mapping could be found. Edit the query as text instead.`,
    );
    return;
  }
  const embeddedQueryBuilderState = editorStore.embeddedQueryBuilderState;
  await flowResult(
    embeddedQueryBuilderState.setEmbeddedQueryBuilderConfiguration({
      setupQueryBuilderState: async () => {
        const sourceInfo = Object.assign(
          {},
          editorStore.editorMode.getSourceInfo(),
          { dataSpace: dataSpace.path },
        );
        const queryBuilderState = new DataSpaceQueryBuilderState(
          editorStore.applicationStore,
          editorStore.graphManagerState,
          QueryBuilderAdvancedWorkflowState.INSTANCE,
          QueryBuilderActionConfig.INSTANCE,
          dataSpace,
          executionContext,
          false,
          undefined,
          async (dataSpaceInfo: ResolvedDataSpaceEntityWithOrigin) => {
            queryBuilderState.dataSpace = guaranteeType(
              queryBuilderState.graphManagerState.graph.getElement(
                dataSpaceInfo.path,
              ),
              DataSpace,
            );
            const targetDefault =
              queryBuilderState.dataSpace.defaultExecutionContext;
            if (targetDefault) {
              queryBuilderState.setExecutionContext(targetDefault);
              await queryBuilderState.propagateExecutionContextChange();
            }
          },
          undefined,
          undefined,
          undefined,
          undefined,
          editorStore.applicationStore.config.options.queryBuilderConfig,
          sourceInfo,
        );
        queryBuilderState.setExecutionContext(executionContext);
        queryBuilderState.changeMapping(mapping);
        const mappingModelCoverageAnalysisResult =
          queryBuilderState.dataSpaceAnalysisResult?.mappingToMappingCoverageResult?.get(
            mapping.path,
          );
        if (mappingModelCoverageAnalysisResult) {
          queryBuilderState.explorerState.mappingModelCoverageAnalysisResult =
            mappingModelCoverageAnalysisResult;
        }
        if (executionContext.defaultRuntime) {
          queryBuilderState.changeRuntime(
            new RuntimePointer(executionContext.defaultRuntime),
          );
        }
        if (!isStubbed_RawLambda(executableTemplate.query)) {
          queryBuilderState.initializeWithQuery(executableTemplate.query);
        } else {
          const compatibleClasses = resolveUsableDataSpaceClasses(
            dataSpace,
            mapping,
            queryBuilderState.graphManagerState,
          );
          const possibleNewClass = compatibleClasses[0];
          if (possibleNewClass) {
            queryBuilderState.changeSourceElement(possibleNewClass);
          }
        }
        return queryBuilderState;
      },
      actionConfigs: [
        {
          key: 'save-data-space-executable-query-btn',
          renderer: (queryBuilderState): React.ReactNode => {
            const save = editorStore.applicationStore.guardUnhandledError(
              async () => {
                const rawLambda = queryBuilderState.buildQueryForPersistence();
                executableTemplate.query = rawLambda;
                embeddedQueryBuilderState.setEmbeddedQueryBuilderConfiguration(
                  undefined,
                );
                await flowResult(
                  lambdaState.convertLambdaObjectToGrammarString({
                    pretty: true,
                  }),
                );
              },
            );
            return (
              <button
                className="query-builder__dialog__header__custom-action"
                tabIndex={-1}
                onClick={save}
              >
                Save Lambda
              </button>
            );
          },
        },
      ],
      disableCompile: true,
    }),
  );
};
