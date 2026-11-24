/**
 * Copyright (c) 2026-present, Goldman Sachs
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
  LogEvent,
  assertErrorThrown,
  assertNonEmptyString,
  assertTrue,
} from '@finos/legend-shared';
import type {
  LocalEngineRequest,
  LocalEngineResponse,
  LocalEngineRoute,
  LocalEngineRouter,
} from '@finos/legend-graph';
import type { LegendSourceInfo } from '@finos/legend-storage';
import type { LegendStudioApplicationStore } from '../LegendStudioBaseStore.js';
import type { LegendStudioApplicationPlugin } from '../LegendStudioApplicationPlugin.js';
import type { LegendStudioLocalEngine } from './LegendStudioLocalEngine.js';
import { LOCAL_ENGINE_MODE } from '../../application/LegendStudioApplicationConfig.js';
import { LEGEND_STUDIO_APP_EVENT } from '../../__lib__/LegendStudioEvent.js';
import { LEGEND_STUDIO_SETTING_KEY } from '../../__lib__/LegendStudioSetting.js';
import {
  LOCAL_ENGINE_CALL_OUTCOME,
  LOCAL_ENGINE_UNAVAILABLE_REASON,
  LegendStudioTelemetryHelper,
} from '../../__lib__/LegendStudioTelemetryHelper.js';

/**
 * The smallest WebAssembly module that declares a GC struct type: a browser
 * validates it only if it supports WebAssembly GC
 */
const WEBASSEMBLY_GC_PROBE = new Uint8Array([
  0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 95, 1, 120, 0,
]);

export const supportsWebAssemblyGC = (): boolean => {
  try {
    return (
      typeof WebAssembly === 'object' &&
      WebAssembly.validate(WEBASSEMBLY_GC_PROBE)
    );
  } catch {
    return false;
  }
};

/**
 * The local engines the plugins provide, refusing an empty or a duplicate key
 */
export const collectLocalEngines = (
  plugins: LegendStudioApplicationPlugin[],
): LegendStudioLocalEngine[] => {
  const engines = plugins.flatMap(
    (plugin) => plugin.getExtraLocalEngines?.() ?? [],
  );
  const keys = new Set<string>();
  engines.forEach((engine) => {
    assertNonEmptyString(
      engine.key,
      `Can't register local engine: its key is empty`,
    );
    assertTrue(
      !keys.has(engine.key),
      `Can't register local engine: more than one local engine has key '${engine.key}'`,
    );
    keys.add(engine.key);
  });
  return engines;
};

export interface LegendStudioLocalEngineRouterOptions {
  /**
   * Where in Studio the calls are made, for telemetry
   */
  getSourceInfo?: (() => LegendSourceInfo | undefined) | undefined;
  /**
   * Overrides the browser's WebAssembly GC check, for tests
   */
  supportsWebAssemblyGC?: (() => boolean) | undefined;
}

/**
 * Routes the calls of one session, i.e. one editor, to a local engine.
 *
 * A call goes local when:
 * - the configuration lists it and the local engine supports it,
 * - the Dev Tool panel has not turned local mode off in this browser,
 * - the session has not left local mode after a refusal,
 * - and the local engine is available: checked once, before the first call.
 */
export class LegendStudioLocalEngineRouter implements LocalEngineRouter {
  readonly applicationStore: LegendStudioApplicationStore;
  readonly engine: LegendStudioLocalEngine;
  readonly routes: ReadonlySet<LocalEngineRoute>;
  private readonly getSourceInfo: () => LegendSourceInfo | undefined;
  private readonly supportsWebAssemblyGC: () => boolean;
  private availability?: Promise<boolean> | undefined;

  /**
   * Set by the Dev Tool panel, and remembered in this browser
   */
  isTurnedOffInThisBrowser: boolean;
  /**
   * Set after the local engine refuses a call: the rest of the session uses
   * the engine server
   */
  hasLeftLocalMode = false;

  constructor(
    applicationStore: LegendStudioApplicationStore,
    engine: LegendStudioLocalEngine,
    routes: LocalEngineRoute[],
    options?: LegendStudioLocalEngineRouterOptions,
  ) {
    makeObservable(this, {
      isTurnedOffInThisBrowser: observable,
      hasLeftLocalMode: observable,
      setTurnedOffInThisBrowser: action,
      leaveLocalMode: action,
    });
    this.applicationStore = applicationStore;
    this.engine = engine;
    this.routes = new Set(routes);
    this.getSourceInfo = options?.getSourceInfo ?? (() => undefined);
    this.supportsWebAssemblyGC =
      options?.supportsWebAssemblyGC ?? supportsWebAssemblyGC;
    this.isTurnedOffInThisBrowser = Boolean(
      applicationStore.settingService.getBooleanValue(
        LEGEND_STUDIO_SETTING_KEY.ENGINE_LOCAL_ENGINE_OFF,
      ),
    );
  }

