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

import React, { useState } from 'react';
import { useDimensions } from 'Utilities/GeneralUtil';
import ReactResizeDetector from 'react-resize-detector';
import clsx from 'clsx';

const DEFAULT_CONTENT_PADDING = 20;

export const BlankPanelContent: React.FC<{
  children: React.ReactNode;
}> = props => {
  const { children } = props;
  const [contentRef, contentDimensions] = useDimensions();
  const [showLogo, setShowLogo] = useState(false);
  const handleResize = (width: number, height: number): void => {
    setShowLogo(width > ((contentDimensions?.width ?? 0) + DEFAULT_CONTENT_PADDING * 2) && height > ((contentDimensions?.height ?? 0) + DEFAULT_CONTENT_PADDING * 2));
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
      <div className="panel__content__blank">
        <div ref={contentRef} className={clsx('panel__content__blank__content', { 'panel__content__blank__content--hide': !showLogo })}>{children}</div>
      </div>
    </ReactResizeDetector>
  );
};
