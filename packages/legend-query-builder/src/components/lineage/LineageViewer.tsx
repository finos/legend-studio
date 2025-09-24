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

import React, { useEffect } from 'react';
import {
  clsx,
  Dialog,
  Modal,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
  ModalHeader,
  PanelContent,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import {
  Background,
  Controls,
  type Edge as ReactFlowEdge,
  MiniMap,
  type Node as ReactFlowNode,
  Position,
  ReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import {
  LINEAGE_VIEW_MODE,
  type LineageState,
} from '../../stores/lineage/LineageState.js';

import {
  type Graph,
  type LineageEdge,
  type LineageNode,
  type LineageProperty,
  type Owner,
  type OwnerLink,
  type PropertyLineageNode,
  type PropertyLineageReport,
  PropertyOwnerNode,
  type ReportLineage,
} from '@finos/legend-graph';
import {
  PropertyOwnerNode as PropertyOwnerNodeComponent,
  type PropertyOwnerNodeData,
} from './PropertyOwnerNode.js';

function autoLayoutNodesAndEdges<T extends { id: string }>(
  nodes: T[],
  edges: { source: string; target: string }[],
  xSpacing = 220,
  ySpacing = 120,
  areaHeight = 800,
): Record<string, { x: number; y: number }> {
  // Build in-degree map
  const nodeIds = nodes.map((n) => n.id);
  const inDegree: Record<string, number> = {};
  nodeIds.forEach((id) => {
    inDegree[id] = 0;
  });
  edges.forEach((e) => {
    inDegree[e.target] = (inDegree[e.target] ?? 0) + 1;
  });

  // BFS to assign levels
  const levels: Record<string, number> = {};
  const queue: string[] = [];

  nodeIds.forEach((id) => {
    if (inDegree[id] === 0) {
      levels[id] = 0;
      queue.push(id);
    }
  });

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) {
      continue; // should never happen, but safe fallback
    }

    const currentLevel = levels[current] ?? 0;
    edges.forEach((e) => {
      if (e.source === current) {
        const targetLevel = levels[e.target] ?? -1;
        if (targetLevel < currentLevel + 1) {
          levels[e.target] = currentLevel + 1;
          queue.push(e.target);
        }
      }
    });
  }

  // Group nodes by level
  const levelNodes: Record<number, string[]> = {};
  Object.entries(levels).forEach(([id, lvl]) => {
    if (!levelNodes[lvl]) {
      levelNodes[lvl] = [];
    }
    levelNodes[lvl].push(id);
  });

  // Position nodes
  const positions: Record<string, { x: number; y: number }> = {};
  const maxLevel = Object.values(levels).length
    ? Math.max(...Object.values(levels))
    : 0;

  for (let lvl = 0; lvl <= maxLevel; lvl++) {
    const ids = levelNodes[lvl] ?? [];
    const totalHeight = (ids.length - 1) * ySpacing;
    const startY = (areaHeight - totalHeight) / 2;
    ids.forEach((id, idx) => {
      positions[id] = {
        x: 80 + lvl * xSpacing,
        y: startY + idx * ySpacing,
      };
    });
  }

  // Fallback for disconnected nodes
  nodeIds.forEach((id, idx) => {
    if (!positions[id]) {
      positions[id] = {
        x: 80,
        y: 80 + idx * ySpacing,
      };
    }
  });

  return positions;
}

function getLayoutBounds(positions: Record<string, { x: number; y: number }>) {
  const xs = Object.values(positions).map((p) => p.x);
  const ys = Object.values(positions).map((p) => p.y);
  if (!xs.length || !ys.length) {
    return { width: 800, height: 600 };
  }
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  // Add some padding
  return {
    width: Math.max(400, maxX - minX + 200),
    height: Math.max(300, maxY - minY + 200),
  };
}

