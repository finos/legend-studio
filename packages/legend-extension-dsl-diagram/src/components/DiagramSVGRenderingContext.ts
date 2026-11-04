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

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const FULL_CIRCLE = 2 * Math.PI;

const formatNumber = (value: number): string => {
  const rounded = Math.round(value * 100) / 100;
  return Object.is(rounded, -0) ? '0' : String(rounded);
};

const escapeXML = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const FONT_PATTERN =
  /^\s*(?:(?<style>italic|oblique)\s+)?(?:(?<weight>normal|bold|bolder|lighter|[1-9]00)\s+)?(?<size>\d*\.?\d+)px\s+(?<family>.+?)\s*$/u;

export interface DiagramSVGFont {
  style?: string | undefined;
  weight?: string | undefined;
  size: number;
  family: string;
}

/**
 * Parse the subset of the CSS `font` shorthand the diagram renderer uses
 * (e.g. `bold 12px Arial`) so we can emit explicit SVG font attributes,
 * which are more widely supported by SVG consumers than the `font` shorthand.
 */
export const parseCanvasFont = (font: string): DiagramSVGFont | undefined => {
  const groups = FONT_PATTERN.exec(font)?.groups;
  if (!groups?.size || !groups.family) {
    return undefined;
  }
  return {
    style: groups.style,
    weight: groups.weight,
    size: Number(groups.size),
    family: groups.family,
  };
};

const TEXT_BASELINE_TO_DOMINANT_BASELINE: Partial<
  Record<CanvasTextBaseline, string>
> = {
  top: 'text-before-edge',
  hanging: 'hanging',
  middle: 'central',
  bottom: 'text-after-edge',
  ideographic: 'ideographic',
};

/**
 * A minimal implementation of the parts of `CanvasRenderingContext2D` used by
 * the diagram renderer, which records drawing calls as SVG elements instead of
 * painting pixels. This lets us reuse the exact same drawing code to produce a
 * vector export of a diagram.
 *
 * Text measurement is delegated to a real 2D context so layout matches what is
 * drawn on screen.
 */
export class DiagramSVGRenderingContext {
  fillStyle = '#000000';
  strokeStyle = '#000000';
  lineWidth = 1;
  font = '10px sans-serif';
  textBaseline: CanvasTextBaseline = 'alphabetic';

  private readonly measuringContext: CanvasRenderingContext2D | undefined;
  private readonly elements: string[] = [];
  private lineDash: number[] = [];
  private currentPath: string[] = [];
  private hasCurrentPoint = false;

  constructor(measuringContext?: CanvasRenderingContext2D | null) {
    this.measuringContext = measuringContext ?? undefined;
  }

  get elementCount(): number {
    return this.elements.length;
  }

  setLineDash(segments: number[]): void {
    this.lineDash = segments.filter(
      (segment) => Number.isFinite(segment) && segment >= 0,
    );
  }

  getLineDash(): number[] {
    return [...this.lineDash];
  }

  beginPath(): void {
    this.currentPath = [];
    this.hasCurrentPoint = false;
  }

  closePath(): void {
    if (this.currentPath.length) {
      this.currentPath.push('Z');
    }
  }

  moveTo(x: number, y: number): void {
    this.currentPath.push(`M${formatNumber(x)} ${formatNumber(y)}`);
    this.hasCurrentPoint = true;
  }

  lineTo(x: number, y: number): void {
    // NOTE: like canvas, a `lineTo()` without a current point acts as `moveTo()`
    this.currentPath.push(
      `${this.hasCurrentPoint ? 'L' : 'M'}${formatNumber(x)} ${formatNumber(y)}`,
    );
    this.hasCurrentPoint = true;
  }

