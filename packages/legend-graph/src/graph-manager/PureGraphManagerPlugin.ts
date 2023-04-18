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

import { AbstractPlugin } from '@finos/legend-shared';
import type { GraphManagerPluginManager } from './GraphManagerPluginManager.js';
import type { PackageableElement } from '../graph/metamodel/pure/packageableElements/PackageableElement.js';
import type {
  AbstractPureGraphManager,
  AbstractPureGraphManagerExtension,
} from './AbstractPureGraphManager.js';
import type { ObserverContext } from './action/changeDetection/CoreObserverHelper.js';

export type PureGraphManagerExtensionBuilder = (
  graphManager: AbstractPureGraphManager,
) => AbstractPureGraphManagerExtension;

export type ElementObserver = (
  metamodel: PackageableElement,
  context: ObserverContext,
) => PackageableElement | undefined;

/**
 * Unlike `PureGraphPlugin`, this is for plugins of graph manager, i.e. operations acting
 * on the graph instead of within the graph. As such processes involving grammar, compilation,
 * generation,etc. should be placed here.
 */
export abstract class PureGraphManagerPlugin extends AbstractPlugin {
  /**
   * This helps to better type-check for this empty abtract type
   * See https://github.com/finos/legend-studio/blob/master/docs/technical/typescript-usage.md#understand-typescript-structual-type-system
   */
  private readonly _$nominalTypeBrand!: 'PureGraphManagerPlugin';

  install(pluginManager: GraphManagerPluginManager): void {
    pluginManager.registerPureGraphManagerPlugin(this);
  }

  getExtraPureGraphManagerExtensionBuilders?(): PureGraphManagerExtensionBuilder[];

  /**
   * Get the list of system element qualified paths to be exposed for common usages.
   *
   * Many system elements are included when building the graph, but only a few should
   * be presented in the form view to user as selection options. This method will
   * provide the allowed list of system element paths that we want the users to be
   * able to see directly in selection/dropdown menus.
   */
  getExtraExposedSystemElementPath?(): string[];

  /**
   * Get the list of observers for packageable element. These observer will make the element
   * become observable by change detection engine.
   */
  getExtraElementObservers?(): ElementObserver[];
}