const convertGraphToFlow = (graph?: Graph) => {
  if (!graph?.nodes.length) {
    // Handle missing or empty graph
    return {
      nodes: [
        {
          id: 'no-lineage',
          data: { label: 'No Lineage Generated' },
          position: { x: 350, y: 300 },
          type: 'default',
          style: {
            background: 'white',
            border: '2px solid #1976d2',
            borderRadius: '8px',
            padding: '16px 12px',
            width: 200,
            minHeight: 80,
            fontSize: '14px',
            fontWeight: '600',
            textAlign: 'center' as const,
            color: '#1976d2',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          },
        },
      ],
      edges: [],
      bounds: { width: 800, height: 600 },
    };
  }
  const nodeList = graph.nodes.map((node: LineageNode) => ({
    id: node.data.id,
    label: node.data.text,
  }));
  const edgeList = graph.edges.map((edge: LineageEdge) => ({
    source: edge.data.source.data.id,
    target: edge.data.target.data.id,
  }));
  const positions = autoLayoutNodesAndEdges(nodeList, edgeList);
  const bounds = getLayoutBounds(positions);

  // For class and database lineage, all nodes should have edges starting from right side
  const nodes = nodeList.map((node) => ({
    id: node.id,
    data: { label: node.label },
    position: positions[node.id] ?? { x: 0, y: 0 },
    type: 'default' as const,
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    style: {
      background: 'white',
      border: '2px solid #1976d2',
      borderRadius: '8px',
      padding: '16px 12px',
      minHeight: 80,
      width: 220,
      fontSize: '14px',
      fontWeight: '600',
      textAlign: 'center' as const,
      color: '#1976d2',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.3s ease',
    },
  }));

  const edges = edgeList.map((edge, idx) => ({
    id: `${edge.source}-${edge.target}-${idx}`,
    source: edge.source,
    target: edge.target,
    type: 'smoothstep' as const,
    // No explicit sourceHandle or targetHandle needed as we set sourcePosition and targetPosition on nodes
  }));
  return { nodes, edges, bounds };
};

