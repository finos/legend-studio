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

import { test, expect, describe } from '@jest/globals';
import type { Entity } from '@finos/legend-storage';
import { unitTest } from '@finos/legend-shared/test';
import {
  TEST__GraphManagerPluginManager,
  TEST__buildGraphWithEntities,
  TEST__getTestGraphManagerState,
} from '@finos/legend-graph/test';
import { TEST_DATA__roundtrip } from '../../graph-manager/__tests__/TEST_DATA__DSL_Diagram_Roundtrip.js';
import { DSL_Diagram_GraphManagerPreset } from '../../graph-manager/DSL_Diagram_GraphManagerPreset.js';
import { getDiagram } from '../../graph-manager/DSL_Diagram_GraphManagerHelper.js';
import { Point } from '../../graph/metamodel/pure/packageableElements/diagram/geometry/DSL_Diagram_Point.js';
import type { Diagram } from '../../graph/metamodel/pure/packageableElements/diagram/DSL_Diagram_Diagram.js';
import {
  DIAGRAM_IMAGE_EXPORT_MAX_DIMENSION,
  DiagramRenderer,
} from '../DiagramRenderer.js';
import {
  DiagramSVGRenderingContext,
  parseCanvasFont,
} from '../DiagramSVGRenderingContext.js';

const buildDiagram = async (): Promise<Diagram> => {
  const pluginManager = new TEST__GraphManagerPluginManager();
  pluginManager.usePresets([new DSL_Diagram_GraphManagerPreset()]).install();
  const graphManagerState = TEST__getTestGraphManagerState(pluginManager);
  await TEST__buildGraphWithEntities(
    graphManagerState,
    TEST_DATA__roundtrip as Entity[],
  );
  return getDiagram('test::tDiag', graphManagerState.graph);
};

const createRenderer = (diagram: Diagram): DiagramRenderer => {
  const div = document.createElement('div');
  // NOTE: jsdom does not do layout, so give the container a size
  Object.defineProperty(div, 'offsetWidth', { value: 800 });
  Object.defineProperty(div, 'offsetHeight', { value: 600 });
  const renderer = new DiagramRenderer(div, diagram);
  renderer.render({ initial: true });
  return renderer;
};

const getSVGSize = (svg: string): { width: number; height: number } => {
  const groups =
    /<svg [^>]*width="(?<width>[\d.]+)" height="(?<height>[\d.]+)"/u.exec(
      svg,
    )?.groups;
  return { width: Number(groups?.width), height: Number(groups?.height) };
};

describe(unitTest('Diagram SVG rendering context'), () => {
  test('records paths, dashes and arcs as SVG elements', () => {
    const ctx = new DiagramSVGRenderingContext();
    ctx.strokeStyle = 'rgb(0,0,0)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.lineTo(1, 2); // no current point: acts as moveTo
    ctx.lineTo(3.14159, 4);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(10, 10, 5, 0, 2 * Math.PI);
    ctx.stroke();
    const svg = ctx.toSVG(20, 20);
    expect(svg).toContain(
      '<path d="M1 2 L3.14 4" fill="none" stroke="rgb(0,0,0)" stroke-width="2" stroke-dasharray="5 5"/>',
    );
    // a full circle has to be split in two arcs
    expect(svg).toContain(
      '<path d="M15 10 A5 5 0 1 1 5 10 A5 5 0 1 1 15 10" fill="none" stroke="rgb(0,0,0)" stroke-width="2"/>',
    );
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(
      true,
    );
    expect(svg).toContain('viewBox="0 0 20 20"');
  });

  test('draws partial arcs with the right flags', () => {
    const ctx = new DiagramSVGRenderingContext();
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI / 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, (3 * Math.PI) / 2);
    ctx.fill();
    const svg = ctx.toSVG(10, 10);
    expect(svg).toContain('d="M10 0 A10 10 0 0 1 0 10"');
    expect(svg).toContain('d="M10 0 A10 10 0 1 1 0 -10"');
  });

  test('normalizes rectangles with negative sizes', () => {
    const ctx = new DiagramSVGRenderingContext();
    ctx.fillStyle = 'red';
    ctx.fillRect(10, 10, -4, -6);
    expect(ctx.toSVG(10, 10)).toContain(
      '<rect x="6" y="4" width="4" height="6" fill="red"/>',
    );
  });

  test('writes text with escaped content and explicit font attributes', () => {
    const ctx = new DiagramSVGRenderingContext();
    ctx.font = 'bold 12px Arial';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgb(0,0,0)';
    ctx.fillText('Map<String, "A" & B>', 1, 2);
    expect(ctx.toSVG(10, 10)).toContain(
      '<text x="1" y="2" fill="rgb(0,0,0)" font-family="Arial" font-size="12" font-weight="bold" dominant-baseline="text-before-edge" xml:space="preserve">Map&lt;String, &quot;A&quot; &amp; B&gt;</text>',
    );
  });

  test('parses the font shorthand used by the renderer', () => {
    expect(parseCanvasFont('bold 12px Arial')).toEqual({
      style: undefined,
      weight: 'bold',
      size: 12,
      family: 'Arial',
    });
    expect(parseCanvasFont(' 5.5px Arial')).toEqual({
      style: undefined,
      weight: undefined,
      size: 5.5,
      family: 'Arial',
    });
    expect(parseCanvasFont('italic 600 10px "Roboto Mono"')).toEqual({
      style: 'italic',
      weight: '600',
      size: 10,
      family: '"Roboto Mono"',
    });
    expect(parseCanvasFont('caption')).toBeUndefined();
  });
});

