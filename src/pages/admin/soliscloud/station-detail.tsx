import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Space, Tag, message, Button, Row, Col, Statistic, Typography, Spin, List, Avatar, Modal, Form, Input, InputNumber, Switch } from 'antd';
import {
  HomeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  ArrowLeftOutlined,
  SyncOutlined,
  ThunderboltOutlined,
  EnvironmentOutlined,
  CalendarOutlined,
  TeamOutlined,
  DashboardOutlined,
  BulbOutlined,
  LineChartOutlined,
  WifiOutlined,
  SignalFilled,
  EditOutlined,
  PlusOutlined,
  LinkOutlined,
  DatabaseOutlined,
  CloudOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { formatSolisTime, toKw, toKwh } from '../../../helpers/solis-units';
import { solisStationType } from '../../../helpers/solis-fields';
import solisCloudService from '../../../service/soliscloud.service';
import DataAsOf from '../../../components/DataAsOf';
import type { StationDetail, InverterDetail, CollectorDetail } from '../../../types/soliscloud';
import { withGap } from '../../../components/maintainer/with-gap';
import StationInsightCard from '../../../components/forecast/StationInsightCard';

const { Title, Text } = Typography;

// Handle both string and number values from API/DB (decimal columns arrive as strings today)
const parseValue = (val: any): number => {
  if (typeof val === 'string') return parseFloat(val) || 0;
  return val || 0;
};

const formatTs = (ts: any): string | undefined => (ts ? dayjs(ts).format('YYYY-MM-DD HH:mm:ss') : undefined);

// DB row (SolisCloudStation entity) uses different keys than the vendor detail; map onto the vendor shape the page renders.
const normalizeDbStation = (s: any): StationDetail => ({
  ...s,
  stationName: s.name,
  capacity: parseValue(s.installedCapacity),
  capacityStr: 'kWp',
  cityStr: s.city,
  countryStr: s.country,
  timeZone: s.timezone,
  currencyUnit: s.currency,
  pac: parseValue(s.pac),
  eToday: parseValue(s.eToday),
  eMonth: parseValue(s.eMonth),
  eYear: parseValue(s.eYear),
  eTotal: parseValue(s.eTotal),
  state: Number(s.state),
  updateDate: formatTs(s.lastSyncedAt),
  gridConnectionDate: formatTs(s.gridConnectionDate),
});

// DB row (SolisCloudInverter entity) -> the fields the inverter cards below read (inverterSn, inverterModel, ...)
const normalizeDbInverter = (i: any): InverterDetail => ({
  ...i,
  inverterSn: i.sn,
  inverterModel: i.model,
  pac: parseValue(i.pac),
  eToday: parseValue(i.eToday),
  eTotal: parseValue(i.eTotal),
  // null from the DB must become undefined so the "Battery SOC" line stays hidden for non-battery inverters
  batteryCapacitySoc: i.batteryCapacitySoc == null ? undefined : parseValue(i.batteryCapacitySoc),
  state: Number(i.state),
});

// Vendor station detail: energy and power come with unit strings (monthEnergy 3.371 + "MWh").
const normalizeLiveStation = (d: any): StationDetail => ({
  ...d,
  pac: toKw(d.power, d.powerStr),
  eToday: toKwh(d.dayEnergy, d.dayEnergyStr),
  eMonth: toKwh(d.monthEnergy, d.monthEnergyStr),
  eYear: toKwh(d.yearEnergy, d.yearEnergyStr),
  eTotal: toKwh(d.allEnergy, d.allEnergyStr),
  // The account's language is Chinese, so the country arrives as 乌兹别克斯坦.
  countryStr: d.countryStr === '乌兹别克斯坦' ? 'Uzbekistan' : d.countryStr,
  cityStr: d.cityStr || d.regionStr,
  timeZone: d.timeZoneStr || d.timeZone,
  dataTimestamp: formatSolisTime(d.dataTimestamp),
  updateDate: formatSolisTime(d.updateDate),
  gmtOffset: d.timeZone,
  installDate: formatSolisTime(d.createDate),
  gridConnectionDate: formatSolisTime(d.fisPowerTime ?? d.fisGenerateTime),
  batteryCapacity: toKwh(d.batteryCapacityEnergy, d.batteryCapacityEnergyStr),
  // stationDetailList (what the sync stores) has no addr at all, checked 2026-10-15; the single
  // station detail may.
  address: d.addr || undefined,
});

// Vendor inverterDetailList rows carry the SN as `sn` and the model as `machine`.
const normalizeLiveInverter = (i: any): InverterDetail => ({
  ...i,
  inverterSn: i.sn,
  inverterModel: i.machine || i.model,
  pac: toKw(i.pac, i.pacStr),
  eToday: toKwh(i.eToday, i.eTodayStr),
  eTotal: toKwh(i.eTotal, i.eTotalStr),
});

const StationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<StationDetail | null>(null);
  const [useDbSource, setUseDbSource] = useState(true);
  const [invertersLoading, setInvertersLoading] = useState(false);
  const [inverters, setInverters] = useState<InverterDetail[]>([]);
  const [collectorsLoading, setCollectorsLoading] = useState(false);
  const [collectors, setCollectors] = useState<CollectorDetail[]>([]);
  const [peakPowerToday, setPeakPowerToday] = useState<number | undefined>(undefined);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [isBindCollectorModalVisible, setIsBindCollectorModalVisible] = useState(false);
  const [bindLoading, setBindLoading] = useState(false);
  const [isBindInverterModalVisible, setIsBindInverterModalVisible] = useState(false);
  const [bindInverterLoading, setBindInverterLoading] = useState(false);
  const [form] = Form.useForm();
  const [bindCollectorForm] = Form.useForm();
  const [bindInverterForm] = Form.useForm();

  useEffect(() => {
    if (id) {
      fetchDetail();
      fetchInverters();
      fetchCollectors();
      fetchPeakPower();
    }
  }, [id, useDbSource]);

  // Highest stored 5-minute station power since local midnight. Station readings hold kW.
  const fetchPeakPower = async () => {
    if (!id) return;
    try {
      const response = await solisCloudService.getDbStationReadings(id, {
        startDate: dayjs().startOf('day').toISOString(),
        endDate: dayjs().toISOString(),
        limit: 500,
      });
      const rows: any[] = response.data || response || [];
      setPeakPowerToday(rows.length ? Math.max(...rows.map((r) => parseValue(r.pac))) : undefined);
    } catch {
      setPeakPowerToday(undefined);
    }
  };

  const fetchDetail = async () => {
    if (!id) return;

    try {
      setLoading(true);
      if (useDbSource) {
        const response = await solisCloudService.getDbStation(id);
        const row = response.data || response;
        let station = normalizeDbStation(row);
        // The hourly sync keeps the vendor's full detail; show all of it, with our own row on top.
        if (row?.detail) {
          station = {
            ...normalizeLiveStation(row.detail),
            ...Object.fromEntries(Object.entries(station).filter(([, v]) => v !== undefined && v !== null && v !== '')),
          } as StationDetail;
        }
        // lastSyncedAt is when our sync ran; the newest stored reading is the true data time
        try {
          const latest = await solisCloudService.getDbStationLatestReading(id);
          const ts = latest?.data?.dataTimestamp;
          if (ts) station.dataTimestamp = formatTs(ts);
        } catch {
          // optional; leave dataTimestamp empty
        }
        setDetail(station);
      } else {
        const response = await solisCloudService.getStationDetail({ id });
        setDetail(normalizeLiveStation(response));
      }
    } catch (error: any) {
      message.error(error?.response?.data?.msg || 'Failed to fetch station details');
    } finally {
      setLoading(false);
    }
  };

  const fetchInverters = async () => {
    if (!id) return;

    try {
      setInvertersLoading(true);
      if (useDbSource) {
        const response = await solisCloudService.getDbInverters({ stationId: id, limit: 100 });
        // An inverter the hourly sync stopped seeing has left the vendor account (RES HUB's old
        // unit, gone since March 2026); it is no longer part of the station.
        const current = (response.data?.records || []).filter(
          (i: any) => !i.lastSyncedAt || Date.now() - new Date(i.lastSyncedAt).getTime() < 2 * 86_400_000,
        );
        setInverters(current.map(normalizeDbInverter));
      } else {
        // inverterDetailList ignores stationId and returns the whole account, so filter here.
        const response = await solisCloudService.getInvertersDetailList({
          stationId: id,
          pageNo: 1,
          pageSize: 100,
        });
        setInverters(
          (response.records || []).filter((i: any) => String(i.stationId) === String(id)).map(normalizeLiveInverter),
        );
      }
    } catch (error: any) {
      console.error('Failed to fetch inverters:', error);
    } finally {
      setInvertersLoading(false);
    }
  };

  // Collectors come from our own table: the vendor has no per-station collector list.
  const fetchCollectors = async () => {
    if (!id) return;

    try {
      setCollectorsLoading(true);
      const response = await solisCloudService.getDbCollectors({ stationId: id, limit: 100 });
      const rows: any[] = response.data?.records || response.records || [];
      setCollectors(
        rows
          .filter((c) => String(c.stationId) === String(id))
          .map((c) => ({ ...c, state: Number(c.state), signalStrength: c.rssiLevel != null ? Number(c.rssiLevel) * 20 : undefined })),
      );
    } catch (error: any) {
      console.error('Failed to fetch collectors:', error);
    } finally {
      setCollectorsLoading(false);
    }
  };

  const handleEditStation = async (values: any) => {
    if (!id) return;
    try {
      setEditLoading(true);
      await solisCloudService.updateStation({
        id,
        stationName: values.stationName,
        capacity: values.capacity,
        address: values.address,
      });
      message.success('Station updated successfully!');
      setIsEditModalVisible(false);
      fetchDetail();
    } catch (error: any) {
      message.error(error?.response?.data?.msg || 'Failed to update station');
    } finally {
      setEditLoading(false);
    }
  };

  const openEditModal = () => {
    form.setFieldsValue({
      stationName: detail?.stationName,
      capacity: detail?.capacity,
      address: detail?.address,
    });
    setIsEditModalVisible(true);
  };

  const handleBindCollector = async (values: any) => {
    if (!id) return;
    try {
      setBindLoading(true);
      await solisCloudService.bindCollector({
        stationId: id,
        collectorSn: values.collectorSn,
      });
      message.success('Collector bound to station successfully!');
      setIsBindCollectorModalVisible(false);
      bindCollectorForm.resetFields();
      fetchDetail();
      fetchCollectors();
    } catch (error: any) {
      message.error(error?.response?.data?.msg || 'Failed to bind collector');
    } finally {
      setBindLoading(false);
    }
  };

  const handleBindInverter = async (values: any) => {
    if (!id) return;
    try {
      setBindInverterLoading(true);
      await solisCloudService.bindInverter({
        stationId: id,
        inverterSn: values.inverterSn,
      });
      message.success('Inverter bound to station successfully!');
      setIsBindInverterModalVisible(false);
      bindInverterForm.resetFields();
      fetchDetail();
      fetchInverters();
    } catch (error: any) {
      message.error(error?.response?.data?.msg || 'Failed to bind inverter');
    } finally {
      setBindInverterLoading(false);
    }
  };

  const getStateTag = (state?: number) => {
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

  const getStationTypeTag = (type?: unknown) => {
    const label = solisStationType(type);
    return label ? <Tag color="blue">{label}</Tag> : <Tag>Unknown</Tag>;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Spin size="large">
          <div style={{ paddingTop: 50 }}>Loading station details...</div>
        </Spin>
      </div>
    );
  }

  if (!detail) {
    return (
      <Card>
        <Text>No station details found</Text>
      </Card>
    );
  }

  return (
    <div>
      {/* Header */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col flex="auto">
            <Space direction="vertical" size={4}>
              <Space size="middle">
                <Button
                  icon={<ArrowLeftOutlined />}
                  onClick={() => navigate('/admin/soliscloud/stations')}
                  size="large"
                >
                  Back
                </Button>
                <Space size="small">
                  <HomeOutlined style={{ fontSize: 28 }} />
                  <Title level={2} style={{ margin: 0 }}>
                    {detail.stationName || 'Station Details'}
                  </Title>
                </Space>
              </Space>
              <Space style={{ paddingLeft: 8 }}>
                <EnvironmentOutlined style={{ color: 'rgba(0,0,0,0.45)' }} />
                <Text type="secondary">
                  {detail.cityStr || 'Location'} {detail.countryStr ? `• ${detail.countryStr}` : ''}
                </Text>
              </Space>
            </Space>
          </Col>
          <Col>
            <Space size="middle">
              <Space>
                <Switch
                  checked={useDbSource}
                  onChange={setUseDbSource}
                  checkedChildren={<DatabaseOutlined />}
                  unCheckedChildren={<CloudOutlined />}
                />
                <Tag color={useDbSource ? 'blue' : 'green'}>
                  {useDbSource ? 'Stored data' : 'Live SolisCloud API'}
                </Tag>
                {useDbSource && <DataAsOf label="Synced" timestamp={detail.lastSyncedAt} />}
              </Space>
              <Button
                icon={<EditOutlined />}
                onClick={openEditModal}
                size="large"
              >
                Edit
              </Button>
              <Button
                icon={<LineChartOutlined />}
                onClick={() => navigate(`/admin/soliscloud/stations/${id}/charts`)}
                size="large"
              >
                View Charts
              </Button>
              <Button
                icon={<SyncOutlined />}
                onClick={fetchDetail}
                loading={loading}
                size="large"
              >
                Refresh
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Key Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Status"
              // An empty value still rendered "0" after the tag ("Online0").
              valueRender={() => getStateTag(detail.state)}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Capacity"
              value={parseValue(detail.capacity).toFixed(2)}
              suffix="kWp"
              prefix={<DashboardOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Current Power"
              value={parseValue(detail.pac).toFixed(2)}
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
              value={parseValue(detail.eToday).toFixed(2)}
              suffix="kWh"
              prefix={<BulbOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Basic Information */}
      <Card title="Station Information" style={{ marginBottom: 16 }}>
        <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }}>
          <Descriptions.Item label="Station ID">{detail.id || '-'}</Descriptions.Item>
          <Descriptions.Item label="Station Name">{detail.stationName || '-'}</Descriptions.Item>
          <Descriptions.Item label="Station Type">{getStationTypeTag(detail.stationTypeNew)}</Descriptions.Item>
          <Descriptions.Item label="Total Capacity">{parseValue(detail.capacity) > 0 ? `${parseValue(detail.capacity).toFixed(2)} kWp` : '-'}</Descriptions.Item>
          <Descriptions.Item label="Battery Capacity">{parseValue(detail.batteryCapacity) > 0 ? `${parseValue(detail.batteryCapacity).toFixed(2)} kWh` : '-'}</Descriptions.Item>
          <Descriptions.Item label="Status">{getStateTag(detail.state)}</Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Location */}
      <Card title={<Space><EnvironmentOutlined />Location & Installation</Space>} style={{ marginBottom: 16 }}>
        <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }}>
          <Descriptions.Item label="Country">{detail.countryStr || '-'}</Descriptions.Item>
          <Descriptions.Item label="City">{detail.cityStr || '-'}</Descriptions.Item>
          <Descriptions.Item label="Address">{detail.address || '-'}</Descriptions.Item>
          <Descriptions.Item label="Timezone">{detail.timeZone || '-'}</Descriptions.Item>
          <Descriptions.Item label="GMT Offset">{detail.gmtOffset !== undefined ? `GMT ${detail.gmtOffset > 0 ? '+' : ''}${detail.gmtOffset}` : '-'}</Descriptions.Item>
          <Descriptions.Item label="Currency">{detail.currencyUnit || '-'}</Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Energy Production */}
      <Card title={<Space><ThunderboltOutlined />Energy Production</Space>} style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={8}>
            <Card size="small" style={{ background: '#f6ffed', borderColor: '#b7eb8f' }}>
              <Statistic
                title="Today"
                value={parseValue(detail.eToday).toFixed(2)}
                suffix="kWh"
                valueStyle={{ color: '#52c41a', fontSize: 20 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Card size="small" style={{ background: '#e6f7ff', borderColor: '#91d5ff' }}>
              <Statistic
                title="This Month"
                value={parseValue(detail.eMonth).toFixed(2)}
                suffix="kWh"
                valueStyle={{ color: '#1890ff', fontSize: 20 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Card size="small" style={{ background: '#fff7e6', borderColor: '#ffd591' }}>
              <Statistic
                title="This Year"
                value={parseValue(detail.eYear).toFixed(2)}
                suffix="kWh"
                valueStyle={{ color: '#fa8c16', fontSize: 20 }}
              />
            </Card>
          </Col>
        </Row>
        <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }}>
          <Descriptions.Item label="Total Energy">{parseValue(detail.eTotal) > 0 ? `${parseValue(detail.eTotal).toFixed(2)} kWh` : '-'}</Descriptions.Item>
          <Descriptions.Item label="Current Power">{parseValue(detail.pac) > 0 ? `${parseValue(detail.pac).toFixed(2)} kW` : '-'}</Descriptions.Item>
          <Descriptions.Item label="Peak Power Today">{peakPowerToday !== undefined && peakPowerToday > 0 ? `${peakPowerToday.toFixed(2)} kW` : '-'}</Descriptions.Item>
        </Descriptions>
      </Card>

      {id && (
        <StationInsightCard
          provider="soliscloud"
          stationId={id}
          energy={{ todayKwh: detail.eToday, monthKwh: detail.eMonth, yearKwh: detail.eYear, totalKwh: detail.eTotal }}
        />
      )}

      {/* Revenue & Performance: the vendor's own income at the portal price (0 on every station). */}
      <Card title={<Space><DashboardOutlined />{withGap('Revenue & Performance', 'solisRevenue')}</Space>} style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          {([
            ["Today's Income", (detail as any).dayInCome],
            ['This Month', (detail as any).monthInCome],
            ['This Year', (detail as any).yearInCome],
            ['Total Income', (detail as any).allInCome],
          ] as const).map(([title, value]) => (
            <Col xs={24} sm={12} md={6} key={title}>
              <Card size="small">
                <Statistic
                  title={title}
                  value={value === undefined || value === null || value === '' ? '-' : parseValue(value).toFixed(2)}
                  suffix={(detail as any).money || detail.currencyUnit || ''}
                  valueStyle={{ fontSize: 18 }}
                />
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {/* Devices */}
      {detail.deviceList && detail.deviceList.length > 0 && (
        <Card title={<Space><TeamOutlined />Connected Devices ({detail.deviceList.length})</Space>} style={{ marginBottom: 16 }}>
          <List
            grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4 }}
            dataSource={detail.deviceList}
            renderItem={(device: any) => (
              <List.Item>
                <Card
                  size="small"
                  hoverable
                  style={{ background: device.state === 1 ? '#f6ffed' : '#fff1f0' }}
                >
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <Space>
                      <Avatar
                        icon={<ThunderboltOutlined />}
                        style={{
                          backgroundColor: device.state === 1 ? '#52c41a' : '#ff4d4f',
                        }}
                      />
                      <Text strong>{device.deviceType || 'Device'}</Text>
                    </Space>
                    <Text type="secondary">SN: {device.sn || '-'}</Text>
                    <div>{getStateTag(device.state)}</div>
                    {device.power !== undefined && (
                      <Text>Power: <Text strong>{parseValue(device.power).toFixed(2)} kW</Text></Text>
                    )}
                  </Space>
                </Card>
              </List.Item>
            )}
          />
        </Card>
      )}

      {/* Station Inverters */}
      <Card
        title={<Space><ThunderboltOutlined />Station Inverters ({inverters.length})</Space>}
        extra={
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => setIsBindInverterModalVisible(true)}
          >
            Bind Inverter
          </Button>
        }
        style={{ marginBottom: 16 }}
        loading={invertersLoading}
      >
        {inverters.length > 0 ? (
          <List
            grid={{ gutter: 16, xs: 1, sm: 2, md: 2, lg: 3 }}
            dataSource={inverters}
            renderItem={(inverter: InverterDetail) => (
              <List.Item>
                <Card
                  size="small"
                  hoverable
                  onClick={() => navigate(`/admin/soliscloud/inverters/${inverter.id}`)}
                  style={{
                    background: inverter.state === 1 ? '#f6ffed' : '#fff1f0',
                    cursor: 'pointer'
                  }}
                >
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                      <Text strong ellipsis>{inverter.inverterSn}</Text>
                      {getStateTag(inverter.state)}
                    </Space>
                    <Text type="secondary">{inverter.inverterModel || 'Unknown Model'}</Text>
                    <Row gutter={8}>
                      <Col span={12}>
                        <Statistic
                          title="AC Power"
                          value={inverter.pac || 0}
                          precision={2}
                          suffix="kW"
                          valueStyle={{ fontSize: 14 }}
                        />
                      </Col>
                      <Col span={12}>
                        <Statistic
                          title="Today"
                          value={inverter.eToday || 0}
                          precision={2}
                          suffix="kWh"
                          valueStyle={{ fontSize: 14 }}
                        />
                      </Col>
                    </Row>
                    {inverter.batteryCapacitySoc !== undefined && (
                      <div>
                        <Text type="secondary">Battery SOC: </Text>
                        <Text strong style={{ color: '#1890ff' }}>{inverter.batteryCapacitySoc}%</Text>
                      </div>
                    )}
                  </Space>
                </Card>
              </List.Item>
            )}
          />
        ) : (
          <Text type="secondary">No inverters found for this station</Text>
        )}
      </Card>

      {/* Station Collectors */}
      <Card
        title={<Space><WifiOutlined />Data Collectors ({collectors.length})</Space>}
        extra={
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => setIsBindCollectorModalVisible(true)}
          >
            Bind Collector
          </Button>
        }
        style={{ marginBottom: 16 }}
        loading={collectorsLoading}
      >
        {collectors.length > 0 ? (
          <List
            grid={{ gutter: 16, xs: 1, sm: 2, md: 2, lg: 3 }}
            dataSource={collectors}
            renderItem={(collector: CollectorDetail) => (
              <List.Item>
                <Card
                  size="small"
                  hoverable
                  onClick={() => navigate(`/admin/soliscloud/collectors/${collector.id || collector.sn}`)}
                  style={{
                    background: collector.state === 1 ? '#e6f7ff' : '#fff1f0',
                    cursor: 'pointer'
                  }}
                >
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                      <Text strong ellipsis>{collector.sn}</Text>
                      {getStateTag(collector.state)}
                    </Space>
                    <Row gutter={8}>
                      <Col span={12}>
                        <Space>
                          <SignalFilled style={{
                            color: (collector.signalStrength || 0) >= 70 ? '#52c41a' :
                                   (collector.signalStrength || 0) >= 40 ? '#faad14' : '#ff4d4f'
                          }} />
                          <div>
                            <Text type="secondary" style={{ fontSize: 12 }}>Signal</Text>
                            <div><Text strong>{collector.signalStrength || 0}%</Text></div>
                          </div>
                        </Space>
                      </Col>
                      <Col span={12}>
                        <div>
                          <Text type="secondary" style={{ fontSize: 12 }}>Version</Text>
                          <div><Text strong ellipsis>{collector.firmwareVersion || 'N/A'}</Text></div>
                        </div>
                      </Col>
                    </Row>
                    {collector.ipAddress && (
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>IP: </Text>
                        <Text style={{ fontSize: 12 }}>{collector.ipAddress}</Text>
                      </div>
                    )}
                  </Space>
                </Card>
              </List.Item>
            )}
          />
        ) : (
          <Text type="secondary">No collectors found for this station</Text>
        )}
      </Card>

      {/* Timestamps */}
      <Card title={<Space><CalendarOutlined />Data Information</Space>}>
        <Descriptions bordered column={{ xs: 1, sm: 2 }}>
          <Descriptions.Item label="Installation Date">{detail.installDate || '-'}</Descriptions.Item>
          <Descriptions.Item label="Grid Connection Date">{detail.gridConnectionDate || '-'}</Descriptions.Item>
          <Descriptions.Item label="Data Timestamp">{detail.dataTimestamp || '-'}</Descriptions.Item>
          <Descriptions.Item label="Last Update">{detail.updateDate || '-'}</Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Edit Station Modal */}
      <Modal
        title="Edit Station Information"
        open={isEditModalVisible}
        onCancel={() => {
          setIsEditModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={editLoading}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleEditStation}
        >
          <Form.Item
            name="stationName"
            label="Station Name"
            rules={[{ required: true, message: 'Please enter station name' }]}
          >
            <Input placeholder="Enter station name" />
          </Form.Item>

          <Form.Item
            name="capacity"
            label="Capacity (kWp)"
            rules={[{ required: true, message: 'Please enter capacity' }]}
          >
            <InputNumber
              placeholder="Enter capacity"
              min={0}
              step={0.1}
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="address"
            label="Address"
          >
            <Input.TextArea
              placeholder="Enter station address (optional)"
              rows={3}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Bind Collector Modal */}
      <Modal
        title={
          <Space>
            <LinkOutlined />
            Bind Collector to Station
          </Space>
        }
        open={isBindCollectorModalVisible}
        onCancel={() => {
          setIsBindCollectorModalVisible(false);
          bindCollectorForm.resetFields();
        }}
        onOk={() => bindCollectorForm.submit()}
        confirmLoading={bindLoading}
        width={500}
      >
        <Form
          form={bindCollectorForm}
          layout="vertical"
          onFinish={handleBindCollector}
        >
          <Form.Item
            name="collectorSn"
            label="Collector Serial Number"
            rules={[{ required: true, message: 'Please enter collector serial number' }]}
          >
            <Input placeholder="Enter collector SN" />
          </Form.Item>
          <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
            Enter the serial number of the data collector you want to bind to this station.
          </Typography.Paragraph>
        </Form>
      </Modal>

      {/* Bind Inverter Modal */}
      <Modal
        title={
          <Space>
            <LinkOutlined />
            Bind Inverter to Station
          </Space>
        }
        open={isBindInverterModalVisible}
        onCancel={() => {
          setIsBindInverterModalVisible(false);
          bindInverterForm.resetFields();
        }}
        onOk={() => bindInverterForm.submit()}
        confirmLoading={bindInverterLoading}
        width={500}
      >
        <Form
          form={bindInverterForm}
          layout="vertical"
          onFinish={handleBindInverter}
        >
          <Form.Item
            name="inverterSn"
            label="Inverter Serial Number"
            rules={[{ required: true, message: 'Please enter inverter serial number' }]}
          >
            <Input placeholder="Enter inverter SN" />
          </Form.Item>
          <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
            Enter the serial number of the inverter you want to bind to this station.
          </Typography.Paragraph>
        </Form>
      </Modal>
    </div>
  );
};

export default StationDetailPage;
