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
  type ITheme as XTermTheme,
  Terminal as XTermTerminal,
  type IDisposable as XTermDisposable,
} from 'xterm';
import { WebLinksAddon as XTermWebLinksAddon } from 'xterm-addon-web-links';
import { FitAddon as XTermFitAddon } from 'xterm-addon-fit';
import { SearchAddon as XTermSearchAddon } from 'xterm-addon-search';
import { Unicode11Addon as XTermUnicode11Addon } from 'xterm-addon-unicode11';
import { WebglAddon as XTermWebglAddon } from 'xterm-addon-webgl';
import { MONOSPACED_FONT_FAMILY, TAB_SIZE } from '../../const.js';
import { forceDispatchKeyboardEvent } from '../../components/LegendApplicationComponentFrameworkProvider.js';
import { Terminal, type TerminalWriteOption, ANSI_ESCAPE } from './Terminal.js';

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

export class XTerm extends Terminal {
  private readonly instance: XTermTerminal;
  private readonly resizer: XTermFitAddon;
  private readonly searcher: XTermSearchAddon;
  private readonly renderer: XTermWebglAddon;

  // NOTE: since we don't attach xterm to a terminal with real stdin, we have to manually
  // register the user input in this temporary variable. When `Enter` is hit, we will flush this
  private _TEMPORARY__currentCommandText = '';
  private _TEMPORARY__onKeyListener?: XTermDisposable;
  private _TEMPORARY__onDataListener?: XTermDisposable;

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
      convertEol: true, // treat \n as new line
    });

    this.resizer = new XTermFitAddon();
    this.searcher = new XTermSearchAddon();
    this.renderer = new XTermWebglAddon();

    this.setup();
  }

  private setup(): void {
    // Handling context loss: The browser may drop WebGL contexts for various reasons like OOM or after the system has been suspended.
    // An easy, but suboptimal way, to handle this is by disposing of WebglAddon when the `webglcontextlost` event fires
    // NOTE: we don't really have a resilient way to fallback right now, hopefully, the fallback is to render in DOM
    this.renderer.onContextLoss(() => {
      this.renderer.dispose();
    });
    this.instance.loadAddon(this.resizer);
    this.instance.loadAddon(this.searcher);
    this.instance.loadAddon(this.renderer);
    this.instance.loadAddon(new XTermWebLinksAddon());
    this.instance.loadAddon(new XTermUnicode11Addon());
    this.instance.unicode.activeVersion = '11';

    this.instance.attachCustomKeyEventHandler(
      (event: KeyboardEvent): boolean => {
        // NOTE: since we render the terminal using webgl/canvas, event is not bubbled
        // naturally through the DOM tree, we have to manually force this
        forceDispatchKeyboardEvent(event);
        return true; // return true to indicate the event should still be handled by xterm
      },
    );

    this._TEMPORARY__onKeyListener = this.instance.onKey(
      ({ key, domEvent }) => {
        if (key.charCodeAt(0) === 13) {
          // Enter
          if (domEvent.shiftKey) {
            // this.instance.write('\n');
            // this._TEMPORARY__currentCommandText += '\n';
          } else {
            this._TEMPORARY__currentCommandText = '';

            // execute command
          }
        } else if (key.charCodeAt(0) === 127) {
          // Backspace
          this.instance.write('\b \b');
        } else {
          this.instance.write(key);
          // this.instance.buffer.active.cur;
          this._TEMPORARY__currentCommandText += key;
        }
      },
    );

    // this._TEMPORARY__onDataHandler = this.instance.onData((val) => {});

    // use onData for paste and normal input, limit the range; use onKey for special handling, liek Enter, Arrow, backspaces, etc.

    // this.searcher.findNext('foo');
  }

  mount(container: HTMLElement): void {
    this.instance.open(container);
  }

  dispose(): void {
    this.searcher.dispose();
    this.resizer.dispose();
    this.renderer.dispose();
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

  override showHelp(): void {
    this.resetANSIStyling();
    this.instance.scrollToBottom();
    this.instance.writeln(HELP_COMMAND_TEXT);
  }

  clear(): void {
    this.instance.reset();
    this.instance.write(DEFAULT_COMMAND_HEADER);
  }

  private resetANSIStyling(): void {
    this.instance.write(ANSI_ESCAPE.RESET);
  }

  write(
    output: string,
    command: string | undefined,
    opts?: TerminalWriteOption,
  ): void {
    if (!this.preserveLog && opts?.clear) {
      this.instance.clear();
      this.instance.scrollToTop();
    }
    this.resetANSIStyling();
    this.instance.write(DEFAULT_COMMAND_HEADER);
    this.instance.write(`${command ?? '(unknown)'}\n`);
    this.instance.writeln(output);
    if (!opts?.clear) {
      this.instance.scrollToBottom();
    }
  }
}
