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

import { useEffect, useState } from 'react';
import { VerticalAlignBottomIcon, AddIcon, EditIcon } from '../icon/Icon.js';
import { useResizeDetector } from 'react-resize-detector';
import { BlankPanelContent } from './BlankPanelContent.js';
import { clsx } from 'clsx';

const DEFAULT_CONTENT_PADDING = 20;
const MIN_DIMENSION = 50;
const TEXT_GRAPHIC_SPACING = 20;

type ClickActionType = 'add' | 'modify';

const renderClickActionIcon = (
  type: ClickActionType | undefined,
): React.ReactElement | null =>
  !type ? null : type === 'add' ? <AddIcon /> : <EditIcon />;

/**
 * This component is used as placeholder for empty panel, which represents an unset/empty value of something.
 * If this value is of multiple values (i.e. a an empty list), the most common operation to interact
 * with a list is `add`, otherwise use `modify`.
 *
 * When the the value is editable, supposed this is a list value, the placeholder can be interacted with in 2 ways:
 *  1. clicking on this placeholder to add a new item,
 *  2. (optional) or, dropping some material to create a new item and add it to the list
 *
 * When the value is read-only, show a placeholder to let user know the value is empty/blank/unset
 */
export const BlankPanelPlaceholder: React.FC<{
  /**
   * Placeholder text is similar to what we would put in text input, e.g. `Choose a file`
   * This should be in `Sentence case` and should have ellipses when it can potentially require more user actions
   */
  text: string;
  /**
   * The tooltip text for the add/drop zone
   */
  tooltipText: string;
  /**
   * The text to be shown when the panel is disabled (i.e. in preview) mode
   */
  previewText?: string | undefined;
  /**
   * Possible values are `add` for list-type value and `modify` for single value
   */
  clickActionType?: ClickActionType | undefined;
  onClick?: (() => void) | undefined;
  /**
   * This flag is used to control whether the panel placeholder supports drag-and-drop interaction
   * By default, this is set to undefined, which means drag-and-drop interaction is not supported
   * When defined as a boolean, it will control when the drag-and-drop indicator becomes active/responsive
   * corresponding to the drag-over entry, signaling dropability.
   */
  isDropZoneActive?: boolean | undefined;
  /**
   * This flag is used to show users as soon as they click and hold an item
   * where they can drop that item on, and indicates to them that the place
   * is droppable
   */
  isDroppable?: boolean | undefined;
  disabled?: boolean | undefined;
}> = (props) => {
  const {
    text,
    tooltipText,
    previewText,
    clickActionType,
    disabled,
    onClick,
    isDropZoneActive,
    isDroppable,
  } = props;
  // if no action is provided, it means the panel support DnD
  const clickActionIcon = !onClick ? (
    <VerticalAlignBottomIcon />
  ) : (
    renderClickActionIcon(clickActionType)
  );
  const {
    ref: textRef,
    width: textWidth,
    height: textHeight,
  } = useResizeDetector<HTMLDivElement>({
    refreshMode: 'throttle',
    refreshRate: 50,
    refreshOptions: { trailing: true },
  });
  const {
    ref: graphicRef,
    width: graphicWidth,
    height: graphicHeight,
  } = useResizeDetector<HTMLDivElement>({
    refreshMode: 'throttle',
    refreshRate: 50,
    refreshOptions: { trailing: true },
  });
  /**
   * NOTE: usually, we would want to set initial states for these to `false` and as the dimensions are detected,
   * we will set them to `true` if allowed. The problem is if they start out to be `false`, which for this component
   * means `display: none`, dimension detector will always show their width and height as 0. As such, we want to initialize
   * these to `true` so that the detector can detect their size. This, in turn, causes a flash if these flag are set to 0
   * after container size detector call `handleResize` for the first time. So to make this smooth, we introduce a mask
   * which initially makes everything invisible then gradually fade in `stylishly` and reveal all after the first `handleResize`
   * is called
   */
  const [showText, setShowText] = useState(true);
  const [showGraphic, setShowGraphic] = useState(true);
  const [fullGraphic, setFullGraphic] = useState(true);
  const [showPlaceholder, setShowPlaceholder] = useState(false);
  const {
    ref: containerRef,
    width: containerWidth,
    height: containerHeight,
  } = useResizeDetector<HTMLDivElement>({
    refreshMode: 'throttle',
    refreshRate: 50,
    refreshOptions: { trailing: true },
  });
  const handleClick = (): void => {
    if (disabled) {
      return;
    }
    onClick?.();
  };

  useEffect(() => {
    const _containerWidth = containerWidth ?? 0;
    const _containerHeight = containerHeight ?? 0;
    const _textWidth = textWidth ? textWidth : DEFAULT_CONTENT_PADDING;
    const _textHeight = textHeight ? textHeight : DEFAULT_CONTENT_PADDING;
    const _graphicWidth = graphicWidth ?? 0;
    const _graphicHeight = graphicHeight ?? 0;
    setShowText(
      _containerWidth >
        Math.max(_textWidth, _graphicWidth) + DEFAULT_CONTENT_PADDING * 2 &&
        _containerHeight >
          _textHeight +
            TEXT_GRAPHIC_SPACING +
            _graphicHeight +
            DEFAULT_CONTENT_PADDING * 2,
    );
    setFullGraphic(
      _containerWidth > _graphicWidth + DEFAULT_CONTENT_PADDING * 2 &&
        _containerHeight > _graphicHeight + DEFAULT_CONTENT_PADDING * 2,
    );
    setShowGraphic(
      _containerWidth > MIN_DIMENSION && _containerHeight > MIN_DIMENSION,
    );
    setShowPlaceholder(true); // reveal everything by resetting opacity
  }, [
    containerWidth,
    containerHeight,
    textWidth,
    textHeight,
    graphicWidth,
    graphicHeight,
  ]);

  if (disabled) {
    return <BlankPanelContent>{previewText ?? null}</BlankPanelContent>;
  }
  return (
    <div ref={containerRef} className="blank-panel-placeholder__container">
      <div
        className={clsx('blank-panel-placeholder', {
          'blank-panel-placeholder--no-click': !onClick || disabled,
          'blank-panel-placeholder--invisible': !showPlaceholder,
          'dnd__dropzone--droppable': isDroppable,
        })}
        title={tooltipText}
        onClick={handleClick}
      >
        <div
          ref={textRef}
          className={clsx('blank-panel-placeholder__text', {
            'blank-panel-placeholder__text--hide': !showText,
          })}
        >
          {text}
        </div>
        {showText && <div className="blank-panel-placeholder__spacing" />}
        <div
          ref={graphicRef}
          className={clsx('blank-panel-placeholder__action', {
            'blank-panel-placeholder__action--sm': !fullGraphic,
            'blank-panel-placeholder__action--hide': !showGraphic,
          })}
        >
          {isDropZoneActive !== undefined && (
            <>
              <VerticalAlignBottomIcon
                className={clsx('blank-panel-placeholder__action__dnd-icon', {
                  'blank-panel-placeholder__action__dnd-icon--can-drop':
                    isDropZoneActive && !disabled,
                })}
              />
              <div className="blank-panel-placeholder__action__dnd-click-icon">
                {clickActionIcon}
              </div>
            </>
          )}
          {isDropZoneActive === undefined && clickActionIcon}
        </div>
      </div>
    </div>
  );
};
