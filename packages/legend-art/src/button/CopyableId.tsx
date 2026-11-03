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

import { useRef, useState } from 'react';
import { clsx } from 'clsx';
import { Tooltip } from '../tooltip/Tooltip.js';
import { CheckIcon, CopyIcon } from '../icon/Icon.js';

type CopyableIdCopyState = 'idle' | 'copied' | 'failed';

const stopPropagation = (event: React.SyntheticEvent): void => {
  event.stopPropagation();
};

const stopEvent = (event: React.SyntheticEvent): void => {
  event.preventDefault();
  event.stopPropagation();
};

/**
 * NOTE: `async` turns a missing `navigator.clipboard` (e.g. outside a secure
 * context) into a rejection, while still calling `writeText` synchronously, inside
 * the user gesture that browsers require for clipboard writes.
 */
const writeToClipboard = async (value: string): Promise<void> => {
  await navigator.clipboard.writeText(value);
};

/**
 * An ID (or any short value) that copies itself to the clipboard when clicked, or
 * when Enter or Space is pressed on it. It is meant to sit inside clickable
 * containers (cards, list rows, accordion headers): the click, the key press and
 * the mousedown stop at the button, so the container neither navigates nor
 * ripples.
 *
 * The only feedback is the tooltip: "Copy {label}" with the full value, then
 * "Copied" (or "Copy failed") until the tooltip closes. Long values end in an
 * ellipsis; the tooltip still shows them in full. Colors and font size come from
 * the surrounding text, so it fits any theme.
 */
export const CopyableId: React.FC<{
  /** What gets copied. */
  value: string;
  /**
   * What the value is, e.g. "data product ID": the tooltip says "Copy {label}" and
   * the button is labelled "Copy {label} {value}".
   */
  label: string;
  /** What to show; defaults to the value. */
  children?: React.ReactNode;
  className?: string;
  /**
   * When the copy icon after the value shows: on hover and keyboard focus (default),
   * always, or never.
   */
  iconVisibility?: 'hover' | 'always' | 'never';
  /** Called once the value is on the clipboard, e.g. for telemetry. */
  onCopy?: ((value: string) => void) | undefined;
}> = (props) => {
  const {
    value,
    label,
    children,
    className,
    iconVisibility = 'hover',
    onCopy,
  } = props;
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const [copyState, setCopyState] = useState<CopyableIdCopyState>('idle');
  // NOTE: MUI calls `onOpen` when the enter delay that a hover started runs out,
  // judging by whether the tooltip was open when the hover began. So a click within
  // that delay is followed by an `onOpen` that would wipe the click's outcome: this
  // tells whether the tooltip is open right now.
  const isTooltipOpenRef = useRef(false);
  const setTooltipOpen = (open: boolean): void => {
    isTooltipOpenRef.current = open;
    setIsTooltipOpen(open);
  };

  const copy = (): void => {
    // keep the tooltip open to show the outcome, even if the click came before
    // the tooltip's enter delay was over
    setTooltipOpen(true);
    writeToClipboard(value)
      .then(() => {
        setCopyState('copied');
        onCopy?.(value);
      })
      .catch(() => setCopyState('failed'));
  };

  const showsCopied = copyState === 'copied' && isTooltipOpen;
  const tooltipTitle =
    copyState === 'copied' ? (
      <span className="copyable-id__tooltip__label">Copied</span>
    ) : copyState === 'failed' ? (
      <span className="copyable-id__tooltip__label">Copy failed</span>
    ) : (
      <>
        <span className="copyable-id__tooltip__label">{`Copy ${label}`}</span>
        <span className="copyable-id__tooltip__value">{value}</span>
      </>
    );

  return (
    <Tooltip
      title={tooltipTitle}
      placement="top"
      arrow={true}
      // the tooltip describes the button, whose name stays "Copy {label} {value}"
      describeChild={true}
      open={isTooltipOpen}
      onOpen={() => {
        // NOTE: the outcome of the last copy is cleared when the tooltip opens again
        // rather than when it closes, so "Copied" doesn't flip back while the
        // tooltip fades out
        if (!isTooltipOpenRef.current) {
          setCopyState('idle');
        }
        setTooltipOpen(true);
      }}
      onClose={() => setTooltipOpen(false)}
      slotProps={{
        tooltip: { className: 'copyable-id__tooltip' },
        // NOTE: the tooltip is rendered in a portal, but React still bubbles its
        // events to the container around the button
        popper: {
          onClick: stopPropagation,
          onMouseDown: stopPropagation,
          onTouchStart: stopPropagation,
        },
      }}
    >
      <button
        type="button"
        className={clsx(
          'copyable-id',
          `copyable-id--icon-${iconVisibility}`,
          {
            'copyable-id--copied': showsCopied,
          },
          className,
        )}
        aria-label={`Copy ${label} ${value}`}
        onClick={(event) => {
          stopEvent(event);
          copy();
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            // NOTE: this also cancels the click the browser would fire for Enter
            stopEvent(event);
            if (!event.repeat) {
              copy();
            }
          }
        }}
        onKeyUp={(event) => {
          // the browser fires a click when Space is released: it was handled on
          // keydown already
          if (event.key === ' ') {
            stopEvent(event);
          }
        }}
        // no ripple on a container built on MUI's ButtonBase (e.g. CardActionArea)
        onMouseDown={stopPropagation}
        onTouchStart={stopPropagation}
      >
        <span className="copyable-id__content">{children ?? value}</span>
        {iconVisibility !== 'never' && (
          <span className="copyable-id__icon" aria-hidden={true}>
            {showsCopied ? <CheckIcon /> : <CopyIcon />}
          </span>
        )}
      </button>
    </Tooltip>
  );
};
