/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { fileURLToPath } from 'node:url';
import type { Locator, Page } from '@playwright/test';

/** Where the Legend Query guide's images go: docs/user-guide/query/images */
export const QUERY_GUIDE_IMAGES = fileURLToPath(
  new URL('../../../../docs/user-guide/query/images/', import.meta.url),
);

/**
 * Where a callout's number sits, beside its controls or inside them: inside
 * at the top right, or at the bottom right where a panel's header has actions
 */
export type CalloutPlacement =
  | 'left'
  | 'right'
  | 'above'
  | 'below'
  | 'inside-right'
  | 'inside-bottom-right';

export interface Callout {
  /** The number the guide's text explains it under */
  readonly n: number;
  /** The controls it outlines: one box around them all */
  readonly targets: readonly Locator[];
  readonly at?: CalloutPlacement | undefined;
  /** Cuts the box off above this control, where a scrolled list ends */
  readonly cutAbove?: Locator | undefined;
  /**
   * Outlines the targets' text rather than their boxes, e.g. a link-like
   * button as wide as its row
   */
  readonly textOnly?: boolean | undefined;
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

const boxOf = async (locator: Locator, textOnly = false): Promise<Box> => {
  // some controls show a moment after the rest, such as a code editor's text
  await locator
    .first()
    .waitFor({ timeout: 10_000 })
    .catch(() => undefined);
  const box = textOnly
    ? await locator.first().evaluate((element) => {
        const range = document.createRange();
        range.selectNodeContents(element);
        const { x, y, width, height } = range.getBoundingClientRect();
        return { x, y, width, height };
      })
    : await locator.first().boundingBox();
  if (!box) {
    throw new Error(
      `Not on the page, so the guide can't point at it: ${locator}`,
    );
  }
  return box;
};

const union = (boxes: Box[]): Box => {
  const x = Math.min(...boxes.map((box) => box.x));
  const y = Math.min(...boxes.map((box) => box.y));
  return {
    x,
    y,
    width: Math.max(...boxes.map((box) => box.x + box.width)) - x,
    height: Math.max(...boxes.map((box) => box.y + box.height)) - y,
  };
};

/**
 * Outlines each callout's controls and numbers them, on a layer above the
 * page that takes no clicks. A control that isn't on the page fails the
 * script, so an image never points at something gone.
 */
export const markCallouts = async (
  page: Page,
  callouts: readonly Callout[],
): Promise<void> => {
  const marks = await Promise.all(
    callouts.map(async (callout) => {
      let box = union(
        await Promise.all(
          callout.targets.map((target) => boxOf(target, callout.textOnly)),
        ),
      );
      if (callout.cutAbove) {
        const below = await boxOf(callout.cutAbove);
        box = { ...box, height: Math.min(box.height, below.y - 14 - box.y) };
      }
      return { n: callout.n, box, at: callout.at ?? 'below' };
    }),
  );
  await page.evaluate((list) => {
    document.getElementById('user-guide-callouts')?.remove();
    const layer = document.createElement('div');
    layer.id = 'user-guide-callouts';
    layer.style.cssText =
      'position:fixed;inset:0;z-index:2147483647;pointer-events:none';
    const size = 24;
    for (const { n, box, at } of list) {
      const outline = document.createElement('div');
      outline.style.cssText = `position:fixed;left:${box.x - 3}px;top:${box.y - 3}px;width:${box.width + 6}px;height:${box.height + 6}px;border:2.5px solid #e8590c;border-radius:6px;box-shadow:0 0 0 2px rgba(255,255,255,.8)`;
      const [left, top] = {
        left: [box.x - size - 6, box.y + box.height / 2 - size / 2],
        right: [box.x + box.width + 6, box.y + box.height / 2 - size / 2],
        above: [box.x + box.width / 2 - size / 2, box.y - size - 6],
        below: [box.x + box.width / 2 - size / 2, box.y + box.height + 6],
        'inside-right': [box.x + box.width - size - 8, box.y + 8],
        'inside-bottom-right': [
          box.x + box.width - size - 8,
          box.y + box.height - size - 8,
        ],
      }[at] as [number, number];
      const badge = document.createElement('div');
      badge.textContent = String(n);
      badge.style.cssText = `position:fixed;left:${left}px;top:${top}px;width:${size}px;height:${size}px;border-radius:50%;background:#e8590c;color:#fff;font:700 13px/24px -apple-system,'Segoe UI',Roboto,sans-serif;text-align:center;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.45)`;
      layer.append(outline, badge);
    }
    document.body.append(layer);
  }, marks);
};

export const clearCallouts = async (page: Page): Promise<void> => {
  await page.evaluate(() =>
    document.getElementById('user-guide-callouts')?.remove(),
  );
};

/**
 * Saves the part of the page around the regions, with a margin for the
 * callouts' numbers beside them, inside the window
 */
export const saveRegion = async (
  page: Page,
  path: string,
  regions: readonly Locator[],
  margin = 44,
): Promise<void> => {
  const box = union(await Promise.all(regions.map((region) => boxOf(region))));
  const viewport = page.viewportSize() ?? { width: 1440, height: 900 };
  const x = Math.max(0, box.x - margin);
  const y = Math.max(0, box.y - margin);
  await page.screenshot({
    path,
    clip: {
      x,
      y,
      width: Math.min(viewport.width, box.x + box.width + margin) - x,
      height: Math.min(viewport.height, box.y + box.height + margin) - y,
    },
  });
};

/**
 * Saves the region from its top down to a margin below `last`, as wide as
 * the region: for an editor whose content ends well above its bottom
 */
export const saveRegionDownTo = async (
  page: Page,
  path: string,
  region: Locator,
  last: Locator,
  margin = 44,
): Promise<void> => {
  const box = await boxOf(region);
  const end = await boxOf(last);
  await page.screenshot({
    path,
    clip: {
      x: box.x,
      y: box.y,
      width: box.width,
      height: Math.min(box.y + box.height, end.y + end.height + margin) - box.y,
    },
  });
};
