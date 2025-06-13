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

import {
  ConcreteFunctionDefinition,
  type Mapping,
  type PackageableElement,
  PureExecution,
  PureMultiExecution,
  PureSingleExecution,
  RawLambda,
  RuntimePointer,
  Service,
  type ParameterValue,
} from '@finos/legend-graph';
import type { EditorStore } from '../EditorStore.js';
import {
  QueryBuilderDataCubeEngine,
  QueryBuilderDataCubeViewerState,
} from '@finos/legend-query-builder';
import {
  assertErrorThrown,
  guaranteeNonNullable,
  guaranteeType,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { type DataCubeSpecification } from '@finos/legend-data-cube';

export const isElementSupportedByDataCube = (
  element: PackageableElement,
): boolean =>
  element instanceof ConcreteFunctionDefinition || element instanceof Service;

export const openDataCube = async (
  element: PackageableElement,
  editorStore: EditorStore,
  parameterValues?: ParameterValue[],
  letFuncsRawLambda?: RawLambda,
): Promise<void> => {
  try {
    let specification: DataCubeSpecification;
    let engine: QueryBuilderDataCubeEngine;

    if (element instanceof ConcreteFunctionDefinition) {
      const body = element.expressionSequence;
      const rawLambda = new RawLambda([], body);
      rawLambda.parameters = element.parameters.map((parameter) =>
        editorStore.graphManagerState.graphManager.serializeRawValueSpecification(
          parameter,
        ),
      );
      engine = new QueryBuilderDataCubeEngine(
        rawLambda,
        parameterValues,
        undefined,
        undefined,
        editorStore.graphManagerState,
        undefined,
        letFuncsRawLambda,
      );
      specification = await engine.generateInitialSpecification();
    } else if (element instanceof Service) {
      const exec = guaranteeType(
        element.execution,
        PureExecution,
        'Service must have a pure execution',
      );
      let mapping: Mapping | undefined;
      let runtime: RuntimePointer | undefined;
      if (exec instanceof PureSingleExecution) {
        mapping = exec.mapping?.value;
        if (exec.runtime) {
          runtime = guaranteeType(
            exec.runtime,
            RuntimePointer,
            'Only runtime pointers supported',
          );
        }
      } else if (exec instanceof PureMultiExecution) {
        const param = guaranteeNonNullable(
          exec.executionParameters?.[0],
          'multi execution does not have an execution param',
        );
        mapping = param.mapping.value;

        runtime = guaranteeType(
          param.runtime,
          RuntimePointer,
          'Only runtime pointers supported',
        );
      }
      engine = new QueryBuilderDataCubeEngine(
        exec.func,
        parameterValues,
        mapping?.path,
        runtime?.packageableRuntime.value.path,
        editorStore.graphManagerState,
        undefined,
        letFuncsRawLambda,
      );
      specification = await engine.generateInitialSpecification();
    } else {
      throw new UnsupportedOperationError(
        'Element not supported to open Data Cube with',
      );
    }

    try {
      await engine.getRelationType(engine.selectInitialQuery);
    } catch (error) {
      assertErrorThrown(error);
      throw new UnsupportedOperationError(
        'Only relation type queries supported in Data Cube',
      );
    }

    editorStore.setEmbeddedDataCubeViewerState(
      new QueryBuilderDataCubeViewerState(specification, engine),
    );
  } catch (error) {
    assertErrorThrown(error);
    editorStore.applicationStore.notificationService.notifyError(
      `Unable to open cube: ${error.message}`,
    );
  }
};
