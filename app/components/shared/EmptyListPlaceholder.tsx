/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, { useRef, useState } from 'react';
import { MdVerticalAlignBottom, MdAdd } from 'react-icons/md';
import clsx from 'clsx';
import ReactResizeDetector from 'react-resize-detector';
import { useDimensions } from 'Utilities/GeneralUtil';

const DEFAULT_CONTENT_PADDING = 20;

const MIN_DIMENSION = 50;
const TEXT_GRAPHIC_SPACING = 20;

export const EmptyListPlaceholder: React.FC<{
  onAdd: () => void;
  addActionLabel: string;
  dnd?: {
    canDrop: boolean;
    isDragOver: boolean;
  };
}> = props => {
  const { onAdd, addActionLabel, dnd } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const [textRef, textDimensions] = useDimensions();
  const [graphicRef, graphicDimensions] = useDimensions();
  /**
   * NOTE: usually, we would want to set initial states for these to `false` and as the dimensions are detected,
   * we will set them to `true` if allowed. The problem is if they start out to be `false`, which for this component
   * means `display: none`, dimension detector will always show their width and height as 0. As such, we want to initialize
   * these to `true` so that the detector can detect their size. This, in turn, causes a flash if these flags are set to 0
   * after container size detector call `handleResize` for the first time. So to make this smooth, we introduce a mask
   * which initially makes everything invisible then gradually fade in `stylishly` and reveal all after the first `handleResize`
   * is called
   */
  const [showText, setShowText] = useState(true);
  const [showGraphic, setShowGraphic] = useState(true);
  const [fullGraphic, setFullGraphic] = useState(true);
  const [showPlaceholder, setShowPlaceholder] = useState(false);
  const handleResize = (width: number, height: number): void => {
    setShowText(width > (Math.max(textDimensions?.width ?? 0, graphicDimensions?.width ?? 0) + DEFAULT_CONTENT_PADDING * 2) && height > ((textDimensions?.height ?? 0) + TEXT_GRAPHIC_SPACING + (graphicDimensions?.height ?? 0) + DEFAULT_CONTENT_PADDING * 2));
    setFullGraphic((width > (graphicDimensions?.width ?? 0) + DEFAULT_CONTENT_PADDING * 2) && height > ((graphicDimensions?.height ?? 0) + DEFAULT_CONTENT_PADDING * 2));
    setShowGraphic(width > MIN_DIMENSION && height > MIN_DIMENSION);
    setShowPlaceholder(true); // reveal everything by resetting opacity
  };

  return (
    <ReactResizeDetector
      handleWidth={true}
      handleHeight={true}
      onResize={handleResize}
      refreshRate={50}
      refreshMode="throttle"
      refreshOptions={{ trailing: true }}
    >
      <div ref={containerRef} className="empty-list-placeholder__container">
        {dnd && <div className={clsx({ 'dnd__overlay': dnd.isDragOver })} />}
        <div className={clsx('empty-list-placeholder', { 'empty-list-placeholder--invisible': !showPlaceholder })} onClick={onAdd}>
          <div ref={textRef} className={clsx('empty-list-placeholder__text', { 'empty-list-placeholder__text--hide': !showText })}>{addActionLabel}</div>
          {showText && <div className="empty-list-placeholder__spacing" />}
          <div ref={graphicRef} className={clsx('empty-list-placeholder__action', { 'empty-list-placeholder__action--sm': !fullGraphic }, { 'empty-list-placeholder__action--hide': !showGraphic })}>
            {dnd &&
              <>
                <MdVerticalAlignBottom className={clsx('empty-list-placeholder__action__dnd-icon', { 'empty-list-placeholder__action__dnd-icon--can-drop': dnd.canDrop })} />
                <MdAdd className="empty-list-placeholder__action__dnd-add-icon" />
              </>
            }
            {!dnd && <MdAdd className="empty-list-placeholder__action__add-icon" />}
          </div>
        </div>
      </div>
    </ReactResizeDetector>
  );
};
