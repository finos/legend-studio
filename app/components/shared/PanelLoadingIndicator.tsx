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

import React, { useEffect, useRef } from 'react';

export const PanelLoadingIndicator: React.FC<{
  isLoading: boolean;
}> = props => {
  const { isLoading } = props;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      if (isLoading) {
        ref.current.parentElement?.classList.add('panel-loading-indicator__container');
      } else {
        ref.current.parentElement?.classList.remove('panel-loading-indicator__container');
      }
    }
  }, [isLoading]);

  return <div ref={ref} className={`panel-loading-indicator${isLoading ? '' : '--disabled'}`} />;
};
