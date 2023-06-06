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

import { clsx } from 'clsx';
import { observer } from 'mobx-react-lite';
import { type RefObject, useEffect, forwardRef } from 'react';
import {
  type ConnectDropTarget,
  type ConnectDragPreview,
  useDragLayer,
} from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { Portal } from '../utils/ComponentUtils.js';
import { VerticalDragHandleIcon } from '../icon/Icon.js';

export const PanelDropZone: React.FC<{
  children: React.ReactNode;
  isDragOver: boolean;
  className?: string | undefined;
  dropTargetConnector: ConnectDropTarget;
  showDroppableSuggestion?: boolean | undefined;
}> = (props) => {
  const {
    children,
    className,
    isDragOver,
    showDroppableSuggestion,
    dropTargetConnector,
  } = props;
  return (
    <>
      {showDroppableSuggestion && (
        <div
          className={clsx('dnd__dropzone--droppable', className)}
          ref={dropTargetConnector}
        ></div>
      )}
      <div className="dnd__dropzone">
        {isDragOver && <div className="panel__dnd__dropzone__overlay" />}
        <div className="panel__dnd__dropzone__content">{children}</div>
      </div>
    </>
  );
};

export const PanelDnDEntryDragHandle: React.FC<{
  dropTargetConnector: RefObject<HTMLDivElement>;
  isBeingDragged: boolean;
  className?: string;
}> = (props) => {
  const { isBeingDragged, dropTargetConnector, className } = props;
  return (
    <div
      ref={dropTargetConnector}
      className={clsx('dnd__entry__handle__container', className, {
        'dnd__entry__handle__container--dragging': isBeingDragged,
      })}
    >
      <div className="dnd__entry-drag-handle">
        <VerticalDragHandleIcon />
      </div>
    </div>
  );
};

export const PanelDnDEntry = observer(
  forwardRef<
    HTMLDivElement,
    {
      children: React.ReactNode;
      placeholder?: React.ReactNode;
      showPlaceholder: boolean;
      className?: string;
    }
  >(function PanelDnDEntryAttempt(props, ref) {
    const { children, placeholder, showPlaceholder, className } = props;
    return (
      <div ref={ref} className={clsx('dnd__entry__container', className)}>
        {showPlaceholder && (
          <div className="dnd__entry__placeholder">
            {placeholder ? (
              <>{placeholder}</>
            ) : (
              <div className="dnd__entry__placeholder__content"></div>
            )}
          </div>
        )}
        <>{children}</>
      </div>
    );
  }),
);

export const PanelEntryDropZonePlaceholder: React.FC<{
  children: React.ReactNode;
  showPlaceholder: boolean;
  label?: string;
  className?: string;
}> = (props) => {
  const { children, label, showPlaceholder, className } = props;
  if (!showPlaceholder) {
    return <>{children}</>;
  }
  return (
    <div className={clsx(['dnd__entry-dropzone__placeholder', className])}>
      <div className="dnd__entry-dropzone__placeholder__content">
        <div className="dnd__entry-dropzone__placeholder__label">
          {label ?? ''}
        </div>
      </div>
    </div>
  );
};

export const useDragPreviewLayer = (
  dragPreviewConnector: ConnectDragPreview,
): void => {
  // hide default HTML5 preview image
  useEffect(() => {
    dragPreviewConnector(getEmptyImage());
  }, [dragPreviewConnector]);
};

export function DragPreviewLayer<T>(props: {
  labelGetter: (item: T) => string;
  types: string[];
}): JSX.Element | null {
  const { labelGetter, types } = props;
  const { itemType, item, isDragging, currentPosition } = useDragLayer(
    (monitor) => ({
      itemType: monitor.getItemType(),
      item: monitor.getItem<T | null>(),
      isDragging: monitor.isDragging(),
      initialOffset: monitor.getInitialSourceClientOffset(),
      currentPosition: monitor.getClientOffset(),
    }),
  );
  if (
    !isDragging ||
    !item ||
    !itemType ||
    !types.includes(itemType.toString())
  ) {
    return null;
  }
  return (
    // use portal so this will show on top of everything regardless of the parent element's container
    <Portal>
      <div className="dnd__drag-preview-layer">
        <div
          className="dnd__drag-preview-layer__content"
          style={
            !currentPosition
              ? { display: 'none' }
              : {
                  transform: `translate(${currentPosition.x / 10 + 2}rem, ${
                    currentPosition.y / 10 + 1
                  }rem)`,
                }
          }
        >
          {labelGetter(item)}
        </div>
      </div>
    </Portal>
  );
}
