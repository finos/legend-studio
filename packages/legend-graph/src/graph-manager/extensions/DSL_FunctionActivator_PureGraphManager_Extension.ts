import type { PostDeploymentProperties } from '../../graph/metamodel/pure/functionActivator/PostDeploymentProperties.js';
import type { PureGraphManagerPlugin } from '../PureGraphManagerPlugin.js';

export type FunctionActivatorObserver = (
  postDeploymentProperties: PostDeploymentProperties,
) => PostDeploymentProperties | undefined;

export interface DSL_FunctionActivator_PureGraphManager_Extension
  extends PureGraphManagerPlugin {
  getExtraFunctionActivatorPostDeploymentPropertiesObservers?(): FunctionActivatorObserver[];
}