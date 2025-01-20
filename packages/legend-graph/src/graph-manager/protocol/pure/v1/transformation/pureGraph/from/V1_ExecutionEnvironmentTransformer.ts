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
  type ExecutionEnvironmentInstance,
  type ExecutionParameters,
  SingleExecutionParameters,
  MultiExecutionParameters,
} from '../../../../../../../graph/metamodel/pure/packageableElements/service/ExecutionEnvironmentInstance.js';
import { V1_initPackageableElement } from './V1_CoreTransformerHelper.js';
import type { V1_GraphTransformerContext } from './V1_GraphTransformerContext.js';
import {
  type V1_ExecutionParameters,
  V1_ExecutionEnvironmentInstance,
  V1_MultiExecutionParameters,
  V1_RuntimeComponents,
  V1_SingleExecutionParameters,
} from '../../../model/packageableElements/service/V1_ExecutionEnvironmentInstance.js';
import { V1_transformRuntime } from './V1_RuntimeTransformer.js';
import { UnsupportedOperationError } from '@finos/legend-shared';
import { PackageableElementPointerType } from '../../../../../../../graph/MetaModelConst.js';
import { V1_PackageableElementPointer } from '../../../model/packageableElements/V1_PackageableElement.js';

const V1_transformSingleExecutionParameters = (
  element: SingleExecutionParameters,
  context: V1_GraphTransformerContext,
): V1_SingleExecutionParameters => {
  const _val = new V1_SingleExecutionParameters();
  _val.key = element.key;
  _val.mapping = element.mapping.valueForSerialization ?? '';
  if (element.runtime) {
    _val.runtime = V1_transformRuntime(element.runtime, context);
  }
  if (element.runtimeComponents) {
    _val.runtimeComponents = new V1_RuntimeComponents();
    _val.runtimeComponents.binding = new V1_PackageableElementPointer(
      PackageableElementPointerType.BINDING,
      element.runtimeComponents.binding.valueForSerialization ?? '',
    );
    _val.runtimeComponents.clazz = new V1_PackageableElementPointer(
      PackageableElementPointerType.CLASS,
      element.runtimeComponents.clazz.valueForSerialization ?? '',
    );
    _val.runtimeComponents.runtime = V1_transformRuntime(
      element.runtimeComponents.runtime,
      context,
    );
  }

  return _val;
};

const V1_transformExecutionParameters = (
  element: ExecutionParameters,
  context: V1_GraphTransformerContext,
): V1_ExecutionParameters => {
  if (element instanceof SingleExecutionParameters) {
    return V1_transformSingleExecutionParameters(element, context);
  } else if (element instanceof MultiExecutionParameters) {
    const val = new V1_MultiExecutionParameters();
    val.masterKey = element.masterKey;
    val.singleExecutionParameters = element.singleExecutionParameters.map((s) =>
      V1_transformSingleExecutionParameters(s, context),
    );
    return val;
  }
  throw new UnsupportedOperationError('Unsupported execution parameter type');
};

export const V1_transformExecutionEnvirnoment = (
  element: ExecutionEnvironmentInstance,
  context: V1_GraphTransformerContext,
): V1_ExecutionEnvironmentInstance => {
  const execEnv = new V1_ExecutionEnvironmentInstance();
  V1_initPackageableElement(execEnv, element);
  execEnv.executionParameters = element.executionParameters.map((e) =>
    V1_transformExecutionParameters(e, context),
  );
  return execEnv;
};
