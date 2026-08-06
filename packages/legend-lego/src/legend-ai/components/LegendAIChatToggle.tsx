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

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { clsx, SparkleStarsIcon } from '@finos/legend-art';

interface ToggleAnchor {
  horizontal: 'left' | 'right';
  vertical: 'top' | 'bottom';
  x: number;
  y: number;
}

const DRAG_THRESHOLD_PX = 4;
const EDGE_MARGIN_PX = 12;

let lastToggleAnchor: ToggleAnchor | undefined;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), Math.max(min, max));

const anchorFromRect = (rect: DOMRect): ToggleAnchor => {
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const horizontal = centerX < window.innerWidth / 2 ? 'left' : 'right';
  const vertical = centerY < window.innerHeight / 2 ? 'top' : 'bottom';
  return {
    horizontal,
    vertical,
    x: Math.max(
      EDGE_MARGIN_PX,
      horizontal === 'left' ? rect.left : window.innerWidth - rect.right,
    ),
    y: Math.max(
      EDGE_MARGIN_PX,
      vertical === 'top' ? rect.top : window.innerHeight - rect.bottom,
    ),
  };
};

/**
 * Floating launcher for the Legend AI chat. Acts as a click-to-open button until
 * dragged past a small threshold, then docks to the nearest corner so the user
 * can move it clear of transient notifications in the bottom-right. The docked
 * position is remembered for the session and re-clamped to the current viewport.
 */
export const LegendAIChatToggle = (props: {
  label: string;
  onOpen: () => void;
}): React.ReactNode => {
  const { label, onOpen } = props;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [anchor, setAnchor] = useState<ToggleAnchor | undefined>(
    lastToggleAnchor,
  );
  const [isDragging, setIsDragging] = useState(false);
  const dragOrigin = useRef<
    { pointerX: number; pointerY: number; anchor: ToggleAnchor } | undefined
  >(undefined);
  const didDrag = useRef(false);

  const clampAnchorToViewport = useCallback(
    (current: ToggleAnchor, element: HTMLButtonElement): ToggleAnchor => ({
      ...current,
      x: clamp(
        current.x,
        EDGE_MARGIN_PX,
        window.innerWidth - element.offsetWidth - EDGE_MARGIN_PX,
      ),
      y: clamp(
        current.y,
        EDGE_MARGIN_PX,
        window.innerHeight - element.offsetHeight - EDGE_MARGIN_PX,
      ),
    }),
    [],
  );

  useLayoutEffect(() => {
    const element = buttonRef.current;
    if (!element) {
      return undefined;
    }
    const reclamp = (): void =>
      setAnchor((current) =>
        current ? clampAnchorToViewport(current, element) : current,
      );
    reclamp();
    window.addEventListener('resize', reclamp);
    return () => window.removeEventListener('resize', reclamp);
  }, [clampAnchorToViewport]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>): void => {
      const element = event.currentTarget;
      element.setPointerCapture(event.pointerId);
      dragOrigin.current = {
        pointerX: event.clientX,
        pointerY: event.clientY,
        anchor: anchor ?? anchorFromRect(element.getBoundingClientRect()),
      };
      didDrag.current = false;
    },
    [anchor],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>): void => {
      const origin = dragOrigin.current;
      if (!origin) {
        return;
      }
      const dx = event.clientX - origin.pointerX;
      const dy = event.clientY - origin.pointerY;
      if (!didDrag.current && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) {
        return;
      }
      didDrag.current = true;
      setIsDragging(true);
      const moved: ToggleAnchor = {
        ...origin.anchor,
        x: origin.anchor.x + (origin.anchor.horizontal === 'left' ? dx : -dx),
        y: origin.anchor.y + (origin.anchor.vertical === 'top' ? dy : -dy),
      };
      setAnchor(clampAnchorToViewport(moved, event.currentTarget));
    },
    [clampAnchorToViewport],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>): void => {
      const element = event.currentTarget;
      if (element.hasPointerCapture(event.pointerId)) {
        element.releasePointerCapture(event.pointerId);
      }
      if (didDrag.current) {
        const docked = anchorFromRect(element.getBoundingClientRect());
        lastToggleAnchor = docked;
        setAnchor(docked);
      }
      dragOrigin.current = undefined;
      setIsDragging(false);
    },
    [],
  );

  const handlePointerCancel = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>): void => {
      const element = event.currentTarget;
      if (element.hasPointerCapture(event.pointerId)) {
        element.releasePointerCapture(event.pointerId);
      }
      dragOrigin.current = undefined;
      didDrag.current = false;
      setIsDragging(false);
    },
    [],
  );

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>): void => {
      const wasDragged = event.detail !== 0 && didDrag.current;
      didDrag.current = false;
      if (wasDragged) {
        return;
      }
      onOpen();
    },
    [onOpen],
  );

  const style: React.CSSProperties | undefined = anchor
    ? {
        left: anchor.horizontal === 'left' ? anchor.x : 'auto',
        right: anchor.horizontal === 'right' ? anchor.x : 'auto',
        top: anchor.vertical === 'top' ? anchor.y : 'auto',
        bottom: anchor.vertical === 'bottom' ? anchor.y : 'auto',
      }
    : undefined;

  return (
    <button
      ref={buttonRef}
      type="button"
      className={clsx('legend-ai-chat-toggle', {
        'legend-ai-chat-toggle--dragging': isDragging,
      })}
      style={style}
      title={label}
      aria-label={label}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onClick={handleClick}
    >
      <span className="legend-ai-chat-toggle__icon">
        <SparkleStarsIcon />
      </span>
      <span className="legend-ai-chat-toggle__label">{label}</span>
    </button>
  );
};
