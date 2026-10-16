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
  Dialog,
  Modal,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
  ModalHeader,
  TimesIcon,
} from '@finos/legend-art';
import {
  buildCubeRunningStepLambda,
  CubeButton,
  CubeEditor,
  formatDisabledReasons,
  type CubeEditorState,
} from '@finos/legend-cube-builder';
import type { IngestDefinition } from '@finos/legend-graph';
import { noop, type PlainObject } from '@finos/legend-shared';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import type { EmbeddedCubeState } from '../../../stores/editor/embedded-cube/EmbeddedCubeState.js';
import { LegendStudioCubeHost } from '../../../stores/editor/embedded-cube/LegendStudioCubeHost.js';

export const EMBEDDED_CUBE_TEST_ID = {
  DIALOG: 'embedded-cube__dialog',
  ADD_MATERIALIZED_VIEW: 'embedded-cube__add-materialized-view',
  SAVE_MATERIALIZED_VIEW: 'embedded-cube__save-materialized-view',
};

/**
 * The classification of the view's data: one of the classifications a data
 * product's access points offer, or typed when Studio's config gives none
 */
const MaterializedViewClassification = observer(
  (props: {
    embeddedCubeState: EmbeddedCubeState;
    sensitivity: string;
    setSensitivity: (sensitivity: string) => void;
  }) => {
    const { embeddedCubeState, sensitivity, setSensitivity } = props;
    const { classifications } = embeddedCubeState;
    return (
      <label className="flex flex-col gap-1 text-base">
        Data classification
        {classifications.length ? (
          <select
            className="input--dark h-8 rounded-sm px-2"
            aria-label="Data classification"
            value={sensitivity}
            onChange={(event) => setSensitivity(event.target.value)}
          >
            <option value="" disabled={true}>
              Pick a classification
            </option>
            {classifications.map((classification) => (
              <option key={classification} value={classification}>
                {classification}
              </option>
            ))}
          </select>
        ) : (
          <input
            className="input--dark h-8 rounded-sm px-2"
            aria-label="Data classification"
            placeholder="Classification"
            spellCheck={false}
            value={sensitivity}
            onChange={(event) => setSensitivity(event.target.value)}
          />
        )}
      </label>
    );
  },
);

/**
 * The view's primary key: none or some of the columns it can take, those of
 * the step that runs but the milestoning ones, kept in the order of the
 * columns
 */
const MaterializedViewPrimaryKey: React.FC<{
  columns: readonly string[];
  primaryKey: readonly string[];
  setPrimaryKey: (primaryKey: string[]) => void;
}> = ({ columns, primaryKey, setPrimaryKey }) => (
  <fieldset className="flex min-w-0 flex-col gap-1 text-base">
    <legend>Primary key</legend>
    <span className="text-sm text-[var(--color-text-muted)]">
      The columns that identify a row, if any
    </span>
    <ul className="max-h-40 overflow-auto" aria-label="Primary key columns">
      {columns.map((column) => (
        <li key={column}>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={primaryKey.includes(column)}
              onChange={() =>
                setPrimaryKey(
                  primaryKey.includes(column)
                    ? primaryKey.filter((each) => each !== column)
                    : columns.filter(
                        (each) => each === column || primaryKey.includes(each),
                      ),
                )
              }
            />
            <span className="min-w-0 truncate">{column}</span>
          </label>
        </li>
      ))}
    </ul>
  </fieldset>
);

/** What a header button gives its dialog */
interface MaterializedViewDialogInput {
  /** The step that runs, as a lambda with no runtime and no row limit */
  readonly lambda: PlainObject;
  /** The columns of the step that runs, the view's; none when Cube doesn't know them */
  readonly columns: readonly string[] | undefined;
  /** Why Save MatView asks again; none to add a new view */
  readonly saveProblems?: readonly string[] | undefined;
}

/**
 * Names the materialized view, classifies its data and picks its primary
 * key, then adds it to the ingest definition (Add MatView). For the view
 * opened to edit, asks again for what it can't be saved with as it was, the
 * classification of its data or a primary key whose column is gone, then
 * saves it in place (Save MatView)
 */
