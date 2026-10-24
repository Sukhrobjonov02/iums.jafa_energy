import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Space, Tag, message, Button, Input, Row, Col, Statistic, Typography, Progress, Modal, Descriptions, Switch, Tooltip } from 'antd';
import {
  ThunderboltOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  ReloadOutlined,
  SearchOutlined,
  ThunderboltFilled,
  SafetyOutlined,
  InfoCircleOutlined,
  DatabaseOutlined,
  CloudOutlined,
} from '@ant-design/icons';
import solisCloudService from '../../../service/soliscloud.service';
import { toKw, toKwh } from '../../../helpers/solis-units';
import { solisWarrantyStatus } from '../../../helpers/solis-fields';
import DataAsOf from '../../../components/DataAsOf';
import type { Inverter } from '../../../types/soliscloud';

const { Title, Text } = Typography;

// Handle both string and number values from API/DB (decimal columns arrive as strings today)
const parseValue = (val: any): number => {
  if (typeof val === 'string') return parseFloat(val) || 0;
  return val || 0;
};

// DB row (SolisCloudInverter entity) uses eToday/eTotal/ratedPower; the table columns read the vendor keys etoday/etotal/power.
const normalizeDbInverter = (i: any): Inverter => ({
  ...i,
  pac: parseValue(i.pac),
  etoday: parseValue(i.eToday),
  etotal: parseValue(i.eTotal),
  power: i.ratedPower == null ? undefined : parseValue(i.ratedPower),
  // null from the DB must become undefined so the SOC column shows '-' for non-battery inverters
  batteryCapacitySoc: i.batteryCapacitySoc == null ? undefined : parseValue(i.batteryCapacitySoc),
  state: Number(i.state),
});

// Vendor list rows: each figure carries its own unit (etotal 4.56 + etotalStr "MWh").
const normalizeLiveInverter = (i: any): Inverter => ({
  ...i,
  pac: toKw(i.pac, i.pacStr),
  etoday: toKwh(i.etoday, i.etodayStr),
  etotal: toKwh(i.etotal, i.etotalStr),
  power: i.power == null ? undefined : toKw(i.power, i.powerStr),
  batteryCapacitySoc: i.batteryCapacitySoc == null || i.batteryCapacitySoc === '' ? undefined : parseValue(i.batteryCapacitySoc),
  state: Number(i.state),
});

const WARRANTY_TAG = {
  active: { color: 'success', text: 'Active' },
  expired: { color: 'error', text: 'Expired' },
  unknown: { color: 'default', text: 'Unknown' },
} as const;

