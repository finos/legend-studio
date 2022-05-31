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
  clsx,
  BasePopper,
  TimesIcon,
  SearchIcon,
  MapMarkerIcon,
  CloseIcon,
  ContextMenu,
  MenuContent,
  MenuContentItem,
  MarkdownTextViewer,
  ChevronDownIcon,
  ChevronRightIcon,
  BlankPanelContent,
  BeardIcon,
  SunglassesIcon,
  WizardHatIcon,
  FaceLaughWinkIcon,
  VerticalDragHandleThinIcon,
  CircleIcon,
} from '@finos/legend-art';
import {
  ContentType,
  downloadFileUsingDataURI,
  isString,
  uuid,
} from '@finos/legend-shared';
import { format } from 'date-fns';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';
import { DATE_TIME_FORMAT, TAB_SIZE } from '../const';
import {
  type VirtualAssistantDocumentationEntry,
  VIRTUAL_ASSISTANT_TAB,
} from '../stores/LegendApplicationAssistantService';
import { useApplicationStore } from './ApplicationStoreProvider';
import Draggable from 'react-draggable';

const WIZARD_GREETING = `Bonjour, It's Pierre!`;

const VirtualAssistantDocumentationEntryViewer = observer(
  (props: { entry: VirtualAssistantDocumentationEntry }) => {
    const { entry } = props;
    const applicationStore = useApplicationStore();
    const toggleExpand = (): void => entry.setIsOpen(!entry.isOpen);
    const copyDocumentationKey = applicationStore.guardUnhandledError(() =>
      applicationStore.copyTextToClipboard(entry.documentationKey),
    );

    return (
      <ContextMenu
        className="virtual-assistant__doc-entry"
        menuProps={{
          elevation: 7,
          classes: {
            root: 'virtual-assistant__context-menu',
          },
        }}
        content={
          <MenuContent>
            <MenuContentItem onClick={copyDocumentationKey}>
              Copy Documentation Key
            </MenuContentItem>
          </MenuContent>
        }
      >
        <div className="virtual-assistant__doc-entry">
          <div className="virtual-assistant__doc-entry__header">
            <button
              className={clsx('virtual-assistant__doc-entry__expand-icon', {
                'virtual-assistant__doc-entry__expand-icon--disabled':
                  !entry.content,
              })}
              disabled={!entry.content}
              tabIndex={-1}
              onClick={toggleExpand}
            >
              {entry.isOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}
            </button>
            {entry.url ? (
              <a
                className="virtual-assistant__doc-entry__title virtual-assistant__doc-entry__title--link"
                rel="noopener noreferrer"
                target="_blank"
                href={entry.url}
                title="Click to see external documentation"
              >
                {entry.title}
              </a>
            ) : (
              <div
                className="virtual-assistant__doc-entry__title"
                onClick={toggleExpand}
              >
                {entry.title}
              </div>
            )}
          </div>
          {entry.isOpen && entry.content && (
            <div className="virtual-assistant__doc-entry__content">
              {isString(entry.content) ? (
                <div className="virtual-assistant__doc-entry__content__text">
                  {entry.content}
                </div>
              ) : (
                <MarkdownTextViewer
                  className="virtual-assistant__doc-entry__content__markdown-text"
                  value={entry.content}
                />
              )}
            </div>
          )}
        </div>
      </ContextMenu>
    );
  },
);

