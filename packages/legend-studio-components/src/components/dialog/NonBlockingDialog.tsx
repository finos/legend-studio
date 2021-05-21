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

import type { DialogProps } from '@material-ui/core';
import type { DialogClassKey } from '@material-ui/core/Dialog';
import Dialog from '@material-ui/core/Dialog';
import { makeStyles } from '@material-ui/core/styles';
import ClickAwayListener from '@material-ui/core/ClickAwayListener';
import clsx from 'clsx';
import { observer } from 'mobx-react-lite';
import { action, makeAutoObservable } from 'mobx';

export class NonBlockingDialogState {
  isOpen = false;
  private _suppressClickawayEventListener = false;

  constructor() {
    makeAutoObservable(this, {
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

const useStyles = makeStyles({
  root: { pointerEvents: 'none' },
  paper: { pointerEvents: 'auto' },
});

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
    props: Omit<DialogProps, 'open'> & {
      classes?: Partial<Record<DialogClassKey, string>>;
      nonModalDialogState: NonBlockingDialogState;
      onClickAway: (event: React.MouseEvent<Document>) => void;
    },
  ) => {
    const { nonModalDialogState, onClickAway, classes, ...dialogProps } = props;
    const onClickAwayWhenModalIsOpen: React.MouseEventHandler<Document> = (
      event,
    ) => {
      nonModalDialogState.handleClickaway(() => onClickAway(event));
    };
    const customStyles = useStyles();
    if (!nonModalDialogState.isOpen) {
      return null;
    }
    return (
      <ClickAwayListener onClickAway={onClickAwayWhenModalIsOpen}>
        <Dialog
          hideBackdrop={true}
          disableEscapeKeyDown={false}
          open={nonModalDialogState.isOpen}
          classes={{
            ...classes,
            root: clsx([customStyles.root, classes?.root ?? '']),
            paper: clsx([customStyles.paper, classes?.paper ?? '']),
          }}
          {...dialogProps}
        />
      </ClickAwayListener>
    );
  },
);