const MaterializedViewDialog = observer(
  (props: {
    embeddedCubeState: EmbeddedCubeState;
    input: MaterializedViewDialogInput;
    close: () => void;
  }) => {
    const { embeddedCubeState, input, close } = props;
    const { lambda, saveProblems } = input;
    const saved = saveProblems ? embeddedCubeState.matViewDataSet : undefined;
    // the columns the key can take; a view saved when Cube doesn't know the
    // step's columns keeps its key
    const columns = embeddedCubeState.getMaterializedViewKeyColumns(
      input.columns ?? saved?.primaryKey ?? [],
    );
    // as Cube's dialogs: the dialog follows the theme, and its primary button
    // is an accent button in every theme (legend-art's light one is grey)
    const darkMode =
      !embeddedCubeState.editorStore.applicationStore.layoutService
        .TEMPORARY__isLightColorThemeEnabled;
    const [name, setName] = useState('');
    // a view saved again starts on its own classification, if it can keep it,
    // and on the columns of its key the step still has
    const [sensitivity, setSensitivity] = useState(() =>
      saved?.sensitivity !== undefined &&
      embeddedCubeState.getMaterializedViewClassificationProblem(
        saved.sensitivity,
      ) === undefined
        ? saved.sensitivity
        : '',
    );
    const [primaryKey, setPrimaryKey] = useState(() =>
      columns.filter((column) => saved?.primaryKey.includes(column)),
    );
    const nameProblem = saveProblems
      ? undefined
      : embeddedCubeState.getMaterializedViewNameProblem(name);
    const problem =
      nameProblem ??
      embeddedCubeState.getMaterializedViewClassificationProblem(sensitivity);
    const verb = saveProblems ? 'Save' : 'Add';
    const confirm = (): void => {
      if (problem !== undefined) {
        return;
      }
      if (saveProblems) {
        embeddedCubeState.saveMaterializedView(lambda, {
          primaryKey,
          sensitivity,
        });
      } else {
        embeddedCubeState.addMaterializedView(name, lambda, {
          primaryKey,
          sensitivity,
        });
      }
    };
    return (
      <Dialog open={true} onClose={close}>
        <Modal darkMode={darkMode} className="w-[440px] max-w-full">
          <ModalHeader>
            <div className="modal__title">{`${verb} MatView`}</div>
          </ModalHeader>
          <ModalBody>
            <form
              className="flex flex-col gap-2"
              data-testid={
                saveProblems
                  ? EMBEDDED_CUBE_TEST_ID.SAVE_MATERIALIZED_VIEW
                  : EMBEDDED_CUBE_TEST_ID.ADD_MATERIALIZED_VIEW
              }
              onSubmit={(event) => {
                event.preventDefault();
                confirm();
              }}
            >
              {saveProblems ? (
                <>
                  <div className="text-base">
                    {`${embeddedCubeState.matView} of ${embeddedCubeState.ingest?.name ?? 'the ingest definition'} can't be saved as it was:`}
                  </div>
                  <ul
                    aria-label="Why Save MatView asks"
                    className="list-disc pl-5 text-sm text-[var(--color-status-warn)]"
                  >
                    {saveProblems.map((each) => (
                      <li key={each}>{each}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <>
                  <label className="flex flex-col gap-1 text-base">
                    {`A data set of ${embeddedCubeState.ingest?.name ?? 'the ingest definition'}, whose rows are the cube's`}
                    <input
                      className="input--dark h-8 rounded-sm px-2"
                      aria-label="Materialized view name"
                      placeholder="Name"
                      spellCheck={false}
                      autoFocus={true}
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                    />
                  </label>
                  {name.trim() && nameProblem && (
                    <div className="text-sm text-[var(--color-status-error)]">
                      {nameProblem}
                    </div>
                  )}
                </>
              )}
              <MaterializedViewClassification
                embeddedCubeState={embeddedCubeState}
                sensitivity={sensitivity}
                setSensitivity={setSensitivity}
              />
              <MaterializedViewPrimaryKey
                columns={columns}
                primaryKey={primaryKey}
                setPrimaryKey={setPrimaryKey}
              />
            </form>
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              darkMode={true}
              formatText={false}
              text={verb}
              title={problem ?? `${verb} the materialized view`}
              disabled={problem !== undefined}
              onClick={confirm}
            />
            <ModalFooterButton
              darkMode={darkMode}
              formatText={false}
              type="secondary"
              text="Cancel"
              onClick={close}
            />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);

/**
 * Cube's header button: the step that runs, as a lambda with no runtime and
 * no row limit, becomes a materialized view of the ingest definition (Add
 * MatView, named, classified and keyed in a dialog), or replaces the one
 * opened to edit (Save MatView), at once unless its classification or its
 * key must be asked again
 */
const MaterializedViewButton = observer(
  (props: {
    embeddedCubeState: EmbeddedCubeState;
    editorState: CubeEditorState;
  }) => {
    const { embeddedCubeState, editorState } = props;
    const { execution } = editorState;
    const { matView } = embeddedCubeState;
    const [dialogInput, setDialogInput] = useState<
      MaterializedViewDialogInput | undefined
    >();
    const [isBuilding, setIsBuilding] = useState(false);
    const start = (): void => {
      // the open step editor's edits go in first, as for Execute
      if (!editorState.nodeEditor.finishApplied()) {
        return;
      }
      // the columns of the step that runs, read with its lambda
      const selected = editorState.document.query.selected;
      const columns = (
        selected === undefined
          ? undefined
          : editorState.analysis.schemas.get(selected)
      )?.columns.map((column) => column.name);
      setIsBuilding(true);
      buildCubeRunningStepLambda(editorState)
        .then((lambda) => {
          if (matView === undefined) {
            setDialogInput({ lambda, columns });
            return;
          }
          const saveProblems =
            embeddedCubeState.getMaterializedViewSaveProblems(columns);
          if (saveProblems.length) {
            setDialogInput({ lambda, columns, saveProblems });
          } else {
            embeddedCubeState.saveMaterializedView(lambda);
          }
        })
        .catch(editorState.host.applicationStore.alertUnhandledError)
        .finally(() => setIsBuilding(false));
    };
    return (
      <>
        <CubeButton
          primary={true}
          title={
            !execution.canExecute
              ? formatDisabledReasons(execution.disabledReasons)
              : matView === undefined
                ? 'Add the step that runs to the ingest definition, as a materialized view'
                : `Replace materialized view ${matView} with the step that runs`
          }
          disabled={!execution.canExecute || isBuilding}
          onClick={start}
        >
          {matView === undefined ? 'Add MatView' : 'Save MatView'}
        </CubeButton>
        {dialogInput && (
          <MaterializedViewDialog
            embeddedCubeState={embeddedCubeState}
            input={dialogInput}
            close={() => setDialogInput(undefined)}
          />
        )}
      </>
    );
  },
);

/**
 * Legend Cube, full screen over the editor, building a materialized view of
 * the ingest definition it was opened from (Create MatView), or
 * editing one of its views, read back into the cube (Edit MatView). Loaded
 * on the first opening, with Cube (`EmbeddedCube`)
 */
export const EmbeddedCubeEditor = observer(
  (props: {
    embeddedCubeState: EmbeddedCubeState;
    ingest: IngestDefinition;
  }) => {
    const { embeddedCubeState, ingest } = props;
    const { editorStore } = embeddedCubeState;
    // a new host for each opening, so each starts on an empty cube
    const [host] = useState(
      () => new LegendStudioCubeHost(editorStore, ingest),
    );
    const { matView } = embeddedCubeState;
    // the view as it was when opened: the cube is read from it once
    const [initialLambda] = useState(() => {
      const lambda = embeddedCubeState.matViewLambda;
      return lambda && matView !== undefined
        ? { lambda, label: `materialized view ${matView}` }
        : undefined;
    });
    const darkMode =
      !editorStore.applicationStore.layoutService
        .TEMPORARY__isLightColorThemeEnabled;
    return (
      <Dialog
        open={true}
        onClose={noop} // closed by its own button only, so a cube isn't lost by Escape
        classes={{
          root: 'editor-modal__root-container',
          container: 'editor-modal__container',
          paper:
            'editor-modal__content query-builder__dialog__container__content',
        }}
      >
        <Modal
          darkMode={darkMode}
          className="editor-modal query-builder__dialog query-builder__dialog--expanded"
        >
          <div
            className="query-builder__dialog__header"
            data-testid={EMBEDDED_CUBE_TEST_ID.DIALOG}
          >
            <div className="min-w-0 flex-1 truncate px-4 text-lg font-medium text-[var(--color-state-disabled-on-accent)]">
              {matView === undefined
                ? `Create MatView for ${ingest.path} with Cube`
                : `Edit MatView ${matView} of ${ingest.path} with Cube`}
            </div>
            <div className="query-builder__dialog__header__actions">
              <button
                className="query-builder__dialog__header__action"
                tabIndex={-1}
                onClick={() => embeddedCubeState.close()}
                title={
                  matView === undefined
                    ? 'Close Cube, adding nothing'
                    : 'Close Cube, saving nothing'
                }
              >
                <TimesIcon />
              </button>
            </div>
          </div>
          <div className="query-builder__dialog__content">
            <CubeEditor
              host={host}
              initialLambda={initialLambda}
              headerActions={(editorState) => (
                <MaterializedViewButton
                  embeddedCubeState={embeddedCubeState}
                  editorState={editorState}
                />
              )}
            />
          </div>
        </Modal>
      </Dialog>
    );
  },
);
