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

import { BasePopper } from '@finos/legend-art';
import { noop } from '@finos/legend-shared';
import { observer } from 'mobx-react-lite';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CUBE_TOUR_ANCHOR_ATTRIBUTE,
  CUBE_TOUR_LABEL,
  type CUBE_TOUR_ANCHOR,
  type CubeTourStep,
} from '../../__lib__/LegendCubeTour.js';
import type { CubeEditorState } from '../../stores/CubeEditorState.js';
import { CubeButton } from '../CubeButton.js';

/**
 * Above the canvas, the grid and the node editor (1250), below MUI's dialogs
 * (1300); inside the dialog that hosts the page, if one does
 */
export const CUBE_TOUR_Z_INDEX = 1290;

/** Room around the controls shown, and between them and the card */
const PADDING = 4;
const GAP = 12;
/** The card's width (Legend's root is 62.5%, so it is written in pixels) */
const CARD_WIDTH = 340;
const DIM = 'rgba(0, 0, 0, 0.45)';

const MODIFIERS = [
  { name: 'offset', options: { offset: [0, GAP + PADDING] } },
  { name: 'flip', options: { padding: GAP } },
  {
    name: 'preventOverflow',
    options: { rootBoundary: 'viewport', padding: GAP, altAxis: true },
  },
];

type CubePopperInstance = NonNullable<
  Extract<
    React.ComponentProps<typeof BasePopper>['popperRef'],
    React.RefObject<unknown>
  >['current']
>;

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** The page's controls that carry the anchor */
const findAnchored = (root: Element, anchor: CUBE_TOUR_ANCHOR): Element[] =>
  Array.from(
    root.querySelectorAll(`[${CUBE_TOUR_ANCHOR_ATTRIBUTE}~="${anchor}"]`),
  );

/** The box around the anchor's controls that have a size; none if none has */
const boxOf = (root: Element, anchor: CUBE_TOUR_ANCHOR): Box | undefined =>
  findAnchored(root, anchor)
    .map((element) => element.getBoundingClientRect())
    .filter((rect) => rect.width > 0 || rect.height > 0)
    .reduce<Box | undefined>((box, rect) => {
      if (!box) {
        return {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        };
      }
      const left = Math.min(box.left, rect.left);
      const top = Math.min(box.top, rect.top);
      return {
        left,
        top,
        width: Math.max(box.left + box.width, rect.right) - left,
        height: Math.max(box.top + box.height, rect.bottom) - top,
      };
    }, undefined);

const isSameBox = (a: Box | undefined, b: Box | undefined): boolean =>
  a === b ||
  (a !== undefined &&
    b !== undefined &&
    a.left === b.left &&
    a.top === b.top &&
    a.width === b.width &&
    a.height === b.height);

/**
 * The editor's guided tour (PLAN §11.21): the page dimmed but for the
 * current step's controls, and a card beside them, or in the middle of the
 * page for a step that points at nothing. The controls are followed as the
 * page moves them (a panel resized, the grid loaded). Clicks on the page
 * are held while it shows; Esc ends it, the arrow keys move through it.
 */
