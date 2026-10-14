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
import { noop, type PlainObject } from '@finos/legend-shared';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import type { EmbeddedCubeState } from '../../../stores/editor/embedded-cube/EmbeddedCubeState.js';
import { useEditorStore } from '../EditorStoreProvider.js';

export const EMBEDDED_CUBE_TEST_ID = {
  DIALOG: 'embedded-cube__dialog',
  ADD_MATERIALIZED_VIEW: 'embedded-cube__add-materialized-view',
};

/** Names the materialized view, then adds it to the ingest definition */
const MaterializedViewNameDialog = observer(
  (props: {
    embeddedCubeState: EmbeddedCubeState;
    lambda: PlainObject;
    close: () => void;
  }) => {
    const { embeddedCubeState, lambda, close } = props;
    // as Cube's dialogs: the dialog follows the theme, and Add is an accent
    // button in every theme (legend-art's light Add is a legacy grey)
    const darkMode =
      !embeddedCubeState.editorStore.applicationStore.layoutService
        .TEMPORARY__isLightColorThemeEnabled;
    const [name, setName] = useState('');
    const problem = embeddedCubeState.getMaterializedViewNameProblem(name);
    const add = (): void => {
      if (problem === undefined) {
        embeddedCubeState.addMaterializedView(name, lambda);
      }
    };
    return (
      <Dialog open={true} onClose={close}>
        <Modal darkMode={darkMode} className="w-[440px] max-w-full">
          <ModalHeader>
            <div className="modal__title">Add as MatView</div>
          </ModalHeader>
          <ModalBody>
            <form
              className="flex flex-col gap-2"
              data-testid={EMBEDDED_CUBE_TEST_ID.ADD_MATERIALIZED_VIEW}
              onSubmit={(event) => {
                event.preventDefault();
                add();
              }}
            >
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
              {name.trim() && problem && (
                <div className="text-sm text-[var(--color-status-error)]">
                  {problem}
                </div>
              )}
            </form>
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              darkMode={true}
              formatText={false}
              text="Add"
              disabled={problem !== undefined}
              onClick={add}
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
 * no row limit, becomes a materialized view of the ingest definition
 */
const AddMaterializedViewButton = observer(
  (props: {
    embeddedCubeState: EmbeddedCubeState;
    editorState: CubeEditorState;
  }) => {
    const { embeddedCubeState, editorState } = props;
    const { execution } = editorState;
    const [lambda, setLambda] = useState<PlainObject | undefined>();
    const [isBuilding, setIsBuilding] = useState(false);
    const start = (): void => {
      // the open step editor's edits go in first, as for Execute
      if (!editorState.nodeEditor.finishApplied()) {
        return;
      }
      setIsBuilding(true);
      buildCubeRunningStepLambda(editorState)
        .then(setLambda)
        .catch(editorState.host.applicationStore.alertUnhandledError)
        .finally(() => setIsBuilding(false));
    };
    return (
      <>
        <CubeButton
          primary={true}
          title={
            execution.canExecute
              ? 'Add the step that runs to the ingest definition, as a materialized view'
              : formatDisabledReasons(execution.disabledReasons)
          }
          disabled={!execution.canExecute || isBuilding}
          onClick={start}
        >
          Add as MatView
        </CubeButton>
        {lambda && (
          <MaterializedViewNameDialog
            embeddedCubeState={embeddedCubeState}
            lambda={lambda}
            close={() => setLambda(undefined)}
          />
        )}
      </>
    );
  },
);

/**
 * Legend Cube, full screen over the editor, building a materialized view of
 * the ingest definition it was opened from (Create MatView with Cube)
 */
export const EmbeddedCube = observer(() => {
  const editorStore = useEditorStore();
  const { embeddedCubeState } = editorStore;
  const { host, ingest } = embeddedCubeState;
  if (!host || !ingest) {
    return null;
  }
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
            {`Create MatView for ${ingest.path} with Cube`}
          </div>
          <div className="query-builder__dialog__header__actions">
            <button
              className="query-builder__dialog__header__action"
              tabIndex={-1}
              onClick={() => embeddedCubeState.close()}
              title="Close Cube, adding nothing"
            >
              <TimesIcon />
            </button>
          </div>
        </div>
        <div className="query-builder__dialog__content">
          <CubeEditor
            host={host}
            headerActions={(editorState) => (
              <AddMaterializedViewButton
                embeddedCubeState={embeddedCubeState}
                editorState={editorState}
              />
            )}
          />
        </div>
      </Modal>
    </Dialog>
  );
});
