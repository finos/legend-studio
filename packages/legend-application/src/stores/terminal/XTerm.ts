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

import type { GenericLegendApplicationStore } from '../ApplicationStore.js';
import {
  Terminal as XTermTerminal,
  type ITheme as XTermTheme,
  type IDisposable as XTermDisposable,
} from 'xterm';
import { WebLinksAddon as XTermWebLinksAddon } from 'xterm-addon-web-links';
import { FitAddon as XTermFitAddon } from 'xterm-addon-fit';
import {
  type ISearchDecorationOptions as XTermSearchDecorationOptions,
  SearchAddon as XTermSearchAddon,
} from 'xterm-addon-search';
import { Unicode11Addon as XTermUnicode11Addon } from 'xterm-addon-unicode11';
import { WebglAddon as XTermWebglAddon } from 'xterm-addon-webgl';
import { MONOSPACED_FONT_FAMILY, TAB_SIZE } from '../../const.js';
import { forceDispatchKeyboardEvent } from '../../components/LegendApplicationComponentFrameworkProvider.js';
import {
  Terminal,
  ANSI_ESCAPE,
  type TerminalWriteOption,
  type TerminalSetupConfiguration,
  ANSI_moveCursor,
} from './Terminal.js';
import {
  ActionState,
  guaranteeNonNullable,
  IllegalStateError,
  isMatchingKeyCombination,
} from '@finos/legend-shared';

const LEGEND_XTERM_THEME: XTermTheme = {
  foreground: '#cccccc',
  background: '#1e1e1e',

  cursor: '#cccccc',
  /** The accent color of the cursor (fg color for a block cursor) */
  // cursorAccent?: string;
  /** The selection background color when the terminal does not have focus (can be transparent) */
  // selectionInactiveBackground?: string;
  selectionBackground: '#264f78', // blue

  black: '#000000',
  red: '#cd3131',
  green: '#0dbc79',
  yellow: '#e5e510',
  blue: '#2472c8',
  magenta: '#bc3fbc',
  cyan: '#11a8cd',
  white: '#e5e5e5',

  brightBlack: '#666666',
  brightRed: '#f14c4c',
  brightGreen: '#23d18b',
  brightYellow: '#f5f543',
  brightBlue: '#3b8eea',
  brightMagenta: '#d670d6',
  brightCyan: '#29b8db',
  brightWhite: '#e5e5e5',
};

const LEGEND_XTERM_SEARCH_THEME: XTermSearchDecorationOptions = {
  matchOverviewRuler: '#d186167e',
  activeMatchColorOverviewRuler: '#A0A0A0CC',
  matchBackground: '#62331c',
  activeMatchBackground: '#515C6A',
};

// robot acsii art
// See https://asciiartist.com/ascii-art-micro-robot/
const HELP_COMMAND_TEXT = `
${ANSI_ESCAPE.BRIGHT_BLACK}+-------------------------------------------------------+${ANSI_ESCAPE.RESET}
${ANSI_ESCAPE.BRIGHT_BLACK}|${ANSI_ESCAPE.RESET}   ${ANSI_ESCAPE.BRIGHT_GREEN}[@@]${ANSI_ESCAPE.RESET}   "Hi! Welcome to the HELP menu of Pure IDE"   ${ANSI_ESCAPE.BRIGHT_BLACK}|${ANSI_ESCAPE.RESET}
${ANSI_ESCAPE.BRIGHT_BLACK}|${ANSI_ESCAPE.RESET}  ${ANSI_ESCAPE.BRIGHT_GREEN}/|__|\\${ANSI_ESCAPE.RESET}                                               ${ANSI_ESCAPE.BRIGHT_BLACK}|${ANSI_ESCAPE.RESET}
${ANSI_ESCAPE.BRIGHT_BLACK}+--${ANSI_ESCAPE.RESET} ${ANSI_ESCAPE.BRIGHT_GREEN}d  b${ANSI_ESCAPE.RESET} ${ANSI_ESCAPE.BRIGHT_BLACK}-----------------------------------------------+${ANSI_ESCAPE.RESET}


`;

const DEFAULT_USER = 'purist';
const DEFAULT_COMMAND_HEADER = `
${ANSI_ESCAPE.BOLD}${ANSI_ESCAPE.BRIGHT_BLUE}$${DEFAULT_USER}${ANSI_ESCAPE.RESET}
${ANSI_ESCAPE.BOLD}${ANSI_ESCAPE.MAGENTA}\u276f${ANSI_ESCAPE.RESET} `;
const COMMAND_START = '\u276f ';

export class XTerm extends Terminal {
  private readonly instance: XTermTerminal;
  private readonly resizer: XTermFitAddon;
  private readonly renderer: XTermWebglAddon;
  private readonly searcher: XTermSearchAddon;
  private webLinkProvider?: XTermWebLinksAddon;

