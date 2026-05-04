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
  Background,
  BackgroundVariant,
  Controls,
  type Edge,
  getNodesBounds,
  getViewportForBounds,
  MiniMap,
  type Node,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useMemo } from 'react';
import { noop } from '@finos/legend-shared';
import { toPng, toSvg } from 'html-to-image';
import {
  DownloadIcon,
  ExpandIcon,
  RefreshIcon,
  ResizeIcon,
} from '@finos/legend-art';
import type { Join, Table, View } from '@finos/legend-graph';
import {
  DatabaseTableNode,
  DatabaseForeignRelationStubNode,
  type DatabaseTableNodeData,
  type DatabaseForeignRelationStubNodeData,
} from './DatabaseTableNode.js';
import {
  buildJoinEdges,
  collectForeignKeyColumns,
  estimateNodeHeight,
  getRelationId,
  isView,
  layoutDatabaseDiagram,
  getOrderedRelations,
  resolveJoinFormula,
} from './DatabaseDiagramHelper.js';
import type { DatabaseEditorState } from '../../../../stores/editor/editor-state/element-editor-state/DatabaseEditorState.js';

const NODE_TYPES = {
  table: DatabaseTableNode,
  foreignStub: DatabaseForeignRelationStubNode,
} as const;

/**
 * Edge data we attach so the canvas (and click handlers) can identify the
 * underlying Join without a lookup. React Flow's edge `data` is `unknown` to
 * downstream code — we narrow with a typed accessor at use sites.
 */
interface DatabaseEdgeData extends Record<string, unknown> {
  join: Join;
  endpoints: { sourceId: string; targetId: string };
  isSelfJoin: boolean;
  isCrossDatabase: boolean;
}

/**
 * Resolve a Table or View by its on-canvas node id (`<schema>.<name>`).
 * Used by the click handler to translate React Flow's string id back into a
 * metamodel reference for selection.
 */
const findRelationById = (
  editorState: DatabaseEditorState,
  id: string,
): Table | View | undefined => {
  for (const schema of editorState.database.schemas) {
    for (const table of schema.tables) {
      if (getRelationId(table) === id) {
        return table;
      }
    }
    for (const view of schema.views) {
      if (getRelationId(view) === id) {
        return view;
      }
    }
  }
  return undefined;
};

/**
 * Inner canvas — must be wrapped in `<ReactFlowProvider>` so that the
 * `useReactFlow()` hook can fit-view after layout.
 */
