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

/** Where the Legend Cube guide's images go: docs/user-guide/cube/images */
export const CUBE_GUIDE_IMAGES = fileURLToPath(
  new URL('../../../../docs/user-guide/cube/images/', import.meta.url),
);

/** Where a callout's number sits, beside its controls or inside them */
export type CalloutPlacement =
  | 'left'
  | 'right'
  | 'above'
  | 'below'
  | 'inside-right';

export interface Callout {
  /** The number the guide's text explains it under */
  readonly n: number;
  /** The controls it outlines: one box around them all */
  readonly targets: readonly Locator[];
  readonly at?: CalloutPlacement | undefined;
  /** Cuts the box off above this control, where a scrolled list ends */
  readonly cutAbove?: Locator | undefined;
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

const boxOf = async (locator: Locator): Promise<Box> => {
  const box = await locator.first().boundingBox();
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
      let box = union(await Promise.all(callout.targets.map(boxOf)));
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

/** Opens Legend Cube on one of its examples and waits for its run */
export const openCubeExample = async (
  page: Page,
  title: string,
): Promise<void> => {
  await page.goto('cube');
  await page.getByRole('button', { name: 'open an example' }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: new RegExp(`^${title}`, 'u') })
    .click();
  await page.getByText(/^\d+ rows? in /u).waitFor();
  // the pointer away from the controls, so none shows its hover
  await page.mouse.move(1300, 120);
};
