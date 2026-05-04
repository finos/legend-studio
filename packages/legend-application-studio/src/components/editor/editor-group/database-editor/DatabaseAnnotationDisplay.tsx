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

import { BasePopover, clsx, HashtagIcon, TagIcon } from '@finos/legend-art';
import type { StereotypeReference, TaggedValue } from '@finos/legend-graph';
import { useState } from 'react';

/**
 * Read-only display for `stereotypes` + `taggedValues` on any
 * `AnnotatedElement` (Database, Schema, Table, View, Column). Mirrors the
 * Pure DSL form `<<profile.stereo>> { tag = "value" }` but rendered as small
 * inline pills so it can sit next to a relation name in a header row, in a
 * tree row, or in a dedicated section.
 *
 * Three layout modes:
 *   - `inline` (default): pills flow next to the surrounding row content.
 *   - `block`: pills wrap into their own block (used in side-panel sections
 *     where the parent has its own column structure).
 *   - `compact`: only renders a single combined badge with the count — used
 *     when horizontal space is tight (e.g. the canvas table-node header).
 *     Hover shows the full content via `title`.
 *
 * The component is dependency-free (no MobX) so it can be used from any of
 * the editor's sub-components without observability concerns — the inputs
 * are static metamodel arrays.
 */

const formatStereotype = (stereotype: StereotypeReference): string => {
  // Pure surface syntax: `profile.stereotypeName`. We mimic that for the
  // tooltip + compact-mode label so users see the same identifier the
  // grammar uses.
  const profilePath =
    stereotype.ownerReference.valueForSerialization ??
    stereotype.value._OWNER.path;
  return `${profilePath}.${stereotype.value.value}`;
};

const formatTaggedValue = (taggedValue: TaggedValue): string => {
  // Same rationale as above — match the grammar form `profile.tag = "value"`.
  const profilePath =
    taggedValue.tag.ownerReference.valueForSerialization ??
    taggedValue.tag.value._OWNER.path;
  return `${profilePath}.${taggedValue.tag.value.value} = "${taggedValue.value}"`;
};

/**
 * Click-to-open popover badge used in compact mode. Kept separate from the
 * parent component so the `useState` hook for the popover anchor is
 * unconditionally called (the parent has an early-return for the empty case
 * which would otherwise put this hook below a conditional).
 */
function CompactAnnotationBadge(props: {
  stereotypes: StereotypeReference[];
  taggedValues: TaggedValue[];
  className?: string | undefined;
}): React.ReactElement {
  const { stereotypes, taggedValues, className } = props;
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const total = stereotypes.length + taggedValues.length;
  return (
    <>
      <button
        type="button"
        className={clsx(
          'database-annotation',
          'database-annotation--compact',
          className,
        )}
        onClick={(event) => {
          // Stop propagation so clicking the badge inside a clickable canvas
          // node header (or tree row) doesn't also trigger the parent's
          // selection handler.
          event.stopPropagation();
          setAnchor(event.currentTarget);
        }}
        title={`${total} annotation${total === 1 ? '' : 's'} \u2014 click to view`}
      >
        <TagIcon />
        <span className="database-annotation__count">{total}</span>
      </button>
      <BasePopover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <div
          className="database-annotation__popover"
          // Stop click events on the popover content from reaching the
          // ReactFlow canvas underneath.
          onClick={(event) => event.stopPropagation()}
        >
          {/* eslint-disable-next-line @typescript-eslint/no-use-before-define */}
          <DatabaseAnnotationDisplay
            stereotypes={stereotypes}
            taggedValues={taggedValues}
            layout="block"
          />
        </div>
      </BasePopover>
    </>
  );
}

export interface DatabaseAnnotationDisplayProps {
  stereotypes: StereotypeReference[];
  taggedValues: TaggedValue[];
  /** Layout density. Defaults to `inline`. */
  layout?: 'inline' | 'block' | 'compact';
  /** Optional className appended to the root element for layout overrides. */
  className?: string | undefined;
}

export const DatabaseAnnotationDisplay: React.FC<
  DatabaseAnnotationDisplayProps
> = ({ stereotypes, taggedValues, layout = 'inline', className }) => {
  if (stereotypes.length === 0 && taggedValues.length === 0) {
    return null;
  }

  // Compact: collapse everything into a single badge with the total count.
  // Useful inside dense headers (canvas table-node) where a row of pills
  // would crowd out the relation name. Click opens a popover with the full
  // list rendered in `block` layout. Extracted into its own component so
  // the `useState` hook is unconditionally called (we can't put a hook
  // after the early-return at the top of the parent).
  if (layout === 'compact') {
    return (
      <CompactAnnotationBadge
        stereotypes={stereotypes}
        taggedValues={taggedValues}
        className={className}
      />
    );
  }

  return (
    <div
      className={clsx(
        'database-annotation',
        `database-annotation--${layout}`,
        className,
      )}
    >
      {stereotypes.map((stereotype) => {
        const label = formatStereotype(stereotype);
        return (
          // Profiles can re-use stereotype names across owners, so prefix the
          // key with the owner path to keep keys unique.
          <span
            key={`stereo:${label}`}
            className="database-annotation__stereotype"
            title={`«${label}»`}
          >
            <HashtagIcon />
            <span className="database-annotation__stereotype__label">
              {stereotype.value.value}
            </span>
          </span>
        );
      })}
      {taggedValues.map((taggedValue) => {
        const tagName = taggedValue.tag.value.value;
        return (
          // Tagged values aren't unique by tag (the same tag can appear
          // twice with different values), so we key off `_UUID` rather than
          // a composite of tag path + name.
          <span
            key={taggedValue._UUID}
            className="database-annotation__tagged-value"
            title={formatTaggedValue(taggedValue)}
          >
            <TagIcon />
            <span className="database-annotation__tagged-value__name">
              {tagName}
            </span>
            <span className="database-annotation__tagged-value__sep">=</span>
            <span className="database-annotation__tagged-value__value">
              {taggedValue.value}
            </span>
          </span>
        );
      })}
    </div>
  );
};