const convertReportLineageToFlow = (reportLineage?: ReportLineage) => {
  if (!reportLineage?.columns.length) {
    // Handle missing or empty report lineage
    return {
      nodes: [
        {
          id: 'no-report-lineage',
          data: { label: 'No Lineage Generated' },
          position: { x: 350, y: 300 },
          type: 'default',
          style: {
            backgroundColor: '#f5f5f5',
            border: '1px solid #ccc',
            borderRadius: '5px',
            padding: '10px',
            width: 200,
          },
        },
      ],
      edges: [],
      bounds: { width: 800, height: 600 },
    };
  }

  const nodes: ReactFlowNode[] = [];
  const edges: ReactFlowEdge[] = [];

  // Layout constants
  const ySpacing = 70;
  const leftX = 100;
  const rightX = 500;
  const startY = 100;
  const columnWidth = 180;
  const tableWidth = 220;
  const headerHeight = 40;

  // Create report columns container
  const reportContainerId = 'report_columns_container';
  const reportContainerHeight =
    reportLineage.columns.length * ySpacing + headerHeight;
  nodes.push({
    id: reportContainerId,
    data: { label: 'Report Columns' },
    position: { x: leftX, y: startY },
    style: {
      width: columnWidth,
      height: reportContainerHeight,
      backgroundColor: '#eaf6ff',
      border: '2px solid #0073e6',
      borderRadius: '8px',
      padding: '10px',
      textAlign: 'center',
      fontWeight: 'bold',
    },
    type: 'default',
  });

  // Report columns inside the container
  reportLineage.columns.forEach((col, idx) => {
    const nodeId = `report_col_${col.name}`;
    nodes.push({
      id: nodeId,
      data: { label: col.name },
      position: { x: 10, y: headerHeight + idx * ySpacing },
      parentId: reportContainerId,
      extent: 'parent',
      style: {
        width: columnWidth - 20,
        backgroundColor: '#f0f7ff',
        border: '1px solid #0073e6',
        borderRadius: '5px',
        padding: '8px',
        zIndex: 10,
      },
      type: 'default',
      sourcePosition: Position.Right, // All report columns should have edges leaving from the right
      targetPosition: Position.Left,
    });
  });

  // Collect all unique owner/column pairs
  const tables = new Map<
    string,
    {
      owner: Owner;
      columns: string[];
    }
  >();

  reportLineage.columns.forEach((col) => {
    col.columns.forEach((childCol) => {
      const ownerObj = childCol.column.owner;
      const ownerKey = `${ownerObj.schema.database.package}.${ownerObj.schema.database.name}.${ownerObj.schema.name}`;
      const columnName = childCol.column.name;

      if (!tables.has(ownerKey)) {
        tables.set(ownerKey, {
          owner: ownerObj,
          columns: [],
        });
      }

      const tableInfo = tables.get(ownerKey);
      if (!tableInfo) {
        return;
      }
      if (!tableInfo.columns.includes(columnName)) {
        tableInfo.columns.push(columnName);
      }
    });
  });

  // Place tables and their columns
  let currentY = startY;
  const tableColumnPositions = new Map<string, { x: number; y: number }>();
  tables.forEach(({ owner, columns }, ownerKey) => {
    const tableId = `table_${ownerKey.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const tableHeight = headerHeight + columns.length * ySpacing;

    // Table container node
    nodes.push({
      id: tableId,
      data: { label: owner.name },
      position: { x: rightX, y: currentY },
      style: {
        width: tableWidth,
        height: tableHeight,
        backgroundColor: '#f5f5f5',
        border: '2px solid #555',
        borderRadius: '5px',
        padding: '10px 0 0 0',
        fontWeight: 'bold',
      },
      type: 'default',
    });

    // Column nodes within table
    columns.forEach((column, colIdx) => {
      const columnId = `${tableId}_column_${column}`;
      const columnY = colIdx * ySpacing;
      tableColumnPositions.set(columnId, { x: 10, y: headerHeight + columnY });
      nodes.push({
        id: columnId,
        data: { label: column },
        position: { x: 10, y: headerHeight + columnY },
        parentId: tableId,
        extent: 'parent',
        style: {
          width: tableWidth - 20,
          backgroundColor: '#fff',
          border: '1px solid #ccc',
          borderRadius: '3px',
          padding: '8px',
          fontSize: '12px',
          zIndex: 10,
        },
        type: 'default',
        sourcePosition: Position.Right,
        targetPosition: Position.Left, // All target columns should accept edges on the left
      });
    });

    currentY += tableHeight + 50; // Add spacing between tables
  });

  // Create edges between report columns and table columns
  reportLineage.columns.forEach((col) => {
    const sourceId = `report_col_${col.name}`;
    col.columns.forEach((childCol) => {
      const ownerObj = childCol.column.owner;
      const ownerKey = `${ownerObj.schema.database.package}.${ownerObj.schema.database.name}.${ownerObj.schema.name}`;
      const columnName = childCol.column.name;
      const tableId = `table_${ownerKey.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const targetId = `${tableId}_column_${columnName}`;

      edges.push({
        id: `${sourceId}-${targetId}`,
        source: sourceId,
        target: targetId,
        type: 'default',
        style: { strokeWidth: 1.5 },
      });
    });
  });

  // Determine total height needed
  const totalHeight = Math.max(startY + reportContainerHeight + 100, currentY);

  return {
    nodes,
    edges,
    bounds: {
      width: rightX + tableWidth + 100,
      height: totalHeight,
    },
  };
};