export const CubeTour = observer(
  (props: {
    editorState: CubeEditorState;
    /** The page, whose controls the steps point at */
    root: HTMLElement | null;
  }) => {
    const { editorState, root } = props;
    const { tour } = editorState;
    const { step } = tour;
    const titleId = useId();
    const textId = useId();
    const [box, setBox] = useState<Box | undefined>(undefined);
    const popperRef = useRef<CubePopperInstance>(null);
    const isShown = useMemo(
      () =>
        (candidate: CubeTourStep): boolean =>
          candidate.anchor === undefined ||
          (root !== null && findAnchored(root, candidate.anchor).length > 0),
      [root],
    );

    // the step's controls followed, frame by frame, while it shows
    const anchor = step?.anchor;
    useEffect(() => {
      if (anchor === undefined || !root) {
        setBox(undefined);
        return undefined;
      }
      let frame = 0;
      const follow = (): void => {
        const next = boxOf(root, anchor);
        setBox((current) => (isSameBox(current, next) ? current : next));
        frame = requestAnimationFrame(follow);
      };
      follow();
      return () => cancelAnimationFrame(frame);
    }, [anchor, root]);
    useEffect(() => {
      popperRef.current?.update().catch(noop());
    }, [box]);

    // the tour's keys come first: the page's shortcuts wait while it shows
    const isOpen = step !== undefined;
    useEffect(() => {
      if (!isOpen) {
        return undefined;
      }
      const onKeyDown = (event: KeyboardEvent): void => {
        if (event.key === 'Escape') {
          tour.close();
        } else if (event.key === 'ArrowRight') {
          tour.move(1, isShown);
        } else if (event.key === 'ArrowLeft') {
          tour.move(-1, isShown);
        } else {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
      };
      window.addEventListener('keydown', onKeyDown, true);
      return () => window.removeEventListener('keydown', onKeyDown, true);
    }, [isOpen, tour, isShown]);

    const spotlight = useMemo(
      () =>
        box && {
          left: box.left - PADDING,
          top: box.top - PADDING,
          width: box.width + 2 * PADDING,
          height: box.height + 2 * PADDING,
        },
      [box],
    );
    // the popper reads the spotlight wherever it places the card
    const latest = useRef(spotlight);
    latest.current = spotlight;
    const virtualAnchor = useMemo(
      () => ({
        getBoundingClientRect: (): DOMRect => {
          const current = latest.current ?? {
            left: 0,
            top: 0,
            width: 0,
            height: 0,
          };
          return DOMRect.fromRect({
            x: current.left,
            y: current.top,
            width: current.width,
            height: current.height,
          });
        },
      }),
      [],
    );

    if (!step || !root) {
      return null;
    }
    // counted over the whole tour, steady while an example loads and adds
    // the controls of later steps; a step skipped skips its number
    const position = tour.index + 1;
    const isLast = tour.steps.filter(isShown).at(-1) === step;
    // a page hosted in a dialog, as Studio hosts Cube, keeps the tour in the
    // dialog's layer, above the page
    const container =
      root.closest<HTMLElement>('.MuiDialog-root') ?? root.ownerDocument.body;
    const card = (
      <div
        // a new card for each step, so its Next button takes the focus
        key={tour.index}
        className="legend-cube__tour flex flex-col gap-2 rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-elevated)] p-3 text-[var(--color-text-primary)] shadow-lg"
        style={{ width: CARD_WIDTH, maxWidth: `calc(100vw - ${2 * GAP}px)` }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={textId}
      >
        <div className="flex items-baseline gap-2">
          <h2 id={titleId} className="min-w-0 flex-1 text-lg font-medium">
            {step.title}
          </h2>
          <span className="shrink-0 text-sm text-[var(--color-text-secondary)]">
            {CUBE_TOUR_LABEL.progress(position, tour.steps.length)}
          </span>
        </div>
        <p id={textId} className="text-base leading-snug">
          {step.text}
          {tour.openedExample && tour.index === 0 && (
            <> {CUBE_TOUR_LABEL.EXAMPLE_OPENED}</>
          )}
        </p>
        <div className="flex items-center gap-2">
          {!isLast && (
            <button
              type="button"
              className="text-sm text-[var(--color-text-secondary)] underline hover:text-[var(--color-text-primary)]"
              onClick={() => tour.close()}
            >
              {CUBE_TOUR_LABEL.END}
            </button>
          )}
          <span className="flex-1" />
          {position > 1 && (
            <CubeButton onClick={() => tour.move(-1, isShown)}>
              {CUBE_TOUR_LABEL.BACK}
            </CubeButton>
          )}
          <CubeButton
            primary={true}
            // the keyboard follows the tour: Enter moves on
            autoFocus={true}
            onClick={() => tour.move(1, isShown)}
          >
            {isLast ? CUBE_TOUR_LABEL.DONE : CUBE_TOUR_LABEL.NEXT}
          </CubeButton>
        </div>
      </div>
    );
    return createPortal(
      <div
        className="legend-cube__tour-layer"
        style={{ position: 'fixed', inset: 0, zIndex: CUBE_TOUR_Z_INDEX }}
        // the page underneath takes no clicks, and shows no menu, meanwhile
        onContextMenu={(event) => event.preventDefault()}
      >
        {spotlight ? (
          <>
            <div
              aria-hidden={true}
              style={{
                position: 'fixed',
                ...spotlight,
                borderRadius: 6,
                boxShadow: `0 0 0 2px var(--color-accent), 0 0 0 9999px ${DIM}`,
                pointerEvents: 'none',
              }}
            />
            <BasePopper
              open={true}
              role="presentation"
              popperRef={popperRef}
              anchorEl={virtualAnchor}
              container={container}
              placement={step.placement ?? 'bottom'}
              modifiers={MODIFIERS}
              style={{ zIndex: CUBE_TOUR_Z_INDEX + 1 }}
            >
              {card}
            </BasePopper>
          </>
        ) : (
          <div
            className="flex items-center justify-center"
            style={{ position: 'fixed', inset: 0, background: DIM }}
          >
            {card}
          </div>
        )}
      </div>,
      container,
    );
  },
);
