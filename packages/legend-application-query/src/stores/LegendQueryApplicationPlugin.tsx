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

import { LegendApplicationPlugin } from '@finos/legend-application';
import type {
  QueryBuilder_LegendApplicationPlugin_Extension,
  QueryBuilderState,
} from '@finos/legend-query-builder';
import type { GeneratorFn } from '@finos/legend-shared';
import type React from 'react';
import type { LegendQueryPluginManager } from '../application/LegendQueryPluginManager.js';
import type {
  ExistingQueryEditorStore,
  QueryEditorStore,
} from './QueryEditorStore.js';
import type { QuerySetupLandingPageStore } from './QuerySetupStore.js';
import type { Query } from '@finos/legend-graph';

export enum QuerySetupActionTag {
  PRODUCTIONIZATION = 'Productionization',
}

export type QuerySetupActionConfiguration = {
  key: string;
  isCreateAction: boolean;
  isAdvanced: boolean;
  /**
   * NOTE: we could potentially support multiple tags, but for simplicity
   * we will only limit this to one
   *
   * If no tag is provided, the action will be classified into the default group
   */
  tag?: string;
  // NOTE: we could have an advanced option for rendering, i.e. specifying the
  // component for the button, this gives a lot of flexibility and could facilitate
  // powerful interaction like click to open modal dialog, etc., but this allows
  // too much customization, so we will not have that for now
  //
  label: string;
  icon: React.ReactNode;
  className?: string | undefined;
  action: (setupStore: QuerySetupLandingPageStore) => Promise<void>;
};

export type ExistingQueryEditorStateBuilder = (
  query: Query,
  editorStore: ExistingQueryEditorStore,
) => Promise<QueryBuilderState | undefined>;

export type NewQueryNavigationPath = (
  query: Query,
  editorStore: ExistingQueryEditorStore,
) => string | undefined;

export type QueryGraphBuilderGetter = (
  editorStore: QueryEditorStore,
) => ((editorStore: QueryEditorStore) => GeneratorFn<void>) | undefined;

export type QueryEditorActionConfiguration = {
  key: string;
  renderer: (
    editorStore: QueryEditorStore,
    queryBuilderState: QueryBuilderState,
  ) => React.ReactNode | undefined;
};

export type QueryEditorHelpMenuActionConfiguration = {
  key: string;
  title?: string;
  label: string;
  onClick: (editorStore: QueryEditorStore) => void;
  icon?: React.ReactNode;
};

export class LegendQueryApplicationPlugin
  extends LegendApplicationPlugin
  implements QueryBuilder_LegendApplicationPlugin_Extension
{
  /**
   * This helps to better type-check for this empty abtract type
   * See https://github.com/finos/legend-studio/blob/master/docs/technical/typescript-usage.md#understand-typescript-structual-type-system
   */
  private readonly _$nominalTypeBrand!: 'LegendQueryApplicationPlugin';

  install(pluginManager: LegendQueryPluginManager): void {
    pluginManager.registerApplicationPlugin(this);
  }

  /**
   * Get the list of actions (configurations) for query setup.
   */
  getExtraQuerySetupActionConfigurations?(): QuerySetupActionConfiguration[];

  /**
   * Get the list of query graph builders
   */
  getExtraQueryGraphBuilderGetters?(): QueryGraphBuilderGetter[];
}
