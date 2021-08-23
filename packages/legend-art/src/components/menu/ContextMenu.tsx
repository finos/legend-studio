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

import { useState, useRef } from 'react';
import type { MenuProps } from '@material-ui/core/Menu';
import { BaseMenu } from '../BaseMuiComponents';

export const ContextMenu: React.FC<{
  menuProps?: Partial<MenuProps>;
  content?: React.ReactNode;
  onClose?: () => void;
  onOpen?: () => void;
  className?: string;
  disabled?: boolean;
}> = (props) => {
  const { className, children, menuProps, content, disabled, onClose, onOpen } =
    props;
  const contextMenuRoot = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<Element>();
  const [left, setLeft] = useState(0);
  const [top, setTop] = useState(0);
  const reset = (): void => {
    setAnchorEl(undefined);
    setOpen(false);
    setTop(0);
    setLeft(0);
  };
  const close: React.MouseEventHandler = (event) => {
    event.stopPropagation();
    event.preventDefault();
    reset();
    onClose?.();
  };
  const onContextMenu: React.MouseEventHandler = (event) => {
    event.stopPropagation();
    event.preventDefault();
    if (disabled) {
      return;
    }
    onOpen?.();
    if (contextMenuRoot.current) {
      // Get position of the container element relative to the page document
      // See https://plainjs.com/javascript/styles/get-the-position-of-an-element-relative-to-the-document-24/
      const containerRect = contextMenuRoot.current.getBoundingClientRect();
      const containerLeft =
        containerRect.left +
        (window.pageXOffset || document.documentElement.scrollLeft);
      const containerTop =
        containerRect.top +
        (window.pageYOffset || document.documentElement.scrollTop);
      const { clientX, clientY, target } = event;
      const eventTarget = target as HTMLElement;
      if (anchorEl !== eventTarget) {
        const elements = document.elementsFromPoint(clientX, clientY);
        // Besides checking for the element containment, we also want to check for position as `material-ui`
        // Menu have a background that spans the whole screen to check for clickout and trap focus
        // which means right click on other part of the screen will also result in context menu being shown
        const hasAnchor =
          elements.some((element) => element === eventTarget) &&
          containerLeft <= clientX &&
          clientX <= containerLeft + containerRect.width &&
          containerTop <= clientY &&
          clientY <= containerTop + containerRect.height;
        if (!hasAnchor) {
          reset();
          onClose?.();
          return;
        }
      }
      setAnchorEl(eventTarget);
      setOpen(true);
      setTop(clientY);
      setLeft(clientX);
    }
  };

  return (
    <div
      ref={contextMenuRoot}
      className={className}
      onContextMenu={onContextMenu}
    >
      {children}
      <BaseMenu
        key={`${left}, ${top}`} // if coordinate changes, re-render the menu
        open={open}
        anchorPosition={{ left, top }}
        onClose={close}
        anchorReference="anchorPosition"
        BackdropProps={{
          invisible: true,
          onContextMenu,
        }}
        disableRestoreFocus={true}
        transitionDuration={0}
        onClick={close}
        {...menuProps}
      >
        {content}
      </BaseMenu>
    </div>
  );
};