const VirtualAssistantContextualSupportPanel = observer(() => {
  const applicationStore = useApplicationStore();
  const assistantService = applicationStore.assistantService;
  const contextualEntry = assistantService.currentContextualDocumentationEntry;
  const copyContextIDToClipboard = applicationStore.guardUnhandledError(() =>
    applicationStore.copyTextToClipboard(contextualEntry?.context ?? ''),
  );
  const copyCurrentContextIDToClipboard = applicationStore.guardUnhandledError(
    () =>
      applicationStore.copyTextToClipboard(
        applicationStore.navigationContextService.currentContext?.value ?? '',
      ),
  );
  const copyContextStackToClipboard = applicationStore.guardUnhandledError(() =>
    applicationStore.copyTextToClipboard(
      applicationStore.navigationContextService.contextStack
        .map((context) => context.value)
        .join(' > '),
    ),
  );

  return (
    <ContextMenu
      className="virtual-assistant__contextual-support"
      disabled={!contextualEntry}
      menuProps={{
        elevation: 7,
        classes: {
          root: 'virtual-assistant__context-menu',
        },
      }}
      content={
        <MenuContent>
          <MenuContentItem onClick={copyContextIDToClipboard}>
            Copy Context ID
          </MenuContentItem>
          <MenuContentItem onClick={copyCurrentContextIDToClipboard}>
            Copy Current Context ID
          </MenuContentItem>
          <MenuContentItem onClick={copyContextStackToClipboard}>
            Copy Context Stack
          </MenuContentItem>
        </MenuContent>
      }
    >
      {contextualEntry && (
        <div className="virtual-assistant__contextual-support__content">
          {contextualEntry.title && (
            <div className="virtual-assistant__contextual-support__title">
              {contextualEntry.title}
            </div>
          )}
          {contextualEntry.content && (
            <>
              {isString(contextualEntry.content) ? (
                <div className="virtual-assistant__contextual-support__text">
                  {contextualEntry.content}
                </div>
              ) : (
                <MarkdownTextViewer
                  className="virtual-assistant__contextual-support__markdown-text"
                  value={contextualEntry.content}
                />
              )}
            </>
          )}
          {contextualEntry.related.length && (
            <div className="virtual-assistant__contextual-support__relevant-entries">
              <div className="virtual-assistant__contextual-support__relevant-entries__title">
                Related entries ({contextualEntry.related.length})
              </div>
              {contextualEntry.related.map((entry) => (
                <VirtualAssistantDocumentationEntryViewer
                  key={entry.uuid}
                  entry={entry}
                />
              ))}
            </div>
          )}
        </div>
      )}
      {!contextualEntry && (
        <BlankPanelContent>
          <div className="virtual-assistant__contextual-support__placeholder">
            <FaceLaughWinkIcon className="virtual-assistant__contextual-support__placeholder__icon" />
            <div className="virtual-assistant__contextual-support__placeholder__message">
              No contextual documentation found!
            </div>
            <div className="virtual-assistant__contextual-support__placeholder__instruction">
              Keep using the app, when contextual doc available, we will let you
              know!
            </div>
          </div>
        </BlankPanelContent>
      )}
    </ContextMenu>
  );
});

const VirtualAssistantSearchPanel = observer(() => {
  const applicationStore = useApplicationStore();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const assistantService = applicationStore.assistantService;
  const searchText = assistantService.searchText;
  const onSearchTextChange: React.ChangeEventHandler<HTMLInputElement> = (
    event,
  ) => assistantService.setSearchText(event.target.value);
  const clearSearchText = (): void => {
    assistantService.setSearchText('');
    searchInputRef.current?.focus();
  };
  const results = assistantService.searchResults;
  const resultCount =
    assistantService.searchResults.length > 99
      ? '99+'
      : assistantService.searchResults.length;
  const downloadDocRegistry = (): void => {
    downloadFileUsingDataURI(
      `documentation-registry_${format(
        new Date(Date.now()),
        DATE_TIME_FORMAT,
      )}.json`,
      JSON.stringify(
        applicationStore.documentationService.publishDocRegistry(),
        undefined,
        TAB_SIZE,
      ),
      ContentType.APPLICATION_JSON,
    );
  };
  const downloadContextualDocRegistry = (): void => {
    downloadFileUsingDataURI(
      `documentation-registry_${format(
        new Date(Date.now()),
        DATE_TIME_FORMAT,
      )}.json`,
      JSON.stringify(
        applicationStore.documentationService.publishContextualDocRegistry(),
        undefined,
        TAB_SIZE,
      ),
      ContentType.APPLICATION_JSON,
    );
  };

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  return (
    <div className="virtual-assistant__search">
      <div className="virtual-assistant__search__header">
        <input
          ref={searchInputRef}
          className={clsx('virtual-assistant__search__input input--dark', {
            'virtual-assistant__search__input--searching': searchText,
          })}
          onChange={onSearchTextChange}
          value={searchText}
          placeholder="Ask me a question"
        />
        {!searchText ? (
          <div className="virtual-assistant__search__input__search__icon">
            <SearchIcon />
          </div>
        ) : (
          <>
            <div className="virtual-assistant__search__input__search__count">
              {resultCount}
            </div>
            <button
              className="virtual-assistant__search__input__clear-btn"
              tabIndex={-1}
              onClick={clearSearchText}
              title="Clear"
            >
              <TimesIcon />
            </button>
          </>
        )}
      </div>
      <div className="virtual-assistant__search__content">
        {Boolean(results.length) && (
          <div className="virtual-assistant__search__results">
            {results.map((result) => (
              <VirtualAssistantDocumentationEntryViewer
                key={result.uuid}
                entry={result}
              />
            ))}
          </div>
        )}
        {searchText && !results.length && (
          <BlankPanelContent>
            <div className="virtual-assistant__search__results__placeholder">
              no result
            </div>
          </BlankPanelContent>
        )}
        {/*
          NOTE: technically, we don't need to check for the result size here.
          However, since the search results update is slightly delayed compared to
          the search text update, we do this to avoid showing the placeholder too
          early, i.e. when the search results are not yet cleaned
         */}
        {!searchText && !results.length && (
          <ContextMenu
            className="virtual-assistant__character__container"
            menuProps={{
              elevation: 7,
              classes: {
                root: 'virtual-assistant__context-menu',
              },
            }}
            content={
              <MenuContent>
                <MenuContentItem onClick={downloadDocRegistry}>
                  Download documentation registry
                </MenuContentItem>
                <MenuContentItem onClick={downloadContextualDocRegistry}>
                  Download contextual documentation registry
                </MenuContentItem>
              </MenuContent>
            }
          >
            <div className="virtual-assistant__character">
              <div className="virtual-assistant__character__figure">
                <WizardHatIcon className="virtual-assistant__character__hat" />
                <SunglassesIcon className="virtual-assistant__character__glasses" />
                <BeardIcon className="virtual-assistant__character__beard" />
              </div>
              <div className="virtual-assistant__character__greeting">
                {WIZARD_GREETING}
              </div>
              <div className="virtual-assistant__character__question">
                How can I help today?
              </div>
            </div>
          </ContextMenu>
        )}
      </div>
    </div>
  );
});

