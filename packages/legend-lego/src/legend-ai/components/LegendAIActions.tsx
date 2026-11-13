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

import { clsx } from '@finos/legend-art';

// What the user acts on outside the conversation: a bar of actions above
// it, and cards (an approval, a sign-in) between it and the input box.

export const LegendAIActionButton = (props: {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean | undefined;
  disabled?: boolean | undefined;
  title?: string | undefined;
}): React.ReactNode => (
  <button
    type="button"
    className={clsx('legend-ai__action-btn', {
      'legend-ai__action-btn--primary': props.primary,
    })}
    disabled={props.disabled}
    title={props.title}
    onClick={props.onClick}
  >
    {props.children}
  </button>
);

/** A link drawn as an action button; it opens in a new tab, so the chat stays. */
export const LegendAIActionLink = (props: {
  href: string;
  children: React.ReactNode;
  primary?: boolean | undefined;
}): React.ReactNode => (
  <a
    className={clsx('legend-ai__action-btn', {
      'legend-ai__action-btn--primary': props.primary,
    })}
    href={props.href}
    target="_blank"
    rel="noopener noreferrer"
  >
    {props.children}
  </a>
);

export const LegendAIActionBar = (props: {
  children: React.ReactNode;
}): React.ReactNode => (
  <div className="legend-ai__actions">{props.children}</div>
);

/**
 * Something waiting on the user: what it is, an optional preview (text, shown
 * as written, or any element, e.g. a table), and the actions.
 */
export const LegendAIActionCard = (props: {
  title: React.ReactNode;
  preview?: React.ReactNode;
  children: React.ReactNode;
}): React.ReactNode => (
  <div className="legend-ai__card">
    <div className="legend-ai__card-title">{props.title}</div>
    {typeof props.preview === 'string' ? (
      <pre className="legend-ai__card-preview">{props.preview}</pre>
    ) : (
      props.preview !== undefined && (
        <div className="legend-ai__card-preview">{props.preview}</div>
      )
    )}
    <div className="legend-ai__card-actions">{props.children}</div>
  </div>
);

/** Between the conversation and the input box; hidden while empty. */
export const LegendAIWaitingArea = (props: {
  children: React.ReactNode;
}): React.ReactNode => (
  <div className="legend-ai__waiting">{props.children}</div>
);
