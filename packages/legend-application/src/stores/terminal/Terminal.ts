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
import { action, makeObservable, observable } from 'mobx';

// NOTE: using Unicode for ANSI escape
// See https://stackoverflow.com/questions/26153308/best-ansi-escape-beginning
// See https://gist.github.com/fnky/458719343aabd01cfb17a3a4f7296797
export enum DISPLAY_ANSI_ESCAPE {
  RESET = '\x1b[0m', // color off

  // text decoration
  BOLD = '\x1b[1m',
  DIM = '\x1b[2m',
  ITALIC = '\x1b[3m',
  UNDERLINE = '\x1b[4m',
  BLINKING = '\x1b[5m',
  STRIKETHROUGH = '\x1b[9m',

  // foreground
  BLACK = '\x1b[30m',
  RED = '\x1b[31m',
  GREEN = '\x1b[32m',
  YELLOW = '\x1b[33m',
  BLUE = '\x1b[34m',
  MAGENTA = '\x1b[35m',
  CYAN = '\x1b[36m',
  WHITE = '\x1b[37m',

  BRIGHT_BLACK = `\x1b[1;30m`,
  BRIGHT_RED = '\x1b[1;31m',
  BRIGHT_GREEN = '\x1b[1;32m',
  BRIGHT_YELLOW = '\x1b[1;33m',
  BRIGHT_BLUE = '\x1b[1;34m',
  BRIGHT_MAGENTA = '\x1b[1;35m',
  BRIGHT_CYAN = '\x1b[1;36m',
  BRIGHT_WHITE = '\x1b[1;37m',

  DIMMED_BLACK = `\x1b[2;30m`,
  DIMMED_RED = '\x1b[2;31m',
  DIMMED_GREEN = '\x1b[2;32m',
  DIMMED_YELLOW = '\x1b[2;33m',
  DIMMED_BLUE = '\x1b[2;34m',
  DIMMED_MAGENTA = '\x1b[2;35m',
  DIMMED_CYAN = '\x1b[2;36m',
  DIMMED_WHITE = '\x1b[2;37m',

  // background
  BLACK_BG = '\x1b[40m',
  RED_BG = '\x1b[41m',
  GREEN_BG = '\x1b[42m',
  YELLOW_BG = '\x1b[43m',
  BLUE_BG = '\x1b[44m',
  MAGENTA_BG = '\x1b[45m',
  CYAN_BG = '\x1b[46m',
  WHITE_BG = '\x1b[47m',

  BRIGHT_BLACK_BG = `\x1b[1;40m`,
  BRIGHT_RED_BG = '\x1b[1;41m',
  BRIGHT_GREEN_BG = '\x1b[1;42m',
  BRIGHT_YELLOW_BG = '\x1b[1;43m',
  BRIGHT_BLUE_BG = '\x1b[1;44m',
  BRIGHT_MAGENTA_BG = '\x1b[1;45m',
  BRIGHT_CYAN_BG = '\x1b[1;46m',
  BRIGHT_WHITE_BG = '\x1b[1;47m',

  DIMMED_BLACK_BG = `\x1b[2;40m`,
  DIMMED_RED_BG = '\x1b[2;41m',
  DIMMED_GREEN_BG = '\x1b[2;42m',
  DIMMED_YELLOW_BG = '\x1b[2;43m',
  DIMMED_BLUE_BG = '\x1b[2;44m',
  DIMMED_MAGENTA_BG = '\x1b[2;45m',
  DIMMED_CYAN_BG = '\x1b[2;46m',
  DIMMED_WHITE_BG = '\x1b[2;47m',
}

/**
 * NOTE: this is the line and the column of the viewport of the terminal;
 * Also, line and column start from 1
 */
export const ANSI_moveCursor = (line: number, column: number): string =>
  `\x1b[${line};${column}H`;
export const ANSI_moveCursorUp = (val: number, start?: boolean): string =>
  start ? `\x1b[${val}F` : `\x1b[${val}A`;
export const ANSI_moveCursorDown = (val: number, start?: boolean): string =>
  start ? `\x1b[${val}E` : `\x1b[${val}B`;
