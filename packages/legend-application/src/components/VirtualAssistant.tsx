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
  PanelLoadingIndicator,
  BasePopover,
  FaceSadTearIcon,
} from '@finos/legend-art';
import {
  ContentType,
  debounce,
  downloadFileUsingDataURI,
  isString,
  uuid,
} from '@finos/legend-shared';
import { format } from 'date-fns';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useRef, useState } from 'react';
import { TAB_SIZE } from '../const.js';
import {
  type VirtualAssistantDocumentationEntry,
  VIRTUAL_ASSISTANT_TAB,
} from '../stores/LegendApplicationAssistantService.js';
import { useApplicationStore } from './ApplicationStoreProvider.js';
import Draggable from 'react-draggable';
import { DATE_TIME_FORMAT } from '@finos/legend-graph';
import { ApplicationTelemetry } from '../stores/ApplicationTelemetry.js';

const WIZARD_GREETING = `Bonjour, It's Pierre!`;

const VirtualAssistantDocumentationEntryViewer = observer(
  (props: { entry: VirtualAssistantDocumentationEntry }) => {
    const { entry } = props;
    const applicationStore = useApplicationStore();
    const toggleExpand = (): void => {
      if (!entry.isOpen) {
        ApplicationTelemetry.logEvent_VirtualAssistantDocumentationEntryAccessed(
          applicationStore.telemetryService,
          {
            key: entry.documentationKey,
          },
        );
      }
      entry.setIsOpen(!entry.isOpen);
    };
    const onDocumentationLinkClick = (): void => {
      ApplicationTelemetry.logEvent_VirtualAssistantDocumentationEntryAccessed(
        applicationStore.telemetryService,
        {
          key: entry.documentationKey,
        },
      );
    };
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
                onClick={onDocumentationLinkClick}
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
        applicationStore.navigationContextService.currentContext?.key ?? '',
      ),
  );
  const copyContextStackToClipboard = applicationStore.guardUnhandledError(() =>
    applicationStore.copyTextToClipboard(
      applicationStore.navigationContextService.contextStack
        .map((context) => context.key)
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
          <div className="virtual-assistant__panel__placeholder">
            <FaceLaughWinkIcon className="virtual-assistant__panel__placeholder__icon" />
            <div className="virtual-assistant__panel__placeholder__message">
              No contextual documentation found!
            </div>
            <div className="virtual-assistant__panel__placeholder__instruction">
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
  const debouncedSearch = useMemo(
    () => debounce(() => assistantService.search(), 100),
    [assistantService],
  );
  const onSearchTextChange: React.ChangeEventHandler<HTMLInputElement> = (
    event,
  ) => {
    assistantService.setSearchText(event.target.value);
    debouncedSearch();
  };
  const clearSearchText = (): void => {
    assistantService.resetSearch();
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
  const downloadContextualDocIndex = (): void => {
    downloadFileUsingDataURI(
      `documentation-registry_${format(
        new Date(Date.now()),
        DATE_TIME_FORMAT,
      )}.json`,
      JSON.stringify(
        applicationStore.documentationService.publishContextualDocIndex(),
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
          /**
           * NOTE: In the scenario where another modal is opened at the same time the assistant panel
           * is open, the focus will be stolen by the newly opened modal. In that case, we need
           * to take back the focus. The trick here is to remount the whole panel (modal/popover)
           * by refreshing the `key` prop of the panel. This will cause `mui` to recompute the
           * focus-trap and allow the input field to be selectable again. Basically, we are stealing
           * back the focus for the assistant.
           *
           * However, the caveat is that this will cause the component states, such as scroll positions,
           * to be reset as such, we need to do this really sparingly. In fact, the only
           * scenario where we need to do this is when a new modal is opened when the assistant panel
           * is already opened. Basically, Other scenarios, such as when the assistant is opened after the modal
           * is opened seem to pose no issue.
           */
          onClick={(): void => {
            if (
              // only when there are dialogs being opened
              // NOTE: this seems rather hacky, but querying by role is the least
              // vendor-dependent approach we can think of at the moment
              document.querySelectorAll('[role="dialog"]').length &&
              // only when the focus is not already with the input field
              // this means the focus is being stolen from the assistant because
              // the newly opened modal is opened more recently than the assistant
              //
              // once the focus has been gained by the assistant
              // we will not need to do this anymore
              searchInputRef.current !== document.activeElement
            ) {
              assistantService.refreshPanelRendering();
            }
          }}
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
        <PanelLoadingIndicator
          isLoading={assistantService.searchState.isInProgress}
        />
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
            <div className="virtual-assistant__panel__placeholder">
              <FaceSadTearIcon className="virtual-assistant__panel__placeholder__icon" />
              <div className="virtual-assistant__panel__placeholder__message">
                No result...
              </div>
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
                <MenuContentItem onClick={downloadContextualDocIndex}>
                  Download contextual documentation mapping
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
      /**
       * The most appropriate component to use is `Popper`
       * as it does not block click-away
       * See https://mui.com/material-ui/react-popper/
       *
       * However, the caveat is that in the implementation of mui Popper
       * focus trap is not supported. As such, we could end up in a situation
       * where the assistant input fields will not be focusable
       * when another modal is being opened, as that newly opened modal will
       * **steal** the focus
       *
       * See https://github.com/finos/legend-studio/issues/1255
       * See https://mui.com/material-ui/react-modal/#focus-trap
       * See https://github.com/mui/material-ui/issues/17497
       */
      <BasePopover
        open={assistantService.isOpen}
        className="virtual-assistant__panel__container"
        anchorEl={triggerElement}
        // we need to get rid of the backdrop and the click-away trap
        // to make this popover behave like a popper
        // NOTE: we will cancel the effect of click-away trap using CSS
        hideBackdrop={true}
        PaperProps={{
          classes: { root: 'virtual-assistant__panel__container__root' },
        }}
        // allow other modals to take the focus from the virtual assistant
        disableEnforceFocus={true}
        // NOTE: make sure the assistant is always fully displayed (not cropped)
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        key={assistantService.panelRenderingKey}
      >
        <div
          className="virtual-assistant__panel"
          // NOTE: here we block `tabbing` (to move focus). This is to counter the effect of
          // `disableEnforceFocus={true}` set in the assistant panel popover
          // this is the poor-man focus trap for the assistant to ensure
          // that we don't leak focus tab down to other parts of the app
          //
          // Especially, due to the hack we do to compete for focus when another modal
          // is opened, we need to do this to avoid leaking of focus to components
          // beneath the modal via assistant
          //
          // setting `tabIndex={0}` is a hack to make this DOM node focusable
          // and hence, we could trap the focus here using `onKeyDown`
          // See https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/tabindex
          tabIndex={0}
          onKeyDown={(event): void => {
            if (event.key === 'Tab') {
              event.preventDefault();
              event.stopPropagation();
            }
          }}
        >
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
      </BasePopover>
    );
  },
);

export const VirtualAssistant = observer(() => {
  const [isDragging, setIsDragging] = useState(false);
  const [_key, _setKey] = useState(uuid());
  const applicationStore = useApplicationStore();
  const assistantRef = useRef<HTMLDivElement>(null);
  const assistantService = applicationStore.assistantService;
  const currentContextualDocumentationEntry =
    assistantService.currentContextualDocumentationEntry;
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
  const resetPosition = (): void => {
    // close the panel since
    assistantService.setIsOpen(false);
    _setKey(uuid());
  };

  // drag and drop
  const onDragEnd = (): void => setIsDragging(false);
  const onDragStart = (): void => setIsDragging(true);

  useEffect(() => {
    if (assistantService.isHidden) {
      // reset to default position when we hide the assistant
      // so that when we open it the position is reset
      _setKey(uuid());
    }
  }, [assistantService.isHidden]);

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
      <div
        className="virtual-assistant"
        // NOTE: we have to set the `ref` at this level so even when the assistant is hidden
        // the element is still in the DOM so when we programmatically show the assistant panel
        // the anchor is available in time
        ref={assistantRef}
      >
        <div
          //  NOTE: make sure when we change the documentation entry,
          // the flashing animation is replayed in the virtual assistant station
          key={currentContextualDocumentationEntry?.uuid ?? ''}
          className={clsx('virtual-assistant__station', {
            'virtual-assistant__station--hidden': assistantService.isHidden,
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

          <ContextMenu
            className={clsx('virtual-assistant__station__drag-handle', {
              'virtual-assistant__station__drag-handle--dragging': isDragging,
            })}
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
        {/* NOTE: temporarily hide the assistant panel while dragging so the position is re-calculated */}
        {!isDragging &&
          assistantService.isOpen &&
          !assistantService.isHidden &&
          assistantRef.current && (
            <VirtualAssistantPanel triggerElement={assistantRef.current} />
          )}
      </div>
    </Draggable>
  );
});