  /**
   * The router for a session, or `undefined` when no call can go local: local
   * mode is off in the configuration, no plugin provides the local engine, or
   * none of the listed calls is one it supports.
   */
  static create(
    applicationStore: LegendStudioApplicationStore,
    options?: LegendStudioLocalEngineRouterOptions,
  ): LegendStudioLocalEngineRouter | undefined {
    const config = applicationStore.config;
    if (config.localEngineMode !== LOCAL_ENGINE_MODE.ON) {
      return undefined;
    }
    const engines = collectLocalEngines(
      applicationStore.pluginManager.getApplicationPlugins(),
    );
    const engine = config.localEngineKey
      ? engines.find((candidate) => candidate.key === config.localEngineKey)
      : engines.length === 1
        ? engines[0]
        : undefined;
    if (!engine) {
      applicationStore.logService.warn(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.LOCAL_ENGINE_UNAVAILABLE),
        config.localEngineKey
          ? `Local mode is on, but no plugin provides local engine '${config.localEngineKey}': using the engine server`
          : `Local mode is on, but plugins provide ${engines.length} local engines and the configuration names none: using the engine server`,
      );
      return undefined;
    }
    const routes = config.localEngineRoutes.filter((route) =>
      engine.supportedRoutes.includes(route),
    );
    if (!routes.length) {
      return undefined;
    }
    return new LegendStudioLocalEngineRouter(
      applicationStore,
      engine,
      routes,
      options,
    );
  }

  setTurnedOffInThisBrowser(val: boolean): void {
    this.isTurnedOffInThisBrowser = val;
    this.applicationStore.settingService.persistValue(
      LEGEND_STUDIO_SETTING_KEY.ENGINE_LOCAL_ENGINE_OFF,
      val,
    );
  }

  leaveLocalMode(): void {
    if (this.hasLeftLocalMode) {
      return;
    }
    this.hasLeftLocalMode = true;
    this.applicationStore.notificationService.notifyWarning(
      `${this.engine.label} can't answer a call Studio made: Studio uses the engine server for the rest of this session`,
    );
  }

  isLocalRoute(route: LocalEngineRoute): boolean {
    return (
      this.routes.has(route) &&
      !this.isTurnedOffInThisBrowser &&
      !this.hasLeftLocalMode
    );
  }

  private isAvailable(): Promise<boolean> {
    this.availability ??= this.checkAvailability();
    return this.availability;
  }

  private async checkAvailability(): Promise<boolean> {
    let reason: LOCAL_ENGINE_UNAVAILABLE_REASON | undefined;
    if (!this.supportsWebAssemblyGC()) {
      reason = LOCAL_ENGINE_UNAVAILABLE_REASON.NO_WEBASSEMBLY_GC;
    } else {
      try {
        if (this.engine.isAvailable && !(await this.engine.isAvailable())) {
          reason = LOCAL_ENGINE_UNAVAILABLE_REASON.ENGINE_UNAVAILABLE;
        }
      } catch (error) {
        assertErrorThrown(error);
        reason = LOCAL_ENGINE_UNAVAILABLE_REASON.ENGINE_UNAVAILABLE;
      }
    }
    if (reason) {
      this.applicationStore.logService.warn(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.LOCAL_ENGINE_UNAVAILABLE),
        `${this.engine.label} is not available in this browser (${reason}): using the engine server`,
      );
      LegendStudioTelemetryHelper.logEvent_LocalEngineUnavailable(
        this.applicationStore.telemetryService,
        {
          sourceInfo: this.getSourceInfo(),
          engineKey: this.engine.key,
          reason,
        },
      );
      return false;
    }
    return true;
  }

  private logCall(
    route: LocalEngineRoute,
    startTime: number,
    outcome: LOCAL_ENGINE_CALL_OUTCOME,
    status: number | undefined,
  ): void {
    LegendStudioTelemetryHelper.logEvent_LocalEngineCall(
      this.applicationStore.telemetryService,
      {
        sourceInfo: this.getSourceInfo(),
        route,
        engineKey: this.engine.key,
        durationMs: Date.now() - startTime,
        outcome,
        status,
      },
    );
  }

  async answer(
    route: LocalEngineRoute,
    request: LocalEngineRequest,
  ): Promise<LocalEngineResponse | undefined> {
    if (!(await this.isAvailable())) {
      return undefined;
    }
    const startTime = Date.now();
    let response: LocalEngineResponse;
    try {
      response = await this.engine.answer(route, request);
    } catch (error) {
      // NOTE: a thrown error is not a refusal: it is shown as it is, and the
      // call is not rerun on the engine server
      this.logCall(
        route,
        startTime,
        LOCAL_ENGINE_CALL_OUTCOME.FAILED,
        undefined,
      );
      throw error;
    }
    if (this.engine.isRefusal?.(response)) {
      this.logCall(
        route,
        startTime,
        LOCAL_ENGINE_CALL_OUTCOME.REFUSED,
        response.status,
      );
      this.leaveLocalMode();
      return undefined;
    }
    this.logCall(
      route,
      startTime,
      response.status >= 200 && response.status < 300
        ? LOCAL_ENGINE_CALL_OUTCOME.SUCCEEDED
        : LOCAL_ENGINE_CALL_OUTCOME.FAILED,
      response.status,
    );
    return response;
  }
}
