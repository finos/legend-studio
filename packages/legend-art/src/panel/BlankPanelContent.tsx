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
import { useResizeDetector } from 'react-resize-detector';
import { clsx } from 'clsx';

const DEFAULT_CONTENT_PADDING = 20;

/**
 * Use this component for panel with empty content, it has a resize detector that will
 * help to show/hide the content as the panel is resized
 */
export const BlankPanelContent: React.FC<{
  children: React.ReactNode;
}> = (props) => {
  const { children } = props;
  const {
    ref: contentRef,
    width: contentWidth,
    height: contentHeight,
  } = useResizeDetector<HTMLDivElement>({
    refreshMode: 'throttle',
    refreshRate: 50,
    refreshOptions: { trailing: true },
  });
  const [showContent, setShowContent] = useState(false);
  const {
    ref: containerRef,
    width: containerWidth,
    height: containerHeight,
  } = useResizeDetector<HTMLDivElement>({
    refreshMode: 'throttle',
    refreshRate: 50,
    refreshOptions: { trailing: true },
  });

  useEffect(() => {
    setShowContent(
      (containerWidth ?? 0) >
        (contentWidth ?? 0) + DEFAULT_CONTENT_PADDING * 2 &&
        (containerHeight ?? 0) >
          (contentHeight ?? 0) + DEFAULT_CONTENT_PADDING * 2,
    );
  }, [containerWidth, containerHeight, contentWidth, contentHeight]);

  return (
    <div ref={containerRef} className="panel__content__blank">
      <div
        ref={contentRef}
        className={clsx('panel__content__blank__content', {
          'panel__content__blank__content--hide': !showContent,
        })}
      >
        {children}
      </div>
    </div>
  );
};