const convertPropertyLineageToFlow = (
  propertyLineage?: PropertyLineageReport,
  selectedSourcePropertiesMap?: Map<string, Set<string>>,
) => {
  if (!propertyLineage?.propertyOwner.length) {
    return {
      nodes: [
        {
          id: 'no-property-lineage',
          data: { label: 'No Property Lineage Generated' },
          position: { x: 350, y: 300 },
          type: 'default',
          style: {
            backgroundColor: '#f5f5f5',
            border: '1px solid #ccc',
            borderRadius: '5px',
            padding: '10px',
            width: 200,
          },
        },
      ],
      edges: [],
      bounds: { width: 800, height: 600 },
    };
  }

  const nodeList = propertyLineage.propertyOwner.map(
    (node: PropertyLineageNode) => ({
      id: node.id,
      label: node.name,
      isPropertyOwner: node instanceof PropertyOwnerNode,
      node: node,
    }),
  );

  const edgeList = propertyLineage.ownerLink.map((link: OwnerLink) => ({
    source: link.source,
    target: link.target,
  }));

  const nodeIds = new Set(nodeList.map((n) => n.id));
  const validEdgeList = edgeList.filter((edge) => {
    return !(!nodeIds.has(edge.source) || !nodeIds.has(edge.target));
  });

  const nodeDimensions = new Map<string, { width: number; height: number }>();

  nodeList.forEach((nodeItem) => {
    const isPropertyOwner = nodeItem.isPropertyOwner;
    const highlightedProperties = selectedSourcePropertiesMap?.get(nodeItem.id);
    const hasHighlightedProperties = (highlightedProperties?.size ?? 0) > 0;
    let nodeWidth = 220;
    let nodeHeight = isPropertyOwner ? 80 : 60;

    if (hasHighlightedProperties && isPropertyOwner) {
      const propertyCount = Math.min(highlightedProperties?.size ?? 0, 20);

      // Header (50px) + properties (32px each including margins) + container padding (20px)
      const propertiesHeight = propertyCount * 32; // 28px min-height + 4px margin

      nodeHeight = 50 + propertiesHeight + 20;
      nodeHeight = Math.max(nodeHeight, 160);
      nodeHeight = Math.min(nodeHeight, 800);

      nodeWidth = 340;
    }

    nodeDimensions.set(nodeItem.id, { width: nodeWidth, height: nodeHeight });
  });

  const maxHeight = Math.max(
    ...Array.from(nodeDimensions.values()).map((d) => d.height),
  );
  const dynamicYSpacing = Math.max(220, maxHeight + 100);
  const dynamicXSpacing = 380;

  const positions = autoLayoutNodesAndEdges(
    nodeList,
    validEdgeList,
    dynamicXSpacing,
    dynamicYSpacing,
  );
  const bounds = getLayoutBounds(positions);

  const nodes = nodeList.map((nodeItem) => {
    const isPropertyOwner = nodeItem.isPropertyOwner;
    const highlightedProperties = selectedSourcePropertiesMap?.get(nodeItem.id);

    let allProperties: Array<{
      name: string;
      dataType?: string | undefined;
      propertyType: string | undefined;
    }> = [];
    if (isPropertyOwner && nodeItem.node instanceof PropertyOwnerNode) {
      const properties = nodeItem.node.properties;
      // Handle the case where properties is empty or not an array
      if (Array.isArray(properties) && properties.length > 0) {
        allProperties = properties.map((prop) => ({
          name: prop.name,
          dataType: prop.dataType,
          propertyType: prop.propertyType,
        }));
      } else {
        allProperties = [];
      }
    }

    const dimensions = nodeDimensions.get(nodeItem.id) ?? {
      width: 220,
      height: 80,
    };

    const nodeData: PropertyOwnerNodeData = {
      label: nodeItem.label,
      isPropertyOwner: isPropertyOwner,
      highlightedProperties: highlightedProperties,
      allProperties: allProperties,
    };

    return {
      id: nodeItem.id,
      data: nodeData,
      position: positions[nodeItem.id] ?? { x: 0, y: 0 },
      type: isPropertyOwner ? 'propertyOwner' : 'default',
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      style: {
        width: dimensions.width,
        height: dimensions.height,
        background: 'transparent',
        border: 'none',
        padding: 0,
        margin: 0,
      },
      width: dimensions.width,
      height: dimensions.height,
    };
  });

  const edges = validEdgeList.map((edge, idx) => ({
    id: `${edge.source}-${edge.target}-${idx}`,
    source: edge.source,
    target: edge.target,
    type: 'smoothstep' as const,
    style: { strokeWidth: 2, stroke: '#1976d2' },
  }));

  const expandedBounds = {
    width: Math.max(bounds.width, 1200),
    height: Math.max(bounds.height, 800),
  };

  return { nodes, edges, bounds: expandedBounds };
};

