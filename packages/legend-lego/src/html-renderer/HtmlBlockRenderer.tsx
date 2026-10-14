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

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FC,
} from 'react';

/**
 * Renders a raw HTML payload inside a sandboxed same-origin iframe.
 *
 * Using an iframe (with `srcDoc`) rather than injecting the HTML directly
 * into the host DOM guarantees that:
 *
 *   - Global CSS embedded in the payload (e.g. `* { margin:0; }` or
 *     `body { font: ... }`) cannot leak into and clobber the surrounding
 *     application UI.
 *   - Scripts embedded in the payload are constrained by the `sandbox`
 *     attribute (only `allow-same-origin` is granted so we can measure
 *     the document height from the parent; scripts are NOT enabled).
 *
 * Callers that want theme-aware defaults (colours, typography, table
 * styling, etc.) pass a stylesheet via `iframeStyles`; the component
 * itself is theme-agnostic and injects nothing beyond the caller-supplied
 * CSS. This keeps the renderer reusable across products while allowing
 * each host to own its own visual language.
 *
 * The iframe height auto-syncs to the content height via a
 * `ResizeObserver` attached to the iframe document body.
 */
export const HtmlBlockRenderer: FC<{
  htmlContent: string;
  title?: string | undefined;
  /**
   * Optional CSS injected at the top of the iframe document. Use this
   * to apply host-specific typography, colours, and element defaults
   * (e.g. table styling). The payload can still override any rule with
   * its own inline CSS.
   */
  iframeStyles?: string | undefined;
}> = ({ htmlContent, title, iframeStyles }) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | undefined>(undefined);
  const [height, setHeight] = useState<number>(0);

  const srcDoc = useMemo(() => {
    if (iframeStyles === undefined || iframeStyles.length === 0) {
      return htmlContent;
    }
    // Neutralize any `</style>` sequence in the caller-supplied CSS so it
    // cannot close the `<style>` block early and inject arbitrary HTML
    // (or, if the sandbox is ever relaxed, scripts) into the iframe
    // document.
    const safeIframeStyles = iframeStyles.replace(/<\/style>/gi, '<\\/style>');
    return `<style>${safeIframeStyles}</style>${htmlContent}`;
  }, [htmlContent, iframeStyles]);

  const measureAndUpdate = useCallback(() => {
    const iframe = iframeRef.current;
    const body = iframe?.contentDocument?.body;
    if (!body) {
      return;
    }
    // `scrollHeight` accounts for content below the fold; add a small
    // buffer so the iframe never shows an internal scrollbar.
    const nextHeight = body.scrollHeight + 4;
    setHeight((prev) => (prev === nextHeight ? prev : nextHeight));
  }, []);

  const handleLoad = useCallback(() => {
    measureAndUpdate();
    const iframe = iframeRef.current;
    const body = iframe?.contentDocument?.body;
    if (!body) {
      return;
    }
    // The iframe reloads whenever `srcDoc` changes; disconnect any prior
    // observer before wiring a new one so we don't leak listeners across
    // content or style updates.
    resizeObserverRef.current?.disconnect();
    const observer = new ResizeObserver(() => measureAndUpdate());
    observer.observe(body);
    resizeObserverRef.current = observer;
  }, [measureAndUpdate]);

  useEffect(
    () => () => {
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = undefined;
    },
    [],
  );

  return (
    <div className="html-block-renderer">
      {title !== undefined && title.length > 0 && (
        <div className="html-block-renderer__title">{title}</div>
      )}
      <iframe
        ref={iframeRef}
        title={title ?? 'HTML content'}
        className="html-block-renderer__frame"
        sandbox="allow-same-origin"
        srcDoc={srcDoc}
        onLoad={handleLoad}
        style={{ height: height ? `${height}px` : undefined }}
      />
    </div>
  );
};
