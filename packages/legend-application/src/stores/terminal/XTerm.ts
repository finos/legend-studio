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
import {
  Terminal,
  DISPLAY_ANSI_ESCAPE,
  ANSI_moveCursor,
  type TerminalWriteOption,
  type TerminalSetupConfiguration,
  type TerminalCommandConfiguration,
} from './Terminal.js';
import {
  ActionState,
  guaranteeNonNullable,
  IllegalStateError,
  isMatchingKeyCombination,
  LogEvent,
  prettyCONSTName,
  uniqBy,
} from '@finos/legend-shared';
import { APPLICATION_EVENT } from '../ApplicationEvent.js';
import { forceDispatchKeyboardEvent } from '../../components/LegendApplicationComponentFrameworkProvider.js';

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
const getHelpCommandContent = (
  commandRegistry: Map<string, TerminalCommandConfiguration>,
): string => `
${
  DISPLAY_ANSI_ESCAPE.BRIGHT_BLACK
}+-------------------------------------------------------+${
  DISPLAY_ANSI_ESCAPE.RESET
}
${DISPLAY_ANSI_ESCAPE.BRIGHT_BLACK}|${DISPLAY_ANSI_ESCAPE.RESET}   ${
  DISPLAY_ANSI_ESCAPE.BRIGHT_GREEN
}[@@]${
  DISPLAY_ANSI_ESCAPE.RESET
}   "Hi! Welcome to the HELP menu of Pure IDE"   ${
  DISPLAY_ANSI_ESCAPE.BRIGHT_BLACK
}|${DISPLAY_ANSI_ESCAPE.RESET}
${DISPLAY_ANSI_ESCAPE.BRIGHT_BLACK}|${DISPLAY_ANSI_ESCAPE.RESET}  ${
  DISPLAY_ANSI_ESCAPE.BRIGHT_GREEN
}/|__|\\${
  DISPLAY_ANSI_ESCAPE.RESET
}                                               ${
  DISPLAY_ANSI_ESCAPE.BRIGHT_BLACK
}|${DISPLAY_ANSI_ESCAPE.RESET}
${DISPLAY_ANSI_ESCAPE.BRIGHT_BLACK}+--${DISPLAY_ANSI_ESCAPE.RESET} ${
  DISPLAY_ANSI_ESCAPE.BRIGHT_GREEN
}d  b${DISPLAY_ANSI_ESCAPE.RESET} ${
  DISPLAY_ANSI_ESCAPE.BRIGHT_BLACK
}-----------------------------------------------+${DISPLAY_ANSI_ESCAPE.RESET}

Following is the list of supported commands:

${uniqBy(Array.from(commandRegistry.values()), (config) => config.command)
  .map(
    (config) =>
      `${DISPLAY_ANSI_ESCAPE.BRIGHT_GREEN}${config.command.padEnd(30)}${
        DISPLAY_ANSI_ESCAPE.RESET
      }${config.description}${
        config.aliases?.length
          ? `\n${''.padEnd(30)}Aliases: ${config.aliases.join(', ')}`
          : ''
      }\n${''.padEnd(30)}Usage: ${DISPLAY_ANSI_ESCAPE.DIM}${config.usage}${
        DISPLAY_ANSI_ESCAPE.RESET
      }`,
  )
  .join('\n')}`;

const getCommonANSIEscapeSequencesForStyling = (): string =>
  `
Common ANSI Escape Sequences for Styling:

${Object.entries(DISPLAY_ANSI_ESCAPE)
  .map(
    ([key, value]) =>
      `${value}${prettyCONSTName(key).padEnd(20)}${
        DISPLAY_ANSI_ESCAPE.RESET
      } ${value.replace('\x1b', '\\x1b')}`,
  )
  .join('\n')}`;

const DEFAULT_USER = 'purist';
const DEFAULT_COMMAND_HEADER = `
${DISPLAY_ANSI_ESCAPE.BOLD}${DISPLAY_ANSI_ESCAPE.BRIGHT_BLUE}$${DEFAULT_USER}${DISPLAY_ANSI_ESCAPE.RESET}
${DISPLAY_ANSI_ESCAPE.BOLD}${DISPLAY_ANSI_ESCAPE.MAGENTA}\u276f${DISPLAY_ANSI_ESCAPE.RESET} `;
const COMMAND_START = '\u276f ';

export class XTerm extends Terminal {
  private readonly instance: XTermTerminal;
  private readonly resizer: XTermFitAddon;
  private readonly renderer: XTermWebglAddon;
  private readonly searcher: XTermSearchAddon;
  private webLinkProvider?: XTermWebLinksAddon;

