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

import { Backdrop, LegendStyleProvider, Portal } from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ActionAlert } from './ActionAlert.js';
import { useApplicationStore } from './ApplicationStoreProvider.js';
import { BlockingAlert } from './BlockingAlert.js';
import { NotificationManager } from './NotificationManager.js';
import { useEffect } from 'react';
import {
  createKeybindingsHandler,
  type KeyBindingConfig,
} from '@finos/legend-shared';
import { VirtualAssistant } from './VirtualAssistant.js';
import { LegendApplicationTelemetryHelper } from '../__lib__/LegendApplicationTelemetry.js';
import type { GenericLegendApplicationStore } from '../stores/ApplicationStore.js';

enum APPLICATION_COMPONENT_ELEMENT_ID {
  TOP_LEVEL_CONTAINER = 'application.top-level-container',
  BACKDROP_CONTAINER = 'application.backdrop-container',
}

const PLATFORM_NATIVE_KEYBOARD_SHORTCUTS = [
  'Meta+KeyP', // Print
  'Control+KeyP',
  'Meta+KeyS', // Save
  'Control+KeyS',

  'F8', // Chrome: Developer Tools > Sources: Run or pause script
  'F10', // Chrome: Developer Tools > Sources: Step over next function call
  'F11', // Chrome: Developer Tools > Sources: Step into next function call
  'Meta+Shift+KeyP', // Chrome: Developer Tools: Open Command Prompt inside developer tools
  'Control+Backquote', // Chrome: Developer Tools: Open console
  'Control+Shift+KeyN', // Chrome: Open Private Browsing (incognito)

  'Control+Shift+KeyP', // Firefox: Open Private Browsing
  'Meta+KeyB', // Firefox: Open bookmark sidebar
  'Control+KeyB',
  'F7', // Firefox: Caret browsing
  'Alt+F7', // Firefox: Caret browsing (Mac)
  'Control+Shift+KeyB',

  'Alt+KeyZ', // Mac: special symbol
];

const buildHotkeysConfiguration = (
  commandKeyMap: Map<string, string[]>,
  handler: (keyCombination: string, event: KeyboardEvent) => void,
): KeyBindingConfig => {
  const keyMap: KeyBindingConfig = {};
  commandKeyMap.forEach((keyCombinations, commandKey) => {
    if (keyCombinations.length) {
      keyMap[commandKey] = {
        combinations: keyCombinations,
        handler,
      };
    }
  });

  // Disable platform native keyboard shortcuts
  // NOTE: due to the order in which hotkey configuration is searched and applied,
  // we must place these after application hotkey configuration
  const PLATFORM_NATIVE_KEYBOARD_COMMAND =
    'INTERNAL__PLATFORM_NATIVE_KEYBOARD_COMMAND';
  keyMap[PLATFORM_NATIVE_KEYBOARD_COMMAND] = {
    combinations: PLATFORM_NATIVE_KEYBOARD_SHORTCUTS,
    handler: (keyCombination: string, event: KeyboardEvent) => {
      // prevent default from potentially clashing key combinations
      event.preventDefault();
    },
  };

  return keyMap;
};

/**
 * Some elements (e.g. <canvas>) and components that we do not control the implementation
 * might have special logic to prevent `keydown` event bubbling naturally, this
 * method forces those event to surface to the top of the app and being handled
 * by keybinding service
 */
export const forceDispatchKeyboardEvent = (
  event: KeyboardEvent,
  applicationStore: GenericLegendApplicationStore,
): void => {
  applicationStore.layoutService
    .getElementByID(APPLICATION_COMPONENT_ELEMENT_ID.TOP_LEVEL_CONTAINER)
    ?.dispatchEvent(new KeyboardEvent(event.type, event));
};

/**
 * Potential location to mount backdrop on
 *
 * NOTE: we usually want the backdrop container to be the first child of its immediate parent
 * so that it properly lies under the content that we pick to show on top of the backdrop
 */
export const BackdropContainer: React.FC<{ elementId: string }> = (props) => (
  <div className="backdrop__container" data-elementid={props.elementId} />
);