const collectSourceOwnerProperties = (
  property: LineageProperty,
  map: Map<string, Set<string>>,
  visited: Set<string> = new Set(),
  depth: number = 0,
): void => {
  if (depth > 50) {
    return;
  }

  if (
    !Array.isArray(property.sourceProperties) ||
    property.sourceProperties.length === 0
  ) {
    return;
  }

  const propertyKey = `${property.ownerID}-${property.name}`;

  if (visited.has(propertyKey)) {
    return;
  }

  visited.add(propertyKey);

  try {
    property.sourceProperties.forEach((sourceProp) => {
      if (!map.has(sourceProp.ownerID)) {
        map.set(sourceProp.ownerID, new Set());
      }
      const sourceSet = map.get(sourceProp.ownerID);
      if (sourceSet) {
        sourceSet.add(sourceProp.name);
      }
      collectSourceOwnerProperties(sourceProp, map, visited, depth + 1);
    });
  } catch {
    return;
  } finally {
    visited.delete(propertyKey);
  }
};

const findRelevantEdges = (
  highlightedNodeIds: Set<string>,
  allEdges: ReactFlowEdge[],
): Set<string> => {
  const relevantEdgeIds = new Set<string>();

  allEdges.forEach((edge) => {
    if (
      highlightedNodeIds.has(edge.source) &&
      highlightedNodeIds.has(edge.target)
    ) {
      relevantEdgeIds.add(edge.id);
    }
  });

  return relevantEdgeIds;
};

const PROPERTY_LINEAGE_NODE_TYPES = {
  propertyOwner: PropertyOwnerNodeComponent,
};

