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

import { useApplicationStore } from '@finos/legend-application';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BlankPanelContent,
  CaseSensitiveIcon,
  CloseIcon,
  clsx,
  ContextMenu,
  CopyIcon,
  HistoryIcon,
  MenuContent,
  MenuContentItem,
  QuestionCircleIcon,
  RegexIcon,
  TrashIcon,
  useResizeDetector,
  WholeWordMatchIcon,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef } from 'react';
import { PANEL_MODE } from '../../stores/PureIDEConfig.js';
import { usePureIDEStore } from '../PureIDEStoreProvider.js';

export const Console = observer(() => {
  const ideStore = usePureIDEStore();
  const applicationStore = useApplicationStore();
  const terminal = applicationStore.terminalService.terminal;
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { ref, width, height } = useResizeDetector<HTMLDivElement>();

  useEffect(() => {
    if (searchInputRef.current) {
      terminal.searchConfig.setSearchInput(searchInputRef.current);
    }
    return () => terminal.searchConfig.setSearchInput(undefined);
  }, [terminal]);

  useEffect(() => {
    if (ref.current) {
      terminal.mount(ref.current);
    }
  }, [terminal, ref]);

  // auto-focus on the terminal when the console tab is open
  useEffect(() => {
    if (
      ideStore.panelGroupDisplayState.isOpen &&
      ideStore.activePanelMode === PANEL_MODE.TERMINAL
    ) {
      terminal.focus();
    }
  }, [
    terminal,
    ideStore.panelGroupDisplayState.isOpen,
    ideStore.activePanelMode,
  ]);

  useEffect(() => {
    terminal.autoResize();
  }, [terminal, width, height]);

  const onSearchTextChange: React.ChangeEventHandler<HTMLInputElement> = (
    event,
  ) => {
    const value = event.target.value;
    terminal.setSearchText(value);
    terminal.search(value);
  };
  const goToPreviousSearchMatch = (): void => {
    terminal.findPrevious();
  };
  const goToNextSearchMatch = (): void => {
    terminal.findNext();
  };
  const onSearchNavigation: React.KeyboardEventHandler<HTMLInputElement> = (
    event,
  ) => {
    if (event.code === 'Enter') {
      if (event.shiftKey) {
        terminal.findPrevious();
      } else {
        terminal.findNext();
      }
    } else if (event.code === 'Escape') {
      terminal.clearSearch();
      terminal.focus();
    }
  };
  const clear = (): void => {
    terminal.clear();
    terminal.focus();
  };
  const copy = (): void => terminal.copy();
  const copyAll = (): void => terminal.copyAll();

  if (!terminal.isSetup) {
    return (
      <div className="terminal-panel">
        <BlankPanelContent>Terminal is not set up yet</BlankPanelContent>
      </div>
    );
  }
  return (
    <div className="terminal-panel">
      <div className="terminal-panel__header">
        <div className="terminal-panel__header__group">
          <div className="terminal-panel__header__searcher__input__container">
            <input
              ref={searchInputRef}
              className="terminal-panel__header__searcher__input input--dark"
              spellCheck={false}
              value={terminal.searchConfig.searchText}
              onChange={onSearchTextChange}
              onKeyDown={onSearchNavigation}
              placeholder="Find"
            />
            <div className="terminal-panel__header__searcher__input__actions">
              <button
                className="terminal-panel__header__searcher__input__action"
                tabIndex={-1}
                title="Clear Search"
                onClick={() => terminal.clearSearch()}
              >
                <CloseIcon />
              </button>
              <button
                className={clsx(
                  'terminal-panel__header__searcher__input__action',
                  {
                    'terminal-panel__header__searcher__input__action--active':
                      terminal.searchConfig.matchCaseSensitive,
                  },
                )}
                tabIndex={-1}
                title="Match Case"
                onClick={() =>
                  terminal.setSearchCaseSensitive(
                    !terminal.searchConfig.matchCaseSensitive,
                  )
                }
              >
                <CaseSensitiveIcon />
              </button>
              <button
                className={clsx(
                  'terminal-panel__header__searcher__input__action',
                  {
                    'terminal-panel__header__searcher__input__action--active':
                      terminal.searchConfig.matchWholeWord,
                  },
                )}
                tabIndex={-1}
                title="Match Whole Word"
                onClick={() =>
                  terminal.setSearchWholeWord(
                    !terminal.searchConfig.matchWholeWord,
                  )
                }
              >
                <WholeWordMatchIcon />
              </button>
              <button
                className={clsx(
                  'terminal-panel__header__searcher__input__action',
                  {
                    'terminal-panel__header__searcher__input__action--active':
                      terminal.searchConfig.useRegex,
                  },
                )}
                tabIndex={-1}
                title="Use Regular Expression"
                onClick={() =>
                  terminal.setSearchRegex(!terminal.searchConfig.useRegex)
                }
              >
                <RegexIcon />
              </button>
            </div>
          </div>
          <div className="terminal-panel__header__searcher__result">
            {terminal.searchConfig.resultCount
              ? `${
                  terminal.searchConfig.currentResultIndex !== undefined
                    ? terminal.searchConfig.currentResultIndex + 1
                    : 0
                } of ${terminal.searchConfig.resultCount}`
              : 'No results'}
          </div>
          <button
            className="terminal-panel__header__action terminal-panel__header__group__action"
            title="Previous Match (Shift+Enter)"
            disabled={!terminal.searchConfig.resultCount}
            tabIndex={-1}
            onClick={goToPreviousSearchMatch}
          >
            <ArrowUpIcon className="terminal-panel__header__action__icon" />
          </button>
          <button
            className="terminal-panel__header__action terminal-panel__header__group__action"
            title="Next Match (Enter)"
            disabled={!terminal.searchConfig.resultCount}
            tabIndex={-1}
            onClick={goToNextSearchMatch}
          >
            <ArrowDownIcon className="terminal-panel__header__action__icon" />
          </button>
        </div>
        <div className="terminal-panel__header__group__separator" />
        <div className="terminal-panel__header__group">
          <button
            className={clsx(
              'terminal-panel__header__action terminal-panel__header__group__action',
              {
                'terminal-panel__header__action--active': terminal.preserveLog,
              },
            )}
            title="Toggle Preserve Console"
            tabIndex={-1}
            onClick={() => terminal.setPreserveLog(!terminal.preserveLog)}
          >
            <HistoryIcon className="terminal-panel__header__action__icon" />
          </button>
          <button
            className="terminal-panel__header__action terminal-panel__header__group__action"
            title="Copy Text Content"
            tabIndex={-1}
            onClick={copyAll}
          >
            <CopyIcon className="terminal-panel__header__action__icon" />
          </button>
          <button
            className="terminal-panel__header__action terminal-panel__header__group__action"
            title="Clear Console"
            tabIndex={-1}
            onClick={clear}
          >
            <TrashIcon className="terminal-panel__header__action__icon" />
          </button>
          <button
            className="terminal-panel__header__action terminal-panel__header__group__action"
            title="Show Help"
            tabIndex={-1}
            onClick={() => {
              terminal.showHelp();
              terminal.focus();
            }}
          >
            <QuestionCircleIcon className="terminal-panel__header__action__icon" />
          </button>
        </div>
      </div>
      <ContextMenu
        className="terminal-panel__content"
        content={
          <MenuContent>
            <MenuContentItem onClick={copy}>Copy</MenuContentItem>
            <MenuContentItem onClick={copyAll}>Copy All</MenuContentItem>
            <MenuContentItem onClick={clear}>Clear</MenuContentItem>
          </MenuContent>
        }
        menuProps={{ elevation: 7 }}
      >
        <div ref={ref} className="terminal-panel__container" />
      </ContextMenu>
    </div>
  );
});
