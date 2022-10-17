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
  ClickAwayListener as MuiClickAwayListener,
  Dialog as MuiDialog,
  type DialogProps as MuiDialogProps,
  type DialogClassKey as MuiDialogClassKey,
} from '@mui/material';
import { observer } from 'mobx-react-lite';
import { action, makeObservable, observable } from 'mobx';
import { clsx } from 'clsx';

export class NonBlockingDialogState {
  isOpen = false;
  private _suppressClickawayEventListener = false;

  constructor() {
    makeObservable(this, {
      isOpen: observable,
      open: action,
      close: action,
      suppressClickawayEventListener: action,
      handleClickaway: action,
    });
  }

  open(): void {
    this.suppressClickawayEventListener();
    this.isOpen = true;
  }
  close(): void {
    this.isOpen = false;
  }
  suppressClickawayEventListener(): void {
    this._suppressClickawayEventListener = true;
  }

  handleClickaway(onClickAway: () => void): void {
    if (this._suppressClickawayEventListener) {
      this._suppressClickawayEventListener = false;
      return;
    }
    if (this.isOpen) {
      onClickAway();
    }
  }
}

/**
 * Non-blocking Dialog
 *
 * Presents non-critical information or optional user tasks, such as search.
 * Often requires only one quick input in form of auto-complete.
 * Should not have a backdrop and any clickaway or Esc key should dismiss it.
 *
 * This is inspired by [Visual Studio Code: Command Pallete](https://code.visualstudio.com/docs/getstarted/userinterface#_command-palette)
 */
export const NonBlockingDialog = observer(
  (
    props: Omit<MuiDialogProps, 'open'> & {
      classes?: Partial<Record<MuiDialogClassKey, string>>;
      nonModalDialogState: NonBlockingDialogState;
      onClickAway: (event: MouseEvent | TouchEvent) => void;
    },
  ) => {
    const { nonModalDialogState, onClickAway, classes, ...dialogProps } = props;
    const onClickAwayWhenModalIsOpen = (
      event: MouseEvent | TouchEvent,
    ): void => {
      nonModalDialogState.handleClickaway(() => onClickAway(event));
    };
    if (!nonModalDialogState.isOpen) {
      return null;
    }
    return (
      <MuiClickAwayListener onClickAway={onClickAwayWhenModalIsOpen}>
        <MuiDialog
          hideBackdrop={true}
          disableEscapeKeyDown={false}
          open={nonModalDialogState.isOpen}
          classes={{
            ...classes,
            root: clsx(['mui-non-blocking-dialog__root', classes?.root ?? '']),
            paper: clsx([
              'mui-non-blocking-dialog__paper',
              classes?.paper ?? '',
            ]),
          }}
          {...dialogProps}
        />
      </MuiClickAwayListener>
    );
  },
);