  private _TEMPORARY__onKeyListener?: XTermDisposable;
  private _TEMPORARY__onDataListener?: XTermDisposable;
  private isRunningCommand = false;

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

    // NOTE: since we render the terminal using webgl/canvas, event is not bubbled
    // naturally through the DOM tree, we have to manually force this
    this.instance.attachCustomKeyEventHandler(
      (event: KeyboardEvent): boolean => {
        // NOTE: this is a cheap way to handle hotkey, but this is really the only
        // hotkey we want to support at local scope of the terminal
        // also, since here we have prevent default and stop propagation, we have to do
        // this here instead at in `onKey` handler
        if (
          isMatchingKeyCombination(event, 'Control+KeyF') ||
          isMatchingKeyCombination(event, 'Meta+KeyF')
        ) {
          // prevent default so as to not trigger browser platform search command
          event.preventDefault();
          event.stopPropagation();
          this.searchConfig.focus();
          return false;
        }
        return true; // return true to indicate the event should still be handled by xterm
      },
    );

    this.webLinkProvider = configuration?.webLinkProvider
      ? new XTermWebLinksAddon(configuration.webLinkProvider.handler, {
          urlRegex: configuration.webLinkProvider.regex,
        })
      : new XTermWebLinksAddon();
    this.instance.loadAddon(this.webLinkProvider);

    (configuration?.commands ?? []).forEach((commandConfig) => {
      [commandConfig.command, ...(commandConfig.aliases ?? [])].forEach(
        (command) => {
          if (!this.commandRegistry.has(command)) {
            this.commandRegistry.set(command, commandConfig);
          } else {
            this.applicationStore.log.warn(
              LogEvent.create(
                APPLICATION_EVENT.APPLICATION_TERMINAL_COMMAND_CONFIGURATION_CHECK_FAILURE,
              ),
              `Found multiple duplicated terminal commands '${command}'`,
            );
          }
        },
      );
    });

    this.searcher.onDidChangeResults((result) => {
      if (result) {
        this.setSearchResultCount(result.resultCount);
        this.setSearchCurrentResultIndex(result.resultIndex);
      } else {
        this.setSearchResultCount(undefined);
        this.setSearchCurrentResultIndex(undefined);
      }
    });

