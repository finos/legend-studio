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

import { clsx, type ClassValue } from 'clsx';
import {
  type HandlerProps,
  type ReflexElementProps,
  ReflexContainer,
  ReflexElement,
  ReflexSplitter,
} from 'react-reflex';

/**
 * We need test-mocks for `react-reflex` or else some of our tests might fail since
 * the library does calculation using the rendering of flex boxes and could throw error
 * in test environment.
 *
 * Here, we have to use a very crude way to mock that is to use `process.env.NODE_ENV === 'test'`
 * Since, Typescript does not currently support subpath `exports` well, we can't really
 * use Jest `moduleNameMapper` to mock, e.g.
 *
 * '^@finos/legend-art/lib/ResizablePanel$': '@finos/legend-art/lib/testMocks/MockedResizablePanel.js'
 *
 * TODO: we should come back to the `moduleNameMaper` approach for mock when this issue is resolved
 * See https://github.com/microsoft/TypeScript/issues/33079
 */
const MockedReactComponent: React.FC<{
  children: React.ReactNode;
}> = (props) => {
  const { children } = props;
  return <div>{children}</div>;
};

export const ResizablePanelGroup =
  // eslint-disable-next-line no-process-env
  process.env.NODE_ENV === 'test'
    ? (MockedReactComponent as unknown as typeof ReflexContainer)
    : ReflexContainer;

const RESIZABLE_COLLAPSED_PANEL_CLASS_NAME = 'resizable-panel--collapsed';
/**
 * NOTE: there is a problem with `react-reflex` that is when a panel
 * is minimized, due to `flex-grow` not being set/round to 0, there is a little
 * of the panel still being shown. We are waiting to see when how we could address
 * this issue programmatically. But the following is an attempt to do this when
 * user manually resize the panel.
 *
 * We will see if we could get the library to support some rounding behavior for
 * flex-grow out of the box.
 *
 * See https://github.com/leefsmp/Re-Flex/issues/146
 */
export const getCollapsiblePanelGroupProps = (
  minimizeCondition: boolean,
  options?: {
    classes?: ClassValue[];
    onStartResize?: (handleProps: ResizablePanelHandlerProps) => void;
    onStopResize?: (handleProps: ResizablePanelHandlerProps) => void;
    size?: number;
  },
): {
  collapsiblePanel: ReflexElementProps;
  remainingPanel: ReflexElementProps;
} => ({
  collapsiblePanel: {
    className: clsx(...(options?.classes ?? []), {
      [RESIZABLE_COLLAPSED_PANEL_CLASS_NAME]: minimizeCondition,
    }),
    onStartResize: (handleProps: ResizablePanelHandlerProps): void => {
      (handleProps.domElement as HTMLDivElement).classList.remove(
        RESIZABLE_COLLAPSED_PANEL_CLASS_NAME,
      );
      options?.onStartResize?.(handleProps);
    },
    onStopResize: (handleProps: ResizablePanelHandlerProps): void => {
      const flexGrow = Number(
        (handleProps.domElement as HTMLDivElement).style.flexGrow,
      );
      if (flexGrow <= 0.01) {
        (handleProps.domElement as HTMLDivElement).style.flexGrow = '0';
      } else if (flexGrow >= 0.99) {
        (handleProps.domElement as HTMLDivElement).style.flexGrow = '1';
      }
      options?.onStopResize?.(handleProps);
    },
    size: !minimizeCondition && options?.size ? options.size : 0,
    /**
     * NOTE: When the panel is minimized we want to programatically
     * set `flex=0`, however, when minimization does not occur
     * we want to let `react-reflex` calculate the `flex` value
     * so that the panel is shown properly
     *
     * See https://github.com/finos/legend-studio/issues/1316
     */
    flex: minimizeCondition ? 0 : (undefined as unknown as number),
  },
  remainingPanel: {
    /**
     * Somehow, if we don't set the flex=1 for the second panel when the first panel has flex=0
     * (i.e. collapsed), the first panel when toggled to display again will not respect the size
     * set to it programmatically
     *
     * See https://github.com/leefsmp/Re-Flex/issues/147
     */
    flex: minimizeCondition ? 1 : (undefined as unknown as number),
  },
});

export const ResizablePanel =
  // eslint-disable-next-line no-process-env
  process.env.NODE_ENV === 'test'
    ? (MockedReactComponent as unknown as typeof ReflexElement)
    : ReflexElement;

export const ResizablePanelSplitter =
  // eslint-disable-next-line no-process-env
  process.env.NODE_ENV === 'test'
    ? (MockedReactComponent as unknown as typeof ReflexSplitter)
    : ReflexSplitter;

export const ResizablePanelSplitterLine: React.FC<{ color: string }> = (
  props,
) => (
  <div
    className="resizable-panel__splitter-line"
    style={{
      background: props.color,
    }}
  />
);

export const configureResizablePanelComponents = (): void => {
  /**
   * The following block is needed to inject `react-reflex` styling during development
   * as HMR makes stylesheet loaded after layout calculation, throwing off `react-reflex`
   * See https://github.com/leefsmp/Re-Flex/issues/27#issuecomment-718949629
   */
  // eslint-disable-next-line no-process-env
  if (process.env.NODE_ENV === 'development') {
    const stylesheet = document.createElement('style');
    stylesheet.innerHTML = `
        /* For development, this needs to be injected before stylesheet, else \`react-reflex\` panel dimension calculation will be off */
        .reflex-container { height: 100%; width: 100%; }
        /* NOTE: we have to leave the min dimension as \`0.1rem\` to avoid re-calculation bugs due to HMR style injection order */
        .reflex-container.horizontal { flex-direction: column; min-height: 0.1rem; }
        .reflex-container.vertical { flex-direction: row; min-width: 0.1rem; }
        .reflex-container > .reflex-element { height: 100%; width: 100%; }
      `;
    document.head.prepend(stylesheet);
  }
};

export type ResizablePanelHandlerProps = HandlerProps;
