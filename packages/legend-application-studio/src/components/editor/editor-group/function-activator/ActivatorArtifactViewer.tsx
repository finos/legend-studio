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

import {
  Dialog,
  Modal,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
  ModalHeader,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { CODE_EDITOR_LANGUAGE } from '@finos/legend-code-editor';
import { CodeEditor } from '@finos/legend-lego/code-editor';
import type { PlainObject } from '@finos/legend-shared';

export const ActivatorArtifactViewer = observer(
  (props: {
    artifact: PlainObject | undefined;
    setArtifact: (value: PlainObject | undefined) => void;
    darkMode: boolean;
  }) => {
    const { artifact, setArtifact, darkMode } = props;
    const closeArtifact = (): void => {
      setArtifact(undefined);
    };

    if (!artifact) {
      return null;
    }

    return (
      <Dialog
        open={Boolean(artifact)}
        onClose={closeArtifact}
        classes={{
          root: 'editor-modal__root-container',
          container: 'editor-modal__container',
          paper: 'editor-modal__content',
        }}
      >
        <Modal className="editor-modal" darkMode={darkMode}>
          <ModalHeader title="Artifact" />
          <ModalBody>
            <div className="panel__content execution-plan-viewer__panel__content">
              <CodeEditor
                inputValue={JSON.stringify(artifact, null, 2)}
                isReadOnly={true}
                language={CODE_EDITOR_LANGUAGE.JSON}
                hidePadding={true}
                hideMinimap={true}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              title="Close artifact modal"
              onClick={closeArtifact}
              text="Close"
              type="secondary"
            />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);
