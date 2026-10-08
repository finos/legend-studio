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

import type { ModelContext } from '@finos/legend-cube';
import type {
  CubeEngine,
  CubeModelOutline,
} from '../graph-manager/CubeEngine.js';
import { CUBE_NORTHWIND_MODEL } from './fixtures/CubeNorthwindModel.js';

// The models of the slice (PLAN §6.2.3): Pure text bundled with Cube, or
// pasted by the user. Picking one gives the model context the cube saves, the
// text itself (§6.2.2), so a saved cube needs no catalog to open.

export interface BundledModel {
  readonly id: string;
  readonly label: string;
  readonly model: ModelContext;
}

export const BUNDLED_MODELS: readonly BundledModel[] = Object.freeze([
  {
    id: 'cube-northwind',
    label: 'Northwind (Cube fixture)',
    model: CUBE_NORTHWIND_MODEL,
  },
]);

/** The model context of pasted Pure text */
export const createTextModel = (code: string): ModelContext =>
  Object.freeze({ _type: 'text', code });

/**
 * Loads the outlines of models through the engine port, each model's once:
 * the picker asks again whenever it opens
 */
export class LocalModelCatalog {
  readonly models = BUNDLED_MODELS;
  private readonly engine: CubeEngine;
  private readonly outlines = new Map<string, Promise<CubeModelOutline>>();

  constructor(engine: CubeEngine) {
    this.engine = engine;
  }

  loadOutline(model: ModelContext): Promise<CubeModelOutline> {
    const key = JSON.stringify(model);
    let outline = this.outlines.get(key);
    if (!outline) {
      outline = this.engine.loadModel(model);
      // a failed load is tried again next time
      outline.catch(() => this.outlines.delete(key));
      this.outlines.set(key, outline);
    }
    return outline;
  }
}
