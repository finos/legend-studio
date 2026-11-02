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

import { execFile } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import type { Locator, Page } from '@playwright/test';

/**
 * Where the Legend Studio guide's recordings go: GIFs of a few tasks, kept in
 * the repository to reuse, which the guide's pages don't show. The site
 * doesn't publish the folder: Docusaurus skips folders whose names start
 * with `_`.
 */
export const STUDIO_GUIDE_RECORDINGS = fileURLToPath(
  new URL('../../../../docs/user-guide/studio/_recordings/', import.meta.url),
);

/** Where a recording's frames wait until its GIFs are made */
const FRAMES = fileURLToPath(
  new URL('../../build/user-guide-recordings/frames/', import.meta.url),
);

/**
 * Shows the pointer, which a headless browser doesn't draw, and a caption
 * bar, on every page the browser opens from now on
 */
export const showPointerAndCaptions = async (page: Page): Promise<void> => {
  await page.addInitScript(() => {
    const install = (): void => {
      const pointer = document.createElement('div');
      pointer.id = 'user-guide-pointer';
      pointer.innerHTML =
        '<svg width="22" height="22" viewBox="0 0 22 22"><path d="M2 2 L2 18 L6.5 13.5 L9.5 20 L12.5 18.6 L9.6 12.3 L16 12.3 Z" fill="#fff" stroke="#000" stroke-width="1.4" stroke-linejoin="round"/></svg>';
      pointer.style.cssText =
        'position:fixed;left:-40px;top:-40px;z-index:2147483647;pointer-events:none';
      const caption = document.createElement('div');
      caption.id = 'user-guide-caption';
      caption.style.cssText =
        "position:fixed;left:50%;bottom:44px;transform:translateX(-50%);z-index:2147483646;pointer-events:none;max-width:80%;padding:9px 18px;border-radius:8px;background:rgba(10,10,10,.86);color:#fff;font:600 17px/1.35 -apple-system,'Segoe UI',Roboto,sans-serif;box-shadow:0 2px 10px rgba(0,0,0,.5);display:none";
      document.body.append(pointer, caption);
      document.addEventListener(
        'mousemove',
        (event) => {
          pointer.style.left = `${event.clientX}px`;
          pointer.style.top = `${event.clientY}px`;
        },
        true,
      );
      document.addEventListener(
        'mousedown',
        (event) => {
          const ring = document.createElement('div');
          ring.style.cssText = `position:fixed;left:${event.clientX - 14}px;top:${event.clientY - 14}px;width:28px;height:28px;border-radius:50%;border:3px solid #e8590c;z-index:2147483646;pointer-events:none;transition:transform .45s ease-out,opacity .45s ease-out`;
          document.body.append(ring);
          requestAnimationFrame(() => {
            ring.style.transform = 'scale(1.8)';
            ring.style.opacity = '0';
          });
          setTimeout(() => ring.remove(), 500);
        },
        true,
      );
    };
    // an init script runs before the page has a body
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', install);
    } else {
      install();
    }
  });
};

/** Shows a caption under the page, or hides it */
export const caption = async (
  page: Page,
  text: string | undefined,
): Promise<void> => {
  await page.evaluate((value) => {
    const bar = document.getElementById('user-guide-caption');
    if (bar) {
      bar.textContent = value ?? '';
      bar.style.display = value ? 'block' : 'none';
    }
  }, text);
};

/**
 * Moves the pointer to a control at a pace the eye can follow, and clicks it.
 * `atPointer` clicks where the pointer is rather than on the control itself,
 * e.g. on a selector's placeholder, which its input covers.
 */
export const pointAndClick = async (
  page: Page,
  target: Locator,
  options: { atPointer?: boolean } = {},
): Promise<void> => {
  await target.waitFor();
  const box = await target.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, {
      steps: 18,
    });
  }
  await page.waitForTimeout(250);
  if (options.atPointer && box) {
    await page.mouse.down();
    await page.mouse.up();
  } else {
    await target.click();
  }
};

/** Types into a field as a person would */
export const typeSlowly = async (
  page: Page,
  target: Locator,
  text: string,
): Promise<void> => {
  await pointAndClick(page, target);
  await target.pressSequentially(text, { delay: 55 });
};

/** A pause on what the screen shows, before the next step */
export const hold = (page: Page, ms = 1200): Promise<void> =>
  page.waitForTimeout(ms);

interface Frame {
  file: string;
  /** Seconds, as the browser stamps its frames */
  time: number;
}

/**
 * Records what the page shows, as the browser paints it, for GIFs of each of
 * its chapters. The frames are the browser's own, so the text stays sharp.
 */
export const startRecording = async (
  page: Page,
  name: string,
): Promise<{
  /** Starts the next GIF: what shows from now until the next chapter */
  chapter: (gif: string) => void;
  /** Stops recording and writes each chapter's GIF */
  finish: () => Promise<void>;
}> => {
  const dir = join(FRAMES, name);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  const frames: Frame[] = [];
  const chapters: { gif: string; start: number }[] = [];
  const client = await page.context().newCDPSession(page);
  client.on('Page.screencastFrame', (event) => {
    const file = join(dir, `${String(frames.length).padStart(5, '0')}.png`);
    frames.push({ file, time: event.metadata.timestamp ?? Date.now() / 1000 });
    writeFile(file, Buffer.from(event.data, 'base64')).catch(() => undefined);
    client
      .send('Page.screencastFrameAck', { sessionId: event.sessionId })
      .catch(() => undefined);
  });
  await client.send('Page.startScreencast', { format: 'png' });
  return {
    chapter: (gif) => {
      chapters.push({ gif, start: Date.now() / 1000 });
    },
    finish: async () => {
      const end = Date.now() / 1000;
      await client.send('Page.stopScreencast');
      // the last frames' files are written
      await page.waitForTimeout(500);
      await mkdir(STUDIO_GUIDE_RECORDINGS, { recursive: true });
      for (const [index, { gif, start }] of chapters.entries()) {
        const stop = chapters[index + 1]?.start ?? end;
        // what showed when the chapter started, then what changed in it
        const before = frames.filter((frame) => frame.time <= start).at(-1);
        const shown = [
          ...(before ? [{ ...before, time: start }] : []),
          ...frames.filter((frame) => frame.time > start && frame.time < stop),
        ];
        const list = shown
          .map((frame, i) => {
            const next = shown[i + 1]?.time ?? stop;
            return `file '${frame.file}'\nduration ${(next - frame.time).toFixed(3)}`;
          })
          .join('\n');
        const listFile = join(dir, `${gif}.txt`);
        // the concat demuxer only applies the last duration to a file listed after it
        await writeFile(
          listFile,
          `${list}\nfile '${shown.at(-1)?.file ?? ''}'\n`,
        );
        await promisify(execFile)('ffmpeg', [
          '-y',
          '-loglevel',
          'error',
          '-f',
          'concat',
          '-safe',
          '0',
          '-i',
          listFile,
          '-vf',
          'fps=12,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle',
          '-loop',
          '0',
          join(STUDIO_GUIDE_RECORDINGS, `${gif}.gif`),
        ]);
      }
    },
  };
};
