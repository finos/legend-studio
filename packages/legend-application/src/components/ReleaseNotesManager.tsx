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

import { observer } from 'mobx-react-lite';
import { useApplicationStore } from './ApplicationStoreProvider.js';
import {
  ArrowCircleUpIcon,
  BugIcon,
  Dialog,
  Modal,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
  ModalHeader,
  ShareIcon,
  clsx,
} from '@finos/legend-art';
import {
  RELEASE_UPDATE_TYPE,
  type ReleaseNote,
  type VersionReleaseNotes,
} from '../stores/ReleaseNotesService.js';
import { isValidUrl, prettyCONSTName } from '@finos/legend-shared';

const ReleaseNoteViewer = observer((props: { note: ReleaseNote }) => {
  const { note } = props;
  const applicationStore = useApplicationStore();
  const isBug = note.type === RELEASE_UPDATE_TYPE.BUG_FIX;
  const visitLink = (): void => {
    if (note.docLink && isValidUrl(note.docLink)) {
      applicationStore.navigationService.navigator.visitAddress(note.docLink);
    }
  };

  return (
    <div className="release-viewer__update__item" key={note.description}>
      <div
        className={clsx('release-viewer__update__item-btn', {
          'release-viewer__update__item-btn-bug': isBug,
        })}
      >
        {isBug ? <BugIcon /> : <ArrowCircleUpIcon />}
      </div>
      <div className="release-viewer__update__description">
        {note.description}
      </div>
      {note.docLink && (
        <div className="release-viewer__update__link">
          <button
            className="release-viewer__update__link-btn"
            title="Visit..."
            onClick={visitLink}
          >
            <ShareIcon />
          </button>
        </div>
      )}
    </div>
  );
});

export const ReleaseViewer = observer(
  (props: { releaseNotes: VersionReleaseNotes }) => {
    const { releaseNotes } = props;
    const enhancements =
      releaseNotes.notes?.filter(
        (r) => r.type === RELEASE_UPDATE_TYPE.ENHANCEMENT,
      ) ?? [];
    const bugFixes =
      releaseNotes.notes?.filter(
        (r) => r.type === RELEASE_UPDATE_TYPE.BUG_FIX,
      ) ?? [];

    return (
      <div className="release-viewer">
        <div className="release-viewer__version">
          Version {releaseNotes.label ?? releaseNotes.version}
        </div>
        <div className="release-viewer__content">
          {Boolean(enhancements.length) && (
            <div className="release-viewer__update">
              <div className="release-viewer__update-type">ENHANCEMENTS</div>
              <div className="release-viewer__update__items">
                {enhancements.map((e) => (
                  <ReleaseNoteViewer note={e} key={e.description} />
                ))}
              </div>
            </div>
          )}
          {Boolean(bugFixes.length) && (
            <div className="release-viewer__update">
              <div className="release-viewer__update-type">BUG FIXES</div>
              <div className="release-viewer__update__items">
                {bugFixes.map((e) => (
                  <ReleaseNoteViewer note={e} key={e.description} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  },
);

export const ReleaseNotesManager = observer(() => {
  const applicationStore = useApplicationStore();
  const releaseService = applicationStore.releaseNotesService;
  const releaseNotes = releaseService.showableVersions();
  const isOpen = releaseService.showCurrentReleaseModal;
  if (!releaseService.isConfigured || !isOpen || !releaseNotes?.length) {
    return null;
  }

  const closeModal = (): void => {
    releaseService.setShowCurrentRelease(false);
    releaseService.updateViewedVersion();
  };
  const title = `Legend ${prettyCONSTName(
    applicationStore.config.appName,
  )} has been upgraded !`;
  return (
    <Dialog
      open={isOpen}
      onClose={closeModal}
      classes={{
        root: 'release-notes__root-container',
        container: 'release-notes__container',
      }}
    >
      <Modal
        darkMode={
          !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
        }
        className="editor-modal release-notes__dialog"
      >
        <ModalHeader
          className="release-notes__dialog__header__title"
          title={title}
        />

        <ModalBody className="release-notes__dialog__body">
          <div className="release-notes__dialog__content">
            <div className="release-notes__dialog__content__title">
              New features, enhancements and bug fixes that were released
            </div>
            {releaseNotes.map((e) => (
              <ReleaseViewer key={e.version} releaseNotes={e} />
            ))}
          </div>
        </ModalBody>
        <ModalFooter>
          <ModalFooterButton
            className="modal__footer__close-btn"
            onClick={closeModal}
            type={'primary'}
          >
            Close
          </ModalFooterButton>
        </ModalFooter>
      </Modal>
    </Dialog>
  );
});

export const ReleaseLogManager = observer(() => {
  const applicationStore = useApplicationStore();
  const releaseService = applicationStore.releaseNotesService;

  if (!releaseService.isConfigured || !releaseService.showReleaseLog) {
    return null;
  }
  const releaseNotes = releaseService.releaseNotes ?? [];
  const isOpen = releaseService.showReleaseLog;
  const closeModal = (): void => {
    releaseService.setReleaseLog(false);
    releaseService.updateViewedVersion();
  };
  const title = `Release Notes`;
  return (
    <Dialog
      open={isOpen}
      onClose={closeModal}
      classes={{
        root: 'release-notes__root-container',
        container: 'release-notes__container',
      }}
    >
      <Modal
        darkMode={
          !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
        }
        className="editor-modal release-notes__dialog"
      >
        <ModalHeader
          className="release-notes__dialog__header__title"
          title={title}
        />
        <ModalBody className="release-notes__dialog__body">
          <div className="release-notes__dialog__content">
            <div className="release-notes__dialog__content__title">
              New features, enhancements and bug fixes that were released
            </div>
            {releaseNotes.map((e) => (
              <ReleaseViewer key={e.version} releaseNotes={e} />
            ))}
          </div>
        </ModalBody>
        <ModalFooter>
          <ModalFooterButton
            className="modal__footer__close-btn"
            onClick={closeModal}
            type={'primary'}
          >
            Close
          </ModalFooterButton>
        </ModalFooter>
      </Modal>
    </Dialog>
  );
});
