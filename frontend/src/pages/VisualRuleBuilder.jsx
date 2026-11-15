import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { TempSensorNode } from '../components/nodes/TempSensorNode';
import { HumiditySensorNode } from '../components/nodes/HumiditySensorNode';
import { TurbineSensorNode } from '../components/nodes/TurbineSensorNode';
import { MovingAverageNode } from '../components/nodes/MovingAverageNode';
import { ThresholdNode } from '../components/nodes/ThresholdNode';
import { MathOpNode } from '../components/nodes/MathOpNode';
import { SmsAlertNode } from '../components/nodes/SmsAlertNode';
import { WebhookNode } from '../components/nodes/WebhookNode';

import { NodePalette } from '../components/builder/NodePalette';
import { RuleToolbar } from '../components/builder/RuleToolbar';
import { NodeConfigModal } from '../components/builder/NodeConfigModal';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';

const nodeTypes = {
  tempSensor: TempSensorNode,
  humiditySensor: HumiditySensorNode,
  turbineSensor: TurbineSensorNode,
  movingAverage: MovingAverageNode,
  threshold: ThresholdNode,
  mathOp: MathOpNode,
  smsAlert: SmsAlertNode,
  webhook: WebhookNode
};

const defaultTemplate = {
  name: 'Turbine Overheat & Vibration Guard',
  description: 'Monitors Turbine-001 with 5-point moving average filter and triggers SMS alert when temperature > 80°C.',
  active: true,
  nodes: [
    {
      id: 'node-1',
      type: 'turbineSensor',
      position: { x: 60, y: 160 },
      data: {
        label: 'Turbine Sensor',
        deviceId: 'TURBINE-001',
        metric: 'temperature'
      }
    },
    {
      id: 'node-2',
      type: 'movingAverage',
      position: { x: 360, y: 160 },
      data: {
        label: '5-Sample Moving Average',
        windowSize: 5
      }
    },
    {
      id: 'node-3',
      type: 'threshold',
      position: { x: 660, y: 160 },
      data: {
        label: 'Threshold > 80°C',
        operator: '>',
        threshold: 80
      }
    },
    {
      id: 'node-4',
      type: 'smsAlert',
      position: { x: 960, y: 160 },
      data: {
        label: 'Factory Floor SMS Alert',
        recipient: '+1 (555) 902-1844',
        message: 'URGENT: Turbine-001 temperature exceeded threshold! Current: {{value}}°C'
      }
    }
  ],
  edges: [
    {
      id: 'e1-2',
      source: 'node-1',
      target: 'node-2',
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed }
    },
    {
      id: 'e2-3',
      source: 'node-2',
      target: 'node-3',
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed }
    },
    {
      id: 'e3-4',
      source: 'node-3',
      target: 'node-4',
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed }
    }
  ]
};

