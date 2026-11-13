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
import { useEffect, useRef } from 'react';
import { clsx } from '@finos/legend-art';

/**
 * The scrolling message list. Given a `scrollKey`, it scrolls to the bottom
 * whenever the key changes: pass something that changes as the conversation
 * grows. A chat that scrolls itself passes its own `containerRef` instead.
 */
export const LegendAIConversation = (props: {
  children: React.ReactNode;
  className?: string | undefined;
  containerRef?: React.RefObject<HTMLDivElement | null> | undefined;
  scrollKey?: string | undefined;
  isBusy?: boolean | undefined;
}): React.ReactNode => {
  const { children, className, containerRef, scrollKey, isBusy } = props;
  const ownRef = useRef<HTMLDivElement>(null);
  const ref = containerRef ?? ownRef;
  useEffect(() => {
    const element = ref.current;
    if (scrollKey !== undefined && element) {
      element.scrollTop = element.scrollHeight;
    }
  }, [ref, scrollKey]);
  return (
    <div
      className={clsx('legend-ai__conversation', className)}
      ref={ref}
      aria-live="polite"
      aria-busy={isBusy}
    >
      {children}
    </div>
  );
};