const PropertyOwnerPanel = observer(
  (props: { lineageState: LineageState; selectedNodeId?: string }) => {
    const { lineageState, selectedNodeId } = props;
    const propertyLineage = lineageState.lineageData?.propertyLineage;

    if (!selectedNodeId || !propertyLineage) {
      return (
        <div className="property-lineage__panel">
          <div className="property-lineage__panel-header">
            <h3>Properties</h3>
          </div>
          <div className="property-lineage__panel-content">
            <p>Select a node with properties to view details</p>
          </div>
        </div>
      );
    }

    const selectedNode = propertyLineage.propertyOwner.find(
      (node) => node.id === selectedNodeId,
    );
    const isPropertyOwner = selectedNode instanceof PropertyOwnerNode;

    if (!isPropertyOwner) {
      return (
        <div className="property-lineage__panel">
          <div className="property-lineage__panel-header">
            <h3>Properties</h3>
          </div>
          <div className="property-lineage__panel-content">
            <p>Selected node has no properties</p>
          </div>
        </div>
      );
    }

    const propertyOwnerNode = selectedNode;

    const handlePropertyClick = (property: LineageProperty) => {
      const propertyKey = `${property.ownerID}-${property.name}`;
      const currentSelection = lineageState.selectedProperty;

      lineageState.setSelectedProperty(
        currentSelection === propertyKey ? undefined : propertyKey,
      );
      if (currentSelection === propertyKey) {
        lineageState.setSelectedSourcePropertiesMap(undefined);
      } else {
        const map = new Map<string, Set<string>>();
        collectSourceOwnerProperties(property, map, new Set(), 0);
        lineageState.setSelectedSourcePropertiesMap(map);
      }
    };

    // Ensure properties is always an array
    const properties: LineageProperty[] = Array.isArray(
      propertyOwnerNode.properties,
    )
      ? propertyOwnerNode.properties
      : [];

    let highlightedSourceProps: Set<string> | undefined = undefined;
    if (lineageState.selectedSourcePropertiesMap?.has(propertyOwnerNode.id)) {
      highlightedSourceProps = lineageState.selectedSourcePropertiesMap.get(
        propertyOwnerNode.id,
      );
    }

    return (
      <div className="property-lineage__panel">
        <div className="property-lineage__panel-header">
          <h3>{propertyOwnerNode.name}</h3>
          <span className="property-lineage__panel-subtitle">
            {properties.length} properties
          </span>
        </div>
        <div className="property-lineage__panel-content">
          {properties.length === 0 ? (
            <p>No properties found</p>
          ) : (
            <div className="property-lineage__properties-list">
              {properties.map((property) => {
                const propertyKey = `${property.ownerID}-${property.name}`;
                const isSelected =
                  lineageState.selectedProperty === propertyKey;

                const isSourceHighlighted = highlightedSourceProps?.has(
                  property.name,
                );

                return (
                  <div
                    key={propertyKey}
                    className={clsx('property-lineage__property-item', {
                      'property-lineage__property-item--selected': isSelected,
                      'property-lineage__property-item--source-highlighted':
                        isSourceHighlighted,
                    })}
                    onClick={() => handlePropertyClick(property)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="property-lineage__property-name">
                      {property.name}
                    </div>
                    <div className="property-lineage__property-details">
                      <span className="property-lineage__property-type">
                        {property.dataType ?? 'Unknown'}
                      </span>
                      <span className="property-lineage__property-scope">
                        {property.propertyType}
                      </span>
                    </div>
                    {property.scope && (
                      <div className="property-lineage__property-scope-detail">
                        {property.scope}
                      </div>
                    )}
                    {Array.isArray(property.sourceProperties) &&
                      property.sourceProperties.length > 0 && (
                        <div className="property-lineage__property-sources">
                          {property.sourceProperties.length} source properties
                        </div>
                      )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  },
);

const PropertyLineageGraphViewer = observer(
  (props: {
    lineageState: LineageState;
    nodes: ReactFlowNode[];
    edges: ReactFlowEdge[];
  }) => {
    const { lineageState, nodes, edges } = props;

    const getHighlightMaps = () => {
      const highlightedNodeIds = new Set<string>();

      const sourcePropertiesMap =
        lineageState.selectedSourcePropertiesMap ??
        new Map<string, Set<string>>();

      if (
        !lineageState.selectedProperty ||
        !lineageState.selectedPropertyOwnerNode
      ) {
        return { highlightedNodeIds, sourcePropertiesMap };
      }

      const propertyLineage = lineageState.lineageData?.propertyLineage;
      if (!propertyLineage) {
        return { highlightedNodeIds, sourcePropertiesMap };
      }

      const selectedNode = propertyLineage.propertyOwner.find(
        (node) => node.id === lineageState.selectedPropertyOwnerNode,
      );

      if (!(selectedNode instanceof PropertyOwnerNode)) {
        return { highlightedNodeIds, sourcePropertiesMap };
      }

      const [ownerID, propertyName] = lineageState.selectedProperty.split('-');
      const selectedProperty = selectedNode.properties.find(
        (prop) => prop.ownerID === ownerID && prop.name === propertyName,
      );

      if (selectedProperty) {
        highlightedNodeIds.add(selectedProperty.ownerID);

        for (const ownerId of sourcePropertiesMap.keys()) {
          highlightedNodeIds.add(ownerId);
        }
      }

      return { highlightedNodeIds, sourcePropertiesMap };
    };

    const { highlightedNodeIds, sourcePropertiesMap } = getHighlightMaps();

    const onNodeClick = (
      _event: React.MouseEvent<Element, MouseEvent>,
      node: ReactFlowNode,
    ) => {
      if (node.data.isPropertyOwner) {
        lineageState.setSelectedPropertyOwnerNode(
          lineageState.selectedPropertyOwnerNode === node.id
            ? undefined
            : node.id,
        );
        lineageState.setSelectedProperty(undefined);
        lineageState.setSelectedSourcePropertiesMap(undefined);
      }
    };

    const enhancedNodes = nodes.map((node) => {
      const isSelected = lineageState.selectedPropertyOwnerNode === node.id;
      // Remove unnecessary type annotation
      const isHighlighted = highlightedNodeIds.has(node.id);

      // Add type for updatedData to avoid unsafe assignment
      const updatedData: PropertyOwnerNodeData = {
        ...(node.data as PropertyOwnerNodeData),
        isSelected,
        isHighlighted,
      };
      return {
        ...node,
        data: updatedData,
        style: {
          ...node.style,
          cursor: node.data.isPropertyOwner ? 'pointer' : 'default',
          background:
            node.type === 'propertyOwner'
              ? 'transparent'
              : node.style?.backgroundColor,
          border:
            node.type === 'propertyOwner'
              ? 'none'
              : isSelected
                ? '3px solid #ff6b35'
                : isHighlighted
                  ? '3px solid #4caf50'
                  : node.style?.border,
          zIndex: isSelected ? 1000 : isHighlighted ? 100 : 1,
        },
      };
    });

    const highlightedEdgeIds = findRelevantEdges(highlightedNodeIds, edges);

    const enhancedEdges = edges.map((edge) => {
      const isHighlighted = highlightedEdgeIds.has(edge.id);

      return {
        ...edge,
        style: {
          ...edge.style,
          strokeWidth: isHighlighted ? 4 : 2,
          stroke: isHighlighted ? '#4caf50' : '#1976d2',
          opacity: isHighlighted ? 1 : 0.6,
        },
      };
    });

    // DO NOT set selectedSourcePropertiesMap here as it causes infinite re-renders
    // The map is already set in handlePropertyClick
    return (
      <div style={{ height: '100%', width: '100%', display: 'flex' }}>
        <div style={{ flex: 1, height: '100%' }}>
          <ReactFlowProvider>
            <ReactFlow
              nodes={enhancedNodes}
              edges={enhancedEdges}
              nodeTypes={PROPERTY_LINEAGE_NODE_TYPES}
              defaultEdgeOptions={{ type: 'default' }}
              defaultViewport={{ x: 0, y: 0, zoom: 0.6 }}
              fitView={true}
              fitViewOptions={{
                padding: 0.2,
                minZoom: 0.3,
                maxZoom: 1.5,
              }}
              nodesDraggable={true}
              onNodeClick={onNodeClick}
              nodeExtent={[
                [-1000, -1000],
                [3000, 3000],
              ]}
              key={`${lineageState.selectedProperty}-${sourcePropertiesMap.size}`}
            >
              <Background />
              <MiniMap />
              <Controls />
            </ReactFlow>
          </ReactFlowProvider>
        </div>

        {lineageState.selectedPropertyOwnerNode && (
          <div style={{ width: '350px', borderLeft: '1px solid #ccc' }}>
            <PropertyOwnerPanel
              lineageState={lineageState}
              selectedNodeId={lineageState.selectedPropertyOwnerNode}
            />
          </div>
        )}
      </div>
    );
  },
);

// Graph Viewer Component
const LineageGraphViewer = observer(
  (props: { nodes: ReactFlowNode[]; edges: ReactFlowEdge[] }) => {
    const { nodes, edges } = props;
    return (
      <div style={{ height: '100%', width: '100%' }}>
        <ReactFlowProvider>
          <div style={{ width: '100%', height: '100%' }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              defaultEdgeOptions={{ type: 'default' }}
              defaultViewport={{ x: 0, y: 0, zoom: 1.5 }}
              fitView={true}
              nodesDraggable={true}
            >
              <Background />
              <MiniMap />
              <Controls />
            </ReactFlow>
          </div>
        </ReactFlowProvider>
      </div>
    );
  },
);

const TAB_ORDER = [
  LINEAGE_VIEW_MODE.DATABASE_LINEAGE,
  LINEAGE_VIEW_MODE.PROPERTY_LINEAGE,
  LINEAGE_VIEW_MODE.CLASS_LINEAGE,
  LINEAGE_VIEW_MODE.REPORT_LINEAGE,
];

const TAB_LABELS: Record<LINEAGE_VIEW_MODE, string> = {
  [LINEAGE_VIEW_MODE.CLASS_LINEAGE]: 'Class Lineage',
  [LINEAGE_VIEW_MODE.DATABASE_LINEAGE]: 'Database Lineage',
  [LINEAGE_VIEW_MODE.REPORT_LINEAGE]: 'Report Lineage',
  [LINEAGE_VIEW_MODE.PROPERTY_LINEAGE]: 'Property Lineage',
};

const LineageTabSelector = observer((props: { lineageState: LineageState }) => {
  const { lineageState } = props;
  return (
    <div className="viewer__header lineage-viewer__header--with-tabs">
      <div>
        {TAB_ORDER.map((tab) => (
          <div
            key={tab}
            onClick={() => lineageState.setSelectedTab(tab)}
            className={clsx('lineage-viewer__tab', {
              'lineage-viewer__tab--active': tab === lineageState.selectedTab,
            })}
          >
            {TAB_LABELS[tab]}
          </div>
        ))}
      </div>
    </div>
  );
});

const LineageViewerContent = observer(
  (props: { lineageState: LineageState }) => {
    const { lineageState } = props;
    const selectedTab = lineageState.selectedTab;
    const lineageData = lineageState.lineageData;

    const classLineageFlow = convertGraphToFlow(lineageData?.classLineage);
    const databaseLineageFlow = convertGraphToFlow(
      lineageData?.databaseLineage,
    );
    const reportLineageFlow = convertReportLineageToFlow(
      lineageData?.reportLineage,
    );
    const propertyLineageFlow = convertPropertyLineageToFlow(
      lineageData?.propertyLineage,
      lineageState.selectedSourcePropertiesMap,
    );

    return (
      <div className="lineage-viewer" style={{ height: '100%' }}>
        <div style={{ height: '100%' }}>
          <LineageTabSelector lineageState={lineageState} />
          <PanelContent>
            {selectedTab === LINEAGE_VIEW_MODE.CLASS_LINEAGE && (
              <LineageGraphViewer
                nodes={classLineageFlow.nodes}
                edges={classLineageFlow.edges}
              />
            )}
            {selectedTab === LINEAGE_VIEW_MODE.DATABASE_LINEAGE && (
              <LineageGraphViewer
                nodes={databaseLineageFlow.nodes}
                edges={databaseLineageFlow.edges}
              />
            )}
            {selectedTab === LINEAGE_VIEW_MODE.REPORT_LINEAGE && (
              <LineageGraphViewer
                nodes={reportLineageFlow.nodes}
                edges={reportLineageFlow.edges}
              />
            )}
            {selectedTab === LINEAGE_VIEW_MODE.PROPERTY_LINEAGE && (
              <PropertyLineageGraphViewer
                lineageState={lineageState}
                nodes={propertyLineageFlow.nodes}
                edges={propertyLineageFlow.edges}
              />
            )}
          </PanelContent>
        </div>
      </div>
    );
  },
);

export const LineageViewer = observer(
  (props: { lineageState: LineageState }) => {
    const { lineageState } = props;

    const closeLineageViewer = (): void => {
      lineageState.setLineageData(undefined);
      lineageState.setSelectedTab(LINEAGE_VIEW_MODE.DATABASE_LINEAGE);
      lineageState.clearPropertySelections();
    };

    useEffect(() => {
      lineageState.setSelectedTab(LINEAGE_VIEW_MODE.DATABASE_LINEAGE);
    }, [lineageState]);

    if (!lineageState.lineageData) {
      return null;
    }
    const isDarkMode =
      !lineageState.applicationStore.layoutService
        .TEMPORARY__isLightColorThemeEnabled;
    return (
      <Dialog
        open={Boolean(lineageState.lineageData)}
        onClose={closeLineageViewer}
      >
        <Modal className="editor-modal" darkMode={isDarkMode}>
          <ModalHeader title="Lineage Viewer" />
          <ModalBody>
            <div className="lineage-viewer" style={{ height: '100%' }}>
              <LineageViewerContent lineageState={lineageState} />
            </div>
          </ModalBody>
          <ModalFooter className="editor-modal__footer">
            <ModalFooterButton
              onClick={closeLineageViewer}
              text="Close"
              type="secondary"
            />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);
