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
import { type ITheme as XTermTheme, Terminal as XTermTerminal } from 'xterm';
import { WebLinksAddon as XTermWebLinksAddon } from 'xterm-addon-web-links';
import { FitAddon as XTermFitAddon } from 'xterm-addon-fit';
import { SearchAddon as XTermSearchAddon } from 'xterm-addon-search';
import { Unicode11Addon as XTermUnicode11Addon } from 'xterm-addon-unicode11';
import { WebglAddon as XTermWebglAddon } from 'xterm-addon-webgl';
import { MONOSPACED_FONT_FAMILY, TAB_SIZE } from '../../const.js';
import { forceDispatchKeyboardEvent } from '../../components/LegendApplicationComponentFrameworkProvider.js';
import { Terminal } from './Terminal.js';

// NOTE: using Unicode for ANSI escape
// See https://stackoverflow.com/questions/26153308/best-ansi-escape-beginning
enum XTERM_ANSI_CODE {
  RESET = '\u001b[0m', // color off

  // foreground
  BLACK = '\u001b[30m',
  RED = '\u001b[31m',
  GREEN = '\u001b[32m',
  YELLOW = '\u001b[33m',
  BLUE = '\u001b[34m',
  MAGENTA = '\u001b[35m',
  CYAN = '\u001b[36m',
  WHITE = '\u001b[37m',

  BRIGHT_BLACK = `\u001b[1;30m`,
  BRIGHT_RED = '\u001b[1;31m',
  BRIGHT_GREEN = '\u001b[1;32m',
  BRIGHT_YELLOW = '\u001b[1;33m',
  BRIGHT_BLUE = '\u001b[1;34m',
  BRIGHT_MAGENTA = '\u001b[1;35m',
  BRIGHT_CYAN = '\u001b[1;36m',
  BRIGHT_WHITE = '\u001b[1;37m',

  DIMMED_BLACK = `\u001b[2;30m`,
  DIMMED_RED = '\u001b[2;31m',
  DIMMED_GREEN = '\u001b[2;32m',
  DIMMED_YELLOW = '\u001b[2;33m',
  DIMMED_BLUE = '\u001b[2;34m',
  DIMMED_MAGENTA = '\u001b[2;35m',
  DIMMED_CYAN = '\u001b[2;36m',
  DIMMED_WHITE = '\u001b[2;37m',

  // background
  BLACK_BG = '\u001b[40m',
  RED_BG = '\u001b[41m',
  GREEN_BG = '\u001b[42m',
  YELLOW_BG = '\u001b[43m',
  BLUE_BG = '\u001b[44m',
  MAGENTA_BG = '\u001b[45m',
  CYAN_BG = '\u001b[46m',
  WHITE_BG = '\u001b[47m',

  BRIGHT_BLACK_BG = `\u001b[1;40m`,
  BRIGHT_RED_BG = '\u001b[1;41m',
  BRIGHT_GREEN_BG = '\u001b[1;42m',
  BRIGHT_YELLOW_BG = '\u001b[1;43m',
  BRIGHT_BLUE_BG = '\u001b[1;44m',
  BRIGHT_MAGENTA_BG = '\u001b[1;45m',
  BRIGHT_CYAN_BG = '\u001b[1;46m',
  BRIGHT_WHITE_BG = '\u001b[1;47m',

  DIMMED_BLACK_BG = `\u001b[2;40m`,
  DIMMED_RED_BG = '\u001b[2;41m',
  DIMMED_GREEN_BG = '\u001b[2;42m',
  DIMMED_YELLOW_BG = '\u001b[2;43m',
  DIMMED_BLUE_BG = '\u001b[2;44m',
  DIMMED_MAGENTA_BG = '\u001b[2;45m',
  DIMMED_CYAN_BG = '\u001b[2;46m',
  DIMMED_WHITE_BG = '\u001b[2;47m',
}

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
${XTERM_ANSI_CODE.BRIGHT_BLACK}+-------------------------------------------------------+${XTERM_ANSI_CODE.RESET}
${XTERM_ANSI_CODE.BRIGHT_BLACK}|${XTERM_ANSI_CODE.RESET}   ${XTERM_ANSI_CODE.BRIGHT_GREEN}[@@]${XTERM_ANSI_CODE.RESET}   "Hi! Welcome to the HELP menu of Pure IDE"   ${XTERM_ANSI_CODE.BRIGHT_BLACK}|${XTERM_ANSI_CODE.RESET}
${XTERM_ANSI_CODE.BRIGHT_BLACK}|${XTERM_ANSI_CODE.RESET}  ${XTERM_ANSI_CODE.BRIGHT_GREEN}/|__|\\${XTERM_ANSI_CODE.RESET}                                               ${XTERM_ANSI_CODE.BRIGHT_BLACK}|${XTERM_ANSI_CODE.RESET}
${XTERM_ANSI_CODE.BRIGHT_BLACK}+--${XTERM_ANSI_CODE.RESET} ${XTERM_ANSI_CODE.BRIGHT_GREEN}d  b${XTERM_ANSI_CODE.RESET} ${XTERM_ANSI_CODE.BRIGHT_BLACK}-----------------------------------------------+${XTERM_ANSI_CODE.RESET}


`;

export class XTerm extends Terminal {
  private readonly instance: XTermTerminal;
  private readonly resizer: XTermFitAddon;
  private readonly searcher: XTermSearchAddon;
  private readonly renderer: XTermWebglAddon;

  constructor(applicationStore: GenericLegendApplicationStore) {
    super(applicationStore);

    this.instance = new XTermTerminal({
      allowProposedApi: true,
      fontSize: 12,
      letterSpacing: 2,
      fontFamily: MONOSPACED_FONT_FAMILY,
      tabStopWidth: TAB_SIZE,
      theme: LEGEND_XTERM_THEME,
      convertEol: true, // treat \n as new line
    });

    this.resizer = new XTermFitAddon();
    this.searcher = new XTermSearchAddon();
    this.renderer = new XTermWebglAddon();
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

    // this.searcher.findNext('foo');
  }

  mount(container: HTMLElement): void {
    this.instance.open(container);
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
    this.instance.clear();
  }

  private resetANSIStyling(): void {
    this.instance.write(XTERM_ANSI_CODE.RESET);
  }

  write(val: string): void {
    if (!this.preserveLog) {
      this.clear();
      this.resetANSIStyling();
      this.instance.scrollToTop();
    }
    this.instance.write(val);
  }

  writeln(val: string): void {
    if (!this.preserveLog) {
      this.clear();
      this.resetANSIStyling();
      this.instance.scrollToTop();
    }
    this.instance.writeln(val);
  }
}
