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
  type FunctionActivator,
  PackageableElementExplicitReference,
  SnowflakeApp,
  extractElementNameFromPath,
  extractPackagePathFromPath,
  SnowflakeAppDeploymentConfiguration,
  DeploymentOwner,
  HostedService,
  MemSQLFunction,
  MemSQLDeploymentConfiguration,
} from '@finos/legend-graph';
import { uuid, type GeneratorFn } from '@finos/legend-shared';
import { FUNCTION_ACTIVATE_TYPE } from '../../../../components/editor/editor-group/function-activator/FunctionEditor.js';

const BASE_ACTIVATOR_NAME = 'NewActivator';

export class FunctionActivatorState {
  readonly functionEditorState: FunctionEditorState;

  activatorPath: string;
  isActivatingFunction = false;
  isFunctionActivatorEditorOpen = false;
  activateType: string | undefined;

  constructor(functionEditorState: FunctionEditorState) {
    makeObservable(this, {
      activatorPath: observable,
      isActivatingFunction: observable,
      isFunctionActivatorEditorOpen: observable,
      activateType: observable,
      setAcitvateType: action,
      updateActivatorPath: action,
      setIsActivatingFunction: action,
      setIsFunctionActivatorEditorOpen: action,
      activate: flow,
    });

    this.functionEditorState = functionEditorState;
    this.activateType = FUNCTION_ACTIVATE_TYPE.SNOWFLAKE_NATIVE_APP;
    this.activatorPath = `${this.functionEditorState.functionElement.package?.path}::${BASE_ACTIVATOR_NAME}`;
  }

  setIsActivatingFunction(val: boolean): void {
    this.isActivatingFunction = val;
  }

  setIsFunctionActivatorEditorOpen(val: boolean): void {
    this.isFunctionActivatorEditorOpen = val;
  }

  setAcitvateType(val: string | undefined): void {
    this.activateType = val;
  }

  showFunctionActivateModal(): void {
    this.setIsActivatingFunction(true);
  }

  closeFunctionActivateModal(): void {
    this.setIsActivatingFunction(false);
  }

  updateActivatorPath(val: string): void {
    this.activatorPath = val;
  }

  createFunctionActivator(
    functionElement: ConcreteFunctionDefinition,
  ): FunctionActivator | undefined {
    const type = this.activateType;
    switch (type) {
      case FUNCTION_ACTIVATE_TYPE.SNOWFLAKE_NATIVE_APP: {
        const activatorName = this.activatorPath.includes('::')
          ? extractElementNameFromPath(this.activatorPath)
          : this.activatorPath;
        const snowflakeApp = new SnowflakeApp(activatorName);
        snowflakeApp.applicationName = '';
        snowflakeApp.description = '';
        snowflakeApp.ownership = new DeploymentOwner('', snowflakeApp);
        snowflakeApp.function =
          PackageableElementExplicitReference.create(functionElement);
        snowflakeApp.activationConfiguration =
          new SnowflakeAppDeploymentConfiguration();
        return snowflakeApp;
      }
      case FUNCTION_ACTIVATE_TYPE.HOSTED_SERVICE: {
        const activatorName = this.activatorPath.includes('::')
          ? extractElementNameFromPath(this.activatorPath)
          : this.activatorPath;
        const hostedService = new HostedService(activatorName);
        hostedService.documentation = '';
        hostedService.ownership = new DeploymentOwner('', hostedService);
        hostedService.pattern = `/${uuid()}`;
        hostedService.autoActivateUpdates = true;
        hostedService.storeModel = false;
        hostedService.generateLineage = false;
        hostedService.function =
          PackageableElementExplicitReference.create(functionElement);
        return hostedService;
      }
      case FUNCTION_ACTIVATE_TYPE.MEM_SQL_FUNCTION: {
        const activatorName = this.activatorPath.includes('::')
          ? extractElementNameFromPath(this.activatorPath)
          : this.activatorPath;
        const memSQLFun = new MemSQLFunction(activatorName);
        memSQLFun.functionName = '';
        memSQLFun.description = '';
        memSQLFun.ownership = new DeploymentOwner('', memSQLFun);
        memSQLFun.function =
          PackageableElementExplicitReference.create(functionElement);
        memSQLFun.activationConfiguration = new MemSQLDeploymentConfiguration();
        return memSQLFun;
      }
      default:
        return undefined;
    }
  }

  *activate(functionElement: ConcreteFunctionDefinition): GeneratorFn<void> {
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
        `Can't activate function`,
      );
    } finally {
      this.setAcitvateType(FUNCTION_ACTIVATE_TYPE.SNOWFLAKE_NATIVE_APP);
    }
  }
}
