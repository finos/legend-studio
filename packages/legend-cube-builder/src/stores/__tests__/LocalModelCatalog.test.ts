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

import { describe, expect, jest, test } from '@jest/globals';
import type { ModelContext } from '@finos/legend-cube';
import type {
  CubeEngine,
  CubeModelOutline,
} from '../../graph-manager/CubeEngine.js';
import { CUBE_NORTHWIND_MODEL_CODE } from '../fixtures/CubeNorthwindModel.js';
import {
  BUNDLED_MODELS,
  createTextModel,
  LocalModelCatalog,
} from '../LocalModelCatalog.js';

const OUTLINE: CubeModelOutline = { databases: [], runtimes: [] };

/** An engine whose only method is `loadModel`, as given */
const engineWith = (
  loadModel: (model: ModelContext) => Promise<CubeModelOutline>,
): CubeEngine => ({ loadModel }) as unknown as CubeEngine;

describe('Local model catalog', () => {
  test('Offers the Cube Northwind fixture first, then the samples, as Pure text, the model a cube saves', () => {
    expect(BUNDLED_MODELS.map((entry) => entry.label)).toEqual([
      'Northwind (Cube fixture)',
      'Sports (sample)',
      'Trades (sample)',
    ]);
    expect(BUNDLED_MODELS[0]?.model).toEqual({
      _type: 'text',
      code: CUBE_NORTHWIND_MODEL_CODE,
    });
  });

  test('Makes pasted Pure text a frozen text model', () => {
    const model = createTextModel('###Pure\nClass a::B {}');
    expect(model).toEqual({ _type: 'text', code: '###Pure\nClass a::B {}' });
    expect(Object.isFrozen(model)).toBe(true);
  });

  test("Loads each model's outline once", async () => {
    const loadModel = jest.fn(async () => OUTLINE);
    const catalog = new LocalModelCatalog(engineWith(loadModel));
    const model = createTextModel('###Pure');
    expect(await catalog.loadOutline(model)).toBe(OUTLINE);
    expect(await catalog.loadOutline(createTextModel('###Pure'))).toBe(OUTLINE);
    expect(loadModel).toHaveBeenCalledTimes(1);
    await catalog.loadOutline(createTextModel('###Pure\n'));
    expect(loadModel).toHaveBeenCalledTimes(2);
  });

  test('Loads a model again after a failed load', async () => {
    const loadModel = jest
      .fn<(model: ModelContext) => Promise<CubeModelOutline>>()
      .mockRejectedValueOnce(new Error('engine down'))
      .mockResolvedValueOnce(OUTLINE);
    const catalog = new LocalModelCatalog(engineWith(loadModel));
    const model = createTextModel('###Pure');
    await expect(catalog.loadOutline(model)).rejects.toThrow('engine down');
    expect(await catalog.loadOutline(model)).toBe(OUTLINE);
  });
});