    // NOTE: `xterm` expects to be attached to a proper terminal program which handles
    // input, since we can't do that yet, we implement a fairly basic input handling flow
    // See https://github.com/xtermjs/xterm.js/issues/617#issuecomment-288849502
    this._TEMPORARY__onKeyListener = this.instance.onKey(
      ({ key, domEvent }) => {
        if (domEvent.code === 'Enter') {
          if (this.command.trim()) {
            const [command, ...args] = this.command
              .replaceAll(/\s+/g, ' ')
              .split(' ');
            if (!command) {
              return;
            }
            const matchingCommand = this.commandRegistry.get(command);
            if (!matchingCommand) {
              this.fail(`command not found: ${command}`);
              return;
            }
            if (this.isRunningCommand) {
              return;
            }
            this.isRunningCommand = true;
            matchingCommand.handler(args).finally(() => {
              this.isRunningCommand = false;
              if (!this.isFlushed) {
                this.abort();
              }
            });
          }
        } else if (
          isMatchingKeyCombination(domEvent, 'Control+KeyC') ||
          isMatchingKeyCombination(domEvent, 'Control+KeyD')
        ) {
          // escape from current command
          this.abort();
        } else if (domEvent.code === 'Backspace') {
          // Alt: jump word only, Ctrl: jump to end
          // this would apply for Delete, ArrowLeft, ArrowRight
          this.deleteFromCommand(
            domEvent.altKey
              ? this.computeCursorJumpMovement(true, true)
              : domEvent.ctrlKey
              ? this.computeCursorJumpMovement(true, false)
              : -1,
          );
        } else if (domEvent.code === 'Delete') {
          this.deleteFromCommand(
            domEvent.altKey
              ? this.computeCursorJumpMovement(false, true)
              : domEvent.ctrlKey
              ? this.computeCursorJumpMovement(false, false)
              : 1,
          );
        } else if (domEvent.code === 'ArrowLeft') {
          this.instance.write(
            this.generateMoveCursorANSISeq(
              domEvent.altKey
                ? this.computeCursorJumpMovement(true, true)
                : domEvent.ctrlKey
                ? this.computeCursorJumpMovement(true, false)
                : -1,
            ),
          );
        } else if (domEvent.code === 'ArrowRight') {
          this.instance.write(
            this.generateMoveCursorANSISeq(
              domEvent.altKey
                ? this.computeCursorJumpMovement(false, true)
                : domEvent.ctrlKey
                ? this.computeCursorJumpMovement(false, false)
                : 1,
            ),
          );
        } else if (
          domEvent.key.match(
            /^[A-Za-z0-9!@#$%^&*()-_=+"':;,.<>/?[\]{}|\\~` \\t]$/,
          )
        ) {
          // commonly supported keys
          this.writeToCommand(key);
        } else {
          // for the rest, allow the keyboard event to be bubbled to
          // application keyboard shortcuts handler
          forceDispatchKeyboardEvent(domEvent);
        }
      },
    );
    // this is needed to support copy-pasting
    this._TEMPORARY__onDataListener = this.instance.onData((val) => {
      // only support pasting (not meant for 1 character though) and special functions starting with special
      // ANSI escape sequence
      if (val.length > 1 && !val.startsWith('\x1b')) {
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
  //
  // there is also a quriky known issue with text-reflow and the line with cursor
  // See https://github.com/xtermjs/xterm.js/issues/1941#issuecomment-463660633
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

  private computeCursorJumpMovement(
    back: boolean,
    jumpWordOnly: boolean,
  ): number {
    const range = this.getCommandRange();

    let distance: number | undefined = undefined;
    let foundWord = false;

    // scan for the boundary of the closest word to the cursor position
    if (jumpWordOnly) {
      if (back) {
        for (let i = range.cursorIdx - 1; i > -1; --i) {
          const char = this.command.charAt(i);
          if (char.match(/\w/)) {
            if (!foundWord) {
              foundWord = true;
            }
          } else {
            if (foundWord) {
              distance = range.cursorIdx - i - 1;
              break;
            }
          }
        }
      } else {
        for (let i = range.cursorIdx + 1; i < this.command.length; ++i) {
          const char = this.command.charAt(i);
          if (char.match(/\w/)) {
            if (!foundWord) {
              foundWord = true;
            }
          } else {
            if (foundWord) {
              distance = i - range.cursorIdx - 1;
              break;
            }
          }
        }
      }
    }

    if (distance === undefined) {
      distance = back ? range.cursorIdx : this.command.length - range.cursorIdx;
    }

    return back ? -distance : distance;
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
          ? Math.floor((buffer.cursorX + distance) / cols)
          : 0);
    }
    return ANSI_moveCursor(newCursorY + 1, newCursorX + 1);
  }

  /**
   * Write value to command with awareness of the current cursor position
   */
  private writeToCommand(val: string): void {
    const range = this.getCommandRange();
    const left = this.command.slice(0, range.cursorIdx);
    const right = this.command.slice(range.cursorIdx);

    this.instance.write(
      val +
        right +
        // update the cursor
        this.generateMoveCursorANSISeq(val.length, false),
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

    let left;
    let right;
    let cursorMovement;
    if (val === 0) {
      return;
    } else if (val < 0) {
      // remove leftwards
      left = this.command.slice(0, range.cursorIdx - distance);
      right = this.command.slice(range.cursorIdx, this.command.length);
      cursorMovement = -distance;
    } else {
      // remove rightwards
      left = this.command.slice(0, range.cursorIdx);
      right = this.command.slice(
        range.cursorIdx + distance,
        this.command.length,
      );
      cursorMovement = 0;
    }

    this.instance.write(
      // reset cursor to start of command, basically here, we're rewriting the entire command
      ANSI_moveCursor(range.startY + 1, range.startX + 1) +
        left +
        right +
        // fill space to erase cells rendered from previous command
        ' '.repeat(distance) +
        // move the cursor as well
        this.generateMoveCursorANSISeq(cursorMovement),
    );
    this.setCommand(left + right);
  }

  get isSetup(): boolean {
    return this.setupState.hasCompleted;
  }

  isFocused(): boolean {
    return document.activeElement === this.instance.textarea;
  }

  mount(container: HTMLElement): void {
    if (!this.setupState.hasCompleted) {
      throw new IllegalStateError(`XTerm terminal has not been set up yet`);
    }

    this.instance.open(container);
  }

  dispose(): void {
    this.searcher.dispose();
    this.resizer.dispose();
    this.renderer.dispose();
    this.webLinkProvider?.dispose();
    this._TEMPORARY__onKeyListener?.dispose();
    this._TEMPORARY__onDataListener?.dispose();
    this.instance.dispose();
  }

  autoResize(): void {
    this.resizer.fit();
  }

  focus(): void {
    this.instance.focus();
  }

  private newCommand(): void {
    this.instance.write(DEFAULT_COMMAND_HEADER);
    this.setCommand('');
  }

  private newSystemCommand(command: string): void {
    // if another command is already running, we don't need to print the command header anymore
    // the potential pitfall here is that we could have another process prints to the
    // terminal while the command is being run. Nothing much we can do here for now.
    if (!this.isRunningCommand) {
      this.newCommand();
      this.instance.write(
        `${DISPLAY_ANSI_ESCAPE.DIM}(system: ${command})\n${DISPLAY_ANSI_ESCAPE.RESET}`,
      );
    }
  }

  /**
   * Flush the terminal screen completely
   *
   * Probably due to write buffer batching, calling `reset` or `clear` on xterm terminal immediately after
   * write commands will not work. To solve this, we can either promisify the `reset` call or write the ANSI
   * reset sequence \x1bc
   */
  private flushScreen(): void {
    this.instance.write('\x1bc');
    this.instance.reset();
  }

  private get isFlushed(): boolean {
    const buffer = this.instance.buffer.active;
    let isLastLineEmpty = true;

    for (let i = buffer.baseY + buffer.cursorY; i > -1; --i) {
      const line = guaranteeNonNullable(buffer.getLine(i));
      const lineText = line.translateToString();

      // skip empty lines
      if (!lineText.trim()) {
        continue;
      } else {
        isLastLineEmpty = lineText !== COMMAND_START;
        break;
      }
    }

    return this.command === '' && isLastLineEmpty;
  }

  clear(): void {
    this.flushScreen();
    this.instance.scrollToTop();
    this.newCommand();
  }

  private resetANSIStyling(): void {
    this.instance.write(DISPLAY_ANSI_ESCAPE.RESET);
  }

  override showHelp(): void {
    this.resetANSIStyling();
    this.instance.scrollToBottom();
    if (!this.isFlushed && !this.isRunningCommand) {
      this.abort();
    }
    this.instance.write(getHelpCommandContent(this.commandRegistry));
    this.abort();
  }

  override showCommonANSIEscapeSequences(): void {
    this.resetANSIStyling();
    this.instance.scrollToBottom();
    if (!this.isFlushed && !this.isRunningCommand) {
      this.abort();
    }
    this.instance.write(getCommonANSIEscapeSequencesForStyling());
    this.abort();
  }

  abort(): void {
    this.resetANSIStyling();
    this.instance.write('\n');
    this.newCommand();
    this.instance.scrollToBottom();
    this.isRunningCommand = false;
  }

  fail(error: string, opts?: TerminalWriteOption): void {
    if (opts?.systemCommand) {
      this.newSystemCommand(opts.systemCommand);
    }

    this.instance.write(
      `\n${DISPLAY_ANSI_ESCAPE.RED}${error}${DISPLAY_ANSI_ESCAPE.RED}`,
    );
    this.abort();
  }

  output(output: string, opts?: TerminalWriteOption): void {
    this.resetANSIStyling();

    if (!opts?.clear && opts?.systemCommand) {
      this.newSystemCommand(opts.systemCommand);
    }

    if (!this.preserveLog && opts?.clear) {
      this.flushScreen();
    } else if (this.preserveLog || this.isRunningCommand) {
      this.instance.write('\n');
    }

    this.instance.writeln(output);
    this.instance.scrollToBottom();
    this.newCommand();
  }

  search(val: string): void {
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
    this.searcher.clearDecorations();
    this.instance.clearSelection();
    this.setSearchText('');
    this.setSearchResultCount(undefined);
    this.setSearchCurrentResultIndex(undefined);
  }

  findPrevious(): void {
    this.searcher.findPrevious(this.searchConfig.searchText, {
      decorations: LEGEND_XTERM_SEARCH_THEME,
      regex: this.searchConfig.useRegex,
      wholeWord: this.searchConfig.matchWholeWord,
      caseSensitive: this.searchConfig.matchCaseSensitive,
    });
  }

  findNext(): void {
    this.searcher.findNext(this.searchConfig.searchText, {
      decorations: LEGEND_XTERM_SEARCH_THEME,
      regex: this.searchConfig.useRegex,
      wholeWord: this.searchConfig.matchWholeWord,
      caseSensitive: this.searchConfig.matchCaseSensitive,
    });
  }
}