const VirtualAssistantPanel = observer(
  (props: { triggerElement: HTMLElement | null }) => {
    const { triggerElement } = props;
    const applicationStore = useApplicationStore();
    const assistantService = applicationStore.assistantService;
    const currentContextualDocumentationEntry =
      assistantService.currentContextualDocumentationEntry;
    const selectedTab = assistantService.selectedTab;

    const selectSearch = (): void =>
      assistantService.setSelectedTab(VIRTUAL_ASSISTANT_TAB.SEARCH);
    const selectContextualDoc = (): void =>
      assistantService.setSelectedTab(VIRTUAL_ASSISTANT_TAB.CONTEXTUAL_SUPPORT);
    const closeAssistantPanel = (): void => assistantService.setIsOpen(false);

    return (
      <BasePopper
        open={assistantService.isOpen}
        className="virtual-assistant__panel__container"
        anchorEl={triggerElement}
        // NOTE: make sure the assistant is always fully displayed (not cropped)
        placement="auto-start"
      >
        <div className="virtual-assistant__panel">
          <div className="virtual-assistant__panel__header">
            <div className="virtual-assistant__panel__header__tabs">
              <div
                className={clsx('virtual-assistant__panel__header__tab', {
                  'virtual-assistant__panel__header__tab--active':
                    selectedTab === VIRTUAL_ASSISTANT_TAB.SEARCH,
                })}
                onClick={selectSearch}
                title="Search"
              >
                <div className="virtual-assistant__panel__header__tab__content">
                  <SearchIcon />
                </div>
              </div>
              <div
                className={clsx('virtual-assistant__panel__header__tab', {
                  'virtual-assistant__panel__header__tab--active':
                    selectedTab === VIRTUAL_ASSISTANT_TAB.CONTEXTUAL_SUPPORT,
                })}
                onClick={selectContextualDoc}
                title="Contextual Support"
              >
                <div className="virtual-assistant__panel__header__tab__content">
                  <MapMarkerIcon />
                  {currentContextualDocumentationEntry && (
                    <div
                      className="virtual-assistant__panel__header__tab__indicator"
                      title="Contextual support available"
                    />
                  )}
                </div>
              </div>
            </div>
            <div className="virtual-assistant__panel__header__actions">
              <button
                className="virtual-assistant__panel__header__action"
                tabIndex={-1}
                onClick={closeAssistantPanel}
                title="Close panel"
              >
                <CloseIcon className="virtual-assistant__panel__icon__close" />
              </button>
            </div>
          </div>
          <div className="virtual-assistant__panel__content">
            {selectedTab === VIRTUAL_ASSISTANT_TAB.SEARCH && (
              <VirtualAssistantSearchPanel />
            )}
            {selectedTab === VIRTUAL_ASSISTANT_TAB.CONTEXTUAL_SUPPORT && (
              <VirtualAssistantContextualSupportPanel />
            )}
          </div>
        </div>
      </BasePopper>
    );
  },
);

