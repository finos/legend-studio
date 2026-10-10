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
  ChartIcon,
  ChevronRightIcon,
  Dialog,
  Modal,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
  ModalHeader,
  ShoppingCartIcon,
  TrophyIcon,
} from '@finos/legend-art';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { Fragment, useMemo } from 'react';
import type { CubeEditorState } from '../../stores/CubeEditorState.js';
import type {
  CubeExample,
  CubeExampleDataset,
} from '../../stores/CubeExamples.js';
import { CubeNodeIcon } from '../CubeNodeIcon.js';

/** Each dataset's icon, by dataset id */
const DATASET_ICONS: Readonly<
  Record<string, React.FC<{ className?: string }>>
> = {
  northwind: ShoppingCartIcon,
  sports: TrophyIcon,
  trades: ChartIcon,
};

const DatasetIcon = (props: { dataset: string; className: string }) => {
  const Icon = DATASET_ICONS[props.dataset] ?? ChartIcon;
  return <Icon className={props.className} />;
};

const CARD =
  'flex h-full w-full flex-col gap-1 rounded-sm border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] p-3 text-left hover:border-[var(--color-accent)] hover:bg-[var(--color-bg-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]';

/** A dataset: starts a new cube on its model */
const DatasetCard = observer(
  (props: { editorState: CubeEditorState; dataset: CubeExampleDataset }) => {
    const { editorState, dataset } = props;
    return (
      <button
        type="button"
        className={`${CARD} border-l-4 border-l-[var(--color-accent)]`}
        title={`Start a new cube on ${dataset.name}, from its first table`}
        onClick={() => editorState.examples.startOnDataset(dataset)}
      >
        <span className="flex items-center gap-2 text-lg font-medium text-[var(--color-text-primary)]">
          <DatasetIcon
            dataset={dataset.id}
            className="shrink-0 text-xl text-[var(--color-accent)]"
          />
          {dataset.name}
        </span>
        <span className="text-base text-[var(--color-text-secondary)]">
          {dataset.description}
        </span>
        <span className="mt-auto pt-1 text-sm text-[var(--color-text-muted)]">
          {dataset.tables.join(' · ')}
        </span>
        <span className="text-sm text-[var(--color-accent)]">
          Start a new cube →
        </span>
      </button>
    );
  },
);

/** An example cube: opens in place of the cube and runs */
const ExampleCard = observer(
  (props: { editorState: CubeEditorState; example: CubeExample }) => {
    const { editorState, example } = props;
    const { registry } = editorState;
    // the example's nodes, in order, as their icons
    const steps = useMemo(
      () =>
        example
          .createDocument()
          .query.nodes.map((node) => registry.get(node.type))
          .filter((definition) => definition !== undefined)
          .map((definition) => ({
            icon: definition.icon,
            label: definition.label,
          })),
      [example, registry],
    );
    return (
      <button
        type="button"
        className={CARD}
        title={`Open ${example.name}: it replaces this cube and runs`}
        onClick={() => {
          flowResult(editorState.examples.openExample(example)).catch(
            editorState.host.applicationStore.alertUnhandledError,
          );
        }}
      >
        <span className="flex items-center gap-2 text-base font-medium text-[var(--color-text-primary)]">
          <DatasetIcon
            dataset={example.dataset}
            className="shrink-0 text-[var(--color-text-secondary)]"
          />
          {example.name}
        </span>
        <span className="text-sm text-[var(--color-text-secondary)]">
          {example.description}
        </span>
        <span
          className="mt-auto flex flex-wrap items-center gap-1 pt-2 text-[var(--color-text-muted)]"
          aria-label={`Steps: ${steps.map((step) => step.label).join(', ')}`}
        >
          {steps.map((step, index) => (
            // eslint-disable-next-line react/no-array-index-key
            <Fragment key={index}>
              {index > 0 && <ChevronRightIcon className="text-xs" />}
              <span title={step.label}>
                <CubeNodeIcon icon={step.icon} />
              </span>
            </Fragment>
          ))}
        </span>
      </button>
    );
  },
);

/**
 * The Examples dialog (PLAN §6.9): a row per sample dataset, its card first,
 * then its example cubes. Either replaces the cube, and Undo brings it back.
 */
export const CubeExamplesDialog = observer(
  (props: { editorState: CubeEditorState }) => {
    const { editorState } = props;
    const { examples } = editorState;
    const { applicationStore } = editorState.host;
    const darkMode =
      !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled;
    return (
      <Dialog open={examples.isOpen} onClose={() => examples.close()}>
        <Modal darkMode={darkMode} className="w-[960px] max-w-full">
          <ModalHeader>
            <div className="modal__title">Examples</div>
          </ModalHeader>
          <ModalBody>
            <div className="mb-3 text-base text-[var(--color-text-secondary)]">
              Sample data to explore. Open an example cube, or start a new cube
              on a dataset. Either replaces this cube: Undo brings it back.
            </div>
            <div
              className="grid grid-cols-1 gap-3 sm:grid-cols-3"
              aria-label="Examples"
            >
              {examples.datasets.map((dataset) => (
                <Fragment key={dataset.id}>
                  <DatasetCard editorState={editorState} dataset={dataset} />
                  {examples.examplesOf(dataset).map((example) => (
                    <ExampleCard
                      key={example.id}
                      editorState={editorState}
                      example={example}
                    />
                  ))}
                </Fragment>
              ))}
            </div>
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              darkMode={darkMode}
              formatText={false}
              type="secondary"
              text="Close"
              onClick={() => examples.close()}
            />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);