export const ApplicationComponentFrameworkProvider = observer(
  (props: {
    children: React.ReactNode;
    enableTransitions?: boolean | undefined;
    customFonts?: string | undefined;
  }) => {
    const { children, enableTransitions, customFonts } = props;
    const applicationStore = useApplicationStore();
    const disableContextMenu: React.MouseEventHandler = (event) => {
      event.stopPropagation();
      event.preventDefault();
    };

    const keyBindingMap = buildHotkeysConfiguration(
      applicationStore.keyboardShortcutsService.commandKeyMap,
      (keyCombination: string, event: KeyboardEvent) => {
        // prevent default from potentially clashing key combinations with platform native keyboard shortcuts
        // NOTE: Though tempting since it's a good way to simplify and potentially avoid conflicts,
        // we should not call `preventDefault()` because if we have any hotkey sequence which is too short,
        // such as `r`, `a` - we risk blocking some very common interaction, i.e. user typing, or even
        // constructing longer key combinations
        if (PLATFORM_NATIVE_KEYBOARD_SHORTCUTS.includes(keyCombination)) {
          event.preventDefault();
        }
        applicationStore.keyboardShortcutsService.dispatch(keyCombination);
      },
    );

    useEffect(() => {
      const onKeyEvent = createKeybindingsHandler(keyBindingMap);
      document.addEventListener('keydown', onKeyEvent);
      return () => {
        document.removeEventListener('keydown', onKeyEvent);
      };
    }, [keyBindingMap]);

    /**
     * Keep track of when the application usage is interrupted (e.g. when the app window/tab is not in focus),
     * since for certain platform, background contexts are de-prioritized, given less resources, and hence, would
     * run less performantly; and might require particular handlings.
     *
     * See https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API#policies_in_place_to_aid_background_page_performance
     * See https://plumbr.io/blog/performance-blog/background-tabs-in-browser-load-20-times-slower
     */
    useEffect(() => {
      const onVisibilityChange = (): void => {
        if (document.hidden) {
          LegendApplicationTelemetryHelper.logEvent_ApplicationUsageInterrupted(
            applicationStore.telemetryService,
          );
          applicationStore.timeService.recordUsageInterruption();
        }
      };
      document.addEventListener('visibilitychange', onVisibilityChange);
      return () => {
        document.removeEventListener('visibilitychange', onVisibilityChange);
      };
    }, [applicationStore]);

    return (
      <LegendStyleProvider
        enableTransitions={enableTransitions}
        customFonts={customFonts}
      >
        <BlockingAlert />
        <ActionAlert />
        <NotificationManager />
        <VirtualAssistant />
        {applicationStore.layoutService.showBackdrop && (
          // We use <Portal> here to insert backdrop into different parts of the app
          // as backdrop relies heavily on z-index mechanism so its location in the DOM
          // really matters.
          // For example, the default location of the backdrop works fine for most cases
          // but if we want to use the backdrop for elements within modal dialogs, we would
          // need to mount the backdrop at a different location
          <Portal
            container={
              applicationStore.layoutService.getElementByID(
                applicationStore.layoutService.backdropContainerElementID ??
                  APPLICATION_COMPONENT_ELEMENT_ID.BACKDROP_CONTAINER,
              ) ?? null
            }
          >
            <Backdrop
              className="backdrop"
              open={applicationStore.layoutService.showBackdrop}
            />
          </Portal>
        )}
        <DndProvider backend={HTML5Backend}>
          <div
            style={{ height: '100%', width: '100%' }}
            // NOTE: this `id` is used to quickly identify this DOM node so we could manually
            // dispatch keyboard event here in order to be captured by our global hotkeys matchers
            data-elementid={
              APPLICATION_COMPONENT_ELEMENT_ID.TOP_LEVEL_CONTAINER
            }
            // Disable global context menu so that only places in the app that supports context-menu will be effective
            onContextMenu={disableContextMenu}
          >
            <BackdropContainer
              elementId={APPLICATION_COMPONENT_ELEMENT_ID.BACKDROP_CONTAINER}
            />
            {children}
          </div>
        </DndProvider>
      </LegendStyleProvider>
    );
  },
);

export const SimpleApplicationComponentFrameworkProvider = observer(
  (props: {
    children: React.ReactNode;
    enableTransitions?: boolean | undefined;
    customFonts?: string | undefined;
  }) => {
    const { children, enableTransitions, customFonts } = props;
    const applicationStore = useApplicationStore();
    const disableContextMenu: React.MouseEventHandler = (event) => {
      event.stopPropagation();
      event.preventDefault();
    };

    const keyBindingMap = buildHotkeysConfiguration(
      applicationStore.keyboardShortcutsService.commandKeyMap,
      (keyCombination: string, event: KeyboardEvent) => {
        // prevent default from potentially clashing key combinations with platform native keyboard shortcuts
        // NOTE: Though tempting since it's a good way to simplify and potentially avoid conflicts,
        // we should not call `preventDefault()` because if we have any hotkey sequence which is too short,
        // such as `r`, `a` - we risk blocking some very common interaction, i.e. user typing, or even
        // constructing longer key combinations
        if (PLATFORM_NATIVE_KEYBOARD_SHORTCUTS.includes(keyCombination)) {
          event.preventDefault();
        }
        applicationStore.keyboardShortcutsService.dispatch(keyCombination);
      },
    );

    useEffect(() => {
      const onKeyEvent = createKeybindingsHandler(keyBindingMap);
      document.addEventListener('keydown', onKeyEvent);
      return () => {
        document.removeEventListener('keydown', onKeyEvent);
      };
    }, [keyBindingMap]);

    return (
      <LegendStyleProvider
        enableTransitions={enableTransitions}
        customFonts={customFonts}
      >
        <DndProvider backend={HTML5Backend}>
          <div
            style={{ height: '100%', width: '100%' }}
            // NOTE: this `id` is used to quickly identify this DOM node so we could manually
            // dispatch keyboard event here in order to be captured by our global hotkeys matchers
            data-elementid={
              APPLICATION_COMPONENT_ELEMENT_ID.TOP_LEVEL_CONTAINER
            }
            // Disable global context menu so that only places in the app that supports context-menu will be effective
            onContextMenu={disableContextMenu}
          >
            <BackdropContainer
              elementId={APPLICATION_COMPONENT_ELEMENT_ID.BACKDROP_CONTAINER}
            />
            {children}
          </div>
        </DndProvider>
      </LegendStyleProvider>
    );
  },
);