export const ANSI_moveCursorRight = (val: number): string => `\x1b[${val}C`;
export const ANSI_moveCursorLeft = (val: number): string => `\x1b[${val}D`;
export const ANSI_moveCursorToColumn = (val: number): string => `\x1b[${val}G`;

class ConsoleSearchConfiguration {
  private searchInput?: HTMLInputElement | undefined;

  searchText = '';

  useRegex = false;
  matchWholeWord = false;
  matchCaseSensitive = false;

  resultCount?: number | undefined;
  currentResultIndex?: number | undefined;

  constructor() {
    makeObservable(this, {
      searchText: observable,

      useRegex: observable,
      matchWholeWord: observable,
      matchCaseSensitive: observable,

      resultCount: observable,
      currentResultIndex: observable,
    });
  }

  setSearchInput(el: HTMLInputElement | undefined): void {
    this.searchInput = el;
  }

  focus(): void {
    this.searchInput?.focus();
  }
}

export abstract class Console {
  readonly applicationStore: GenericLegendApplicationStore;

  readonly searchConfig = new ConsoleSearchConfiguration();

  constructor(applicationStore: GenericLegendApplicationStore) {
    makeObservable(this, {
      setSearchText: action,

      setSearchRegex: action,
      setSearchWholeWord: action,
      setSearchCaseSensitive: action,

      setSearchResultCount: action,
      setSearchCurrentResultIndex: action,
    });

    this.applicationStore = applicationStore;
  }

  setSearchText(val: string): void {
    this.searchConfig.searchText = val;
  }

  setSearchRegex(val: boolean): void {
    this.searchConfig.useRegex = val;
  }

  setSearchWholeWord(val: boolean): void {
    this.searchConfig.matchWholeWord = val;
  }

  setSearchCaseSensitive(val: boolean): void {
    this.searchConfig.matchCaseSensitive = val;
  }

  setSearchResultCount(val: number | undefined): void {
    this.searchConfig.resultCount = val;
  }

  setSearchCurrentResultIndex(val: number | undefined): void {
    this.searchConfig.currentResultIndex = val;
  }

  abstract mount(container: HTMLElement): void;
  abstract dispose(): void;
  abstract autoResize(): void;
  abstract clear(): void;
}

export abstract class OutputConsole extends Console {}

export interface TerminalWriteOption {
  systemCommand?: string | undefined;
  /**
   * Whether to clear the console prior to writing
   */
  clear?: boolean | undefined;
}

export interface TerminalWebLinkProviderConfiguration {
  handler: (event: MouseEvent, text: string) => void;
  regex: RegExp;
}

export interface TerminalCommandConfiguration {
  command: string;
  description: string;
  usage: string;
  aliases?: string[] | undefined;
  handler: (args: string[], command: string, text: string) => Promise<void>;
}

export interface TerminalSetupConfiguration {
  // NOTE: since xterm do not support web-link provider, we need to override the default addon
  // the more ideal strategy is to implement additional buffer parser
  // See https://github.com/xtermjs/xterm.js/issues/3746
  webLinkProvider?: TerminalWebLinkProviderConfiguration | undefined;
  commands?: TerminalCommandConfiguration[] | undefined;
}

export abstract class Terminal extends Console {
  preserveLog = false;
  protected commandRegistry = new Map<string, TerminalCommandConfiguration>();

  constructor(applicationStore: GenericLegendApplicationStore) {
    super(applicationStore);

    makeObservable(this, {
      preserveLog: observable,
      setPreserveLog: action,
    });
  }

  setPreserveLog(val: boolean): void {
    this.preserveLog = val;
  }

  abstract get isSetup(): boolean;
  abstract setup(configuration?: TerminalSetupConfiguration | undefined): void;
  abstract focus(): void;

  showHelp(): void {
    // do nothing
  }

  showCommonANSIEscapeSequences(): void {
    // do nothing
  }

  abstract abort(): void;
  abstract fail(error: string, opts?: TerminalWriteOption): void;
  abstract output(val: string, opts?: TerminalWriteOption): void;

  abstract isFocused(): boolean;

  abstract search(val: string): void;
  abstract clearSearch(): void;
  abstract findPrevious(): void;
  abstract findNext(): void;

  abstract copy(): void;
  abstract copyAll(): void;
}
