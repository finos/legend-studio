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
  CaretDownIcon,
  CaretRightIcon,
  MarkdownTextViewer,
} from '@finos/legend-art';
import { useMemo, useState } from 'react';
import { CUBE_FUNCTIONS_PANEL_LABEL } from '../../__lib__/LegendCubeLabels.js';
import {
  type CubeFunctionCatalogue,
  type CubeFunctionOffer,
  type CubeFunctionSignature,
  CubeFunctionCategory,
  getCubeFunctionCategory,
} from '../../graph-manager/CubeFunctionCatalogue.js';
import {
  getCubeDatabaseLabel,
  getCubeFunctionDocumentation,
} from './CubeFunctionHelp.js';

// The functions panel (EXPRESSION-EDITOR.md, round 2b): the engine's
// functions of values, and Cube's own, by category, found by name, each with
// its signatures, its documentation and how the engine's tests of it went on
// the cube's database; Insert writes a call of it at the code's cursor.

/** The first sentence of a function's documentation, as the list summarizes it */
const summaryOf = (offer: CubeFunctionOffer): string => {
  const documentation = offer.signatures[0]?.documentation.trim() ?? '';
  const [paragraph] = documentation.split(/\n\s*\n/u);
  return (
    /^(?<sentence>.*?[.!?])(?:\s|$)/su.exec(paragraph ?? '')?.groups
      ?.sentence ??
    paragraph ??
    ''
  )
    .replace(/\s+/gu, ' ')
    .replace(/`/gu, '');
};

const categoryOf = (
  offer: CubeFunctionOffer,
): CubeFunctionCategory | undefined =>
  offer.signatures[0]
    ? getCubeFunctionCategory(offer.signatures[0])
    : undefined;

/** The functions panel, behind its toggle under an expression editor */
export const CubeFunctionsPanel = (props: {
  catalogue: CubeFunctionCatalogue;
  /** The database the expression runs on, as the engine names it; none until the model's runtime tells it */
  databaseType: string | undefined;
  /** What a call is written into, e.g. `the condition` */
  target: string;
  disabled: boolean;
  /** Writes a call of the function, by its signatures, at the cursor */
  onInsert: (signatures: readonly CubeFunctionSignature[]) => void;
}) => {
  const { catalogue, databaseType, target, disabled, onInsert } = props;
  const [shown, setShown] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CubeFunctionCategory | undefined>();
  const [selectedName, setSelectedName] = useState<string | undefined>();
  const offers = useMemo(() => catalogue.browse(), [catalogue]);
  const searched = search.trim().toLowerCase();
  const listed = offers.filter(
    (offer) =>
      (category === undefined || categoryOf(offer) === category) &&
      (!searched || offer.function.name.toLowerCase().includes(searched)),
  );
  const selected = listed.find((offer) => offer.function.name === selectedName);
  const context = {
    databaseType,
    testedDatabases: catalogue.testedDatabases,
  };
  return (
    <div className="flex flex-col gap-1 text-sm">
      <button
        className="flex items-center gap-1 self-start text-base hover:text-[var(--color-text-primary)]"
        aria-expanded={shown}
        title={
          shown
            ? CUBE_FUNCTIONS_PANEL_LABEL.HIDE
            : CUBE_FUNCTIONS_PANEL_LABEL.SHOW(target)
        }
        onClick={() => setShown(!shown)}
      >
        {shown ? <CaretDownIcon /> : <CaretRightIcon />}
        {CUBE_FUNCTIONS_PANEL_LABEL.TITLE}
      </button>
      {shown && (
        <div
          aria-label={CUBE_FUNCTIONS_PANEL_LABEL.TITLE}
          className="flex flex-col gap-1 rounded-sm border border-[var(--color-border-subtle)] p-1"
        >
          <input
            className="h-6 rounded-sm border border-[var(--color-border-default)] bg-[var(--color-bg-input)] px-1 text-base"
            aria-label={CUBE_FUNCTIONS_PANEL_LABEL.SEARCH}
            placeholder={CUBE_FUNCTIONS_PANEL_LABEL.SEARCH}
            spellCheck={false}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div
            role="group"
            aria-label={CUBE_FUNCTIONS_PANEL_LABEL.CATEGORIES}
            className="flex flex-wrap gap-1"
          >
            {[undefined, ...Object.values(CubeFunctionCategory)].map((each) => (
              <button
                key={each ?? 'all'}
                className={`rounded-sm border px-1 text-xs ${
                  each === category
                    ? 'border-[var(--color-accent)] bg-[var(--color-bg-selected)]'
                    : 'border-[var(--color-border-subtle)] hover:bg-[var(--color-bg-hover)]'
                }`}
                aria-pressed={each === category}
                onClick={() => setCategory(each)}
              >
                {each ?? CUBE_FUNCTIONS_PANEL_LABEL.ALL}
              </button>
            ))}
          </div>
          <ul
            aria-label={CUBE_FUNCTIONS_PANEL_LABEL.LIST}
            className="flex max-h-40 flex-col overflow-y-auto"
          >
            {listed.map((offer) => {
              const { name } = offer.function;
              const isSelected = name === selected?.function.name;
              return (
                <li key={name}>
                  <button
                    className={`flex w-full items-baseline gap-2 rounded-sm px-1 text-left ${
                      isSelected
                        ? 'bg-[var(--color-bg-selected)]'
                        : 'hover:bg-[var(--color-bg-hover)]'
                    }`}
                    aria-pressed={isSelected}
                    onClick={() =>
                      setSelectedName(isSelected ? undefined : name)
                    }
                  >
                    <span className="font-mono">{name}</span>
                    <span className="truncate text-xs text-[var(--color-text-secondary)]">
                      {summaryOf(offer)}
                    </span>
                  </button>
                </li>
              );
            })}
            {!listed.length && (
              <li className="px-1 text-[var(--color-text-muted)]">
                {CUBE_FUNCTIONS_PANEL_LABEL.NONE}
              </li>
            )}
          </ul>
          {selected && (
            <div
              aria-label={CUBE_FUNCTIONS_PANEL_LABEL.DETAIL(
                selected.function.name,
              )}
              className="flex flex-col gap-1 border-t border-[var(--color-border-subtle)] pt-1"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold">
                  {selected.function.name}
                </span>
                {databaseType !== undefined && (
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {CUBE_FUNCTIONS_PANEL_LABEL.ON_DATABASE(
                      getCubeDatabaseLabel(databaseType),
                    )}
                  </span>
                )}
                <button
                  className="ml-auto rounded-sm border border-[var(--color-border-default)] px-2 hover:bg-[var(--color-bg-hover)] disabled:text-[var(--color-text-disabled)]"
                  disabled={disabled}
                  title={CUBE_FUNCTIONS_PANEL_LABEL.INSERT_TITLE(target)}
                  onClick={() => onInsert(selected.signatures)}
                >
                  {CUBE_FUNCTIONS_PANEL_LABEL.INSERT}
                </button>
              </div>
              <div className="max-h-60 overflow-y-auto">
                <MarkdownTextViewer
                  className="text-sm"
                  value={{
                    value: getCubeFunctionDocumentation(
                      selected.signatures,
                      context,
                    ),
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