describe(unitTest('Diagram image export'), () => {
  test('exports the whole diagram to SVG regardless of the current viewport', async () => {
    const diagram = await buildDiagram();
    const renderer = createRenderer(diagram);
    const baseline = renderer.exportAsSVG();

    // pan, zoom and select things: none of it should leak into the export
    renderer.setZoomLevel(0.37);
    renderer.screenOffset = new Point(-1234, 567);
    renderer.setSelectedClasses([...diagram.classViews]);
    renderer.setSelectedInheritance(diagram.generalizationViews[0]);
    renderer.setSelectedPropertyOrAssociation(diagram.propertyViews[0]);
    const liveContext = renderer.ctx;
    const svg = renderer.exportAsSVG();

    expect(svg).toEqual(baseline);
    expect(svg).toContain('>tClass</text>');
    expect(svg).toContain('>tClass2</text>');
    // property view label and the inheritance arrow head
    expect(svg).toContain('>prop1</text>');
    expect(svg).toContain(
      `fill="${renderer.generalizationViewInheritanceTriangeFillColor}"`,
    );
    // selection highlight (thicker lines) is not exported
    expect(svg).not.toContain('stroke-width="2"');

    // the export bounds are the content bounds plus padding
    const bounds = renderer.getImageExportBounds();
    expect(getSVGSize(svg)).toEqual({
      width: Math.round(bounds.rectangle.width * 100) / 100,
      height: Math.round(bounds.rectangle.height * 100) / 100,
    });
    expect(bounds.rectangle.width).toBeGreaterThan(renderer.screenPadding * 2);

    // renderer state is restored afterwards
    expect(renderer.zoom).toBe(0.37);
    expect(renderer.screenOffset).toEqual(new Point(-1234, 567));
    expect(renderer.ctx).toBe(liveContext);
    expect(renderer.selectedClasses).toHaveLength(diagram.classViews.length);
  });

  test('supports scaling and skipping the background', async () => {
    const renderer = createRenderer(await buildDiagram());
    const svg = renderer.exportAsSVG();
    const scaled = renderer.exportAsSVG({ scale: 2 });
    const size = getSVGSize(svg);
    const scaledSize = getSVGSize(scaled);
    expect(scaledSize.width).toBeCloseTo(size.width * 2, 1);
    expect(scaledSize.height).toBeCloseTo(size.height * 2, 1);
    expect(scaled).toContain('font-size="24"');

    const backgroundRect = `<rect x="0" y="0" width="${size.width}" height="${size.height}" fill="${renderer.backgroundColor}"/>`;
    expect(svg).toContain(backgroundRect);
    expect(renderer.exportAsSVG({ includeBackground: false })).not.toContain(
      backgroundRect,
    );
  });

  test('renders PNG exports to a canvas sized to the diagram', async () => {
    const renderer = createRenderer(await buildDiagram());
    const bounds = renderer.getImageExportBounds();
    const canvas = renderer.renderImageToCanvas({ scale: 2 });
    expect(canvas.width).toBe(Math.ceil(bounds.rectangle.width * 2));
    expect(canvas.height).toBe(Math.ceil(bounds.rectangle.height * 2));
    expect(canvas).not.toBe(renderer.canvas);

    const blob = await renderer.exportAsPNG();
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/png');
  });

  test('caps the PNG scale for very large diagrams', async () => {
    const diagram = await buildDiagram();
    const renderer = createRenderer(diagram);
    expect(renderer.computeImageExportScale(2)).toBe(2);
    // stretch the diagram far beyond what a browser canvas can hold
    const lastClassView = diagram.classViews[diagram.classViews.length - 1];
    if (lastClassView) {
      lastClassView.position = new Point(100000, 100000);
    }
    const bounds = renderer.getImageExportBounds();
    const scale = renderer.computeImageExportScale(2);
    expect(scale).toBeLessThan(1);
    const canvas = renderer.renderImageToCanvas({ scale: 2 });
    expect(canvas.width).toBeLessThanOrEqual(
      DIAGRAM_IMAGE_EXPORT_MAX_DIMENSION,
    );
    expect(canvas.width).toBe(Math.ceil(bounds.rectangle.width * scale));
  });

  test('refuses to export an empty diagram', async () => {
    const diagram = await buildDiagram();
    const renderer = createRenderer(diagram);
    diagram.classViews = [];
    diagram.generalizationViews = [];
    diagram.propertyViews = [];
    expect(() => renderer.exportAsSVG()).toThrow(
      `Can't export an empty diagram`,
    );
  });
});