const SolisCloudInverters: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [inverters, setInverters] = useState<Inverter[]>([]);
  const [filteredInverters, setFilteredInverters] = useState<Inverter[]>([]);
  const [searchText, setSearchText] = useState('');
  const [warrantyData, setWarrantyData] = useState<Map<string, any>>(new Map());
  const [warrantyLoading, setWarrantyLoading] = useState(false);
  const [selectedWarranty, setSelectedWarranty] = useState<any>(null);
  const [isWarrantyModalVisible, setIsWarrantyModalVisible] = useState(false);
  const [useDbSource, setUseDbSource] = useState(true);
  // Each station's own power. In a parallel group the master inverter reports the whole group's
  // power as its pac (OOO Spaytch X: 46.3 kW on the master, 45.3 kW for the station), so summing
  // inverters counts the group twice.
  const [stationPower, setStationPower] = useState<number | null>(null);

  useEffect(() => {
    fetchInverters();
  }, [useDbSource]);

  useEffect(() => {
    filterInverters();
  }, [searchText, inverters]);

  const fetchInverters = async () => {
    try {
      setLoading(true);

      // The whole fleet is loaded and paged in the table: the totals above it used to be summed
      // over the visible page only (20 of 26 inverters).
      if (useDbSource) {
        const response = await solisCloudService.getDbInverters({ page: 1, limit: 1000 });
        const rows: any[] = response.data?.records || [];
        const records = rows.map(normalizeDbInverter);
        setInverters(records);
        setFilteredInverters(records);
        const stations = await solisCloudService.getDbStations({ page: 1, limit: 100 });
        const stationRows: any[] = stations.data?.records || stations.data || [];
        setStationPower(stationRows.reduce((sum, st) => sum + parseValue(st.pac), 0));
        // The stored list carries each inverter's warranty from the synced vendor detail.
        setWarrantyData(new Map(rows.filter((r) => r.warranty).map((r) => [r.sn, r.warranty])));
      } else {
        const records: Inverter[] = [];
        for (let pageNo = 1; pageNo <= 20; pageNo++) {
          const response = await solisCloudService.getInverterList({ pageNo, pageSize: 100 });
          records.push(...(response.page?.records || []).map(normalizeLiveInverter));
          if (records.length >= Number(response.page?.total || 0) || !response.page?.records?.length) break;
        }
        setInverters(records);
        setFilteredInverters(records);
        const stations = await solisCloudService.getStationList({ pageNo: 1, pageSize: 100 });
        setStationPower((stations.records || []).reduce((sum: number, st: any) => sum + toKw(st.power, st.powerStr), 0));
        fetchWarrantyData();
      }
    } catch (error: any) {
      message.error(error?.response?.data?.msg || error?.response?.data?.message || 'Failed to fetch inverters');
    } finally {
      setLoading(false);
    }
  };

  const fetchWarrantyData = async () => {
    try {
      setWarrantyLoading(true);
      const response = await solisCloudService.getInverterWarranty({
        pageNo: 1,
        pageSize: 100,
      });

      const warrantyMap = new Map();
      response.records?.forEach((warranty: any) => {
        warrantyMap.set(warranty.sn, warranty);
      });
      setWarrantyData(warrantyMap);
    } catch (error: any) {
      console.error('Failed to fetch warranty data:', error);
    } finally {
      setWarrantyLoading(false);
    }
  };

  const showWarrantyDetails = (sn: string) => {
    const warranty = warrantyData.get(sn);
    if (warranty) {
      setSelectedWarranty(warranty);
      setIsWarrantyModalVisible(true);
    } else {
      message.info('No warranty information available for this inverter');
    }
  };

  const filterInverters = () => {
    if (!searchText) {
      setFilteredInverters(inverters);
      return;
    }

    const filtered = inverters.filter(inverter =>
      inverter.sn?.toLowerCase().includes(searchText.toLowerCase()) ||
      inverter.stationName?.toLowerCase().includes(searchText.toLowerCase()) ||
      inverter.model?.toLowerCase().includes(searchText.toLowerCase())
    );
    setFilteredInverters(filtered);
  };

  const getStateTag = (state: number) => {
    switch (state) {
      case 1:
        return <Tag icon={<CheckCircleOutlined />} color="success">Online</Tag>;
      case 2:
        return <Tag icon={<CloseCircleOutlined />} color="error">Offline</Tag>;
      case 3:
        return <Tag icon={<WarningOutlined />} color="warning">Alarm</Tag>;
      default:
        return <Tag>Unknown</Tag>;
    }
  };

  const columns = [
    {
      title: 'Serial Number',
      dataIndex: 'sn',
      key: 'sn',
      width: 180,
      render: (text: string) => <Text code strong>{text}</Text>,
    },
    {
      title: 'Station',
      dataIndex: 'stationName',
      key: 'stationName',
      width: 180,
    },
    {
      title: 'Model',
      dataIndex: 'model',
      key: 'model',
      width: 150,
      render: (text: string) => text || '-',
    },
    {
      title: 'Status',
      dataIndex: 'state',
      key: 'state',
      width: 120,
      render: (state: number) => getStateTag(state),
      filters: [
        { text: 'Online', value: 1 },
        { text: 'Offline', value: 2 },
        { text: 'Alarm', value: 3 },
      ],
      onFilter: (value: any, record: Inverter) => record.state === value,
    },
    {
      title: 'Power',
      dataIndex: 'power',
      key: 'power',
      width: 100,
      render: (power: any) => `${parseValue(power)} kW`,
      sorter: (a: Inverter, b: Inverter) => parseValue(a.power) - parseValue(b.power),
    },
    {
      title: 'Current Output',
      dataIndex: 'pac',
      key: 'pac',
      width: 130,
      render: (pac: any) => (
        <Space>
          <ThunderboltOutlined style={{ color: '#faad14' }} />
          <Text>{parseValue(pac).toFixed(2)} kW</Text>
        </Space>
      ),
      sorter: (a: Inverter, b: Inverter) => parseValue(a.pac) - parseValue(b.pac),
    },
    {
      title: "Today's Energy",
      dataIndex: 'etoday',
      key: 'etoday',
      width: 130,
      render: (etoday: any) => `${parseValue(etoday).toFixed(2)} kWh`,
      sorter: (a: Inverter, b: Inverter) => parseValue(a.etoday) - parseValue(b.etoday),
    },
    {
      title: 'Total Energy',
      dataIndex: 'etotal',
      key: 'etotal',
      width: 130,
      render: (etotal: any) => `${parseValue(etotal).toFixed(2)} kWh`,
      sorter: (a: Inverter, b: Inverter) => parseValue(a.etotal) - parseValue(b.etotal),
    },
    {
      title: 'Warranty',
      dataIndex: 'sn',
      key: 'warranty',
      width: 140,
      render: (sn: string) => {
        const warranty = warrantyData.get(sn);
        if (!warranty) return <Text type="secondary">-</Text>;

        const tag = WARRANTY_TAG[solisWarrantyStatus(warranty.shelfState, warranty.shelfEndTime)];
        return (
          <Space direction="vertical" size="small">
            <Tag color={tag.color} icon={<SafetyOutlined />}>
              {tag.text}
            </Tag>
            <Button
              type="link"
              size="small"
              icon={<InfoCircleOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                showWarrantyDetails(sn);
              }}
            >
              Details
            </Button>
          </Space>
        );
      },
    },
    {
      title: 'Battery SOC',
      dataIndex: 'batteryCapacitySoc',
      key: 'batteryCapacitySoc',
      width: 150,
      render: (soc: number) => soc !== undefined ? (
        <Space>
          <Progress
            type="circle"
            percent={soc}
            size={40}
            strokeColor={soc > 80 ? '#52c41a' : soc > 50 ? '#faad14' : '#ff4d4f'}
          />
          <Text>{soc}%</Text>
        </Space>
      ) : '-',
      sorter: (a: Inverter, b: Inverter) => parseValue(a.batteryCapacitySoc) - parseValue(b.batteryCapacitySoc),
    },
  ];

  const onlineInverters = inverters.filter(i => i.state === 1).length;
  const offlineInverters = inverters.filter(i => i.state === 2).length;
  const alarmInverters = inverters.filter(i => i.state === 3).length;

  // Newest sync time over the loaded rows; vendor rows carry no lastSyncedAt so this stays null in live mode
  const lastSyncedAt = inverters.reduce<string | null>((max, i: any) => {
    const ts = i.lastSyncedAt;
    if (!ts) return max;
    return !max || Date.parse(ts) > Date.parse(max) ? ts : max;
  }, null);

  const totalPower = stationPower ?? inverters.reduce((sum, i) => sum + parseValue(i.pac), 0);
  const totalEnergyToday = inverters.reduce((sum, i) => sum + parseValue(i.etoday), 0);
  const totalEnergyAll = inverters.reduce((sum, i) => sum + parseValue(i.etotal), 0);
  // Only inverters that report a battery; the rest would pull the average towards 0.
  const withBattery = inverters.filter((i) => i.batteryCapacitySoc !== undefined && i.batteryCapacitySoc !== null);
  const avgBatterySoc = withBattery.length > 0
    ? withBattery.reduce((sum, i) => sum + parseValue(i.batteryCapacitySoc), 0) / withBattery.length
    : undefined;

  return (
    <div>
      {/* Header */}
      <Card
        style={{
          marginBottom: 24,

          border: 'none',
        }}
      >
        <Row justify="space-between" align="middle">
          <Col>
            <Space direction="vertical" size="small">
              <Space>
                <ThunderboltOutlined style={{ fontSize: 32 }} />
                <Title level={2} style={{ margin: 0 }}>
                  Solar Inverters
                </Title>
              </Space>
              <Text style={{ color: 'rgba(0,0,0,0.65)' }}>
                Monitor and manage your solar inverters and battery systems
              </Text>
            </Space>
          </Col>
          <Col>
            <Space size="large">
              {useDbSource && <DataAsOf label="Synced" timestamp={lastSyncedAt} />}
              <Tooltip title={useDbSource ? "Switch to live SolisCloud API" : "Switch to stored data (synced every 5 min)"}>
                <Space>
                  <CloudOutlined style={{ color: useDbSource ? '#bfbfbf' : '#1890ff' }} />
                  <Switch
                    checked={useDbSource}
                    onChange={setUseDbSource}
                    checkedChildren={<DatabaseOutlined />}
                    unCheckedChildren={<CloudOutlined />}
                  />
                  <DatabaseOutlined style={{ color: useDbSource ? '#1890ff' : '#bfbfbf' }} />
                </Space>
              </Tooltip>
              <Tag color={useDbSource ? 'blue' : 'green'}>
                {useDbSource ? 'Stored data' : 'Live SolisCloud API'}
              </Tag>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Inverters"
              value={inverters.length}
              prefix={<ThunderboltOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
            <Progress
              percent={onlineInverters > 0 ? Math.round((onlineInverters / inverters.length) * 100) : 0}
              strokeColor="#52c41a"
              showInfo={false}
              size="small"
              style={{ marginTop: 8 }}
            />
            <div style={{ marginTop: 4, fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>
              {onlineInverters} online, {offlineInverters} offline, {alarmInverters} alarm
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Current Power"
              value={totalPower.toFixed(2)}
              suffix="kW"
              prefix={<ThunderboltOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Today's Energy"
              value={totalEnergyToday.toFixed(2)}
              suffix="kWh"
              prefix={<ThunderboltOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={`Avg Battery SOC${withBattery.length ? ` (${withBattery.length} with battery)` : ''}`}
              value={avgBatterySoc !== undefined ? avgBatterySoc.toFixed(0) : '-'}
              suffix={avgBatterySoc !== undefined ? '%' : undefined}
              prefix={<ThunderboltFilled style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Inverters Table */}
      <Card
        title={
          <Space>
            <ThunderboltOutlined />
            <span>Inverter List</span>
          </Space>
        }
        extra={
          <Space>
            <Input
              placeholder="Search by SN, station or model"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 280 }}
              allowClear
            />
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchInverters}
              loading={loading}
            >
              Refresh
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={filteredInverters}
          rowKey="id"
          loading={loading}
          pagination={{
            defaultPageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} inverters`,
          }}
          scroll={{ x: 1400 }}
          onRow={(record) => ({
            onClick: () => navigate(`/admin/soliscloud/inverters/${record.id}`),
            style: { cursor: 'pointer' },
          })}
        />
      </Card>

      {/* Warranty Details Modal */}
      <Modal
        title={
          <Space>
            <SafetyOutlined />
            Inverter Warranty Information
          </Space>
        }
        open={isWarrantyModalVisible}
        onCancel={() => setIsWarrantyModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsWarrantyModalVisible(false)}>
            Close
          </Button>
        ]}
        width={600}
      >
        {selectedWarranty && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="Serial Number">
              <Text code>{selectedWarranty.sn}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Warranty Status">
              {(() => {
                const tag = WARRANTY_TAG[solisWarrantyStatus(selectedWarranty.shelfState, selectedWarranty.shelfEndTime)];
                return <Tag color={tag.color} icon={<SafetyOutlined />}>{tag.text}</Tag>;
              })()}
            </Descriptions.Item>
            <Descriptions.Item label="Warranty Start Date">
              {selectedWarranty.shelfBeginTime ? new Date(selectedWarranty.shelfBeginTime).toLocaleDateString() : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Warranty End Date">
              {selectedWarranty.shelfEndTime ? new Date(selectedWarranty.shelfEndTime).toLocaleDateString() : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Warranty Duration">
              {selectedWarranty.shelfTime ? `${Math.floor(selectedWarranty.shelfTime / (1000 * 60 * 60 * 24 * 365))} years` : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Warranty Type">
              {selectedWarranty.shelfWarrantyType || 'Standard'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default SolisCloudInverters;
