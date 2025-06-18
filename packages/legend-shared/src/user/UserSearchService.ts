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

import { action, makeObservable, observable } from 'mobx';
import {
  AbstractPlugin,
  type AbstractPluginManager,
} from '../application/AbstractPluginManager.js';
import type { LegendUser } from './LegendUser.js';

export interface LegendUserPluginManager extends AbstractPluginManager {
  getUserPlugins(): LegendUserPlugin[];
  registerUserPlugin(plugin: LegendUserPlugin): void;
}

export abstract class LegendUserPlugin extends AbstractPlugin {
  /**
   * This helps to better type-check for this empty abtract type
   * See https://github.com/finos/legend-studio/blob/master/docs/technical/typescript-usage.md#understand-typescript-structual-type-system
   */
  private readonly _$nominalTypeBrand!: 'LegendUserPlugin';
  protected baseUrl?: string | undefined;

  install(pluginManager: LegendUserPluginManager): void {
    pluginManager.registerUserPlugin(this);
  }

  setup(baseUrl: string | undefined): void {
    this.baseUrl = baseUrl;
  }

  abstract executeSearch(searchTerm: string): Promise<LegendUser[]>;
}

export class UserSearchService {
  private plugins: LegendUserPlugin[] = [];
  readonly requestQueue = new Map<string, Promise<LegendUser[]>>();
  readonly userMap: Map<string, LegendUser | string> = new Map<
    string,
    LegendUser | string
  >();

  constructor() {
    makeObservable(this, {
      userMap: observable,
      setUser: action,
    });
  }

  registerPlugins(plugins: LegendUserPlugin[]): void {
    this.plugins = plugins;
  }

  async getOrFetchUser(
    userId: string,
  ): Promise<LegendUser | string | undefined> {
    if (this.userMap.has(userId)) {
      return this.userMap.get(userId)!;
    }

    if (!this.requestQueue.has(userId)) {
      this.requestQueue.set(userId, this.executeSearch(userId));
    }

    const users = await this.requestQueue.get(userId)!;
    this.requestQueue.delete(userId);
    const user = users.find((_user) => _user.id === userId);
    if (user) {
      this.userMap.set(userId, user);
      return user;
    } else {
      return undefined;
    }
  }

  setUser(userId: string, user: LegendUser | string): void {
    this.userMap.set(userId, user);
  }

  async executeSearch(searchTerm: string): Promise<LegendUser[]> {
    const results = await Promise.all(
      this.plugins.map(async (plugin) => plugin.executeSearch(searchTerm)),
    );
    return results.flat();
  }
}
