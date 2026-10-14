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
  DropdownMenu,
  DropdownMenuItem,
  MenuIcon,
  Modal,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
  ModalHeader,
  PanelForm,
  PanelFormBooleanField,
  PanelFormTextField,
  useDropdownMenu,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import type { CubeEditorState } from '../../stores/CubeEditorState.js';

/** Why Dev Settings can't change anything */
const DEV_SETTINGS_UNAVAILABLE =
  "This Legend deployment doesn't let Legend Cube's engine clients be changed.";

/**
 * The page's menu, at the top left, as Legend Query's editor has one: Dev
 * Settings (PLAN §11.16)
 */
export const CubePageMenu = observer(
  (props: { editorState: CubeEditorState }) => {
    const { editorState } = props;
    const [openMenu, closeMenu, menuProps, isOpen] = useDropdownMenu();
    return (
      <>
        <button
          type="button"
          className="flex h-6 w-6 shrink-0 items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          title="Menu"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          onClick={openMenu}
        >
          <MenuIcon />
        </button>
        <DropdownMenu
          {...menuProps}
          menuProps={{
            elevation: 7,
            slotProps: {
              root: { slotProps: { backdrop: { invisible: true } } },
            },
          }}
        >
          <DropdownMenuItem
            className="px-2 text-base"
            onClick={() => {
              closeMenu();
              editorState.devSettings.open();
            }}
          >
            Dev Settings
          </DropdownMenuItem>
        </DropdownMenu>
      </>
    );
  },
);

/**
 * Dev Settings, as Legend Query's editor offers them: the engine client's
 * URL and its request compression, for Cube's engine clients
 */
export const CubeDevSettingsDialog = observer(
  (props: { editorState: CubeEditorState }) => {
    const { editorState } = props;
    const { devSettings } = editorState;
    const { applicationStore } = editorState.host;
    const darkMode =
      !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled;
    return (
      <Dialog open={devSettings.isOpen} onClose={() => devSettings.close()}>
        <Modal darkMode={darkMode} className="w-[600px] max-w-full">
          <ModalHeader>
            <div className="modal__title">Dev Settings</div>
          </ModalHeader>
          <ModalBody>
            {!devSettings.isAvailable && (
              <div className="mb-2 text-base text-[var(--color-text-secondary)]">
                {DEV_SETTINGS_UNAVAILABLE}
              </div>
            )}
            <PanelForm>
              <PanelFormTextField
                name="Engine client base URL"
                prompt={`The engine Legend Cube's requests go to, from the next one. The deployment's: ${devSettings.defaultBaseUrl ?? 'none'}`}
                value={devSettings.baseUrlText}
                isReadOnly={!devSettings.isAvailable}
                update={(value) => devSettings.setBaseUrlText(value ?? '')}
                errorMessage={devSettings.baseUrlError}
                darkMode={darkMode}
                fullWidth={true}
              />
              <PanelFormBooleanField
                name="Engine client request payload compression"
                prompt="Specifies if request payload should be compressed. Off, the browser's Network tab shows each request's JSON."
                value={devSettings.requestCompression}
                isReadOnly={!devSettings.isAvailable}
                update={() =>
                  devSettings.setRequestCompression(
                    !devSettings.requestCompression,
                  )
                }
              />
            </PanelForm>
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              darkMode={darkMode}
              formatText={false}
              type="secondary"
              text="Reset engine URL"
              disabled={
                !devSettings.isAvailable ||
                devSettings.baseUrlText === (devSettings.defaultBaseUrl ?? '')
              }
              onClick={() => devSettings.resetBaseUrl()}
            />
            <ModalFooterButton
              darkMode={darkMode}
              formatText={false}
              type="secondary"
              text="Close"
              onClick={() => devSettings.close()}
            />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);