  private _TEMPORARY__onKeyListener?: XTermDisposable;
  private _TEMPORARY__onDataListener?: XTermDisposable;

  private readonly setupState = ActionState.create();

  constructor(applicationStore: GenericLegendApplicationStore) {
    super(applicationStore);

    this.instance = new XTermTerminal({
      allowProposedApi: true,

      fontSize: 12,
      letterSpacing: 2,
      fontWeight: 400,
      fontWeightBold: 700,
      fontFamily: `"${MONOSPACED_FONT_FAMILY}", Menlo, Consolas, monospace`,
      tabStopWidth: TAB_SIZE,
      theme: LEGEND_XTERM_THEME,
      overviewRulerWidth: 14, // 14px
      scrollback: 10000, // buffer a substantial content length
      convertEol: true, // treat \n as new line
    });

    this.resizer = new XTermFitAddon();
    this.searcher = new XTermSearchAddon();
    this.renderer = new XTermWebglAddon();
  }

  setup(configuration?: TerminalSetupConfiguration | undefined): void {
    if (this.setupState.hasCompleted) {
      throw new IllegalStateError(`Terminal is already set up`);
    }
    this.setupState.complete();

    // Handling context loss: The browser may drop WebGL contexts for various reasons like OOM or after the system has been suspended.
    // An easy, but suboptimal way, to handle this is by disposing of WebglAddon when the `webglcontextlost` event fires
    // NOTE: we don't really have a resilient way to fallback right now, hopefully, the fallback is to render in DOM
    this.renderer.onContextLoss(() => {
      this.renderer.dispose();
    });
    this.instance.loadAddon(this.resizer);
    this.instance.loadAddon(this.searcher);
    this.instance.loadAddon(this.renderer);

    this.instance.loadAddon(new XTermUnicode11Addon());
    this.instance.unicode.activeVersion = '11';

    this.instance.attachCustomKeyEventHandler(
      (event: KeyboardEvent): boolean => {
        // NOTE: this is a cheap way to handl hotkey, but this is really the only
        // hotkey we want to support at local scope of the terminal
        if (
          isMatchingKeyCombination(event, 'Control+KeyF') ||
          isMatchingKeyCombination(event, 'Meta+KeyF')
        ) {
          event.preventDefault();
          event.stopPropagation();
          this.searchConfig.focus();
          return false;
        }
        // NOTE: since we render the terminal using webgl/canvas, event is not bubbled
        // naturally through the DOM tree, we have to manually force this
        forceDispatchKeyboardEvent(event);
        return true; // return true to indicate the event should still be handled by xterm
      },
    );

    this.webLinkProvider = configuration?.webLinkProvider
      ? new XTermWebLinksAddon(configuration.webLinkProvider.handler, {
          urlRegex: configuration.webLinkProvider.regex,
        })
      : new XTermWebLinksAddon();
    this.instance.loadAddon(this.webLinkProvider);

    this.searcher.onDidChangeResults((result) => {
      if (result) {
        this.setSearchResultCount(result.resultCount);
        this.setSearchCurrentResultIndex(result.resultIndex);
      } else {
        this.setSearchResultCount(undefined);
        this.setSearchCurrentResultIndex(undefined);
      }
    });

    // NOTE:
    // 1. no multi line support
    // 2. a lot of navigation is limitted
    // no word navigation yet
    this._TEMPORARY__onKeyListener = this.instance.onKey(
      ({ key, domEvent }) => {
        // TODO: grab and build the WHOLE command string, then do string manipulation on it, if we modify it, e.g.
        // TODO handle paste at cursor, we can also employ the same strategy ^

        // console.log(this.instance.buffer.active);
        if (domEvent.code === 'Enter') {
          console.log(
            'command....',
            { command: this.command },
            this.getCommandRange(),
          );
          // console.log('issuing command...', this.command);
          // get current command
          // issue command not found here as well?
          // how to execute command and send it to log?
          // execute command
        } else if (
          isMatchingKeyCombination(domEvent, 'Control+KeyC') ||
          isMatchingKeyCombination(domEvent, 'Control+KeyD')
        ) {
          // escape from current command
          this.abort();
        } else if (domEvent.code === 'Backspace') {
          this.deleteFromCommand(-1);
        } else if (domEvent.code === 'Delete') {
          this.deleteFromCommand(1);
        } else if (domEvent.code === 'ArrowRight') {
          this.instance.write(this.generateMoveCursorANSISeq(1));
        } else if (domEvent.code === 'ArrowLeft') {
          this.instance.write(this.generateMoveCursorANSISeq(-1));
        } else if (
          domEvent.key.match(
            /^[A-Za-z0-9!@#$%^&*()-_=+"':;,.<>/?[\]{}|\\~` \\t]$/,
          )
        ) {
          // commonly supported keys
          this.writeToCommand(key);
        }
      },
    );

    // this is needed to support pasting
    this._TEMPORARY__onDataListener = this.instance.onData((val) => {
      // only support pasting (not meant for 1 character though) and special functions starting with special
      // ANSI escape sequence
      if (val.length > 1 && !val.startsWith('\x1B')) {
        this.writeToCommand(
          val
            // remove all unsupported characters, including newline
            .replaceAll(
              /[^A-Za-z0-9!@#$%^&*()-_=+"':;,.<>/?[\]{}|\\~` \\t]/g,
              '',
            )
            .trimEnd(),
        );
      }
    });
  }

  // NOTE: this is fairly HACKY way to detect command
  // we don't really have a better solution at the moment,
  // but we should come with more systematic way of persisting the start line of command
  // the challenge with this is due to text-reflow
  private getCommandRange(): {
    // NOTE: all of these are absolute index in the buffer, not relative to the viewport
    startY: number;
    startX: number;
    endY: number;
    endX: number;
    cursorIdx: number;
  } {
    const buffer = this.instance.buffer.active;
    const cols = this.instance.cols;
    const commandText = `${COMMAND_START}${this.command}`;
    const commandFirstLine = `${COMMAND_START}${this.command.substring(
      0,
      cols - COMMAND_START.length,
    )}${
      this.command.length < cols - COMMAND_START.length
        ? ' '.repeat(cols - this.command.length - COMMAND_START.length)
        : ''
    }`;

    let startY = 0;
    let cursorIdx = 0;

    for (let i = buffer.baseY + buffer.cursorY; i > -1; --i) {
      const line = guaranteeNonNullable(buffer.getLine(i));
      const lineText = line.translateToString();
      if (lineText === commandFirstLine) {
        startY = i;
        cursorIdx +=
          (i === buffer.baseY + buffer.cursorY ? buffer.cursorX : cols) -
          COMMAND_START.length;
        break;
      } else {
        cursorIdx +=
          i === buffer.baseY + buffer.cursorY ? buffer.cursorX : cols;
      }
    }

    // start line == -1 is the rare case where the command is too long and exceeds the buffer length
    // leading to incomplete command being captured
    return {
      startY,
      startX: COMMAND_START.length,
      endY: startY + (commandText.length - (commandText.length % cols)) / cols,
      endX: commandText.length % cols,
      cursorIdx,
    };
  }

  /**
   * Generate the ANSI escape sequence for new cursor position
   * after being moved by the the number of cells.
   *
   * @param val a number (negative means cursor move leftwards)
   * @param limit whether to limit the movement of the cursor by the command range
   * @returns  ANSI escape sequence for new cursor position
   */
  private generateMoveCursorANSISeq(val: number, limit = true): string {
    const buffer = this.instance.buffer.active;
    const cols = this.instance.cols;
    const range = this.getCommandRange();

    const maxDistance = limit
      ? val < 0
        ? range.cursorIdx
        : this.command.length - range.cursorIdx
      : val;
    const distance = Math.min(Math.abs(val), maxDistance);

    let newCursorX = buffer.cursorX;
    let newCursorY = buffer.cursorY;

    if (val < 0) {
      // move leftwards
      newCursorX = (cols + ((buffer.cursorX - distance) % cols)) % cols;
      newCursorY =
        buffer.baseY +
        buffer.cursorY -
        (distance > buffer.cursorX ? Math.ceil(distance / cols) : 0);
    } else if (val > 0) {
      // move rightwards
      newCursorX = (buffer.cursorX + distance) % cols;
      newCursorY =
        buffer.baseY +
        buffer.cursorY +
        (buffer.cursorX + distance >= cols
          ? Math.ceil((buffer.cursorX + distance) / cols)
          : 0);
    }
    return ANSI_moveCursor(newCursorY + 1, newCursorX + 1);
  }

  /**
   * Write value to command with awareness of the current cursor position
   */
  private writeToCommand(val: string): void {
    const range = this.getCommandRange();
    const a = this.generateMoveCursorANSISeq(val.length, false);
    const left = this.command.slice(0, range.cursorIdx);
    const right = this.command.slice(range.cursorIdx);

    this.instance.write(
      val +
        right +
        // update the cursor
        a,
    );
    this.setCommand(left + val + right);
  }

  /**
   * Remove number of characters from command with awareness of the current cursor position
   * NOTE: negative number means backward deleting (i.e. backspace)
   */
  private deleteFromCommand(val: number): void {
    const range = this.getCommandRange();
    const maxDistance =
      val < 0 ? range.cursorIdx : this.command.length - range.cursorIdx;
    const distance = Math.min(Math.abs(val), maxDistance);

    if (val === 0) {
      return;
    } else if (val < 0) {
      // remove leftwards
      const left = this.command.slice(0, range.cursorIdx - distance);
      const right = this.command.slice(range.cursorIdx, this.command.length);
      this.instance.write(
        // reset cursor to start of command, basically here, we're rewriting the entire command
        ANSI_moveCursor(range.startY + 1, range.startX + 1) +
          left +
          right +
          // fill space to erase cells rendered from previous command
          ' '.repeat(distance) +
          // move the cursor as well
          this.generateMoveCursorANSISeq(-distance),
      );
      this.setCommand(left + right);
    } else if (val > 0) {
      // remove rightwards
      const left = this.command.slice(0, range.cursorIdx);
      const right = this.command.slice(
        range.cursorIdx + distance,
        this.command.length,
      );
      this.instance.write(
        // reset cursor to start of command, basically here, we're rewriting the entire command
        ANSI_moveCursor(range.startY + 1, range.startX + 1) +
          left +
          right +
          // fill space to erase cells rendered from previous command
          ' '.repeat(distance) +
          // move the cursor as well
          this.generateMoveCursorANSISeq(0),
      );
      this.setCommand(left + right);
    }
  }

  get isSetup(): boolean {
    return this.setupState.hasCompleted;
  }

  private checkSetup(): void {
    if (!this.setupState.hasCompleted) {
      throw new IllegalStateError(`Terminal has not been set up yet`);
    }
  }

  mount(container: HTMLElement): void {
    this.checkSetup();

    this.instance.open(container);
  }

  dispose(): void {
    this.checkSetup();

    this.searcher.dispose();
    this.resizer.dispose();
    this.renderer.dispose();
    this.webLinkProvider?.dispose();
    this._TEMPORARY__onKeyListener?.dispose();
    this._TEMPORARY__onDataListener?.dispose();
    this.instance.dispose();
  }

  autoResize(): void {
    this.checkSetup();

    this.resizer.fit();
  }

  focus(): void {
    this.checkSetup();

    this.instance.focus();
  }

  private newCommand(): void {
    this.instance.write(DEFAULT_COMMAND_HEADER);
    this.setCommand('');
  }

  clear(): void {
    this.checkSetup();

    this.instance.reset();
    this.newCommand();
  }

  private resetANSIStyling(): void {
    this.instance.write(ANSI_ESCAPE.RESET);
  }

  override showHelp(): void {
    this.checkSetup();

    this.resetANSIStyling();
    this.instance.scrollToBottom();
    if (this.command !== '') {
      this.abort();
    }
    this.instance.writeln(HELP_COMMAND_TEXT);
    this.abort();
    this.focus();
  }

  abort(): void {
    this.resetANSIStyling();
    this.instance.write('\n');
    this.newCommand();
    this.instance.scrollToBottom();
  }

  write(
    output: string,
    command: string | undefined,
    opts?: TerminalWriteOption,
  ): void {
    this.checkSetup();

    this.resetANSIStyling();

    if (!this.preserveLog && opts?.clear) {
      this.instance.reset();
      this.instance.scrollToTop();
    } else if (this.preserveLog) {
      // effectively abort previous command
      this.instance.write('\n');
    }

    this.newCommand();
    this.instance.write(`${command ?? '(unknown)'}\n`);
    this.instance.writeln(output);

    if (!opts?.clear) {
      this.instance.scrollToBottom();
    }

    this.newCommand();
  }

  search(val: string): void {
    this.checkSetup();

    this.searcher.findNext(val, {
      decorations: LEGEND_XTERM_SEARCH_THEME,
      regex: this.searchConfig.useRegex,
      wholeWord: this.searchConfig.matchWholeWord,
      caseSensitive: this.searchConfig.matchCaseSensitive,
      // do incremental search so that the expansion will be expanded the selection if it
      // still matches the term the user typed.
      incremental: true,
    });
  }

  clearSearch(): void {
    this.checkSetup();

    this.searcher.clearDecorations();
    this.instance.clearSelection();
    this.setSearchText('');
    this.setSearchResultCount(undefined);
    this.setSearchCurrentResultIndex(undefined);
  }

  findPrevious(): void {
    this.checkSetup();

    this.searcher.findPrevious(this.searchConfig.searchText, {
      decorations: LEGEND_XTERM_SEARCH_THEME,
      regex: this.searchConfig.useRegex,
      wholeWord: this.searchConfig.matchWholeWord,
      caseSensitive: this.searchConfig.matchCaseSensitive,
    });
  }

  findNext(): void {
    this.checkSetup();

    this.searcher.findNext(this.searchConfig.searchText, {
      decorations: LEGEND_XTERM_SEARCH_THEME,
      regex: this.searchConfig.useRegex,
      wholeWord: this.searchConfig.matchWholeWord,
      caseSensitive: this.searchConfig.matchCaseSensitive,
    });
  }
}
