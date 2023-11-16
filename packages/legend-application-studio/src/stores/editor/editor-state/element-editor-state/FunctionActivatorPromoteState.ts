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

import { action, flow, flowResult, makeObservable, observable } from 'mobx';
import type { FunctionEditorState } from './FunctionEditorState.js';
import {
  type ConcreteFunctionDefinition,
  FunctionActivator,
  extractElementNameFromPath,
  extractPackagePathFromPath,
} from '@finos/legend-graph';
import { type GeneratorFn, assertType } from '@finos/legend-shared';
import { FUNCTION_PROMOTE_TYPE } from '../../../../components/editor/editor-group/function-activator/FunctionEditor.js';
import type { DSL_LegendStudioApplicationPlugin_Extension } from '../../../LegendStudioApplicationPlugin.js';

const BASE_ACTIVATOR_NAME = 'NewActivator';

export class FunctionActivatorPromoteState {
  readonly functionEditorState: FunctionEditorState;

  activatorPath: string;
  isPromotingFunction = false;
  isFunctionActivatorEditorOpen = false;
  promoteType: string | undefined;

  constructor(functionEditorState: FunctionEditorState) {
    makeObservable(this, {
      activatorPath: observable,
      isPromotingFunction: observable,
      isFunctionActivatorEditorOpen: observable,
      promoteType: observable,
      setPromoteType: action,
      updateActivatorPath: action,
      setIsPromotingFunction: action,
      setIsFunctionActivatorEditorOpen: action,
      promote: flow,
    });

    this.functionEditorState = functionEditorState;
    this.promoteType = FUNCTION_PROMOTE_TYPE.SNOWFLAKE_NATIVE_APP;
    this.activatorPath = `${this.functionEditorState.functionElement.package?.path}::${BASE_ACTIVATOR_NAME}`;
  }

  setIsPromotingFunction(val: boolean): void {
    this.isPromotingFunction = val;
  }

  setIsFunctionActivatorEditorOpen(val: boolean): void {
    this.isFunctionActivatorEditorOpen = val;
  }

  setPromoteType(val: string | undefined): void {
    this.promoteType = val;
  }

  showFunctionPromoteModal(): void {
    this.setIsPromotingFunction(true);
  }

  closeFunctionPromoteModal(): void {
    this.setIsPromotingFunction(false);
  }

  updateActivatorPath(val: string): void {
    this.activatorPath = val;
  }

  createFunctionActivator(
    functionElement: ConcreteFunctionDefinition,
  ): FunctionActivator | undefined {
    const type = this.promoteType;
    const activatorName = this.activatorPath.includes('::')
      ? extractElementNameFromPath(this.activatorPath)
      : this.activatorPath;
    if (type) {
      const extraNewElementFromStateCreators =
        this.functionEditorState.editorStore.pluginManager
          .getApplicationPlugins()
          .flatMap(
            (plugin) =>
              (
                plugin as DSL_LegendStudioApplicationPlugin_Extension
              ).getExtraNewElementFromStateCreators?.() ?? [],
          );
      let functionActivator;
      for (const creator of extraNewElementFromStateCreators) {
        const _element = creator(
          type,
          activatorName,
          this.functionEditorState.editorStore.newElementState,
          { decorElement: functionElement },
        );
        if (_element) {
          functionActivator = _element;
          assertType(functionActivator, FunctionActivator);
          return functionActivator;
        }
      }
    }
    return undefined;
  }

  *promote(functionElement: ConcreteFunctionDefinition): GeneratorFn<void> {
    const functionActivator = this.createFunctionActivator(functionElement);
    if (!functionActivator) {
      return;
    }
    try {
      yield flowResult(
        this.functionEditorState.editorStore.graphEditorMode.addElement(
          functionActivator,
          extractPackagePathFromPath(this.activatorPath) ?? this.activatorPath,
          true,
        ),
      );
    } catch {
      this.functionEditorState.editorStore.applicationStore.notificationService.notifyError(
        `Can't promote function`,
      );
    } finally {
      this.setPromoteType(FUNCTION_PROMOTE_TYPE.SNOWFLAKE_NATIVE_APP);
    }
  }
}
