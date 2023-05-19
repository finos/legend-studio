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
  action,
  computed,
  flow,
  flowResult,
  makeObservable,
  observable,
} from 'mobx';
import type { FunctionEditorState } from './FunctionEditorState.js';
import {
  INTERNAL__UnknownFunctionActivator,
  type FunctionActivatorConfiguration,
  PackageableElementExplicitReference,
  buildPath,
  generateFunctionPrettyName,
} from '@finos/legend-graph';
import { ProtocolValueBuilderState } from './ProtocolValueBuilderState.js';
import {
  generateEnumerableNameFromToken,
  type GeneratorFn,
  type PlainObject,
} from '@finos/legend-shared';
import { INTERNAL__UnknownFunctionActivator_setContent } from '../../../graph-modifier/DomainGraphModifierHelper.js';

const BASE_ACTIVATOR_NAME = 'NewActivator';
export const FUNCTION_ACTIVATOR_EXCLUDED_PATHS = [
  'meta::protocols::pure::vX_X_X::metamodel::functionActivator::FunctionActivator.function',
  'meta::protocols::pure::vX_X_X::metamodel::domain::AnnotatedElement.stereotypes',
  'meta::protocols::pure::vX_X_X::metamodel::domain::AnnotatedElement.taggedValues',
  'meta::protocols::pure::vX_X_X::metamodel::domain::AnnotatedElement.sourceInformation',
  'meta::protocols::pure::vX_X_X::metamodel::PackageableElement.sourceInformation',
  'meta::protocols::pure::vX_X_X::metamodel::PackageableElement.package',
  'meta::protocols::pure::vX_X_X::metamodel::PackageableElement.name',
  'meta::protocols::pure::vX_X_X::metamodel::PackageableElement._type',
];

export class FunctionActivatorBuilderState {
  readonly functionEditorState: FunctionEditorState;

  currentActivatorConfiguration?: FunctionActivatorConfiguration | undefined;
  functionActivatorProtocolValueBuilderState?:
    | ProtocolValueBuilderState
    | undefined;
  activatorName = BASE_ACTIVATOR_NAME;
  functionActivator?: INTERNAL__UnknownFunctionActivator | undefined;

  constructor(functionEditorState: FunctionEditorState) {
    makeObservable(this, {
      currentActivatorConfiguration: observable,
      functionActivatorProtocolValueBuilderState: observable,
      functionActivator: observable,
      activatorName: observable,
      isDuplicated: computed,
      isValid: computed,
      setActivatorName: action,
      setCurrentActivatorConfiguration: action,
      activate: flow,
    });

    this.functionEditorState = functionEditorState;
  }

  get isDuplicated(): boolean {
    return Boolean(
      this.functionEditorState.editorStore.graphManagerState.graph.getNullableElement(
        buildPath(
          this.functionEditorState.functionElement.package?.path,
          this.activatorName,
        ),
      ),
    );
  }

  get isValid(): boolean {
    if (!this.functionActivator) {
      return false;
    }
    return this.activatorName.length !== 0 && !this.isDuplicated;
  }

  setActivatorName(val: string): void {
    this.activatorName = val;
    if (this.functionActivator) {
      this.functionActivator.name = val;
    }
  }

  setCurrentActivatorConfiguration(
    val: FunctionActivatorConfiguration | undefined,
  ): void {
    this.currentActivatorConfiguration = val;
    if (val) {
      this.functionActivatorProtocolValueBuilderState =
        new ProtocolValueBuilderState(val.configurationType, {
          graph: val.graph,
          initialValue: undefined,
          excludedPaths: FUNCTION_ACTIVATOR_EXCLUDED_PATHS,
          onValueChange: (value: PlainObject) => {
            if (this.functionActivator) {
              INTERNAL__UnknownFunctionActivator_setContent(
                this.functionActivator,
                value,
              );
            }
          },
          decorateValue: (value: PlainObject): PlainObject => {
            value._type = val.packageableElementJSONType;
            value.package =
              this.functionEditorState.functionElement.package?.path;
            value.name = this.activatorName;
            value.function = generateFunctionPrettyName(
              this.functionEditorState.functionElement,
              {
                fullPath: true,
                spacing: false,
              },
            ).replaceAll(' ', '');
            return value;
          },
        });
      this.activatorName = generateEnumerableNameFromToken(
        this.functionEditorState.functionElement.package?.children.map(
          (child) => child.name,
        ) ?? [],
        BASE_ACTIVATOR_NAME,
      );
      this.functionActivator = new INTERNAL__UnknownFunctionActivator(
        this.activatorName,
      );
      this.functionActivator.function =
        PackageableElementExplicitReference.create(
          this.functionEditorState.functionElement,
        );
      this.functionActivator.content =
        this.functionActivatorProtocolValueBuilderState.getValue();
    } else {
      this.functionActivatorProtocolValueBuilderState = undefined;
    }
  }

  *activate(): GeneratorFn<void> {
    if (!this.isValid || !this.functionActivator) {
      return;
    }

    try {
      yield flowResult(
        this.functionEditorState.editorStore.graphEditorMode.addElement(
          this.functionActivator,
          this.functionEditorState.functionElement.package?.path,
          true,
        ),
      );
    } catch {
      this.functionEditorState.editorStore.applicationStore.notificationService.notifyError(
        `Can't activate function`,
      );
    } finally {
      this.setCurrentActivatorConfiguration(undefined);
    }
  }
}
