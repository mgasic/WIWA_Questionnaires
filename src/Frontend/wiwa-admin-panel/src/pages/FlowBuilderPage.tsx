import { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    useReactFlow,
    ReactFlowProvider,
    SelectionMode,
    updateEdge,
} from 'reactflow';
import type { Connection, Edge } from 'reactflow';
import { UndoOutlined, RedoOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import 'reactflow/dist/style.css';
import { Card, Button, List, Modal, Form, Input, Select, Checkbox, Tabs, InputNumber, message, Row, Col } from 'antd';
import { SaveOutlined, QuestionCircleOutlined, CheckSquareOutlined, DeleteOutlined, TableOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import QuestionNode from '../components/QuestionNode';
import AnswerNode from '../components/AnswerNode';
import MatrixEditor from '../components/MatrixEditor';
import {
    questionnaireTypesService,
    questionnaireIdentificatorTypesService,
    questionFormatsService,
    specificQuestionTypesService,
    databaseMetadataService,
    flowService
} from '../services/flowApiService';
import type { QuestionFormat, SpecificQuestionType, QuestionnaireType, QuestionnaireIdentificatorType, MatrixDto } from '../types/flow';
import './FlowBuilderPage.css';

const nodeTypes = {
    questionNode: QuestionNode,
    answerNode: AnswerNode,
};

const paletteItems = [
    { id: 'question', type: 'questionNode', label: 'Question', icon: <QuestionCircleOutlined />, color: '#1890ff' },
    { id: 'answer', type: 'answerNode', label: 'Predefined Answer', icon: <CheckSquareOutlined />, color: '#52c41a' },
];

const FlowBuilderPageContent = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [selectedNode, setSelectedNode] = useState<any>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [form] = Form.useForm();
    const [saveForm] = Form.useForm();
    const { screenToFlowPosition } = useReactFlow();

    // Matrix Editor State
    const [isMatrixEditorOpen, setIsMatrixEditorOpen] = useState(false);
    const [currentMatrix, setCurrentMatrix] = useState<MatrixDto | null>(null);

    // UI State
    const [sidebarWidth, setSidebarWidth] = useState(300);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [currentFlowName, setCurrentFlowName] = useState<string>('');

    // Dropdown data
    const [questionFormats, setQuestionFormats] = useState<QuestionFormat[]>([]);
    const [specificQuestionTypes, setSpecificQuestionTypes] = useState<SpecificQuestionType[]>([]);
    const [questionnaireTypes, setQuestionnaireTypes] = useState<QuestionnaireType[]>([]);
    const [questionnaireIdTypes, setQuestionnaireIdTypes] = useState<QuestionnaireIdentificatorType[]>([]);
    const [tableNames, setTableNames] = useState<string[]>([]);
    const [tableColumns, setTableColumns] = useState<string[]>([]);
    const [isNewQuestionnaireType, setIsNewQuestionnaireType] = useState(false);
    const [isNewIdType, setIsNewIdType] = useState(false);
    const [referencedTables, setReferencedTables] = useState<string[]>([]);
    const [referenceMetadata, setReferenceMetadata] = useState<any[]>([]);

    // History (Undo/Redo)
    const [history, setHistory] = useState<{ nodes: any[], edges: any[] }[]>([]);
    const [historyPointer, setHistoryPointer] = useState(-1);

    // Snapshot helper
    const takeSnapshot = useCallback((_nodes: any[], _edges: any[]) => {
        setHistory(prev => {
            const newHistory = prev.slice(0, historyPointer + 1);
            newHistory.push({ nodes: JSON.parse(JSON.stringify(_nodes)), edges: JSON.parse(JSON.stringify(_edges)) });
            return newHistory;
        });
        setHistoryPointer(prev => prev + 1);
    }, [historyPointer]);

    // Initial Snapshot
    useEffect(() => {
        if (history.length === 0 && nodes.length === 0 && edges.length === 0) {
            // Don't snapshot empty initial state immediately or handle it gracefully
        }
    }, []);

    const undo = useCallback(() => {
        if (historyPointer > 0) {
            const prevState = history[historyPointer - 1];
            setNodes(prevState.nodes);
            setEdges(prevState.edges);
            setHistoryPointer(historyPointer - 1);
        }
    }, [history, historyPointer, setNodes, setEdges]);

    const redo = useCallback(() => {
        if (historyPointer < history.length - 1) {
            const nextState = history[historyPointer + 1];
            setNodes(nextState.nodes);
            setEdges(nextState.edges);
            setHistoryPointer(historyPointer + 1);
        }
    }, [history, historyPointer, setNodes, setEdges]);

    // Capture snapshot on significant changes
    // We'll wrap setNodes/setEdges where relevant or use a specific effect?
    // Using an effect on nodes/edges change is too chatty (drag).
    // Better to snapshot on specific actions: Delete, Connect, Drop, Edit.


    // Resizing Logic
    const startResizing = useCallback(() => setIsResizing(true), []);
    const stopResizing = useCallback(() => setIsResizing(false), []);
    const resize = useCallback((mouseMoveEvent: MouseEvent) => {
        if (isResizing) {
            const newWidth = mouseMoveEvent.clientX;
            if (newWidth > 150 && newWidth < 800) setSidebarWidth(newWidth);
        }
    }, [isResizing]);

    useEffect(() => {
        window.addEventListener('mousemove', resize);
        window.addEventListener('mouseup', stopResizing);
        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [resize, stopResizing]);

    useEffect(() => {
        loadDropdownData();
    }, []);

    useEffect(() => {
        if (id && id !== 'new') {
            const typeId = parseInt(id, 10);
            if (!isNaN(typeId)) {
                loadFlow(typeId);
            }
        }
    }, [id]);

    const getUpdatedChildStatus = (currentNodes: any[], currentEdges: any[]) => {
        const questionNodes = currentNodes.filter(n => n.type === 'questionNode');
        const answerNodes = currentNodes.filter(n => n.type === 'answerNode');

        return currentNodes.map((node) => {
            // Add onDelete callback to EVERY node
            const baseNode = {
                ...node,
                data: {
                    ...node.data,
                    onDelete: () => {
                        setNodes((nds) => nds.filter((n) => n.id !== node.id));
                        setEdges((eds) => eds.filter((e) => e.source !== node.id && e.target !== node.id));
                    }
                }
            };

            if (baseNode.type === 'questionNode') {
                const parentEdge = currentEdges.find(edge => edge.target === baseNode.id);

                if (!parentEdge) {
                    return {
                        ...baseNode,
                        data: { ...baseNode.data, isChild: false, childType: null },
                    };
                }

                const parentIsQuestion = questionNodes.some(qn => qn.id === parentEdge.source);
                if (parentIsQuestion) {
                    return {
                        ...baseNode,
                        data: { ...baseNode.data, isChild: true, childType: 'parent-child' },
                    };
                }

                const parentIsAnswer = answerNodes.some(an => an.id === parentEdge.source);
                if (parentIsAnswer) {
                    return {
                        ...baseNode,
                        data: { ...baseNode.data, isChild: true, childType: 'subquestion' },
                    };
                }
            }
            return baseNode;
        });
    };

    const loadReferencedTables = async (typeId: number) => {
        try {
            const [tables, metadata] = await Promise.all([
                flowService.getUserReferenceTables(typeId),
                flowService.getReferenceTableMetadata(typeId)
            ]);
            // Map the result objects to string names for the dropdown
            setReferencedTables(tables.map((t: any) => t.tableName));
            setReferenceMetadata(metadata);
        } catch (error) {
            console.error('Failed to load referenced tables', error);
        }
    };

    const loadFlow = async (typeId: number) => {
        try {
            message.loading({ content: 'Loading flow...', key: 'loadFlow' });
            const flow = await flowService.getFlow(typeId);
            setCurrentFlowName(flow.questionnaireTypeName);

            // Set nodes with pre-calculated child status
            const processedNodes = getUpdatedChildStatus(flow.nodes, flow.edges);
            setNodes(processedNodes);
            setEdges(flow.edges);

            // Clear history and take initial snapshot
            setHistory([{ nodes: processedNodes, edges: flow.edges }]);
            setHistoryPointer(0);

            // Load referenced tables for this type
            loadReferencedTables(typeId);

            // Pre-fill save form
            setIsNewQuestionnaireType(false);

            saveForm.setFieldsValue({
                existingQuestionnaireTypeID: flow.questionnaireTypeID,
                existingQuestionnaireIdentificatorTypeID: flow.existingQuestionnaireIdentificatorTypeID,
            });

            if (flow.existingQuestionnaireIdentificatorTypeID) {
                setIsNewIdType(false);
            }

            message.success({ content: `Loaded flow: ${flow.questionnaireTypeName}`, key: 'loadFlow' });
        } catch (error) {
            console.error(error);
            message.error({ content: 'Failed to load flow', key: 'loadFlow' });
        }
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Delete' || event.key === 'Backspace') {
                // Delete selected nodes and edges
                takeSnapshot(nodes, edges); // Snapshot BEFORE delete
                setNodes((nds) => nds.filter((node) => !node.selected));
                setEdges((eds) => eds.filter((edge) => !edge.selected));
                message.info('Selected elements deleted');
            } else if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
                if (event.shiftKey) {
                    redo();
                } else {
                    undo();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [nodes, edges, setNodes, setEdges, undo, redo, takeSnapshot]);

    const loadDropdownData = async () => {
        try {
            const [formats, specificTypes, qTypes, idTypes, tables] = await Promise.all([
                questionFormatsService.getAll(),
                specificQuestionTypesService.getAll(),
                questionnaireTypesService.getAll(),
                questionnaireIdentificatorTypesService.getAll(),
                databaseMetadataService.getTableNames(),
            ]);
            setQuestionFormats(formats);
            setSpecificQuestionTypes(specificTypes);
            setQuestionnaireTypes(qTypes);
            setQuestionnaireIdTypes(idTypes);
            setTableNames(tables);
        } catch (error) {
            message.error('Failed to load dropdown data');
            console.error(error);
        }
    };

    const handleReferenceTableChange = async (tableName: string) => {
        if (!tableName) {
            setTableColumns([]);
            return;
        }

        // Check metadata for preferred column
        const meta = referenceMetadata.find(m => m.tableName === tableName);
        if (meta && meta.preferredColumnName) {
            form.setFieldValue('referenceColumn', meta.preferredColumnName);
        }

        try {
            const columns = await databaseMetadataService.getTableColumns(tableName);
            setTableColumns(columns);
        } catch (error) {
            message.error('Failed to load table columns');
            console.error(error);
        }
    };

    const onConnect = useCallback(
        (params: any) => {
            takeSnapshot(nodes, edges);
            const newEdges = addEdge(params, edges);
            setEdges(newEdges);

            // Update child status for questions
            setNodes(nds => getUpdatedChildStatus(nds, newEdges));
        },
        [edges, nodes, setEdges, setNodes, takeSnapshot]
    );

    const onEdgeUpdate = useCallback(
        (oldEdge: Edge, newConnection: Connection) => {
            takeSnapshot(nodes, edges);
            setEdges((els) => updateEdge(oldEdge, newConnection, els));
        },
        [nodes, edges, setEdges, takeSnapshot]
    );

    const updateChildStatus = () => {
        setNodes(nds => getUpdatedChildStatus(nds, edges));
    };

    const onDragStart = (event: React.DragEvent, item: typeof paletteItems[0]) => {
        event.dataTransfer.setData('application/reactflow', JSON.stringify(item));
        event.dataTransfer.effectAllowed = 'move';
    };

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            const data = event.dataTransfer.getData('application/reactflow');

            if (!data) return;

            const item = JSON.parse(data);

            // Convert screen coordinates to flow coordinates
            const position = screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            const newNode: any = {
                id: `${item.id}-${Date.now()}`,
                type: item.type,
                position,
                data: {
                    label: `New ${item.label}`,
                },
            };

            takeSnapshot(nodes, edges);
            setNodes((nds) => nds.concat(newNode));
        },
        [nodes, edges, setNodes, screenToFlowPosition, takeSnapshot]
    );

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onNodeDoubleClick = useCallback(
        (_event: React.MouseEvent, node: any) => {
            setSelectedNode(node);

            // Check if node has child questions (for computed section)
            const hasChildQuestions = edges.some(edge =>
                edge.source === node.id &&
                nodes.some(n => n.id === edge.target && n.type === 'questionNode')
            );

            form.setFieldsValue({
                ...node.data,
                hasChildQuestions, // Pass this to conditionally show computed
            });

            // Load columns if referenceTable is already set
            if (node.data.referenceTable) {
                handleReferenceTableChange(node.data.referenceTable);
            }

            setIsEditModalOpen(true);
        },
        [form, edges, nodes, handleReferenceTableChange]
    );

    const handleEditModalOk = () => {
        const values = form.getFieldsValue();

        // Validation: Reference column required if table is set
        if (values.referenceTable && !values.referenceColumn) {
            message.error('Reference Column is required when Reference Table is set');
            return;
        }

        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === selectedNode.id) {
                    const updatedNode = {
                        ...node,
                        data: { ...node.data, ...values },
                    };
                    // Snapshot only if changed (simple check)
                    return updatedNode;
                }
                return node;
            })
        );
        // We really should snapshot here, but getting previous state implies passing it or using functional setNodes correctly
        // Let's force a snapshot of CURRENT state before the update?
        // Actually, handleEditModalOk is called when we click "Save" on modal.
        // It's safe to snapshot current state here before update.
        takeSnapshot(nodes, edges);

        setIsEditModalOpen(false);
        message.success('Node updated successfully');
    };

    const handleOpenMatrixEditor = () => {
        const formula = form.getFieldValue('formulaExpression');
        let matrix: MatrixDto | null = null;
        if (formula && formula.trim().startsWith('{')) {
            try {
                matrix = JSON.parse(formula);
            } catch (e) {
                console.error('Failed to parse matrix JSON', e);
            }
        }
        setCurrentMatrix(matrix);
        setIsMatrixEditorOpen(true);
    };

    const handleMatrixSaveSuccess = (matrix: MatrixDto) => {
        form.setFieldsValue({
            formulaExpression: JSON.stringify(matrix, null, 2),
            matrixObjectName: matrix.matrixName,
            // Optionally auto-set output column if needed
            // matrixOutputColumnName: matrix.definition.valueColumns[0] 
        });
        message.success('Matrix configuration updated in form');
    };

    const handleSaveFlow = () => {
        if (nodes.length === 0) {
            message.error('Flow is empty. Add at least one question.');
            return;
        }

        saveForm.resetFields();
        setIsSaveModalOpen(true);
    };

    const handleSaveModalOk = async () => {
        setIsSaving(true);
        try {
            const values = await saveForm.validateFields();

            // Step 1: Check if combination exists (if using existing types and NOT updating)
            if (!isNewQuestionnaireType && !isNewIdType && !values.isUpdate) {
                const checkResult = await flowService.checkCombination(
                    values.existingQuestionnaireTypeID,
                    values.existingIdentificatorTypeID
                );

                if (checkResult.exists) {
                    message.error('⚠️ This combination of Questionnaire Type and ID Type already exists. Please choose a different combination, create new types, or select "Overwrite existing".');
                    return;
                }
            }

            const flowData = {
                nodes: nodes.map(n => ({
                    id: n.id,
                    type: n.type,
                    position: n.position,
                    data: n.data,
                })),
                edges: edges.map(e => ({
                    id: e.id,
                    source: e.source,
                    target: e.target,
                    sourceHandle: e.sourceHandle,
                    targetHandle: e.targetHandle,
                })),
                questionnaireTypeName: isNewQuestionnaireType ? values.newQuestionnaireTypeName : questionnaireTypes.find(qt => qt.questionnaireTypeID === values.existingQuestionnaireTypeID)?.name || '',
                questionnaireTypeCode: values.questionnaireTypeCode,
                existingQuestionnaireTypeID: isNewQuestionnaireType ? undefined : values.existingQuestionnaireTypeID,
                questionnaireIdentificatorTypeName: isNewIdType ? values.newIdentificatorTypeName : questionnaireIdTypes.find(it => it.questionnaireIdentificatorTypeID === values.existingIdentificatorTypeID)?.name || '',
                existingQuestionnaireIdentificatorTypeID: isNewIdType ? undefined : values.existingIdentificatorTypeID,
                isUpdate: values.isUpdate
            };

            const response = await flowService.save(flowData);

            if (response.success) {
                message.success(response.message || `Flow saved successfully! Questionnaire ID: ${response.questionnaireID}`);
                setIsSaveModalOpen(false);

                // Reload dropdown data
                await loadDropdownData();
            } else {
                message.error(`Save failed: ${response.message}`);
                if (response.errors?.length) {
                    response.errors.forEach((err: string) => message.error(err));
                }
            }
        } catch (error: any) {
            message.error('Failed to save flow');
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const deleteSelected = useCallback(() => {
        const selectedNodes = nodes.filter(n => (n as any).selected);
        const selectedEdges = edges.filter(e => (e as any).selected);

        if (selectedNodes.length === 0 && selectedEdges.length === 0) {
            message.info('Please select elements to delete (Shift + Drag or Ctrl + Click)');
            return;
        }

        takeSnapshot(nodes, edges);

        setNodes((nds) => nds.filter((node) => !selectedNodes.find(s => s.id === node.id)));
        setEdges((eds) => eds.filter((edge) => !selectedEdges.find(s => s.id === edge.id)));

        message.success(`Deleted ${selectedNodes.length} nodes and ${selectedEdges.length} edges`);
    }, [nodes, edges, setNodes, setEdges, takeSnapshot]);

    // Handle node drag stop for snapshot?
    // Handle node drag start for snapshot
    const onNodeDragStart = () => {
        // Snapshot state BEFORE move so we can undo to this position
        takeSnapshot(nodes, edges);
    };

    // Using onNodeDragStop to capture move history

    return (
        <div className="flow-builder-container">
            <div
                className={`toolbar ${isSidebarCollapsed ? 'collapsed' : ''}`}
                style={{ width: isSidebarCollapsed ? 0 : sidebarWidth }}
            >
                <Card
                    title={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Elements Palette</span>
                        </div>
                    }
                    size="small"
                    style={{ height: '100%', overflow: 'auto', display: isSidebarCollapsed ? 'none' : 'flex', flexDirection: 'column' }}
                    bodyStyle={{ flex: 1, overflowY: 'auto' }}
                >
                    <List
                        dataSource={paletteItems}
                        renderItem={(item) => (
                            <List.Item
                                className="draggable-item"
                                draggable
                                onDragStart={(e) => onDragStart(e, item)}
                                style={{ borderColor: item.color }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ color: item.color, fontSize: '18px' }}>{item.icon}</span>
                                    <strong>{item.label}</strong>
                                </div>
                            </List.Item>
                        )}
                    />
                    <div style={{ marginTop: '16px', padding: '8px', background: '#f0f0f0', borderRadius: '4px', fontSize: '12px' }}>
                        <strong>Instructions:</strong>
                        <ul style={{ margin: '8px 0 0 0', paddingLeft: '16px' }}>
                            <li>Drag to canvas</li>
                            <li>Double-click to edit</li>
                            <li>Connect with edges</li>
                            <li><strong>Shift + Drag</strong>: Box select</li>
                            <li><strong>Ctrl + Click</strong>: Multi-select</li>
                            <li><strong>Middle/Right Click</strong>: Pan</li>
                            <li><strong>Move Line</strong>: Drag existing line end to new point</li>
                            <li style={{ color: '#1890ff', marginTop: '4px' }}>🔵 Root Question (blue)</li>
                            <li style={{ color: '#722ed1' }}>🟣 Q→Q parent-child (purple)</li>
                            <li style={{ color: '#fa8c16' }}>🟠 A→Q subquestion (orange)</li>
                            <li style={{ color: '#52c41a', display: 'flex', alignItems: 'center', marginTop: '4px' }}>
                                <CheckSquareOutlined style={{ marginRight: '4px' }} /> Predefined Answer (green)
                            </li>
                        </ul>
                    </div>
                </Card>
            </div>
            <div
                className="sidebar-resizer"
                onMouseDown={startResizing}
            />

            <div className="canvas-container">
                <div className="flow-builder-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <Button
                            icon={isSidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        />
                        <h2>
                            {id === 'new' ? (
                                'Create New Flow'
                            ) : (
                                <>
                                    <span>Edit Flow</span>
                                    {currentFlowName && <span style={{ color: '#1890ff', marginLeft: '8px' }}>- {currentFlowName}</span>}
                                </>
                            )}
                        </h2>
                    </div>
                    <div className="header-actions">
                        <Button
                            danger
                            icon={<DeleteOutlined />}
                            onClick={deleteSelected}
                            style={{ marginRight: '8px' }}
                        >
                            Delete Selected
                        </Button>
                        <Button onClick={() => navigate('/dashboard')} style={{ marginRight: '8px' }}>
                            Back to Dashboard
                        </Button>
                        <Button
                            icon={<UndoOutlined />}
                            onClick={undo}
                            disabled={historyPointer <= 0}
                            style={{ marginRight: '8px' }}
                        >
                            Undo
                        </Button>
                        <Button
                            icon={<RedoOutlined />}
                            onClick={redo}
                            disabled={historyPointer >= history.length - 1}
                            style={{ marginRight: '16px' }}
                        >
                            Redo
                        </Button>
                        <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveFlow}>
                            Save Flow
                        </Button>
                    </div>
                </div>

                <div className="react-flow-wrapper" onDrop={onDrop} onDragOver={onDragOver}>
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onEdgeUpdate={onEdgeUpdate}
                        onNodeDragStart={onNodeDragStart}
                        // DragStart snapshots current state so we can return to it.
                        onEdgesDelete={updateChildStatus}
                        onNodesDelete={updateChildStatus}
                        onNodeDoubleClick={onNodeDoubleClick}
                        nodeTypes={nodeTypes}
                        fitView
                        multiSelectionKeyCode="Control"
                        selectionKeyCode="Shift"
                        selectionMode={SelectionMode.Partial}
                        selectionOnDrag={true}
                        panOnDrag={[1, 2]} // Pan with right or middle click
                        deleteKeyCode="Delete"
                        selectNodesOnDrag={false}
                    >
                        <Controls />
                        <MiniMap />
                        <Background gap={12} size={1} />
                    </ReactFlow>
                </div>
            </div>

            {/* Edit Node Modal */}
            <Modal
                title={`Edit ${selectedNode?.type === 'questionNode' ? 'Question' : 'Answer'} `}
                open={isEditModalOpen}
                onOk={handleEditModalOk}
                onCancel={() => setIsEditModalOpen(false)}
                width={800}
                okText="Save"
                cancelText="Cancel"
            >
                <Form form={form} layout="vertical">
                    {selectedNode?.type === 'questionNode' ? (
                        <Tabs defaultActiveKey="basic">
                            <Tabs.TabPane tab="Basic Info" key="basic">
                                <Form.Item label="Label" name="label">
                                    <Input placeholder="e.g., 1.1" />
                                </Form.Item>
                                <Form.Item label="Question Text" name="questionText" rules={[{ required: true }]}>
                                    <Input.TextArea rows={3} />
                                </Form.Item>

                                <Row gutter={16}>
                                    <Col span={8}>
                                        <Form.Item label="Order" name="questionOrder">
                                            <InputNumber style={{ width: '100%' }} placeholder="1" />
                                        </Form.Item>
                                    </Col>
                                    <Col span={16}>
                                        <Form.Item label="Format" name="questionFormatID">
                                            <Select placeholder="Select format" allowClear>
                                                {questionFormats.map(f => (
                                                    <Select.Option key={f.questionFormatID} value={f.questionFormatID}>
                                                        {f.name}
                                                    </Select.Option>
                                                ))}
                                            </Select>
                                        </Form.Item>
                                    </Col>
                                </Row>

                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Form.Item name="isRequired" valuePropName="checked">
                                            <Checkbox>Required</Checkbox>
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item name="readOnly" valuePropName="checked">
                                            <Checkbox>Read Only</Checkbox>
                                        </Form.Item>
                                    </Col>
                                </Row>

                                <Form.Item label="Validation Pattern" name="validationPattern">
                                    <Input placeholder="Regex pattern (optional)" />
                                </Form.Item>
                            </Tabs.TabPane>

                            <Tabs.TabPane tab="Advanced" key="advanced">
                                <Form.Item label="Specific Question Type" name="specificQuestionTypeID">
                                    <Select placeholder="Select type (optional)" allowClear>
                                        {specificQuestionTypes.map(t => (
                                            <Select.Option key={t.specificQuestionTypeID} value={t.specificQuestionTypeID}>
                                                {t.name} ({t.code})
                                            </Select.Option>
                                        ))}
                                    </Select>
                                </Form.Item>

                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Form.Item label="Reference Table" name="referenceTable">
                                            <Select
                                                showSearch
                                                placeholder="Select or type table name"
                                                mode="tags"
                                                maxTagCount={1}
                                                onChange={(value) => {
                                                    const tableName = Array.isArray(value) ? value[0] : value;
                                                    if (tableName) {
                                                        handleReferenceTableChange(tableName);
                                                        form.setFieldValue('referenceTable', tableName);
                                                    }
                                                }}
                                                options={(referencedTables.length > 0 ? referencedTables : tableNames)
                                                    .map(name => ({ value: name, label: name }))}
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item
                                            label="Reference Column"
                                            name="referenceColumn"
                                            dependencies={['referenceTable']}
                                        >
                                            <Select
                                                showSearch
                                                placeholder="Select or type column name"
                                                mode="tags"
                                                maxTagCount={1}
                                                onChange={(value) => {
                                                    const columnName = Array.isArray(value) ? value[0] : value;
                                                    form.setFieldValue('referenceColumn', columnName);
                                                }}
                                                options={tableColumns.map(name => ({ value: name, label: name }))}
                                                disabled={!form.getFieldValue('referenceTable') || (Boolean(referenceMetadata.find(m => m.tableName === form.getFieldValue('referenceTable'))?.preferredColumnName))}
                                            />
                                        </Form.Item>
                                    </Col>
                                </Row>
                            </Tabs.TabPane>

                            <Tabs.TabPane tab="Computed Config" key="computed">
                                <p style={{ color: '#666', marginBottom: '16px' }}>
                                    <strong>Note:</strong> Enable computed only if this question has child questions.
                                </p>
                                <Form.Item name="isComputed" valuePropName="checked">
                                    <Checkbox>Is Computed</Checkbox>
                                </Form.Item>
                                <Form.Item noStyle shouldUpdate={(prev, curr) => prev.isComputed !== curr.isComputed}>
                                    {({ getFieldValue }) => getFieldValue('isComputed') ? (
                                        <>
                                            <Row gutter={16}>
                                                <Col span={16}>
                                                    <Form.Item label="Rule Name" name="ruleName">
                                                        <Input placeholder="Rule name" />
                                                    </Form.Item>
                                                </Col>
                                                <Col span={8}>
                                                    <Form.Item label="Priority" name="priority">
                                                        <InputNumber style={{ width: '100%' }} placeholder="1" />
                                                    </Form.Item>
                                                </Col>
                                            </Row>

                                            <Form.Item label="Rule Description" name="ruleDescription">
                                                <Input.TextArea rows={2} placeholder="Optional description" />
                                            </Form.Item>

                                            <Row gutter={16}>
                                                <Col span={12}>
                                                    <Form.Item label="Matrix Object Name" name="matrixObjectName">
                                                        <Input placeholder="e.g., MatrixName" />
                                                    </Form.Item>
                                                </Col>
                                                <Col span={12}>
                                                    <Form.Item label="Matrix Output Column" name="matrixOutputColumnName">
                                                        <Input placeholder="Column name" />
                                                    </Form.Item>
                                                </Col>
                                            </Row>

                                            <Row gutter={16}>
                                                <Col span={12}>
                                                    <Form.Item label="Output Mode" name="outputMode">
                                                        <Select placeholder="Select mode">
                                                            <Select.Option value={0}>Value</Select.Option>
                                                            <Select.Option value={1}>Answer ID</Select.Option>
                                                        </Select>
                                                    </Form.Item>
                                                </Col>
                                                <Col span={12}>
                                                    <Form.Item label="Output Target" name="outputTarget">
                                                        <Input placeholder="Target field" />
                                                    </Form.Item>
                                                </Col>
                                            </Row>

                                            <Form.Item label="Formula Expression / Matrix Config" name="formulaExpression">
                                                <Input.TextArea rows={4} placeholder="Formula or Matrix JSON" />
                                            </Form.Item>

                                            <div style={{ marginBottom: 24 }}>
                                                <Button type="dashed" onClick={handleOpenMatrixEditor} icon={<TableOutlined />}>
                                                    Open Matrix Editor
                                                </Button>
                                                <span style={{ marginLeft: 8, color: '#8c8c8c', fontSize: '12px' }}>
                                                    (Use this to visually edit Matrix Lookup rules)
                                                </span>
                                            </div>

                                            <Form.Item name="isActive" valuePropName="checked" initialValue={true}>
                                                <Checkbox>Is Active</Checkbox>
                                            </Form.Item>
                                        </>
                                    ) : null}
                                </Form.Item>
                            </Tabs.TabPane>
                        </Tabs>
                    ) : (
                        <>
                            <Row gutter={16}>
                                <Col span={8}>
                                    <Form.Item label="Label" name="label">
                                        <Input placeholder="e.g., 1" />
                                    </Form.Item>
                                </Col>
                                <Col span={16}>
                                    <Form.Item label="Code" name="code">
                                        <Input placeholder="e.g., DA, NE" />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Form.Item label="Answer Text" name="answerText" rules={[{ required: true }]}>
                                <Input placeholder="Enter answer text" />
                            </Form.Item>

                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item label="Display Order" name="displayOrder">
                                        <InputNumber style={{ width: '100%' }} placeholder="1" />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item label="Statistical Weight" name="statisticalWeight">
                                        <InputNumber style={{ width: '100%' }} step={0.1} placeholder="1.0" />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Form.Item name="isPreSelected" valuePropName="checked">
                                <Checkbox>Pre-selected</Checkbox>
                            </Form.Item>
                        </>
                    )}
                </Form>
            </Modal>

            {/* Save Flow Modal */}
            <Modal
                title="Save Questionnaire Flow"
                open={isSaveModalOpen}
                onOk={handleSaveModalOk}
                onCancel={() => setIsSaveModalOpen(false)}
                width={600}
                confirmLoading={isSaving}
                maskClosable={!isSaving}
                closable={!isSaving}
                okButtonProps={{ disabled: isSaving }}
                cancelButtonProps={{ disabled: isSaving }}
            >
                <Form form={saveForm} layout="vertical">
                    <Form.Item label="Questionnaire Type">
                        <Select
                            value={isNewQuestionnaireType ? 'new' : 'existing'}
                            onChange={(val) => setIsNewQuestionnaireType(val === 'new')}
                        >
                            <Select.Option value="existing">Select Existing</Select.Option>
                            <Select.Option value="new">Create New</Select.Option>
                        </Select>
                    </Form.Item>

                    {isNewQuestionnaireType ? (
                        <>
                            <Form.Item label="Type Name" name="newQuestionnaireTypeName" rules={[{ required: true }]}>
                                <Input placeholder="e.g., Veliki upitnik" />
                            </Form.Item>
                            <Form.Item label="Type Code" name="questionnaireTypeCode">
                                <Input placeholder="e.g., VELIKI" />
                            </Form.Item>
                        </>
                    ) : (
                        <Form.Item label="Select Type" name="existingQuestionnaireTypeID" rules={[{ required: true }]}>
                            <Select
                                placeholder="Choose questionnaire type"
                                onChange={(val) => loadReferencedTables(val)}
                            >
                                {questionnaireTypes.map(qt => (
                                    <Select.Option key={qt.questionnaireTypeID} value={qt.questionnaireTypeID}>
                                        {qt.name} ({qt.code})
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                    )}

                    <Form.Item noStyle shouldUpdate={(prev, curr) => prev.existingQuestionnaireTypeID !== curr.existingQuestionnaireTypeID || isNewQuestionnaireType}>
                        {() => !isNewQuestionnaireType && saveForm.getFieldValue('existingQuestionnaireTypeID') && (
                            <Form.Item name="isUpdate" valuePropName="checked" style={{ marginBottom: '24px' }}>
                                <Checkbox>
                                    <span style={{ fontWeight: 'bold', color: '#fa8c16' }}>
                                        Overwrite existing flow logic for this type
                                    </span>
                                    <br />
                                    <small style={{ color: '#8c8c8c' }}>
                                        This will replace the current question structure with your new design.
                                    </small>
                                </Checkbox>
                            </Form.Item>
                        )}
                    </Form.Item>

                    <Form.Item label="Identificator Type">
                        <Select
                            value={isNewIdType ? 'new' : 'existing'}
                            onChange={(val) => setIsNewIdType(val === 'new')}
                        >
                            <Select.Option value="existing">Select Existing</Select.Option>
                            <Select.Option value="new">Create New</Select.Option>
                        </Select>
                    </Form.Item>

                    {isNewIdType ? (
                        <Form.Item label="Identificator Name" name="newIdentificatorTypeName" rules={[{ required: true }]}>
                            <Input placeholder="e.g., Location ID" />
                        </Form.Item>
                    ) : (
                        <Form.Item label="Select Identificator Type" name="existingIdentificatorTypeID" rules={[{ required: true }]}>
                            <Select placeholder="Choose identificator type">
                                {questionnaireIdTypes.map(it => (
                                    <Select.Option key={it.questionnaireIdentificatorTypeID} value={it.questionnaireIdentificatorTypeID}>
                                        {it.name}
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                    )}
                </Form>
            </Modal>
            {/* Matrix Editor Modal */}
            {selectedNode && (
                <MatrixEditor
                    visible={isMatrixEditorOpen}
                    onClose={() => setIsMatrixEditorOpen(false)}
                    questionId={parseInt(selectedNode.id.split('-')[0]) || 0}
                    initialMatrix={currentMatrix}
                    onSaveSuccess={handleMatrixSaveSuccess}
                />
            )}
        </div>
    );
};

const FlowBuilderPage = () => {
    return (
        <ReactFlowProvider>
            <FlowBuilderPageContent />
        </ReactFlowProvider>
    );
};

export default FlowBuilderPage;
