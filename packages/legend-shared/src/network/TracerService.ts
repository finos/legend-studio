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
  AbstractPlugin,
  type AbstractPluginManager,
} from '../application/AbstractPluginManager.js';
import type { PlainObject } from '../CommonUtils.js';

export interface TraceData {
  name: string;
  tags?: PlainObject;
}

export enum CORE_TRACER_TAG {
  USER = 'user',
  ENV = 'env',
  RESULT = 'result',
  ERROR = 'error',
  HTTP_STATUS = 'status',
  HTTP_REQUEST_METHOD = 'method',
  HTTP_REQUEST_URL = 'url',
}
export interface TracerServicePluginManager extends AbstractPluginManager {
  getTracerServicePlugins(): TracerServicePlugin<unknown>[];
  registerTracerServicePlugin(plugin: TracerServicePlugin<unknown>): void;
}

export interface TracerServicePluginInfo {
  serviceName: string;
  url: string;
}

export abstract class TracerServicePlugin<T> extends AbstractPlugin {
  install(pluginManager: TracerServicePluginManager): void {
    pluginManager.registerTracerServicePlugin(this);
  }

  abstract bootstrap(clientSpan: T | undefined, response: Response): void;
  abstract createClientSpan(
    traceData: TraceData,
    method: string,
    url: string,
    headers: PlainObject,
  ): T;
  abstract concludeClientSpan(
    clientSpan: T | undefined,
    error: Error | undefined,
  ): void;
}

interface TraceEntry<T> {
  clientSpan: T;
  plugin: TracerServicePlugin<T>;
}

export class Trace {
  traceEntries: TraceEntry<unknown>[] = [];

  setup(traceEntries: TraceEntry<unknown>[]): void {
    this.traceEntries = traceEntries;
  }

  bootstrap(response: Response): void {
    this.traceEntries.forEach((entry) => {
      entry.plugin.bootstrap(entry.clientSpan, response);
    });
  }

  reportSuccess(): void {
    this.traceEntries.forEach((entry) => {
      entry.plugin.concludeClientSpan(entry.clientSpan, undefined);
    });
  }

  reportError(error: Error): void {
    this.traceEntries.forEach((entry) => {
      entry.plugin.concludeClientSpan(entry.clientSpan, error);
    });
  }
}

export class TracerService {
  private plugins: TracerServicePlugin<unknown>[] = [];

  registerPlugins(plugins: TracerServicePlugin<unknown>[]): void {
    this.plugins = plugins;
  }

  createTrace(
    traceData: TraceData | undefined,
    method: string,
    url: string,
    headers: PlainObject,
  ): Trace {
    const trace = new Trace();
    if (traceData) {
      trace.setup(
        this.plugins.map((plugin) => {
          const clientSpan = plugin.createClientSpan(
            traceData,
            method,
            url,
            headers,
          );
          return {
            clientSpan,
            plugin,
          };
        }),
      );
    }
    return trace;
  }
}
