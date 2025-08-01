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

import { NAVIGATION_ZONE_SEPARATOR } from '@finos/legend-application';
import { action, computed, makeObservable, observable } from 'mobx';
import { type TerminalProductViewerState } from './TerminalProductViewerState.js';
import { isNonNullable } from '@finos/legend-shared';
import {
  TERMINAL_PRODUCT_VIEWER_SECTION,
  generateAnchorForSection,
} from './DataProductViewerNavigation.js';
import {
  type DataProductPageNavigationCommand,
  DATA_PRODUCT_VIEWER_ANCHORS,
} from './DataProductLayoutState.js';

export class TerminalProductLayoutState {
  readonly terminalProductViewerState: TerminalProductViewerState;

  currentNavigationZone = '';
  isExpandedModeEnabled = false;

  frame?: HTMLElement | undefined;
  header?: HTMLElement | undefined;
  isTopScrollerVisible = false;

  private wikiPageAnchorIndex = new Map<string, HTMLElement>();
  wikiPageNavigationCommand?: DataProductPageNavigationCommand | undefined;
  private wikiPageVisibleAnchors: string[] = [];
  private wikiPageScrollIntersectionObserver?: IntersectionObserver | undefined;

  constructor(terminalProductViewerState: TerminalProductViewerState) {
    makeObservable<
      TerminalProductLayoutState,
      | 'wikiPageAnchorIndex'
      | 'wikiPageVisibleAnchors'
      | 'updatePageVisibleAnchors'
    >(this, {
      currentNavigationZone: observable,
      isExpandedModeEnabled: observable,
      isTopScrollerVisible: observable,
      wikiPageAnchorIndex: observable,
      wikiPageVisibleAnchors: observable,
      frame: observable.ref,
      wikiPageNavigationCommand: observable.ref,
      isWikiPageFullyRendered: computed,
      registerWikiPageScrollObserver: action,
      setCurrentNavigationZone: action,
      enableExpandedMode: action,
      setFrame: action,
      setTopScrollerVisible: action,
      setWikiPageAnchor: action,
      unsetWikiPageAnchor: action,
      setWikiPageAnchorToNavigate: action,
      updatePageVisibleAnchors: action,
    });

    this.terminalProductViewerState = terminalProductViewerState;
  }

  setCurrentNavigationZone(val: string): void {
    this.currentNavigationZone = val;
  }

  get isWikiPageFullyRendered(): boolean {
    return (
      Boolean(this.frame) &&
      DATA_PRODUCT_VIEWER_ANCHORS.every((anchor) =>
        this.wikiPageAnchorIndex.has(anchor),
      ) &&
      Array.from(this.wikiPageAnchorIndex.values()).every(isNonNullable)
    );
  }

  registerWikiPageScrollObserver(): void {
    if (this.frame && this.isWikiPageFullyRendered) {
      const wikiPageIntersectionObserver = new IntersectionObserver(
        (entries) => {
          const anchorsWithVisibilityChanged = entries
            .map((entry) => {
              for (const [key, element] of this.wikiPageAnchorIndex.entries()) {
                if (element === entry.target) {
                  return { key, isIntersecting: entry.isIntersecting };
                }
              }
              return undefined;
            })
            .filter(isNonNullable);
          anchorsWithVisibilityChanged.forEach((entry) => {
            this.updatePageVisibleAnchors(entry.key, entry.isIntersecting);
          });
          // NOTE: sync scroll with menu/address is quite a delicate piece of work
          // as it interferes with programatic scroll operations we do elsewhere.
          // This is particularly bad when we do a programatic `smooth` scroll, which
          // mimic user scrolling behavior and would tangle up with this observer
          // Since currently, there's no good mechanism to detect scroll end event, and as such,
          // there is no good way to temporarily disable this logic while doing the programmatic
          // smooth scroll as such, we avoid supporting programatic smooth scrolling for now
          // See https://github.com/w3c/csswg-drafts/issues/3744
          // See https://developer.mozilla.org/en-US/docs/Web/API/Document/scrollend_event
          if (
            // if current navigation zone is not set, do not update zone
            this.currentNavigationZone === '' ||
            // if there is no visible anchors, do not update zone
            !this.wikiPageVisibleAnchors.length ||
            // if some of the current visible anchors match or is parent section of the current
            // navigation zone, do not update zone
            this.wikiPageVisibleAnchors.some(
              (visibleAnchor) =>
                this.currentNavigationZone === visibleAnchor ||
                this.currentNavigationZone.startsWith(
                  `${visibleAnchor}${NAVIGATION_ZONE_SEPARATOR}`,
                ),
            )
          ) {
            return;
          }
        },
        {
          root: this.frame,
          threshold: 0.5,
        },
      );
      Array.from(this.wikiPageAnchorIndex.values()).forEach((el) =>
        wikiPageIntersectionObserver.observe(el),
      );
      this.wikiPageScrollIntersectionObserver = wikiPageIntersectionObserver;
    }
  }

  unregisterWikiPageScrollObserver(): void {
    this.wikiPageScrollIntersectionObserver?.disconnect();
    this.wikiPageScrollIntersectionObserver = undefined;
    this.wikiPageVisibleAnchors = [];
  }

  private updatePageVisibleAnchors(
    changedAnchor: string,
    isIntersecting: boolean,
  ): void {
    if (isIntersecting) {
      const anchors = this.wikiPageVisibleAnchors.filter(
        (anchor) => changedAnchor !== anchor,
      );
      // NOTE: the newly visible anchors should be the furthest one in
      // the direction of scroll
      anchors.push(changedAnchor);
      this.wikiPageVisibleAnchors = anchors;
    } else {
      this.wikiPageVisibleAnchors = this.wikiPageVisibleAnchors.filter(
        (anchor) => changedAnchor !== anchor,
      );
    }
  }

  enableExpandedMode(val: boolean): void {
    this.isExpandedModeEnabled = val;
  }

  setFrame(val: HTMLElement | undefined): void {
    this.frame = val;
  }

  setTopScrollerVisible(val: boolean): void {
    this.isTopScrollerVisible = val;
  }

  setWikiPageAnchor(anchorKey: string, element: HTMLElement): void {
    // do not allow overriding existing anchor
    if (!this.wikiPageAnchorIndex.has(anchorKey)) {
      this.wikiPageAnchorIndex.set(anchorKey, element);
    }
  }

  unsetWikiPageAnchor(anchorKey: string): void {
    this.wikiPageAnchorIndex.delete(anchorKey);
  }

  setWikiPageAnchorToNavigate(
    val: DataProductPageNavigationCommand | undefined,
  ): void {
    this.wikiPageNavigationCommand = val;
  }

  navigateWikiPageAnchor(): void {
    if (
      this.frame &&
      this.wikiPageNavigationCommand &&
      this.isWikiPageFullyRendered
    ) {
      const anchor = this.wikiPageNavigationCommand.anchor;
      const matchingWikiPageSection = this.wikiPageAnchorIndex.get(anchor);
      if (matchingWikiPageSection) {
        this.frame.scrollTop =
          matchingWikiPageSection.offsetTop -
          (this.header?.getBoundingClientRect().height ?? 0);
      }

      this.setWikiPageAnchorToNavigate(undefined);
    }
  }
}
