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

import { describe, test, expect, jest } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import {
  getCollapsiblePanelGroupProps,
  type ResizablePanelHandlerProps,
} from '../ResizablePanel.js';

const COLLAPSED_CLASS_NAME = 'resizable-panel--collapsed';

const buildHandlerProps = (
  flexGrow: string,
): {
  handlerProps: ResizablePanelHandlerProps;
  style: { flexGrow: string };
  remove: jest.Mock<(token: string) => void>;
} => {
  const style = { flexGrow };
  const remove = jest.fn<(token: string) => void>();
  return {
    handlerProps: {
      domElement: { style, classList: { remove } },
    } as unknown as ResizablePanelHandlerProps,
    style,
    remove,
  };
};

describe('getCollapsiblePanelGroupProps', () => {
  describe(unitTest('class names'), () => {
    test(unitTest('marks the panel collapsed when minimized'), () => {
      const { collapsiblePanel } = getCollapsiblePanelGroupProps(true, {
        classes: ['my-panel'],
      });
      expect(collapsiblePanel.className).toEqual(
        `my-panel ${COLLAPSED_CLASS_NAME}`,
      );
    });

    test(unitTest('omits the collapsed class when not minimized'), () => {
      const { collapsiblePanel } = getCollapsiblePanelGroupProps(false, {
        classes: ['my-panel'],
      });
      expect(collapsiblePanel.className).toEqual('my-panel');
    });

    test(unitTest('tolerates missing options'), () => {
      const { collapsiblePanel } = getCollapsiblePanelGroupProps(false);
      expect(collapsiblePanel.className).toEqual('');
    });
  });

  describe(unitTest('size and flex'), () => {
    test(unitTest('pins flex when minimized'), () => {
      const { collapsiblePanel, remainingPanel } =
        getCollapsiblePanelGroupProps(true, { size: 200 });
      // when minimized the size is forced to 0 even though one was supplied
      expect(collapsiblePanel.size).toBe(0);
      expect(collapsiblePanel.flex).toBe(0);
      expect(remainingPanel.flex).toBe(1);
    });

    test(unitTest('leaves flex to the library when not minimized'), () => {
      const { collapsiblePanel, remainingPanel } =
        getCollapsiblePanelGroupProps(false, { size: 200 });
      expect(collapsiblePanel.size).toBe(200);
      expect(collapsiblePanel.flex).toBeUndefined();
      expect(remainingPanel.flex).toBeUndefined();
    });

    test(unitTest('falls back to a size of zero'), () => {
      const { collapsiblePanel } = getCollapsiblePanelGroupProps(false);
      expect(collapsiblePanel.size).toBe(0);
    });
  });

  describe(unitTest('onStartResize'), () => {
    test(unitTest('clears the collapsed class and delegates'), () => {
      const onStartResize = jest.fn();
      const { handlerProps, remove } = buildHandlerProps('0.5');

      getCollapsiblePanelGroupProps(true, {
        onStartResize,
      }).collapsiblePanel.onStartResize?.(handlerProps);

      expect(remove).toHaveBeenCalledWith(COLLAPSED_CLASS_NAME);
      expect(onStartResize).toHaveBeenCalledWith(handlerProps);
    });

    test(unitTest('works without a delegate'), () => {
      const { handlerProps, remove } = buildHandlerProps('0.5');
      expect(() =>
        getCollapsiblePanelGroupProps(true).collapsiblePanel.onStartResize?.(
          handlerProps,
        ),
      ).not.toThrow();
      expect(remove).toHaveBeenCalledWith(COLLAPSED_CLASS_NAME);
    });
  });

  describe(unitTest('onStopResize rounds the flex grow'), () => {
    const stopResize = (flexGrow: string): string => {
      const { handlerProps, style } = buildHandlerProps(flexGrow);
      getCollapsiblePanelGroupProps(false).collapsiblePanel.onStopResize?.(
        handlerProps,
      );
      return style.flexGrow;
    };

    test(unitTest('rounds a near-zero value down to 0'), () => {
      expect(stopResize('0.005')).toEqual('0');
      // the threshold is inclusive
      expect(stopResize('0.01')).toEqual('0');
      expect(stopResize('0')).toEqual('0');
    });

    test(unitTest('rounds a near-one value up to 1'), () => {
      expect(stopResize('0.995')).toEqual('1');
      expect(stopResize('0.99')).toEqual('1');
      expect(stopResize('1')).toEqual('1');
    });

    test(unitTest('leaves intermediate values untouched'), () => {
      expect(stopResize('0.5')).toEqual('0.5');
      expect(stopResize('0.02')).toEqual('0.02');
      expect(stopResize('0.98')).toEqual('0.98');
    });

    test(unitTest('treats an unset flex grow as zero'), () => {
      // `Number('')` is 0, which falls into the round-down branch
      expect(stopResize('')).toEqual('0');
    });

    test(unitTest('delegates after rounding'), () => {
      const onStopResize = jest.fn();
      const { handlerProps, style } = buildHandlerProps('0.001');

      getCollapsiblePanelGroupProps(false, {
        onStopResize,
      }).collapsiblePanel.onStopResize?.(handlerProps);

      expect(style.flexGrow).toEqual('0');
      expect(onStopResize).toHaveBeenCalledWith(handlerProps);
    });
  });
});
