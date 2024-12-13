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
import { type RefObject, useEffect, forwardRef, useRef } from 'react';
import {
  type ConnectDropTarget,
  type ConnectDragPreview,
  useDragLayer,
} from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { VerticalDragHandleIcon } from '../icon/Icon.js';

export const PanelDropZone: React.FC<{
  children: React.ReactNode;
  className?: string | undefined;
  dropTargetConnector: ConnectDropTarget;
  isDragOver: boolean;
  isDroppable?: boolean | undefined;
  contentClassName?: string | undefined;
}> = (props) => {
  const {
    children,
    className,
    isDragOver,
    isDroppable,
    dropTargetConnector,
    contentClassName,
  } = props;

  const ref = useRef<HTMLInputElement>(null);
  dropTargetConnector(ref);

  return (
    <>
      <div className={clsx('dnd__dropzone', className)} ref={ref}>
        {isDroppable && <div className="dnd__dropzone--droppable"></div>}
        {isDragOver && <div className="panel__dnd__dropzone__overlay" />}
        <div
          className={clsx('panel__dnd__dropzone__content', contentClassName)}
        >
          {children}
        </div>
      </div>
    </>
  );
};

export const PanelDnDEntry = observer(
  forwardRef<
    HTMLDivElement,
    {
      children: React.ReactNode;
      className?: string;
      placeholder?: React.ReactNode;
      showPlaceholder: boolean;
      placeholderContainerClassName?: string;
    }
  >(function PanelDnDEntry(props, ref) {
    const {
      children,
      placeholder,
      showPlaceholder,
      className,
      placeholderContainerClassName,
    } = props;
    return (
      <div ref={ref} className={clsx('dnd__entry__container', className)}>
        {showPlaceholder && (
          <div
            className={clsx(
              'dnd__entry__placeholder',
              placeholderContainerClassName,
            )}
          >
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

export const PanelEntryDragHandle: React.FC<{
  dragSourceConnector: RefObject<HTMLElement | null>;
  className?: string;
  isDragging: boolean;
}> = (props) => {
  const { isDragging, dragSourceConnector, className } = props;
  return (
    <div
      ref={dragSourceConnector as RefObject<HTMLDivElement | null>}
      title="Drag Element"
      className={clsx('dnd__entry__handle__container', className, {
        'dnd__entry__handle__container--dragging': isDragging,
      })}
    >
      <div className="dnd__entry-drag-handle">
        <VerticalDragHandleIcon />
      </div>
    </div>
  );
};

export const PanelEntryDropZonePlaceholder: React.FC<{
  children: React.ReactNode;
  className?: string;
  label?: string;
  isDragOver: boolean;
  isDroppable?: boolean | undefined;
  alwaysShowChildren?: boolean;
}> = (props) => {
  const {
    children,
    label,
    isDragOver,
    isDroppable,
    className,
    alwaysShowChildren,
  } = props;
  if (isDragOver || isDroppable) {
    return (
      <div
        className={clsx([
          'dnd__entry-dropzone__placeholder',
          className,
          {
            'dnd__entry-dropzone__placeholder--active': isDragOver,
            'dnd__entry-dropzone__placeholder--droppable': isDroppable,
          },
        ])}
      >
        <div
          className={clsx('dnd__entry-dropzone__placeholder__content', {
            'dnd__entry-dropzone__placeholder__content--children':
              alwaysShowChildren,
          })}
        >
          {alwaysShowChildren ? (
            <>{children}</>
          ) : (
            <div className="dnd__entry-dropzone__placeholder__label">
              {label ?? ''}
            </div>
          )}
        </div>
      </div>
    );
  }
  return <>{children}</>;
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
}): React.ReactNode {
  const { labelGetter, types } = props;
  const { itemType, item, isDragging, currentPosition } = useDragLayer(
    (monitor) => ({
      itemType: monitor.getItemType(),
      item: monitor.getItem<T | null>(),
      isDragging: monitor.isDragging(),
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
  );
}
