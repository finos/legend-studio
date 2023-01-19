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
import { prettyCONSTName } from '@finos/legend-shared';

// NOTE: using Unicode for ANSI escape
// See https://stackoverflow.com/questions/26153308/best-ansi-escape-beginning
// See https://gist.github.com/fnky/458719343aabd01cfb17a3a4f7296797
export enum DISPLAY_ANSI_ESCAPE {
  RESET = '\x1B[0m', // color off

  // text decoration
  BOLD = '\x1B[1m',
  DIM = '\x1B[2m',
  ITALIC = '\x1B[3m',
  UNDERLINE = '\x1B[4m',
  BLINKING = '\x1B[5m',
  STRIKETHROUGH = '\x1B[9m',

  // foreground
  BLACK = '\x1B[30m',
  RED = '\x1B[31m',
  GREEN = '\x1B[32m',
  YELLOW = '\x1B[33m',
  BLUE = '\x1B[34m',
  MAGENTA = '\x1B[35m',
  CYAN = '\x1B[36m',
  WHITE = '\x1B[37m',

  BRIGHT_BLACK = `\x1B[1;30m`,
  BRIGHT_RED = '\x1B[1;31m',
  BRIGHT_GREEN = '\x1B[1;32m',
  BRIGHT_YELLOW = '\x1B[1;33m',
  BRIGHT_BLUE = '\x1B[1;34m',
  BRIGHT_MAGENTA = '\x1B[1;35m',
  BRIGHT_CYAN = '\x1B[1;36m',
  BRIGHT_WHITE = '\x1B[1;37m',

  DIMMED_BLACK = `\x1B[2;30m`,
  DIMMED_RED = '\x1B[2;31m',
  DIMMED_GREEN = '\x1B[2;32m',
  DIMMED_YELLOW = '\x1B[2;33m',
  DIMMED_BLUE = '\x1B[2;34m',
  DIMMED_MAGENTA = '\x1B[2;35m',
  DIMMED_CYAN = '\x1B[2;36m',
  DIMMED_WHITE = '\x1B[2;37m',

  // background
  BLACK_BG = '\x1B[40m',
  RED_BG = '\x1B[41m',
  GREEN_BG = '\x1B[42m',
  YELLOW_BG = '\x1B[43m',
  BLUE_BG = '\x1B[44m',
  MAGENTA_BG = '\x1B[45m',
  CYAN_BG = '\x1B[46m',
  WHITE_BG = '\x1B[47m',

  BRIGHT_BLACK_BG = `\x1B[1;40m`,
  BRIGHT_RED_BG = '\x1B[1;41m',
  BRIGHT_GREEN_BG = '\x1B[1;42m',
  BRIGHT_YELLOW_BG = '\x1B[1;43m',
  BRIGHT_BLUE_BG = '\x1B[1;44m',
  BRIGHT_MAGENTA_BG = '\x1B[1;45m',
  BRIGHT_CYAN_BG = '\x1B[1;46m',
  BRIGHT_WHITE_BG = '\x1B[1;47m',

  DIMMED_BLACK_BG = `\x1B[2;40m`,
  DIMMED_RED_BG = '\x1B[2;41m',
  DIMMED_GREEN_BG = '\x1B[2;42m',
  DIMMED_YELLOW_BG = '\x1B[2;43m',
  DIMMED_BLUE_BG = '\x1B[2;44m',
  DIMMED_MAGENTA_BG = '\x1B[2;45m',
  DIMMED_CYAN_BG = '\x1B[2;46m',
  DIMMED_WHITE_BG = '\x1B[2;47m',
}

const getCommonANSIEscapeSequencesForStyling = (): string =>
  `
Common ANSI Escape Sequences for Styling:

${Object.entries(DISPLAY_ANSI_ESCAPE)
  .map(
    ([key, value]) =>
      `${value}${prettyCONSTName(key).padEnd(20)}${
        DISPLAY_ANSI_ESCAPE.RESET
      } ${value.replace('\x1B', '\\x1B')}`,
  )
  .join('\n')}
`;

/**
 * NOTE: line and column start from 1
 */
export const ANSI_moveCursor = (line: number, column: number): string =>
  `\x1B[${line};${column}H`;
export const ANSI_moveCursorUp = (val: number, start?: boolean): string =>
  start ? `\x1B[${val}F` : `\x1B[${val}A`;
export const ANSI_moveCursorDown = (val: number, start?: boolean): string =>
  start ? `\x1B[${val}E` : `\x1B[${val}B`;
export const ANSI_moveCursorRight = (val: number): string => `\x1B[${val}C`;
export const ANSI_moveCursorLeft = (val: number): string => `\x1B[${val}D`;
export const ANSI_moveCursorToColumn = (val: number): string => `\x1B[${val}G`;

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
  description: string;
  usage: string;
  aliases?: string[] | undefined;
  handler: (args: string[]) => Promise<void>;
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

  showCommonANSIEscapeSequences(): void {
    this.write(getCommonANSIEscapeSequencesForStyling(), undefined);
  }

  abstract fail(error: string): void;
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
