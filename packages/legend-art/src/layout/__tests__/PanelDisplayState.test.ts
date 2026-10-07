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

import { describe, test, expect } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import { PanelDisplayState } from '../PanelDisplayState.js';

const buildState = (snap?: number): PanelDisplayState =>
  new PanelDisplayState({ initial: 300, default: 300, snap });

describe('PanelDisplayState', () => {
  describe(unitTest('construction'), () => {
    test(unitTest('seeds size, default size and snap size'), () => {
      const state = new PanelDisplayState({
        initial: 100,
        default: 300,
        snap: 50,
      });
      expect(state.size).toBe(100);
      expect(state.defaultSize).toBe(300);
      expect(state.snapSize).toBe(50);
      expect(state.maxSize).toBeUndefined();
    });

    test(unitTest('starts closed when the initial size is zero'), () => {
      const state = new PanelDisplayState({
        initial: 0,
        default: 300,
        snap: undefined,
      });
      expect(state.isOpen).toBe(false);
    });
  });

  describe(unitTest('setSize without a snap size'), () => {
    test(unitTest('assigns the value verbatim'), () => {
      const state = buildState();
      state.setSize(123);
      expect(state.size).toBe(123);
    });

    test(unitTest('clamps negative values to zero'), () => {
      const state = buildState();
      state.setSize(-50);
      expect(state.size).toBe(0);
      expect(state.isOpen).toBe(false);
    });

    test(unitTest('clamps to the max size'), () => {
      const state = buildState();
      state.setMaxSize(500);
      state.setSize(900);
      expect(state.size).toBe(500);
    });

    test(unitTest('does not clamp against a max size of zero'), () => {
      const state = buildState();
      // NOTE: the clamp is guarded by a truthiness check rather than an
      // `undefined` check, so a max size of 0 is skipped entirely
      state.setMaxSize(0);
      state.setSize(900);
      expect(state.size).toBe(900);
    });
  });

  describe(unitTest('setSize with a snap size'), () => {
    test(
      unitTest('snaps up to the default size when expanding below the snap'),
      () => {
        const state = new PanelDisplayState({
          initial: 0,
          default: 300,
          snap: 100,
        });
        state.setSize(40);
        expect(state.size).toBe(300);
      },
    );

    test(unitTest('expands verbatim at or above the snap size'), () => {
      const state = new PanelDisplayState({
        initial: 0,
        default: 300,
        snap: 100,
      });
      state.setSize(150);
      expect(state.size).toBe(150);
    });

    test(
      unitTest('snaps down to collapsed when shrinking below the snap'),
      () => {
        const state = buildState(100);
        state.setSize(40);
        expect(state.size).toBe(0);
        expect(state.isOpen).toBe(false);
      },
    );

    test(unitTest('shrinks verbatim at or above the snap size'), () => {
      const state = buildState(100);
      state.setSize(150);
      expect(state.size).toBe(150);
    });

    test(
      unitTest('snaps to the max size when expanding into the snap band'),
      () => {
        const state = new PanelDisplayState({
          initial: 100,
          default: 300,
          snap: 50,
        });
        state.setMaxSize(500);
        // 470 > 500 - 50, so it jumps the rest of the way
        state.setSize(470);
        expect(state.size).toBe(500);
        expect(state.isMaximized).toBe(true);
      },
    );

    test(unitTest('does nothing when the size is unchanged'), () => {
      const state = buildState(100);
      state.setSize(300);
      // the early return means the snap logic never runs, so the value stays
      // put rather than being re-evaluated
      expect(state.size).toBe(300);
    });
  });

  describe(unitTest('open, close and toggle'), () => {
    test(unitTest('close stashes the current size and reopens to it'), () => {
      const state = buildState();
      state.setSize(250);
      state.close();
      expect(state.size).toBe(0);
      expect(state.isOpen).toBe(false);

      state.open();
      expect(state.size).toBe(250);
    });

    test(
      unitTest('close falls back to the default size when already collapsed'),
      () => {
        const state = new PanelDisplayState({
          initial: 0,
          default: 300,
          snap: undefined,
        });
        // size is already 0, so `close` is a no-op and the stashed size stays
        // at the default
        state.close();
        state.open();
        expect(state.size).toBe(300);
      },
    );

    test(unitTest('open is a no-op when already open'), () => {
      const state = buildState();
      state.setSize(250);
      state.open();
      expect(state.size).toBe(250);
    });

    test(unitTest('toggle flips between open and closed'), () => {
      const state = buildState();
      expect(state.isOpen).toBe(true);
      state.toggle();
      expect(state.isOpen).toBe(false);
      state.toggle();
      expect(state.isOpen).toBe(true);
      expect(state.size).toBe(300);
    });
  });

  describe(unitTest('setMaxSize'), () => {
    test(unitTest('clamps the current size down'), () => {
      const state = buildState();
      state.setMaxSize(200);
      expect(state.size).toBe(200);
      expect(state.maxSize).toBe(200);
      expect(state.defaultSize).toBe(200);
    });

    test(
      unitTest('recomputes the default size from the initial default'),
      () => {
        const state = buildState();
        state.setMaxSize(100);
        expect(state.defaultSize).toBe(100);

        // the original default is kept immutably, so growing the max size
        // restores it rather than leaving it stuck at 100
        state.setMaxSize(1000);
        expect(state.defaultSize).toBe(300);
      },
    );

    test(unitTest('makes the panel maximizable'), () => {
      const state = buildState();
      expect(state.isMaximizable).toBe(false);
      state.setMaxSize(500);
      expect(state.isMaximizable).toBe(true);
    });
  });

  describe(unitTest('maximize and minimize'), () => {
    test(unitTest('are no-ops while no max size is set'), () => {
      const state = buildState();
      state.maximize();
      expect(state.size).toBe(300);
      state.minimize();
      expect(state.size).toBe(300);
      state.toggleMaximize();
      expect(state.size).toBe(300);
    });

    test(unitTest('maximize stashes the size and restores it'), () => {
      const state = buildState();
      state.setMaxSize(500);
      state.setSize(200);

      state.maximize();
      expect(state.size).toBe(500);
      expect(state.isMaximized).toBe(true);

      state.minimize();
      expect(state.size).toBe(200);
      expect(state.isMaximized).toBe(false);
    });

    test(unitTest('maximize is a no-op when already maximized'), () => {
      const state = buildState();
      state.setMaxSize(500);
      state.setSize(200);
      state.maximize();
      // a second maximize must not overwrite the stashed size with the max
      // size, otherwise minimize would have nothing to restore to
      state.maximize();
      state.minimize();
      expect(state.size).toBe(200);
    });

    test(
      unitTest('minimize falls back to the default when stuck maximized'),
      () => {
        const state = new PanelDisplayState({
          initial: 400,
          default: 300,
          snap: undefined,
        });
        state.setMaxSize(500);
        state.setSize(500);
        // closing while maximized stashes the max size, so after reopening
        // both the current and the stashed size are the max size
        state.close();
        state.open();
        expect(state.size).toBe(500);
        expect(state.isMaximized).toBe(true);

        // minimize therefore has to fall back to the default size -- restoring
        // the stashed size would leave the panel stuck maximized
        state.minimize();
        expect(state.size).toBe(300);
        expect(state.isMaximized).toBe(false);
      },
    );

    test(unitTest('minimize is a no-op when not maximized'), () => {
      const state = buildState();
      state.setMaxSize(500);
      state.setSize(200);
      state.minimize();
      expect(state.size).toBe(200);
    });

    test(unitTest('toggleMaximize flips between the two'), () => {
      const state = buildState();
      state.setMaxSize(500);
      state.setSize(200);

      state.toggleMaximize();
      expect(state.size).toBe(500);
      state.toggleMaximize();
      expect(state.size).toBe(200);
    });
  });
});
