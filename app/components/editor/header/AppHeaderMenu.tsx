/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, { useState } from 'react';
import { config } from 'ApplicationConfig';
import { DropdownMenu } from 'Components/shared/DropdownMenu';
import clsx from 'clsx';
import { FaBars, FaInfoCircle, FaTimes } from 'react-icons/fa';
import Dialog from '@material-ui/core/Dialog';

const AboutModal: React.FC<{
  open: boolean;
  closeModal: () => void;
}> = props => {
  const { open, closeModal } = props;
  return (
    <Dialog onClose={closeModal} open={open}>
      <div className="modal modal--dark about-modal">
        <div className="modal__header">
          <div className="modal__title">
            <div className="modal__title__icon"><FaInfoCircle /></div>
            <div className="modal__title__label">About</div>
          </div>
          <div className="modal__header__actions">
            <button
              className="modal__header__action"
              tabIndex={-1}
              onClick={closeModal}
            ><FaTimes /></button>
          </div>
        </div>
        <div className="modal__body">
          <div className="about-modal__info-entry">
            <div className="about-modal__info-entry__title">Version:</div>
            <div className="about-modal__info-entry__value">{config.appVersion}</div>
          </div>
          <div className="about-modal__info-entry">
            <div className="about-modal__info-entry__title">Build Time:</div>
            <div className="about-modal__info-entry__value">{config.appVersionBuildTime}</div>
          </div>
          <div className="about-modal__info-entry">
            <div className="about-modal__info-entry__title">Commit ID:</div>
            <div className="about-modal__info-entry__value">{config.appVersionCommitId}</div>
          </div>
          <div className="about-modal__info-entry">
            <div className="about-modal__info-entry__title">SDLC Server:</div>
            <div className="about-modal__info-entry__value"><a href={config.sdlcServerUrl} target="_blank" rel="noopener noreferrer">{config.sdlcServerUrl}</a></div>
          </div>
          <div className="about-modal__info-entry">
            <div className="about-modal__info-entry__title">Execution Server:</div>
            <div className="about-modal__info-entry__value"><a href={config.executionServerUrl} target="_blank" rel="noopener noreferrer">{config.executionServerUrl}</a></div>
          </div>
          <div className="about-modal__info-entry">
            <div className="about-modal__info-entry__title">Tracer Server:</div>
            <div className="about-modal__info-entry__value"><a href={config.tracerServerUrl} target="_blank" rel="noopener noreferrer">{config.tracerServerUrl}</a></div>
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export const AppHeaderMenu: React.FC = () => {
  // menu
  const [openMenuDropdown, setOpenMenuDropdown] = useState(false);
  const showMenuDropdown = (): void => setOpenMenuDropdown(true);
  const hideMenuDropdown = (): void => setOpenMenuDropdown(false);
  // about modal
  const [openAboutModal, setOpenAboutModal] = useState(false);
  const showAboutModal = (): void => setOpenAboutModal(true);
  const hideAboutModal = (): void => setOpenAboutModal(false);
  // documentation WIP
  const goToDocumentation = (): void => { window.open(config.documentations.fullDocUrl, '_blank') };

  return (
    <>
      <DropdownMenu
        className={clsx('app__header__action', { 'app__header__menu--open': openMenuDropdown })}
        onClose={hideMenuDropdown}
        menuProps={{ elevation: 7 }}
        content={
          <div className="app__header__menu__options">
            <div className="app__header__menu__option" onClick={showAboutModal}>About</div>
            <div className="app__header__menu__option" onClick={goToDocumentation}>Documentation</div>
          </div>
        }>
        <button
          className="app__header__menu-btn"
          onClick={showMenuDropdown}
          tabIndex={-1}
        ><FaBars /></button>
      </DropdownMenu>
      <AboutModal open={openAboutModal} closeModal={hideAboutModal} />
    </>
  );
};
