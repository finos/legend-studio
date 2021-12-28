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
  type PluginConsumer,
} from '../application/AbstractPluginManager';

export interface TraceData {
  spanName: string;
  tags?: Record<PropertyKey, unknown>;
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
  abstract createClientSpan(traceData: TraceData): T;
  abstract createServerSpan(
    clientSpan: T,
    method: string,
    url: string,
    headers: Record<PropertyKey, unknown>,
  ): T;
  abstract concludeClientSpan(
    clientSpan: T | undefined,
    error: Error | undefined,
  ): void;
  abstract concludeServerSpan(serverSpan: T | undefined): void;
}

interface TraceEntry<T> {
  clientSpan: T;
  serverSpan: T;
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

  close(): void {
    this.traceEntries.forEach((entry) => {
      entry.plugin.concludeServerSpan(entry.serverSpan);
    });
  }
}

export class TracerService implements PluginConsumer {
  private plugins: TracerServicePlugin<unknown>[] = [];

  registerPlugins(plugins: TracerServicePlugin<unknown>[]): void {
    this.plugins = plugins;
  }

  createTrace(
    traceData: TraceData | undefined,
    method: string,
    url: string,
    headers: Record<PropertyKey, unknown>,
  ): Trace {
    const trace = new Trace();
    if (traceData) {
      trace.setup(
        this.plugins.map((plugin) => {
          const clientSpan = plugin.createClientSpan(traceData);
          const serverSpan = plugin.createServerSpan(
            clientSpan,
            method,
            url,
            headers,
          );
          return {
            clientSpan,
            serverSpan,
            plugin,
          };
        }),
      );
    }
    return trace;
  }
}