  arc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    counterclockwise = false,
  ): void {
    let sweep = counterclockwise
      ? startAngle - endAngle
      : endAngle - startAngle;
    if (sweep >= FULL_CIRCLE) {
      sweep = FULL_CIRCLE;
    } else {
      sweep = ((sweep % FULL_CIRCLE) + FULL_CIRCLE) % FULL_CIRCLE;
    }
    const direction = counterclockwise ? -1 : 1;
    const pointAt = (angle: number): string =>
      `${formatNumber(x + radius * Math.cos(angle))} ${formatNumber(
        y + radius * Math.sin(angle),
      )}`;
    this.currentPath.push(
      `${this.hasCurrentPoint ? 'L' : 'M'}${pointAt(startAngle)}`,
    );
    this.hasCurrentPoint = true;
    if (sweep === 0) {
      return;
    }
    const sweepFlag = counterclockwise ? 0 : 1;
    const r = formatNumber(radius);
    if (sweep === FULL_CIRCLE) {
      // SVG cannot draw a full circle with a single arc command
      const midAngle = startAngle + direction * Math.PI;
      this.currentPath.push(
        `A${r} ${r} 0 1 ${sweepFlag} ${pointAt(midAngle)}`,
        `A${r} ${r} 0 1 ${sweepFlag} ${pointAt(startAngle)}`,
      );
      return;
    }
    const largeArcFlag = sweep > Math.PI ? 1 : 0;
    this.currentPath.push(
      `A${r} ${r} 0 ${largeArcFlag} ${sweepFlag} ${pointAt(
        startAngle + direction * sweep,
      )}`,
    );
  }

  stroke(): void {
    if (!this.currentPath.length) {
      return;
    }
    this.elements.push(
      `<path d="${this.currentPath.join(' ')}" fill="none"${this.strokeAttributes()}/>`,
    );
  }

  fill(): void {
    if (!this.currentPath.length) {
      return;
    }
    this.elements.push(
      `<path d="${this.currentPath.join(' ')}" fill="${escapeXML(
        this.fillStyle,
      )}"/>`,
    );
  }

  fillRect(x: number, y: number, width: number, height: number): void {
    this.elements.push(
      `<rect${this.rectAttributes(x, y, width, height)} fill="${escapeXML(
        this.fillStyle,
      )}"/>`,
    );
  }

  strokeRect(x: number, y: number, width: number, height: number): void {
    this.elements.push(
      `<rect${this.rectAttributes(
        x,
        y,
        width,
        height,
      )} fill="none"${this.strokeAttributes()}/>`,
    );
  }

  fillText(text: string, x: number, y: number): void {
    const attributes = [
      `x="${formatNumber(x)}"`,
      `y="${formatNumber(y)}"`,
      `fill="${escapeXML(this.fillStyle)}"`,
    ];
    const font = parseCanvasFont(this.font);
    if (font) {
      attributes.push(
        `font-family="${escapeXML(font.family)}"`,
        `font-size="${formatNumber(font.size)}"`,
      );
      if (font.weight && font.weight !== 'normal') {
        attributes.push(`font-weight="${font.weight}"`);
      }
      if (font.style) {
        attributes.push(`font-style="${font.style}"`);
      }
    } else {
      attributes.push(`style="font: ${escapeXML(this.font)}"`);
    }
    const dominantBaseline =
      TEXT_BASELINE_TO_DOMINANT_BASELINE[this.textBaseline];
    if (dominantBaseline) {
      attributes.push(`dominant-baseline="${dominantBaseline}"`);
    }
    this.elements.push(
      `<text ${attributes.join(' ')} xml:space="preserve">${escapeXML(
        text,
      )}</text>`,
    );
  }

  measureText(text: string): TextMetrics {
    if (this.measuringContext) {
      this.measuringContext.font = this.font;
      this.measuringContext.textBaseline = this.textBaseline;
      return this.measuringContext.measureText(text);
    }
    // NOTE: fallback approximation when no real context is available
    const size = parseCanvasFont(this.font)?.size ?? 10;
    return { width: text.length * size * 0.6 } as TextMetrics;
  }

  /**
   * Serialize everything drawn so far as a standalone SVG document.
   */
  toSVG(width: number, height: number): string {
    const w = formatNumber(width);
    const h = formatNumber(height);
    return [
      `<svg xmlns="${SVG_NAMESPACE}" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`,
      ...this.elements,
      '</svg>',
    ].join('\n');
  }

  private rectAttributes(
    x: number,
    y: number,
    width: number,
    height: number,
  ): string {
    // NOTE: canvas accepts negative width/height, SVG does not
    const left = width < 0 ? x + width : x;
    const top = height < 0 ? y + height : y;
    return ` x="${formatNumber(left)}" y="${formatNumber(
      top,
    )}" width="${formatNumber(Math.abs(width))}" height="${formatNumber(
      Math.abs(height),
    )}"`;
  }

  private strokeAttributes(): string {
    let attributes = ` stroke="${escapeXML(
      this.strokeStyle,
    )}" stroke-width="${formatNumber(this.lineWidth)}"`;
    if (this.lineDash.some((segment) => segment > 0)) {
      attributes += ` stroke-dasharray="${this.lineDash
        .map(formatNumber)
        .join(' ')}"`;
    }
    return attributes;
  }
}
