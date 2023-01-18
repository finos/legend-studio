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
export enum ANSI_ESCAPE {
  RESET = '\u001b[0m', // color off

  // text decoration
  BOLD = '\u001b[1m',
  DIM = '\u001b[2m',
  ITALIC = '\u001b[3m',
  UNDERLINE = '\u001b[4m',
  BLINKING = '\u001b[5m',
  STRIKETHROUGH = '\u001b[9m',

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

  // utility
  ERASE_FROM_CURSOR_TO_END_OF_LINE = '\u001b[0K',
  ERASE_FROM_CURSOR_TO_START_OF_LINE = '\u001b[1K',
  ERASE_LINE = '\u001b[2K',
}

/**
 * NOTE: line and column start from 1
 */
export const ANSI_moveCursor = (line: number, column: number): string =>
  `\u001b[${line};${column}H`;
export const ANSI_moveCursorUp = (val: number, start?: boolean): string =>
  start ? `\u001b[${val}F` : `\u001b[${val}A`;
export const ANSI_moveCursorDown = (val: number, start?: boolean): string =>
  start ? `\u001b[${val}E` : `\u001b[${val}B`;
export const ANSI_moveCursorRight = (val: number): string => `\u001b[${val}C`;
export const ANSI_moveCursorLeft = (val: number): string => `\u001b[${val}D`;
export const ANSI_moveCursorToColumn = (val: number): string =>
  `\u001b[${val}G`;

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
  alias: string[];
  handler: (args: string[]) => void;
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
  protected commandRegistry: TerminalCommandConfiguration[] = [];
  command = '';

  constructor(applicationStore: GenericLegendApplicationStore) {
    super(applicationStore);

    makeObservable(this, {
      preserveLog: observable,
      command: observable,
      setPreserveLog: action,
      setCommand: action,
    });
  }

  setPreserveLog(val: boolean): void {
    this.preserveLog = val;
  }

  setCommand(val: string): void {
    this.command = val;
  }

  abstract get isSetup(): boolean;
  abstract setup(configuration?: TerminalSetupConfiguration | undefined): void;
  abstract focus(): void;

  showHelp(): void {
    // do nothing
  }

  abstract abort(): void;
  abstract write(
    output: string,
    command: string | undefined,
    opts?: TerminalWriteOption,
  ): void;

  abstract search(val: string): void;
  abstract clearSearch(): void;
  abstract findPrevious(): void;
  abstract findNext(): void;
}