const DatabaseDiagramCanvasInner = observer(
  (props: { editorState: DatabaseEditorState }) => {
    const { editorState } = props;
    const {
      database,
      selectedRelation,
      selectedColumn,
      selectedJoin,
      selectedFilter,
      filterFormulas,
      joinFormulas,
      viewColumnFormulas,
      viewGroupByFormulas,
      selectedViewColumnName,
      panToSelectedRequestCounter,
      fitAllRequestCounter,
      resetLayoutRequestCounter,
    } = editorState;

    // Compute nodes + edges from the metamodel. We rebuild on metamodel changes
    // (driven by `database` identity), but the layout itself (positions) is
    // memoized so dagre runs only once per metamodel snapshot.
    const { laidOutNodes, laidOutEdges } = useMemo(() => {
      const fkColumns = collectForeignKeyColumns(database);

      // Build canvas nodes for both tables AND views. The kind tag drives the
      // table-node component's icon choice and column-row content.
      const relationNodes = getOrderedRelations(database).map(
        ({ schema, relation }) => ({
          id: getRelationId(relation),
          relation,
          schemaName: schema.name,
          estimatedHeight: estimateNodeHeight(relation),
        }),
      );

      const { edges: joinEdges, foreignStubs } = buildJoinEdges(database);

      // Foreign stubs participate in dagre layout the same way real nodes do,
      // so cross-database join edges get a sensible position. They render as
      // a smaller placeholder node (see `DatabaseForeignRelationStubNode`).
      const FOREIGN_STUB_HEIGHT = 60;
      const positions = layoutDatabaseDiagram(
        [
          ...relationNodes.map((n) => ({
            id: n.id,
            relation: n.relation,
            estimatedHeight: n.estimatedHeight,
          })),
          ...foreignStubs.map((s) => ({
            id: s.id,
            // The layout helper only reads `id` and `estimatedHeight`; the
            // `relation` field is unused for stubs but required by the
            // shared type. Coerce safely — the helper never dereferences
            // it.
            relation: undefined as unknown as Parameters<
              typeof layoutDatabaseDiagram
            >[0][number]['relation'],
            estimatedHeight: FOREIGN_STUB_HEIGHT,
          })),
        ],
        joinEdges,
      );

      const reactFlowNodes: Node<
        DatabaseTableNodeData | DatabaseForeignRelationStubNodeData
      >[] = relationNodes.map((node) => {
        const pos = positions.get(node.id) ?? { x: 0, y: 0 };
        return {
          id: node.id,
          type: 'table',
          position: { x: pos.x, y: pos.y },
          data: {
            relation: node.relation,
            kind: isView(node.relation) ? 'view' : 'table',
            schemaName: node.schemaName,
            isSelected: false,
            isJoinEndpoint: false,
            fkColumns,
            selectedColumn: undefined,
            // Filled in by `selectionAwareNodes` from observable state.
            viewColumnFormulas: new Map(),
            viewGroupByFormulas: new Map(),
            selectedViewColumnName: undefined,
          } as DatabaseTableNodeData,
        };
      });
      // Stub nodes for foreign endpoints of cross-database joins. Rendered
      // smaller and visually distinct (dashed border) so users can tell at a
      // glance that the actual relation lives in another store.
      foreignStubs.forEach((stub) => {
        const pos = positions.get(stub.id) ?? { x: 0, y: 0 };
        reactFlowNodes.push({
          id: stub.id,
          type: 'foreignStub',
          position: { x: pos.x, y: pos.y },
          data: {
            schemaName: stub.schemaName,
            relationName: stub.relationName,
            ownerPath: stub.ownerPath,
            isJoinEndpoint: false,
          } satisfies DatabaseForeignRelationStubNodeData,
        });
      });

      const reactFlowEdges: Edge<DatabaseEdgeData>[] = joinEdges.map(
        (edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          label: edge.name,
          // Loop self-joins use the React Flow `step` edge type so the path
          // bows out cleanly into a loop instead of overlapping the node.
          // Cross-database edges keep the standard smoothstep — same shape
          // but the dashed style below conveys the foreign endpoint.
          type: edge.isSelfJoin ? 'smoothstep' : 'smoothstep',
          animated: false,
          labelBgPadding: [4, 2],
          labelBgBorderRadius: 2,
          data: {
            join: edge.join,
            endpoints: { sourceId: edge.source, targetId: edge.target },
            isSelfJoin: edge.isSelfJoin,
            isCrossDatabase: edge.isCrossDatabase,
          },
          // Cross-database edges use a dashed stroke; self-joins keep the
          // solid line but the loop shape itself signals self-join. Both
          // get overridden again by the selection-aware pass below when the
          // user picks one.
          ...(edge.isCrossDatabase
            ? { style: { strokeDasharray: '4 3' } }
            : {}),
        }),
      );

      return { laidOutNodes: reactFlowNodes, laidOutEdges: reactFlowEdges };
    }, [database]);

    const [nodes, setNodes, onNodesChange] =
      useNodesState<
        Node<DatabaseTableNodeData | DatabaseForeignRelationStubNodeData>
      >(laidOutNodes);
    const [edges, , onEdgesChange] =
      useEdgesState<Edge<DatabaseEdgeData>>(laidOutEdges);
    const { fitView } = useReactFlow();

    // Reset whenever the database identity changes (e.g. after graph rebuild).
    useEffect(() => {
      setNodes(laidOutNodes);
      const timer = window.setTimeout(() => {
        fitView({ padding: 0.15, duration: 200 }).catch(noop());
      }, 0);
      return () => window.clearTimeout(timer);
    }, [laidOutNodes, setNodes, fitView]);

    // Resolve the two endpoint table ids of the selected join (if any). Used
    // both for the `--join-endpoint` highlight on the two nodes and for the
    // pan-to-fit-both effect below. We compute it here once per selection
    // change rather than walking edges in multiple places.
    const selectedJoinEndpointIds = useMemo<{
      sourceId: string;
      targetId: string;
    } | null>(() => {
      if (!selectedJoin) {
        return null;
      }
      const match = laidOutEdges.find((e) => e.data?.join === selectedJoin);
      return match?.data?.endpoints ?? null;
    }, [selectedJoin, laidOutEdges]);

    // Mirror selection from MobX into node data so each table-node renders
    // its current visual state. Three independent flags:
    //   - isSelected: blue ring (single-table focus)
    //   - isJoinEndpoint: yellow ring (one of the two endpoints of the
    //     selected join — distinct color so the user can tell the two modes
    //     apart)
    //   - selectedColumn: forwarded only to the matching table
    const selectionAwareNodes = useMemo<
      Node<DatabaseTableNodeData | DatabaseForeignRelationStubNodeData>[]
    >(
      () =>
        nodes.map((n) => {
          const isSelected =
            n.type === 'table' && selectedRelation
              ? n.id === getRelationId(selectedRelation)
              : false;
          const isJoinEndpoint =
            selectedJoinEndpointIds !== null &&
            (n.id === selectedJoinEndpointIds.sourceId ||
              n.id === selectedJoinEndpointIds.targetId);
          if (n.type === 'foreignStub') {
            return {
              ...n,
              data: {
                ...(n.data as DatabaseForeignRelationStubNodeData),
                isJoinEndpoint,
              },
            };
          }
          return {
            ...n,
            data: {
              ...(n.data as DatabaseTableNodeData),
              isSelected,
              isJoinEndpoint,
              selectedColumn: isSelected ? selectedColumn : undefined,
              // Forward the live formula maps. Only view-kind nodes use
              // them, but it's cheap to pass to all and keeps the data
              // shape uniform.
              viewColumnFormulas,
              viewGroupByFormulas,
              // Same story for the view column-mapping selection — only
              // the focused view's node ends up with a non-undefined
              // value, but every node receives the prop for shape stability.
              selectedViewColumnName: isSelected
                ? selectedViewColumnName
                : undefined,
            },
          };
        }),
      [
        nodes,
        selectedRelation,
        selectedColumn,
        selectedJoinEndpointIds,
        viewColumnFormulas,
        viewGroupByFormulas,
        selectedViewColumnName,
      ],
    );

    // Highlight the selected edge with a yellow stroke that matches the
    // endpoint-table ring color, and lift it visually. Other edges keep their
    // default style (driven by SCSS in `_database-editor.scss`).
    const selectionAwareEdges = useMemo<Edge<DatabaseEdgeData>[]>(
      () =>
        edges.map((e) => {
          const isSelected = Boolean(
            selectedJoin && e.data?.join === selectedJoin,
          );
          // Build with `exactOptionalPropertyTypes` in mind — only attach
          // `style` when actually overriding it, so TS doesn't see `undefined`
          // assigned to an optional-but-not-undefined-allowed prop.
          const styled: Edge<DatabaseEdgeData> = {
            ...e,
            labelStyle: {
              fontSize: 10,
              fill: isSelected
                ? 'var(--color-yellow-200)'
                : 'var(--color-light-grey-200)',
            },
            labelBgStyle: {
              fill: 'var(--color-dark-grey-100)',
            },
            zIndex: isSelected ? 10 : 0,
          };
          if (isSelected) {
            styled.style = {
              stroke: 'var(--color-yellow-200)',
              strokeWidth: 2,
            };
          }
          return styled;
        }),
      [edges, selectedJoin],
    );

    // Pan to whatever's selected when the panel asks us to. Two modes:
    //   - Table selected → fit on that one node.
    //   - Join selected → fit to encompass both endpoint nodes.
    // The counter (rather than the selection itself) drives this so canvas
    // clicks don't pan — the user is already looking at what they clicked.
    useEffect(() => {
      if (panToSelectedRequestCounter === 0) {
        return;
      }
      if (selectedJoinEndpointIds) {
        fitView({
          nodes: [
            { id: selectedJoinEndpointIds.sourceId },
            { id: selectedJoinEndpointIds.targetId },
          ],
          duration: 400,
          padding: 0.3,
          maxZoom: 1.2,
        }).catch(noop());
        return;
      }
      if (selectedRelation) {
        fitView({
          nodes: [{ id: getRelationId(selectedRelation) }],
          duration: 400,
          padding: 0.4,
          maxZoom: 1.2,
        }).catch(noop());
      }
      // Intentional: only the counter triggers re-pan. Selection identities
      // are resolved at fire time from the closure.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [panToSelectedRequestCounter]);

    // Toolbar: fit-all. Increments via `editorState.requestFitAll()`. Skips
    // the initial render (counter starts at 0) so we don't double-fit on
    // mount \u2014 React Flow already runs `fitView={true}` on first layout.
    useEffect(() => {
      if (fitAllRequestCounter === 0) {
        return;
      }
      fitView({ duration: 400, padding: 0.15 }).catch(noop());
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fitAllRequestCounter]);

    // Toolbar: reset layout. Re-runs dagre over the ORIGINAL `laidOutNodes`
    // positions and replaces the live `nodes` state with them, undoing any
    // user-initiated drags. Edges don't carry positions so they pass
    // through untouched.
    useEffect(() => {
      if (resetLayoutRequestCounter === 0) {
        return undefined;
      }
      setNodes(laidOutNodes);
      // Defer the fit so React Flow has a frame to apply the new positions.
      const timer = window.setTimeout(() => {
        fitView({ padding: 0.15, duration: 300 }).catch(noop());
      }, 0);
      return () => window.clearTimeout(timer);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resetLayoutRequestCounter]);

    /**
     * Toolbar: export the diagram as a PNG. The strategy is the standard
     * React Flow recipe \u2014 compute the bounding box of every current
     * node, ask React Flow for the matching viewport (so the rendered
     * image fits the entire graph at a sensible zoom), then rasterize the
     * `.react-flow__viewport` element with `html-to-image`'s `toPng`.
     *
     * We pass the viewport transform via `style` so html-to-image clones
     * the viewport with the right CSS transform applied; that yields a
     * complete picture even when the user has panned/zoomed off-screen.
     * We pass the viewport transform via `style` so html-to-image clones
     * the viewport with the right CSS transform applied; that yields a
     * complete picture even when the user has panned/zoomed off-screen.
     *
     * Image width/height are clamped: the natural viewport size would
     * either be too small (no nodes selected, default zoom) or huge
     * (large databases). 1920x1080 is the upper bound; the helper
     * scales down if needed while preserving aspect.
     */
    const exportDiagramAsPng = useCallback(
      async (format: 'png' | 'svg' = 'png'): Promise<void> => {
        const viewportEl = document.querySelector<HTMLElement>(
          '.database-diagram__canvas-shell .react-flow__viewport',
        );
        if (!viewportEl) {
          return;
        }
        const bounds = getNodesBounds(selectionAwareNodes);
        const padding = 40;
        // Cap output size so the export stays usable as an image asset.
        // The cap matters for PNG (hard pixel ceiling); for SVG it just
        // sets the root viewBox — vector graphics scale infinitely.
        const maxWidth = 1920;
        const maxHeight = 1080;
        const naturalWidth = bounds.width + padding * 2;
        const naturalHeight = bounds.height + padding * 2;
        const scale = Math.min(
          1,
          maxWidth / naturalWidth,
          maxHeight / naturalHeight,
        );
        const imageWidth = naturalWidth * scale;
        const imageHeight = naturalHeight * scale;
        const transform = getViewportForBounds(
          bounds,
          imageWidth,
          imageHeight,
          0.1,
          4,
          0.1,
        );
        const options = {
          backgroundColor: 'transparent',
          width: imageWidth,
          height: imageHeight,
          style: {
            width: `${imageWidth}px`,
            height: `${imageHeight}px`,
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.zoom})`,
          },
          // Bust caches so re-exports after edits pick up new content.
          cacheBust: true,
        };
        // `toPng` returns a base64 data URL; `toSvg` returns a
        // `data:image/svg+xml;...` URL with the inlined SVG markup.
        // Either works as the `href` of a download anchor.
        const dataUrl =
          format === 'svg'
            ? await toSvg(viewportEl, options)
            : await toPng(viewportEl, options);
        const link = document.createElement('a');
        // Path-based filename so the user can correlate the file with the
        // database it came from when they have many such exports.
        const safeName = editorState.database.path.replace(
          /[^a-z0-9_.-]/gi,
          '_',
        );
        link.download = `${safeName}.${format}`;
        link.href = dataUrl;
        link.click();
      },
      [selectionAwareNodes, editorState],
    );

    return (
      <div className="database-diagram__canvas-shell">
        <ReactFlow
          className="database-diagram__canvas"
          nodes={selectionAwareNodes}
          edges={selectionAwareEdges}
          nodeTypes={NODE_TYPES}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={(_, node) => {
            // Foreign-stub nodes don't correspond to a real relation in this
            // database, so a click on them is just an inert acknowledgement
            // — we skip the relation selection rather than clearing it.
            if (node.type === 'foreignStub') {
              return;
            }
            const matching = findRelationById(editorState, node.id);
            editorState.setSelectedRelation(matching);
          }}
          onEdgeClick={(_, edge) => {
            if (edge.data?.join) {
              editorState.focusOnJoin(edge.data.join);
            }
          }}
          onPaneClick={() => editorState.clearSelection()}
          nodesDraggable={true}
          nodesConnectable={false}
          elementsSelectable={true}
          proOptions={{ hideAttribution: true }}
          minZoom={0.2}
          maxZoom={1.5}
          fitView={true}
        >
          <Background variant={BackgroundVariant.Dots} gap={18} size={1} />
          <Controls showInteractive={false} />
          <MiniMap
            pannable={true}
            zoomable={true}
            className="database-diagram__minimap"
            // Highlight the currently focused node(s) on the minimap so the
            // user can see at a glance where their selection sits relative
            // to the rest of the graph (especially useful for large
            // databases where the selection can scroll off-screen).
            nodeColor={(node) => {
              const data = node.data as
                | (DatabaseTableNodeData & { isJoinEndpoint?: boolean })
                | DatabaseForeignRelationStubNodeData
                | undefined;
              if (data?.isJoinEndpoint) {
                return 'var(--color-yellow-200)';
              }
              if ((data as DatabaseTableNodeData | undefined)?.isSelected) {
                return 'var(--color-blue-200)';
              }
              return 'var(--color-dark-grey-200)';
            }}
            maskColor="rgba(0, 0, 0, 0.6)"
          />
        </ReactFlow>
        {/*
         * Floating canvas toolbar pinned to the top-right. Three buttons:
         *   - Fit all: pans + zooms to encompass every node.
         *   - Fit selection: same as the side-panel pan trigger but
         *     reachable without leaving the canvas.
         *   - Reset layout: re-runs dagre, undoing user-drags.
         * Disabled states are intentionally minimal — "Fit selection" is
         * disabled when nothing is selected, the others are always usable.
         */}
        <div className="database-diagram__toolbar">
          <button
            type="button"
            className="database-diagram__toolbar__btn"
            title="Fit all to view"
            onClick={() => editorState.requestFitAll()}
          >
            <ExpandIcon />
          </button>
          <button
            type="button"
            className="database-diagram__toolbar__btn"
            title="Fit selection to view"
            disabled={!selectedRelation && !selectedJoin}
            onClick={() => {
              // Reuse the existing pan-to-selected pipeline by re-issuing
              // the current focus. We bump the counter via the matching
              // focus action so the canvas effect runs the same fit logic
              // it does for side-panel clicks.
              if (selectedJoin) {
                editorState.focusOnJoin(selectedJoin);
              } else if (selectedRelation) {
                editorState.focusOnRelation(selectedRelation);
              }
            }}
          >
            <ResizeIcon />
          </button>
          <button
            type="button"
            className="database-diagram__toolbar__btn"
            title="Reset layout (re-run auto-layout)"
            onClick={() => editorState.requestResetLayout()}
          >
            <RefreshIcon />
          </button>
          <button
            type="button"
            className="database-diagram__toolbar__btn"
            title="Export diagram as PNG"
            onClick={() => {
              exportDiagramAsPng('png').catch(noop());
            }}
          >
            <DownloadIcon />
            <span className="database-diagram__toolbar__btn__label">PNG</span>
          </button>
          <button
            type="button"
            className="database-diagram__toolbar__btn"
            title="Export diagram as SVG (vector, editable)"
            onClick={() => {
              exportDiagramAsPng('svg').catch(noop());
            }}
          >
            <DownloadIcon />
            <span className="database-diagram__toolbar__btn__label">SVG</span>
          </button>
        </div>
        {selectedJoin && (
          <div
            className="database-diagram__floating-card database-diagram__floating-card--join"
            // Position pinned bottom-left so it never collides with the
            // ReactFlow `<MiniMap>` (bottom-right) or `<Controls>` (also
            // bottom-left, but they auto-shift up). z-index keeps it above
            // the canvas surface but below modals.
          >
            <div className="database-diagram__floating-card__title">
              <span className="database-diagram__floating-card__kind">
                JOIN
              </span>
              <span className="database-diagram__floating-card__name">
                {selectedJoin.name}
              </span>
            </div>
            <div className="database-diagram__floating-card__formula">
              {resolveJoinFormula(joinFormulas, selectedJoin.name)}
            </div>
          </div>
        )}
        {selectedFilter && (
          <div
            // Filters don't have an on-canvas anchor (they live at the
            // database level, not on a specific table/edge). Showing them
            // as a floating card is the canvas-level affordance: clicking
            // a filter in the side panel still gives users an immediate
            // visual response on the canvas surface they're staring at.
            className="database-diagram__floating-card database-diagram__floating-card--filter"
          >
            <div className="database-diagram__floating-card__title">
              <span className="database-diagram__floating-card__kind">
                FILTER
              </span>
              <span className="database-diagram__floating-card__name">
                {selectedFilter.name}
              </span>
            </div>
            <div className="database-diagram__floating-card__formula">
              {filterFormulas.get(selectedFilter.name) ?? 'filter [...]'}
            </div>
          </div>
        )}
      </div>
    );
  },
);

export const DatabaseDiagramCanvas = observer(
  (props: { editorState: DatabaseEditorState }) => (
    <ReactFlowProvider>
      <DatabaseDiagramCanvasInner editorState={props.editorState} />
    </ReactFlowProvider>
  ),
);
