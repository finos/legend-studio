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

import { AbstractPlugin, type Clazz } from '@finos/legend-shared';
import type { PackageableElement } from '../graph/metamodel/pure/packageableElements/PackageableElement.js';
import type { PureModel } from './PureModel.js';
import type { GraphPluginManager } from './GraphPluginManager.js';
import type { Testable } from '../graph/metamodel/pure/test/Testable.js';

export type DeadReferencesCleaner = (graph: PureModel) => void;
export type TestableElementFilter = (
  element: PackageableElement,
) => Testable | undefined;

/**
 * Plugins for Pure graph (aka `PureModel`). These plugins concern the operations of the graph alone and
 * should not refer to anything but the graph itself as it would be embedded as part of the graph.
 * For example: if a plugin has to do with grammar, compilation, generation, etc., probably it should not be
 * placed in this class.
 */
export abstract class PureGraphPlugin extends AbstractPlugin {
  /**
   * This helps to better type-check for this empty abtract type
   * See https://github.com/finos/legend-studio/blob/master/docs/technical/typescript-usage.md#understand-typescript-structual-type-system
   */
  private readonly _$nominalTypeBrand!: 'PureGraphPlugin';

  install(pluginManager: GraphPluginManager): void {
    pluginManager.registerPureGraphPlugin(this);
  }

  /**
   * Get the list of supported packageable element classes.
   * This will be used to create extensions to the graph.
   */
  getExtraPureGraphExtensionClasses?(): Clazz<PackageableElement>[];

  /**
   * Get the list of procedures to be done to cleanup dead references in the graph.
   */
  getExtraDeadReferencesCleaners?(): DeadReferencesCleaner[];

  /**
   * Get the list of collectors for testable items
   */
  getExtraTestablesCollectors?(): TestableElementFilter[];
}