export const VirtualAssistant = observer(() => {
  const [isDragging, setIsDragging] = useState(false);
  const [_key, _setKey] = useState(uuid());
  const applicationStore = useApplicationStore();
  const assistantService = applicationStore.assistantService;
  const currentContextualDocumentationEntry =
    assistantService.currentContextualDocumentationEntry;
  const assistantStationRef = useRef<HTMLDivElement>(null);
  const toggleAssistantPanel = (): void => {
    const newVal = !assistantService.isOpen;
    // open the contextual help tab when contextual help is available
    if (newVal && currentContextualDocumentationEntry) {
      assistantService.setSelectedTab(VIRTUAL_ASSISTANT_TAB.CONTEXTUAL_SUPPORT);
    }
    assistantService.setIsOpen(!assistantService.isOpen);
  };
  const hideAssistant = (): void =>
    applicationStore.assistantService.hideAssistant();
  const resetPosition = async (): Promise<void> => {
    // close the panel since
    assistantService.setIsOpen(false);
    _setKey(uuid());
  };

  // drag and drop
  const onDragEnd = (): void => setIsDragging(false);
  const onDragStart = (): void => setIsDragging(true);

  if (assistantService.isHidden) {
    return null;
  }
  return (
    <Draggable
      // this is a trick so we could reset the default position of the assistant
      // See https://github.com/react-grid-layout/react-draggable/issues/214#issuecomment-270021423
      key={_key}
      // make sure we cannot drag and drop outside of the screen
      bounds="parent"
      onStart={onDragStart}
      onStop={onDragEnd}
      // limit the dnd trigger to only the drag handle
      handle=".virtual-assistant__station__drag-handle"
    >
      <div className="virtual-assistant">
        <div
          ref={assistantStationRef}
          //  NOTE: make sure when we change the documentation entry, the flashing animation
          // is replayed
          key={currentContextualDocumentationEntry?.uuid ?? ''}
          className={clsx('virtual-assistant__station', {
            // 'virtual-assistant__station--collapsed': assistantService.isHidden,
            'virtual-assistant__station--active': Boolean(
              currentContextualDocumentationEntry,
            ),
          })}
        >
          <button
            className="virtual-assistant__station__trigger"
            tabIndex={-1}
            onClick={toggleAssistantPanel}
            title={
              assistantService.isOpen
                ? `Click to close assistant panel`
                : `${
                    currentContextualDocumentationEntry
                      ? 'Contextual support available.\n'
                      : ''
                  }Click to open assistant panel...`
            }
          >
            {assistantService.isOpen ? (
              <CloseIcon className="virtual-assistant__station__trigger__close" />
            ) : currentContextualDocumentationEntry ? (
              <CircleIcon className="virtual-assistant__station__trigger__circle" />
            ) : null}
          </button>
          {/* NOTE: temporarily hide the assistant panel while dragging so the position is re-calculated */}
          {!isDragging && assistantStationRef.current && (
            <VirtualAssistantPanel
              triggerElement={assistantStationRef.current}
            />
          )}

          <ContextMenu
            className={clsx('virtual-assistant__station__drag-handle', {
              'virtual-assistant__station__drag-handle--dragging': isDragging,
            })}
            // title={isDragging ? undefined : 'Grab to drag assistant'}
            menuProps={{
              elevation: 7,
              classes: {
                root: 'virtual-assistant__context-menu',
              },
            }}
            content={
              <MenuContent>
                <MenuContentItem onClick={resetPosition}>
                  Reset Position
                </MenuContentItem>
                <MenuContentItem onClick={hideAssistant}>
                  Hide Assistant
                </MenuContentItem>
              </MenuContent>
            }
          >
            <div
              className="virtual-assistant__station__drag-handle__content"
              title={isDragging ? undefined : 'Grab to drag assistant'}
            >
              <VerticalDragHandleThinIcon />
            </div>
          </ContextMenu>
        </div>
      </div>
    </Draggable>
  );
});
