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

import { useEffect } from 'react';
import type { CubeEditorState } from '../../stores/CubeEditorState.js';
import { returnFocusToCubeCanvasNode } from '../canvas/CubeCanvasNodeFocus.js';

/**
 * What a press outside the floating editor leaves alone (PLAN §11.6):
 * a node, whose click applies and opens it or selects it; the canvas's
 * background, controls and minimap, so panning or zooming keeps the editor
 * (a plain click on the background closes it, through the canvas); the
 * splitter above the results, as the editor follows its node when the
 * canvas is resized; and MUI's layers, where a dropdown, menu or dialog
 * opened from the editor lives.
 */
const LEFT_ALONE =
  '.react-flow__node, .react-flow__pane, .react-flow__controls, .react-flow__minimap, .reflex-splitter, .MuiModal-root, .MuiPopover-root, .MuiPopper-root';

/** An Escape there is the results grid's, e.g. closing its menu */
const GRID_LAYERS = '.ag-popup, .ag-menu';

/** Whether a press on the target, outside the editor, closes it */
export const isCubeNodeEditorDismissedBy = (
  target: EventTarget | null,
  editor: Element | null,
): boolean =>
  target instanceof Element &&
  !editor?.contains(target) &&
  target.closest(LEFT_ALONE) === null;

/**
 * Closes the floating node editor, applying its edits, on a press of the
 * main button outside it, or on Escape (PLAN §11.6, spec §17.5). A press
 * closes it as it goes down, before the click, so a button pressed outside
 * (Execute, Undo) acts on the applied edits. Nothing closes it while a Cube
 * dialog is open or something opened from it holds it; an Escape a field or
 * a dialog already used is theirs, and so is one in the results grid's menu.
 * A surface opened from the editor and shown elsewhere (a portal) must be
 * one of MUI's layers, or hold the editor open (`nodeEditor.holdOpen()`),
 * or a press in it closes the editor.
 */
export const useCubeNodeEditorDismiss = (
  editorState: CubeEditorState,
  editorRef: React.RefObject<Element | null>,
): void => {
  const isOpen = editorState.nodeEditor.nodeId !== undefined;
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    const canDismiss = (): boolean =>
      !editorState.isDialogOpen && !editorState.nodeEditor.isHeld;
    const onPointerDown = (event: PointerEvent): void => {
      if (
        event.button === 0 &&
        // on macOS, Ctrl with the main button is a right-click
        !event.ctrlKey &&
        canDismiss() &&
        isCubeNodeEditorDismissedBy(event.target, editorRef.current)
      ) {
        editorState.nodeEditor.finish();
      }
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (
        event.key === 'Escape' &&
        !event.defaultPrevented &&
        !(
          event.target instanceof Element &&
          event.target.closest(GRID_LAYERS) !== null
        ) &&
        canDismiss()
      ) {
        const { nodeId } = editorState.nodeEditor;
        const focused = document.activeElement;
        if (editorState.nodeEditor.finish() && nodeId !== undefined) {
          returnFocusToCubeCanvasNode(nodeId, editorRef.current, focused);
        }
      }
    };
    // capturing, so a press that something else stops still closes it
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [editorState, editorRef, isOpen]);
};
