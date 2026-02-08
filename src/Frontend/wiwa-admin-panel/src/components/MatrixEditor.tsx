
import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, Table, Space, message, Tabs, Alert, Popconfirm, Row, Col } from 'antd';
import { MinusCircleOutlined, PlusOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import type { MatrixDto } from '../types/flow';
import { flowService } from '../services/flowApiService';

interface MatrixEditorProps {
    visible: boolean;
    onClose: () => void;
    questionId: number;
    initialMatrix?: MatrixDto | null;
    onSaveSuccess: (matrix: MatrixDto) => void;
}

const MatrixEditor: React.FC<MatrixEditorProps> = ({ visible, onClose, questionId, initialMatrix, onSaveSuccess }) => {
    const [form] = Form.useForm();
    const [activeTab, setActiveTab] = useState('properties');
    const [keyColumns, setKeyColumns] = useState<string[]>([]);
    const [valueColumns, setValueColumns] = useState<string[]>([]);
    const [dataRows, setDataRows] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (visible) {
            if (initialMatrix) {
                form.setFieldsValue({
                    matrixName: initialMatrix.matrixName,
                });
                setKeyColumns(initialMatrix.definition?.keyColumns || []);
                setValueColumns(initialMatrix.definition?.valueColumns || []);
                // Add unique keys to rows for Table component
                const rows = (initialMatrix.data || []).map((row, index) => ({ ...row, key: index.toString() }));
                setDataRows(rows);
            } else {
                form.resetFields();
                setKeyColumns(['Key1']);
                setValueColumns(['Value1']);
                setDataRows([]);
            }
        }
    }, [visible, initialMatrix, form]);

    const handleAddKeyColumn = () => {
        setKeyColumns([...keyColumns, `Key${keyColumns.length + 1}`]);
    };

    const handleRemoveKeyColumn = (index: number) => {
        const newCols = [...keyColumns];
        if (newCols.length > 1) {
            newCols.splice(index, 1);
            setKeyColumns(newCols);
        } else {
            message.warning('At least one key column is required.');
        }
    };

    const handleKeyColumnChange = (index: number, val: string) => {
        const newCols = [...keyColumns];
        newCols[index] = val;
        setKeyColumns(newCols);
    };

    const handleAddValueColumn = () => {
        setValueColumns([...valueColumns, `Value${valueColumns.length + 1}`]);
    };

    const handleRemoveValueColumn = (index: number) => {
        const newCols = [...valueColumns];
        if (newCols.length > 1) {
            newCols.splice(index, 1);
            setValueColumns(newCols);
        } else {
            message.warning('At least one value column is required.');
        }
    };

    const handleValueColumnChange = (index: number, val: string) => {
        const newCols = [...valueColumns];
        newCols[index] = val;
        setValueColumns(newCols);
    };

    const handleAddRow = () => {
        const newRow: any = { key: Date.now().toString() };
        [...keyColumns, ...valueColumns].forEach(col => {
            newRow[col] = '';
        });
        setDataRows([...dataRows, newRow]);
    };

    const handleRowChange = (key: string, col: string, val: string) => {
        const newData = [...dataRows];
        const index = newData.findIndex(item => item.key === key);
        if (index > -1) {
            const item = { ...newData[index] };
            item[col] = val;
            newData[index] = item;
            setDataRows(newData);
        }
    };

    const handleDeleteRow = (key: string) => {
        setDataRows(dataRows.filter(item => item.key !== key));
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setIsSaving(true);

            // Clean data rows (remove 'key')
            const cleanData = dataRows.map(({ key, ...rest }) => {
                const newRow: any = {};
                Object.keys(rest).forEach(k => {
                    const val = rest[k];
                    // Simple heuristic: if it looks like a number, save as number.
                    // Be careful with IDs that look like numbers but are used as strings, 
                    // but usually matrix lookups are type specific. 
                    // For safety, maybe keep as string if it was input as string? 
                    // But backend expects types to match if it's strictly typed.
                    // Given previous SQL fixes used ints, let's try to convert if valid number.
                    if (typeof val === 'string' && val.trim() !== '' && !isNaN(Number(val))) {
                        newRow[k] = Number(val);
                    } else {
                        newRow[k] = val;
                    }
                });
                return newRow;
            });

            const matrixDto: MatrixDto = {
                matrixName: values.matrixName,
                definition: {
                    keyColumns: keyColumns,
                    valueColumns: valueColumns
                },
                data: cleanData
            };


            // Call API to save ONLY if we have a valid Question ID (persisted node)
            if (questionId > 0) {
                await flowService.saveMatrix(questionId, matrixDto);
                message.success('Matrix saved to database');
            } else {
                message.info('Matrix configuration updated locally. Save the Flow to persist.');
            }

            onSaveSuccess(matrixDto); // Callback to update parent state (e.g. formula field)
            onClose();
        } catch (error) {
            console.error(error);
            message.error('Failed to save matrix');
        } finally {
            setIsSaving(false);
        }
    };

    // Columns for AntD Table
    const tableColumnsDef = [
        ...keyColumns.map(col => ({
            title: <span style={{ color: '#1890ff' }}>{col} (Key)</span>,
            dataIndex: col,
            key: col,
            render: (text: any, record: any) => (
                <Input
                    value={text}
                    onChange={e => handleRowChange(record.key, col, e.target.value)}
                    style={{ borderColor: '#91d5ff' }}
                />
            )
        })),
        ...valueColumns.map(col => ({
            title: <span style={{ color: '#52c41a' }}>{col} (Value)</span>,
            dataIndex: col,
            key: col,
            render: (text: any, record: any) => (
                <Input
                    value={text}
                    onChange={e => handleRowChange(record.key, col, e.target.value)}
                    style={{ borderColor: '#b7eb8f' }}
                />
            )
        })),
        {
            title: 'Action',
            key: 'action',
            render: (_: any, record: any) => (
                <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDeleteRow(record.key)}
                />
            )
        }
    ];

    return (
        <Modal
            title="Matrix Editor"
            open={visible}
            onCancel={onClose}
            width={1200}
            maskClosable={false}
            footer={[
                <Button key="cancel" onClick={onClose}>Cancel</Button>,
                <Button key="save" type="primary" icon={<SaveOutlined />} loading={isSaving} onClick={handleSave}>
                    Save Matrix
                </Button>
            ]}
        >
            <Form form={form} layout="vertical">
                <Form.Item name="matrixName" label="Matrix Name (Storage Object Name)" rules={[{ required: true }]}>
                    <Input placeholder="e.g. BuildingCategoryMatrix" />
                </Form.Item>
            </Form>

            <Tabs activeKey={activeTab} onChange={setActiveTab}>
                <Tabs.TabPane tab="Structure (Columns)" key="properties">
                    <Alert message="Define the columns for your matrix. Keys are input variables (e.g. WallMaterial), Values are output variables (e.g. BuildingCategory)." type="info" showIcon style={{ marginBottom: 16 }} />

                    <Row gutter={24}>
                        <Col span={12}>
                            <h4 style={{ color: '#1890ff' }}>Key Columns (Inputs)</h4>
                            {keyColumns.map((col, idx) => (
                                <div key={idx} style={{ display: 'flex', marginBottom: 8 }}>
                                    <Input value={col} onChange={e => handleKeyColumnChange(idx, e.target.value)} />
                                    <Button icon={<DeleteOutlined />} danger onClick={() => handleRemoveKeyColumn(idx)} style={{ marginLeft: 8 }} />
                                </div>
                            ))}
                            <Button type="dashed" onClick={handleAddKeyColumn} icon={<PlusOutlined />} block style={{ marginTop: 8 }}>
                                Add Key Column
                            </Button>
                        </Col>
                        <Col span={12}>
                            <h4 style={{ color: '#52c41a' }}>Value Columns (Outputs)</h4>
                            {valueColumns.map((col, idx) => (
                                <div key={idx} style={{ display: 'flex', marginBottom: 8 }}>
                                    <Input value={col} onChange={e => handleValueColumnChange(idx, e.target.value)} />
                                    <Button icon={<DeleteOutlined />} danger onClick={() => handleRemoveValueColumn(idx)} style={{ marginLeft: 8 }} />
                                </div>
                            ))}
                            <Button type="dashed" onClick={handleAddValueColumn} icon={<PlusOutlined />} block style={{ marginTop: 8 }}>
                                Add Value Column
                            </Button>
                        </Col>
                    </Row>
                </Tabs.TabPane>
                <Tabs.TabPane tab="Data (Rows)" key="data">
                    <Space style={{ marginBottom: 16 }}>
                        <Button type="primary" onClick={handleAddRow} icon={<PlusOutlined />}>
                            Add Row
                        </Button>
                        <Button onClick={() => setDataRows([])} danger>
                            Clear All Data
                        </Button>
                    </Space>
                    <Table
                        dataSource={dataRows}
                        columns={tableColumnsDef}
                        pagination={{ pageSize: 50 }}
                        size="small"
                        scroll={{ y: 500 }}
                    />
                </Tabs.TabPane>
            </Tabs>
        </Modal>
    );
};

export default MatrixEditor;