export const VisualRuleBuilder = () => {
  const { selectedRuleId, setSelectedRuleId, showToast, refreshStats } = useApp();
  const reactFlowWrapper = useRef(null);

  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [ruleName, setRuleName] = useState('Turbine Overheat & Vibration Guard');
  const [ruleActive, setRuleActive] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  // Load selected rule or default template
  useEffect(() => {
    const loadRule = async () => {
      try {
        if (selectedRuleId) {
          const res = await api.getRuleById(selectedRuleId);
          if (res.success && res.data) {
            setRuleName(res.data.name || 'Untitled Rule');
            setRuleActive(res.data.active);
            setNodes(res.data.graph?.nodes || []);
            setEdges(res.data.graph?.edges || []);
            return;
          }
        }

        // Try to fetch existing rule or fall back to template
        const rulesRes = await api.getRules();
        if (rulesRes.success && rulesRes.data?.length > 0) {
          const firstRule = rulesRes.data[0];
          setSelectedRuleId(firstRule._id);
          setRuleName(firstRule.name);
          setRuleActive(firstRule.active);
          setNodes(firstRule.graph?.nodes || defaultTemplate.nodes);
          setEdges(firstRule.graph?.edges || defaultTemplate.edges);
        } else {
          setNodes(defaultTemplate.nodes);
          setEdges(defaultTemplate.edges);
        }
      } catch (err) {
        setNodes(defaultTemplate.nodes);
        setEdges(defaultTemplate.edges);
      }
    };

    loadRule();
  }, [selectedRuleId]);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (params) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: '#4f46e5', strokeWidth: 2.5 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#4f46e5' }
          },
          eds
        )
      ),
    []
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const rawData = event.dataTransfer.getData('application/reactflow');
      if (!rawData) return;

      const { type, data } = JSON.parse(rawData);
      if (!reactFlowWrapper.current || !reactFlowInstance) return;

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY
      });

      const newNode = {
        id: `node-${Date.now()}`,
        type,
        position,
        data: { ...data }
      };

      setNodes((nds) => nds.concat(newNode));
      showToast(`Added ${data.label || type} to canvas`, 'info');
    },
    [reactFlowInstance]
  );

  const onNodeClick = (_, node) => {
    setSelectedNode(node);
  };

  const handleSaveNodeConfig = (nodeId, updatedData) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === nodeId ? { ...n, data: updatedData } : n))
    );
    showToast('Node configuration updated', 'success');
  };

  const handleDeleteNode = (nodeId) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    showToast('Node removed from flow', 'info');
  };

  const handleValidate = async () => {
    setIsValidating(true);
    try {
      const graph = { nodes, edges };
      const res = await api.validateGraph(graph);
      if (res.valid) {
        showToast('✅ Graph structure is valid & ready to compile!', 'success');
      } else {
        showToast(`❌ Validation error: ${res.errors.join('; ')}`, 'danger');
      }
    } catch (err) {
      showToast(`Validation request failed: ${err.message}`, 'danger');
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const graph = {
        nodes,
        edges,
        viewport: reactFlowInstance ? reactFlowInstance.getViewport() : { x: 0, y: 0, zoom: 1 }
      };

      const payload = {
        name: ruleName || 'NexusFlow Rule',
        active: ruleActive,
        graph
      };

      let res;
      if (selectedRuleId) {
        res = await api.updateRule(selectedRuleId, payload);
      } else {
        res = await api.createRule(payload);
        if (res.data?._id) setSelectedRuleId(res.data._id);
      }

      showToast('🚀 Rule saved & compiled into live RxJS pipeline!', 'success');
      refreshStats();
    } catch (err) {
      showToast(`Save & compilation failed: ${err.message}`, 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetTemplate = () => {
    setRuleName(defaultTemplate.name);
    setNodes(defaultTemplate.nodes);
    setEdges(defaultTemplate.edges);
    showToast('Loaded Problem Statement visual template', 'info');
  };

  const handleClear = () => {
    if (window.confirm('Clear all nodes and edges from the canvas?')) {
      setNodes([]);
      setEdges([]);
      showToast('Canvas cleared', 'info');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>
      <RuleToolbar
        ruleName={ruleName}
        setRuleName={setRuleName}
        active={ruleActive}
        onToggleActive={() => setRuleActive(!ruleActive)}
        onSave={handleSave}
        onValidate={handleValidate}
        onResetTemplate={handleResetTemplate}
        onClear={handleClear}
        isValidating={isValidating}
        isSaving={isSaving}
      />

      <div className="builder-container">
        <NodePalette />

        <div className="flow-canvas-wrapper" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            snapToGrid
            snapGrid={[15, 15]}
          >
            <Controls />
            <MiniMap
              nodeStrokeColor="#4f46e5"
              nodeColor="#e0e7ff"
              nodeBorderRadius={6}
              style={{ background: 'white', border: '1px solid #e2e8f0' }}
            />
            <Background variant="dots" gap={16} size={1} color="#cbd5e1" />
          </ReactFlow>
        </div>
      </div>

      {selectedNode && (
        <NodeConfigModal
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onSave={handleSaveNodeConfig}
          onDelete={handleDeleteNode}
        />
      )}
    </div>
  );
};
