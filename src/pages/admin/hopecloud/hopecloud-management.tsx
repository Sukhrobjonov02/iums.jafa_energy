import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Space,
  Button,
  Table,
  Tag,
  Spin,
  message,
  Tabs,
  Statistic,
  Progress,
  Modal,
  Descriptions,
  Badge,
  Avatar,
  Layout,
  Input,
  Select,
  List,
  Drawer,
  Empty,
  Form,
  Divider,
  Alert,
  Switch,
  Tooltip,
} from 'antd';
import { DESIGN_TOKENS } from '../../../constants/design-tokens';
import type { TabsProps } from 'antd';
import {
  CloudServerOutlined,
  ThunderboltOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  DatabaseOutlined,
  DashboardOutlined,
  BellOutlined,
  SafetyCertificateOutlined,
  SunOutlined,
  LineChartOutlined,
  UserOutlined,
  SearchOutlined,
  ToolOutlined,
  ClusterOutlined,
  TeamOutlined,
  // DollarOutlined,
  HomeOutlined,
  PhoneOutlined,
  MailOutlined,
  BuildOutlined,
  PlusOutlined,
  // EditOutlined,
  BarChartOutlined,
  WifiOutlined,
  LinkOutlined,
  AlertOutlined,
  FileTextOutlined,
  SaveOutlined,
  CloseOutlined,
  // RiseOutlined,
  // FallOutlined,
  // SettingFilled,
} from '@ant-design/icons';
import { hopeCloudService } from '../../../service';
import StatisticsDashboard from '../../../components/StatisticsDashboard';
import HopeCloudStationHistory from '../../../components/HopeCloudStationHistory';
import HopeCloudEquipmentHistory from '../../../components/HopeCloudEquipmentHistory';
import DataAsOf from '../../../components/DataAsOf';
import { withGap } from '../../../components/maintainer/with-gap';
import StationInsightCard from '../../../components/forecast/StationInsightCard';
import {
  alarmGradeLabel,
  alarmTypeLabel,
  formatHopeCloudTime,
  inverterStatus,
  moduleTypeLabel,
  normalizeHopeCloudAlarm,
  paramNumber,
  paramText,
  stationPlace,
  toNumber,
} from '../../../helpers/hopecloud-fields';
import type {
  HopeCloudStation,
  HopeCloudAlarm,
  HopeCloudHealthStatus,
  HopeCloudDevice,
  HopeCloudOwner,
  HopeCloudChannelProvider,
  HopeCloudChannelTree,
  HopeCloudEquipmentDetails,
  HopeCloudRealtimeData,
  HopeCloudCommunicationModule,
  HopeCloudEquipmentRealtimeData,
  CreateHopeCloudStationDto,
  BindDevicesDto,
  HopeCloudConfigTypes,
  // HopeCloudAuthValidation,
} from '../../../types/hopecloud';

const { Title, Text } = Typography;
const { Content } = Layout;

const HopeCloudManagement: React.FC = () => {
  // Core state
  const [healthStatus, setHealthStatus] = useState<HopeCloudHealthStatus | null>(null);
  // const [batchStatus, setBatchStatus] = useState<HopeCloudBatchStatus | null>(null);
  const [stations, setStations] = useState<HopeCloudStation[]>([]);
  const [alarms, setAlarms] = useState<HopeCloudAlarm[]>([]);
  const [devices, setDevices] = useState<HopeCloudDevice[]>([]);
  const [owners, setOwners] = useState<HopeCloudOwner[]>([]);
  const [channelProviders, setChannelProviders] = useState<HopeCloudChannelProvider[]>([]);
  const [channelTree, setChannelTree] = useState<HopeCloudChannelTree[]>([]);
  // const [metrics, setMetrics] = useState<HopeCloudMetrics | null>(null);
  // const [authValidation, setAuthValidation] = useState<HopeCloudAuthValidation | null>(null);
  
  // New state for additional APIs
  const [equipmentRealtimeData, setEquipmentRealtimeData] = useState<HopeCloudEquipmentRealtimeData | null>(null);
  const [equipmentAlarms, setEquipmentAlarms] = useState<HopeCloudAlarm[]>([]);
  const [communicationModules, setCommunicationModules] = useState<HopeCloudCommunicationModule[]>([]);
  const [selectedCommModule, setSelectedCommModule] = useState<HopeCloudCommunicationModule | null>(null);
  const [stationConfigTypes, setStationConfigTypes] = useState<HopeCloudConfigTypes | null>(null);
  const [selectedAlarmDetails, setSelectedAlarmDetails] = useState<HopeCloudAlarm | null>(null);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedStation, setSelectedStation] = useState<HopeCloudStation | null>(null);
  const [stationDetailVisible, setStationDetailVisible] = useState(false);
  const [deviceDrawerVisible, setDeviceDrawerVisible] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<HopeCloudDevice | null>(null);
  const [equipmentDetails, setEquipmentDetails] = useState<HopeCloudEquipmentDetails | null>(null);
  const [realtimeData, setRealtimeData] = useState<HopeCloudRealtimeData[]>([]);
  
  // New UI state
  const [createStationVisible, setCreateStationVisible] = useState(false);
  const [bindDevicesVisible, setBindDevicesVisible] = useState(false);
  const [alarmDetailVisible, setAlarmDetailVisible] = useState(false);
  const [commModuleVisible, setCommModuleVisible] = useState(false);
  const [selectedStationId] = useState<string>('');
  
  // New state for missing APIs
  // const [stationDetails, setStationDetails] = useState<HopeCloudStation | null>(null);
  
  const [selectedCommModuleDetails, setSelectedCommModuleDetails] = useState<HopeCloudCommunicationModule | null>(null);
  const [commModuleDetailsVisible, setCommModuleDetailsVisible] = useState(false);
  const [stationHistoryVisible, setStationHistoryVisible] = useState(false);
  const [selectedStationForHistory, setSelectedStationForHistory] = useState<HopeCloudStation | null>(null);
  const [equipmentHistoryVisible, setEquipmentHistoryVisible] = useState(false);
  const [selectedEquipmentForHistory, setSelectedEquipmentForHistory] = useState<HopeCloudDevice | null>(null);

  // Statistics Dashboard state
  const [statisticsDashboardVisible, setStatisticsDashboardVisible] = useState(false);
  const [selectedStationIdForStats, setSelectedStationIdForStats] = useState<string>('');
  const [selectedEquipmentSnForStats, setSelectedEquipmentSnForStats] = useState<string>('');
  const [statisticsDashboardTitle, setStatisticsDashboardTitle] = useState<string>('');

  // Utility function for handling 502 errors
  
  // Station table UI state
  // const [showAllColumns, setShowAllColumns] = useState(false);
  // const [viewMode, setViewMode] = useState<'simple' | 'detailed' | 'compact'>('simple');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [regionFilter, setRegionFilter] = useState<string>('');
  const [companyFilter, setCompanyFilter] = useState<string>('');

  // Filters
  const [stationFilter, setStationFilter] = useState('');
  const [alarmFilter, setAlarmFilter] = useState('');

  // Data source toggle: stored data (our DB, default) or the live HopeCloud API
  const [useDbSource, setUseDbSource] = useState(true);
  // Newest stored station row, reported by GET /hopecloud/db/stations
  const [stationsDataAsOf, setStationsDataAsOf] = useState<string | null>(null);

  // Stations come from our DB or the vendor API depending on the toggle; both resolve to the same HopeCloudStation shape.
  const loadStations = async (): Promise<HopeCloudStation[]> => {
    if (useDbSource) {
      const response = await hopeCloudService.getDbStations();
      setStationsDataAsOf(response.dataAsOf ?? null);
      return Array.isArray(response.data) ? response.data : [];
    }
    setStationsDataAsOf(null);
    const response = await hopeCloudService.getStations({ pageIndex: 1, pageSize: 50 });
    return Array.isArray(response.data?.records) ? response.data.records : [];
  };

  /**
   * Communication modules come from our own table (filled by the HopeCloud module sync), in one
   * call. The page used to ask once per station with a plantId the route ignores, so it fetched
   * the same empty list four times.
   */
  const loadCommunicationModules = async () => {
    const modules: any[] = (await hopeCloudService.getStoredCommunicationModules()) || [];
    setCommunicationModules(modules.map((m) => ({ ...m, updateTime: m.updateTime ?? m.lastUpdate })));
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      if (useDbSource) {
        // Stored data does not depend on the vendor, so it no longer waits for the health probe:
        // that call goes through HopeCloud's 10-second gate and held the page for ~17 s.
        hopeCloudService.getHealth().then(setHealthStatus).catch(() => undefined);
        const [stationsData, alarmsResponse, configTypes] = await Promise.all([
          loadStations(),
          hopeCloudService.getDbAlarms(),
          hopeCloudService.getStationConfigTypes().catch(() => null),
          loadCommunicationModules().catch((error) => console.warn('Communication modules:', error)),
        ]);
        setStations(stationsData);
        setAlarms(Array.isArray(alarmsResponse.data) ? alarmsResponse.data : []);
        if (configTypes) setStationConfigTypes(configTypes.data);
        return;
      }

      // Live vendor data: check the API first, as before.
      const health = await hopeCloudService.getHealth();
      setHealthStatus(health);
      if (health.status !== 'healthy') return;
      // The vendor's alarm list uses id / powerPlantName / reportedTime and status "0" pending /
      // "1" processed; normalise it to the stored-alarm shape the Alarms tab renders.
      const [stationsData, alarmsResponse, configTypesResponse] = await Promise.all([
        loadStations(),
        hopeCloudService.getActiveAlarms({ pageIndex: 1, pageSize: 50 }),
        hopeCloudService.getStationConfigTypes(),
      ]);
      setStations(stationsData);
      setAlarms(
        (Array.isArray(alarmsResponse.data) ? alarmsResponse.data : []).map(
          (a: any) => normalizeHopeCloudAlarm(a) as HopeCloudAlarm,
        ),
      );
      setStationConfigTypes(configTypesResponse.data);
      loadCommunicationModules().catch((error) => console.warn('Communication modules:', error));
    } catch (error: any) {
      message.error('Failed to fetch HopeCloud data: ' + (error?.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };


  const [usersLoaded, setUsersLoaded] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const [ownersResponse, providersResponse, treeResponse] = await Promise.all([
        hopeCloudService.getSubOwners({ pageIndex: 1, pageSize: 20 }),
        hopeCloudService.getChannelProviders({ pageIndex: 1, pageSize: 20 }),
        hopeCloudService.getChannelTree(),
      ]);
      const records = (response: any) =>
        Array.isArray(response.data?.records) ? response.data.records : Array.isArray(response.data) ? response.data : [];
      setOwners(records(ownersResponse));
      setChannelProviders(records(providersResponse));
      setChannelTree(Array.isArray(treeResponse.data) ? treeResponse.data : []);
      setUsersLoaded(true);
    } catch (error: any) {
      message.error('Failed to load HopeCloud users: ' + (error?.response?.data?.message || error.message));
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users' && !usersLoaded && !usersLoading) loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleViewDeviceDetails = async (device: HopeCloudDevice) => {
    setSelectedDevice(device);
    setDeviceDrawerVisible(true);
    
    try {
      const [equipmentResponse, realtimeResponse] = await Promise.all([
        hopeCloudService.getEquipmentDetails(device.equipmentSn),
        hopeCloudService.getEquipmentRealtimeData(device.equipmentSn),
      ]);
      setEquipmentDetails(equipmentResponse.data);
      setEquipmentRealtimeData(realtimeResponse.data);
    } catch (error: any) {
      console.warn('Could not fetch equipment details:', error);
    }
  };

  const handleViewAlarmDetails = async (alarm: HopeCloudAlarm) => {
    try {
      const response = await hopeCloudService.getAlarmDetails({
        alarmId: alarm.alarmId,
        sn: alarm.equipmentSn
      });
      // The detail answer is the vendor shape (id, powerPlantName, status "0"/"1"); keep what
      // the list already had for anything it leaves out
      setSelectedAlarmDetails(normalizeHopeCloudAlarm({ ...alarm, ...(response.data || {}) }) as HopeCloudAlarm);
      setAlarmDetailVisible(true);
    } catch (error: any) {
      // If API fails, show the alarm data we already have with a warning
      console.warn('Failed to fetch enhanced alarm details, showing basic info:', error);
      message.warning('Unable to fetch detailed analysis from external service. Showing basic alarm information.');
      setSelectedAlarmDetails(alarm);
      setAlarmDetailVisible(true);
    }
  };

  const handleViewEquipmentAlarms = async (deviceSn: string) => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(endDate.getMonth() - 1);

      const filters = {
        startTime: startDate.toISOString().split('T')[0],
        endTime: endDate.toISOString().split('T')[0]
      };

      const response = await hopeCloudService.getEquipmentAlarms(deviceSn, filters);
      const alarmsData = Array.isArray(response.data) ? response.data : [];
      setEquipmentAlarms(alarmsData.map((a: any) => normalizeHopeCloudAlarm(a) as HopeCloudAlarm));
    } catch (error: any) {
      console.warn('Could not fetch equipment alarms:', error);
    }
  };

  const handleCreateStation = async (values: any) => {
    try {
      const stationData: CreateHopeCloudStationDto = {
        ...values,
        snList: values.snList?.split('\n').filter((sn: string) => sn.trim()) || [],
      };
      await hopeCloudService.createPowerStation(stationData);
      message.success('Power station created successfully');
      setCreateStationVisible(false);
      await fetchAllData();
    } catch (error: any) {
      message.error('Failed to create power station: ' + error.message);
    }
  };

  const handleBindDevices = async (plantId: string, devices: BindDevicesDto) => {
    try {
      await hopeCloudService.bindDevicesToPlant(plantId, devices);
      message.success('Devices bound to station successfully');
      setBindDevicesVisible(false);
      await fetchAllData();
    } catch (error: any) {
      message.error('Failed to bind devices: ' + error.message);
    }
  };

  // const handleViewStationHistory = (station: HopeCloudStation) => {
  //   setSelectedStationForHistory(station);
  //   setStationHistoryVisible(true);
  // };

  const handleViewEquipmentHistory = (device: HopeCloudDevice) => {
    setSelectedEquipmentForHistory(device);
    setEquipmentHistoryVisible(true);
  };



  // Consolidated station details handler
  const handleViewStationDetailsModal = async (stationId: string) => {
    try {
      // Find the station from our existing data and open modal immediately
      const station = stations.find(s => s.id === stationId);
      if (station) {
        setSelectedStation(station);
      }
      
      // Open the modal immediately with basic data
      setStationDetailVisible(true);
      
      // Load additional data in the background
      try {
        const devicesResponse = await hopeCloudService.getStationDevices(stationId);
        if (devicesResponse?.data && (devicesResponse.data as any).records) {
          setDevices((devicesResponse.data as any).records);
        }
      } catch (devicesError) {
        console.warn('Could not fetch station devices:', devicesError);
        setDevices([]);
      }
      
      try {
        const realtimeResponse = await hopeCloudService.getStationRealtimeData(stationId);
        if (realtimeResponse?.data) {
          setRealtimeData([realtimeResponse.data]);
        }
      } catch (realtimeError) {
        console.warn('Could not fetch realtime data:', realtimeError);
        setRealtimeData([]);
      }
      
    } catch (error: any) {
      message.error('Failed to load station details: ' + (error?.response?.data?.message || error.message));
    }
  };








  const handleViewCommModuleDetails = async (moduleId?: number | string, modulePn?: string) => {
    try {
      setLoading(true);
      const response = await hopeCloudService.getCommunicationModuleDetails({ id: moduleId?.toString(), pn: modulePn });

      // Handle different response structures
      const moduleData = response.data || response;

      setSelectedCommModuleDetails(moduleData as any);
      setCommModuleDetailsVisible(true);
    } catch (error: any) {
      console.error('[COMM_MODULE_DETAILS] Error:', error);
      message.error('Failed to load communication module details: ' + (error?.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Statistics Dashboard handlers
  // const handleOpenStationStatsDashboard = (stationId: string, stationName?: string) => {
  //   setSelectedStationIdForStats(stationId);
  //   setSelectedEquipmentSnForStats('');
  //   setStatisticsDashboardTitle(`Station Statistics - ${stationName || stationId}`);
  //   setStatisticsDashboardVisible(true);
  // };

  const handleOpenEquipmentStatsDashboard = (equipmentSn: string, equipmentName?: string) => {
    setSelectedStationIdForStats('');
    setSelectedEquipmentSnForStats(equipmentSn);
    setStatisticsDashboardTitle(`Equipment Statistics - ${equipmentName || equipmentSn}`);
    setStatisticsDashboardVisible(true);
  };


  const handleCloseStatisticsDashboard = () => {
    setStatisticsDashboardVisible(false);
    setSelectedStationIdForStats('');
    setSelectedEquipmentSnForStats('');
    setStatisticsDashboardTitle('');
  };

  // Re-fetch when the stored/live toggle changes
  useEffect(() => {
    fetchAllData();
  }, [useDbSource]);


  const isHealthy = healthStatus?.status === 'healthy';

  // Helper functions for enhanced UI
  // const getPerformanceColor = (efficiency: number) => {
  //   if (efficiency >= 80) return '#52c41a'; // Green
  //   if (efficiency >= 60) return '#faad14'; // Yellow
  //   return '#ff4d4f'; // Red
  // };

  // const getNetworkStrength = (networkTime?: string) => {
  //   if (!networkTime) return { level: 0, color: '#d9d9d9' };
  //   const hoursAgo = (Date.now() - new Date(networkTime).getTime()) / (1000 * 60 * 60);
  //   if (hoursAgo < 1) return { level: 3, color: '#52c41a' }; // Strong
  //   if (hoursAgo < 6) return { level: 2, color: '#faad14' }; // Moderate
  //   return { level: 1, color: '#ff4d4f' }; // Weak
  // };

  // const getTrendIndicator = (current: number, previous: number = current * 0.95) => {
  //   if (current > previous) return <RiseOutlined style={{ color: '#52c41a' }} />;
  //   if (current < previous) return <FallOutlined style={{ color: '#ff4d4f' }} />;
  //   return null;
  // };

  // Direct filtering function that always recalculates
  const getFilteredStations = () => {
    if (!Array.isArray(stations)) {
      console.warn('getFilteredStations: Stations is not an array:', stations);
      return [];
    }
    
    // Use immediate stationFilter for real-time search
    const searchTerm = stationFilter.toLowerCase().trim();
    
    const filteredStations = stations.filter(station => {
      if (!station || typeof station !== 'object') {
        console.warn('Invalid station object:', station);
        return false;
      }
      
      // Text search filter - immediate response
      const matchesSearch = searchTerm === '' || 
        (station.name && station.name.toLowerCase().includes(searchTerm)) ||
        (station.city && station.city.toLowerCase().includes(searchTerm)) ||
        (station.ownerName && station.ownerName.toLowerCase().includes(searchTerm)) ||
        (station.companyName && station.companyName.toLowerCase().includes(searchTerm)) ||
        (station.province && station.province.toLowerCase().includes(searchTerm)) ||
        (station.district && station.district.toLowerCase().includes(searchTerm));
        
      // Status filter
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'online' && station.status === 1) ||
        (statusFilter === 'offline' && station.status !== 1);
        
      // Region filter
      const matchesRegion = regionFilter === '' || station.province === regionFilter;
      
      // Company filter
      const matchesCompany = companyFilter === '' || station.companyName === companyFilter;
      
      const result = matchesSearch && matchesStatus && matchesRegion && matchesCompany;
      return result;
    });
    
    return filteredStations;
  };

  // Helper function to highlight search terms
  // const highlightSearchTerm = (text: string, searchTerm: string) => {
  //   if (!searchTerm || !text) return text;
  //
  //   const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  //   const parts = text.split(regex);
  //
  //   return parts.map((part, index) =>
  //     regex.test(part) ? (
  //       <Text key={index} style={{ backgroundColor: '#fff2b8', fontWeight: 600 }}>
  //         {part}
  //       </Text>
  //     ) : (
  //       <span key={index}>{part}</span>
  //     )
  //   );
  // };

  // Get columns based on view mode
  // const getTableColumns = () => {
  //   // Default to essential columns since we removed view controls
  //   return essentialStationColumns;
  // };

  // Enhanced station columns with all available data
  // Essential columns for simplified view
  /*
  const essentialStationColumns: TableColumnsType<HopeCloudStation> = [
    {
      title: 'Station Name',
      dataIndex: 'name',
      key: 'name',
      width: 250,
      fixed: 'left' as const,
      render: (text: string, record) => (
        <div style={{ padding: '8px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
            <HomeOutlined style={{ color: '#13c2c2', marginRight: '8px' }} />
            <Text strong style={{ fontSize: '14px' }}>
              {stationFilter ? highlightSearchTerm(text, stationFilter) : text}
            </Text>
          </div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {stationFilter ? 
              <>{highlightSearchTerm(record.city, stationFilter)}, {highlightSearchTerm(record.province, stationFilter)}</> :
              <>{record.city}, {record.province}</>
            }
          </Text>
        </div>
      ),
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Status',
      key: 'status',
      width: 140,
      render: (_, record) => {
        const networkStrength = getNetworkStrength(record.networkTime);
        return (
          <Space direction="vertical" size={2}>
            <Badge
              status={record.status === 1 ? 'success' : 'error'}
              text={
                <Text strong style={{ color: record.status === 1 ? '#52c41a' : '#ff4d4f' }}>
                  {record.status === 1 ? 'Online' : 'Offline'}
                </Text>
              }
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <WifiOutlined style={{ color: networkStrength.color, fontSize: '12px' }} />
              <Text type="secondary" style={{ fontSize: '11px' }}>
                Network {networkStrength.level === 3 ? 'Strong' : networkStrength.level === 2 ? 'Good' : 'Weak'}
              </Text>
            </div>
          </Space>
        );
      },
      filters: [
        { text: 'Online', value: 1 },
        { text: 'Offline', value: 0 },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Current Power',
      key: 'currentPower',
      width: 160,
      render: (_, record) => {
        const efficiency = Math.min(Math.round((record.nowKw / record.kwp) * 100), 100);
        const performanceColor = getPerformanceColor(efficiency);
        return (
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
              <Text strong style={{ color: performanceColor, fontSize: '15px' }}>
                {(record.nowKw || 0).toFixed(2)} kW
              </Text>
              {getTrendIndicator(record.nowKw)}
            </div>
            <Progress
              percent={efficiency}
              strokeColor={performanceColor}
              size="small"
              showInfo={false}
              style={{ margin: '4px 0' }}
            />
            <Text type="secondary" style={{ fontSize: '11px' }}>
              {efficiency}% of {record.kwp} kWp
            </Text>
          </div>
        );
      },
      sorter: (a, b) => a.nowKw - b.nowKw,
    },
    {
      title: "Today's Generation",
      key: 'todayGeneration',
      width: 160,
      render: (_, record) => (
        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
            <Text strong style={{ color: '#52c41a', fontSize: '14px' }}>
              {(record.todayKwh || 0).toFixed(1)} kWh
            </Text>
            {getTrendIndicator(record.todayKwh)}
          </div>
          <div style={{ marginTop: '2px' }}>
            <Progress
              percent={Math.min((record.todayKwh / (record.kwp * 8)) * 100, 100)} // Assuming 8h peak sun
              strokeColor="#52c41a"
              size="small"
              showInfo={false}
              style={{ width: '80px' }}
            />
          </div>
        </div>
      ),
      sorter: (a, b) => a.todayKwh - b.todayKwh,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      fixed: 'right' as const,
      render: (_, record) => (
        <Space direction="vertical" size={4}>
          <Button 
            type="primary"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewStationDetailsModal(record.id)}
            block
          >
            Details
          </Button>
          <Button 
            size="small"
            icon={<LineChartOutlined />}
            onClick={() => handleViewStationHistory(record)}
            block
          >
            History
          </Button>
        </Space>
      ),
    },
  ];
  */

  // Stations content with enhanced design
  const StationsContent = () => {
    const totalStations = Array.isArray(stations) ? stations.length : 0;
    const onlineStations = Array.isArray(stations) ? stations.filter(s => s.status === 1).length : 0;
    const offlineStations = totalStations - onlineStations;
    const activeAlarms = Array.isArray(alarms) ? alarms.filter(a => a.status === 'active').length : 0;
    const totalPower = Array.isArray(stations) ? stations.reduce((sum, s) => sum + (s.nowKw || 0), 0) : 0;
    const totalCapacity = Array.isArray(stations) ? stations.reduce((sum, s) => sum + (s.kwp || 0), 0) : 0;
    const todayEnergy = Array.isArray(stations) ? stations.reduce((sum, s) => sum + (s.todayKwh || 0), 0) : 0;

    return (
      <div style={{ width: '100%', padding: '24px', background: '#f0f2f5', minHeight: '100vh', boxSizing: 'border-box' }}>
        {/* Data Source Toggle */}
        <Card style={{ marginBottom: 24 }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={4} style={{ margin: 0 }}>
                <DatabaseOutlined /> Data Source
              </Title>
            </Col>
            <Col>
              <Space size="large">
                <Tooltip title={useDbSource ? "Switch to Live HopeCloud API" : "Switch to stored data"}>
                  <Space>
                    <CloudServerOutlined style={{ color: useDbSource ? '#bfbfbf' : DESIGN_TOKENS.status.success, fontSize: 20 }} />
                    <Switch
                      checked={useDbSource}
                      onChange={setUseDbSource}
                      checkedChildren={<DatabaseOutlined />}
                      unCheckedChildren={<CloudServerOutlined />}
                    />
                    <DatabaseOutlined style={{ color: useDbSource ? DESIGN_TOKENS.status.success : '#bfbfbf', fontSize: 20 }} />
                  </Space>
                </Tooltip>
                <Tag color={useDbSource ? 'blue' : 'green'} style={{ padding: '4px 12px', fontSize: 14 }}>
                  {useDbSource ? 'Stored data' : 'Live HopeCloud API'}
                </Tag>
                {useDbSource && <DataAsOf timestamp={stationsDataAsOf} />}
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Gradient Statistics Cards */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={6}>
            <Card style={{ background: DESIGN_TOKENS.gradients.purple, border: 'none' }}>
              <Statistic
                title={<span style={{ color: 'rgba(255,255,255,0.9)' }}>Total Stations</span>}
                value={totalStations}
                prefix={<HomeOutlined style={{ color: '#fff' }} />}
                valueStyle={{ color: '#fff' }}
              />
              <Progress
                percent={totalStations > 0 ? Math.round((onlineStations / totalStations) * 100) : 0}
                strokeColor="#fff"
                showInfo={false}
                style={{ marginTop: 8 }}
              />
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 8, display: 'block' }}>
                {onlineStations} online, {offlineStations} offline
              </Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card style={{ background: DESIGN_TOKENS.gradients.pink, border: 'none' }}>
              <Statistic
                title={<span style={{ color: 'rgba(255,255,255,0.9)' }}>Current Power</span>}
                value={totalPower.toFixed(1)}
                suffix="kW"
                prefix={<ThunderboltOutlined style={{ color: '#fff' }} />}
                valueStyle={{ color: '#fff' }}
              />
              <Progress
                percent={totalCapacity > 0 ? Math.min(Math.round((totalPower / totalCapacity) * 100), 100) : 0}
                strokeColor="#fff"
                showInfo={false}
                style={{ marginTop: 8 }}
              />
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 8, display: 'block' }}>
                {totalCapacity > 0 ? `${Math.round((totalPower / totalCapacity) * 100)}% of ${totalCapacity.toFixed(0)} kWp` : 'No capacity on record'}
              </Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card style={{ background: DESIGN_TOKENS.gradients.green, border: 'none' }}>
              <Statistic
                title={<span style={{ color: 'rgba(255,255,255,0.9)' }}>Today's Energy</span>}
                value={todayEnergy.toFixed(1)}
                suffix="kWh"
                prefix={<SunOutlined style={{ color: '#fff' }} />}
                valueStyle={{ color: '#fff' }}
              />
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 8, display: 'block' }}>
                Across {totalStations} station{totalStations === 1 ? '' : 's'}
              </Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card style={{ background: DESIGN_TOKENS.gradients.orange, border: 'none' }}>
              <Statistic
                title={<span style={{ color: 'rgba(255,255,255,0.9)' }}>Active Alarms</span>}
                value={activeAlarms}
                prefix={<BellOutlined style={{ color: '#fff' }} />}
                valueStyle={{ color: '#fff' }}
              />
              <Progress
                percent={activeAlarms > 0 ? 100 : 0}
                strokeColor="#fff"
                showInfo={false}
                style={{ marginTop: 8 }}
                status={activeAlarms > 0 ? 'exception' : 'success'}
              />
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 8, display: 'block' }}>
                {activeAlarms > 0 ? 'Attention required' : 'All systems normal'}
              </Text>
            </Card>
          </Col>
        </Row>

        {/* Header */}
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <Title level={4} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <DatabaseOutlined />
              Power Stations Management
              <Badge count={Array.isArray(stations) ? stations.length : 0} showZero style={{ backgroundColor: DESIGN_TOKENS.menu.primary }} />
            </Title>
            <Text type="secondary">
              {getFilteredStations().length} of {stations.length} stations
              {stationFilter && ` • Searching: "${stationFilter}"`}
            </Text>
          </div>
          <Space>
            <Input
              placeholder="Search stations..."
              prefix={<SearchOutlined />}
              value={stationFilter}
              onChange={(e) => setStationFilter(e.target.value)}
              style={{ width: 250 }}
              allowClear
            />
            <Button
              icon={<PlusOutlined />}
              onClick={() => setCreateStationVisible(true)}
              style={{
                background: DESIGN_TOKENS.menu.primary,
                borderColor: DESIGN_TOKENS.menu.primary,
                color: '#fff'
              }}
            >
              Create Station
            </Button>
          </Space>
        </div>

      {/* Stations Grid */}
      <div>
        {(!Array.isArray(stations) || stations.length === 0) && !loading ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No stations available"
          >
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchAllData}
              style={{
                background: '#13c2c2',
                borderColor: '#13c2c2',
                color: '#fff'
              }}
            >
              Retry Loading
            </Button>
          </Empty>
        ) : getFilteredStations().length === 0 && (stationFilter || statusFilter !== 'all' || regionFilter || companyFilter) ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div>
                <Text>No stations found matching your search criteria</Text>
                <br />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {stationFilter && `Search: "${stationFilter}" • `}
                  {statusFilter !== 'all' && `Status: ${statusFilter} • `}
                  {regionFilter && `Region: ${regionFilter} • `}
                  {companyFilter && `Company: ${companyFilter}`}
                </Text>
              </div>
            }
          >
            <Space>
              <Button 
                icon={<CloseOutlined />} 
                onClick={() => {
                  setStationFilter('');
                  setStatusFilter('all');
                  setRegionFilter('');
                  setCompanyFilter('');
                }}
              >
                Clear All Filters
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchAllData}
                style={{
                  background: '#13c2c2',
                  borderColor: '#13c2c2',
                  color: '#fff'
                }}
              >
                Refresh Data
              </Button>
            </Space>
          </Empty>
        ) : (
          <Row gutter={[16, 16]}>
            {getFilteredStations().map((station) => (
              <Col xs={24} sm={24} md={12} lg={12} xl={8} key={station.id}>
                <Card
                  hoverable
                  style={{
                    height: '100%',
                    borderLeft: `4px solid ${station.status === 1 ? '#52c41a' : '#ff4d4f'}`,
                    transition: 'all 0.3s ease'
                  }}
                  bodyStyle={{ padding: '20px' }}
                >
                  {/* Station Header */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div style={{ flex: 1 }}>
                        <Title level={5} style={{ margin: 0, marginBottom: 4 }}>
                          <HomeOutlined style={{ marginRight: 8, color: '#13c2c2' }} />
                          {station.name}
                        </Title>
                        {stationPlace(station) && (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {stationPlace(station)}
                          </Text>
                        )}
                      </div>
                      <Badge
                        status={station.status === 1 ? 'success' : 'error'}
                        text={
                          <Text style={{
                            fontSize: 12,
                            fontWeight: 500,
                            color: station.status === 1 ? '#52c41a' : '#ff4d4f'
                          }}>
                            {station.status === 1 ? 'Online' : 'Offline'}
                          </Text>
                        }
                      />
                    </div>
                  </div>

                  <Divider style={{ margin: '12px 0' }} />

                  {/* Power Metrics */}
                  <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                    <Col span={12}>
                      <div style={{
                        background: 'linear-gradient(135deg, #f9f0ff 0%, #ffffff 100%)',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid #f0f0f0'
                      }}>
                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
                          Current Output
                        </Text>
                        <Title level={4} style={{ margin: 0, color: '#722ed1' }}>
                          {(station.nowKw || 0).toFixed(1)} <Text style={{ fontSize: 14, color: '#722ed1' }}>kW</Text>
                        </Title>
                        {station.kwp > 0 && (
                          <>
                            <Progress
                              percent={Math.min(Math.round(((station.nowKw || 0) / station.kwp) * 100), 100)}
                              strokeColor="#722ed1"
                              size="small"
                              showInfo={false}
                              style={{ marginTop: 4 }}
                            />
                            <Text type="secondary" style={{ fontSize: 10 }}>
                              {Math.round(((station.nowKw || 0) / station.kwp) * 100)}% of {station.kwp.toFixed(0)} kWp
                            </Text>
                          </>
                        )}
                      </div>
                    </Col>
                    <Col span={12}>
                      <div style={{
                        background: 'linear-gradient(135deg, #f6ffed 0%, #ffffff 100%)',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid #f0f0f0'
                      }}>
                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
                          Today's Gen
                        </Text>
                        <Title level={4} style={{ margin: 0, color: '#52c41a' }}>
                          {(station.todayKwh || 0).toFixed(1)} <Text style={{ fontSize: 14, color: '#52c41a' }}>kWh</Text>
                        </Title>
                        <div style={{ marginTop: 8 }}>
                          <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>
                            Month: {(station.monKwh || 0).toFixed(0)} kWh
                          </Text>
                          <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>
                            Total: {((station.sumKwh || 0) / 1000).toFixed(1)} MWh
                          </Text>
                        </div>
                      </div>
                    </Col>
                  </Row>

                  {/* Station Info (live data only: stored stations carry no owner or company) */}
                  {(station.ownerName || station.companyName) && (
                  <div style={{
                    background: '#fafafa',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    marginBottom: 12
                  }}>
                    <Space split={<Divider type="vertical" />} size="small" style={{ fontSize: 11 }}>
                      {station.ownerName && (
                        <Text type="secondary">
                          <UserOutlined style={{ marginRight: 4 }} />
                          {station.ownerName}
                        </Text>
                      )}
                      {station.companyName && (
                        <Text type="secondary">
                          <BuildOutlined style={{ marginRight: 4 }} />
                          {station.companyName}
                        </Text>
                      )}
                    </Space>
                  </div>
                  )}

                  {/* Action Buttons */}
                  <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                    <Button
                      size="small"
                      icon={<LineChartOutlined />}
                      onClick={() => {
                        setSelectedStationForHistory(station);
                        setStationHistoryVisible(true);
                      }}
                      style={{
                        borderColor: DESIGN_TOKENS.menu.primary,
                        color: DESIGN_TOKENS.menu.primary
                      }}
                    >
                      History
                    </Button>
                    <Button
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => handleViewStationDetailsModal(station.id)}
                      type="primary"
                      style={{
                        background: DESIGN_TOKENS.menu.primary,
                        borderColor: DESIGN_TOKENS.menu.primary,
                      }}
                    >
                      Details
                    </Button>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </div>
    </div>
    );
  };

  // SyncContent function removed from UI but preserved for future use

  // Single comprehensive alarms management
  const AlarmsContent = () => {
    const activeAlarms = Array.isArray(alarms) ? alarms.filter(a => a.status === 'active') : [];
    const filteredAlarms = Array.isArray(alarms) ? alarms.filter(alarm =>
      !alarmFilter || alarm.alarmGrade === alarmFilter
    ) : [];

    return (
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              background: DESIGN_TOKENS.gradients.orange,
              padding: '8px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <BellOutlined style={{ color: 'white', fontSize: '16px' }} />
            </div>
            <span style={{ fontSize: '18px', fontWeight: 600, color: 'rgba(0,0,0,0.8)' }}>
              Alarm Management
            </span>
            <Badge
              count={activeAlarms.length}
              overflowCount={99}
              style={{ backgroundColor: DESIGN_TOKENS.status.error }}
            />
          </div>
        }
        extra={
          <Space>
            <Select
              placeholder="Filter by level"
              style={{ width: 150 }}
              allowClear
              value={alarmFilter || undefined}
              onChange={(v) => setAlarmFilter(v ?? '')}
            >
              <Select.Option value="2">Severe</Select.Option>
              <Select.Option value="1">General</Select.Option>
              <Select.Option value="0">Prompt</Select.Option>
            </Select>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchAllData}
              loading={loading}
              style={{
                borderColor: DESIGN_TOKENS.menu.primary,
                color: DESIGN_TOKENS.menu.primary
              }}
            >
              Refresh
            </Button>
          </Space>
        }
      >
        {(!Array.isArray(alarms) || alarms.length === 0) ? (
          <div style={{
            background: DESIGN_TOKENS.backgrounds.green,
            border: `1px solid ${DESIGN_TOKENS.backgrounds.greenBorder}`,
            borderRadius: '12px',
            padding: '48px 24px',
            textAlign: 'center'
          }}>
            <Empty
              image={<SafetyCertificateOutlined style={{ fontSize: '64px', color: DESIGN_TOKENS.status.success }} />}
              description={
                <Space direction="vertical" size={8}>
                  <Text strong style={{ fontSize: '16px', color: 'rgba(0,0,0,0.85)' }}>
                    No Active Alarms
                  </Text>
                  <Text type="secondary">All systems are operating normally</Text>
                </Space>
              }
            />
          </div>
        ) : (
          <List
            dataSource={filteredAlarms}
            renderItem={(alarm) => {
              const isActive = alarm.status === 'active';
              const severityColor = alarm.alarmGrade === '2' ? DESIGN_TOKENS.status.error :
                                   alarm.alarmGrade === '1' ? DESIGN_TOKENS.status.warning :
                                   DESIGN_TOKENS.status.success;

              return (
                <List.Item
                  style={{
                    background: isActive ? DESIGN_TOKENS.backgrounds.red : 'transparent',
                    borderLeft: isActive ? DESIGN_TOKENS.borders.error : 'none',
                    padding: '16px',
                    marginBottom: '8px',
                    borderRadius: '8px',
                    transition: 'all 0.3s ease'
                  }}
                  actions={[
                    <Button
                      key="details"
                      type="link"
                      size="small"
                      icon={<FileTextOutlined />}
                      onClick={() => handleViewAlarmDetails(alarm)}
                      style={{ color: DESIGN_TOKENS.status.info }}
                    >
                      View Details
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar
                        icon={<ExclamationCircleOutlined />}
                        style={{
                          backgroundColor: severityColor,
                          boxShadow: `0 2px 8px ${severityColor}40`
                        }}
                      />
                    }
                    title={
                      <Space size="small">
                        <Text strong style={{ fontSize: '15px' }}>
                          {alarm.alarmContent || alarm.message || `Alarm ${alarm.alarmCode}`}
                        </Text>
                        <Tag
                          color={alarm.alarmGrade === '2' ? 'error' :
                                 alarm.alarmGrade === '1' ? 'warning' : 'success'}
                          style={{ fontWeight: 500 }}
                        >
                          {alarmGradeLabel(alarm.alarmGrade)}
                        </Tag>
                        <Tag
                          color={isActive ? 'error' : 'success'}
                          icon={isActive ? <ExclamationCircleOutlined /> : <CheckCircleOutlined />}
                        >
                          {isActive ? 'Active' : 'Resolved'}
                        </Tag>
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size={4} style={{ width: '100%' }}>
                        <Text style={{ color: 'rgba(0,0,0,0.65)' }}>
                          {alarmTypeLabel(alarm.alarmType)}{alarm.alarmCode ? ` · code ${alarm.alarmCode}` : ''}
                        </Text>
                        <div style={{
                          background: DESIGN_TOKENS.backgrounds.blue,
                          border: `1px solid ${DESIGN_TOKENS.backgrounds.blueBorder}`,
                          borderRadius: '6px',
                          padding: '6px 12px',
                          marginTop: '8px'
                        }}>
                          <Space split={<span style={{ color: '#d9d9d9' }}>•</span>}>
                            <Text style={{ fontSize: '12px', color: 'rgba(0,0,0,0.65)' }}>
                              <strong>Device:</strong> {alarm.equipmentSn || alarm.deviceSn || alarm.deviceId}
                            </Text>
                            <Text style={{ fontSize: '12px', color: 'rgba(0,0,0,0.65)' }}>
                              <strong>Plant:</strong> {alarm.plantName || '-'}
                            </Text>
                            <Text style={{ fontSize: '12px', color: 'rgba(0,0,0,0.65)' }}>
                              <strong>Time:</strong> {formatHopeCloudTime(alarm.reportedTime || alarm.occurredAt)}
                            </Text>
                          </Space>
                        </div>
                      </Space>
                    }
                  />
                </List.Item>
              );
            }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} alarms`,
            }}
          />
        )}
      </Card>
    );
  };

  // Communication modules management
  const CommunicationModulesContent = () => {
    const isEmpty = !Array.isArray(communicationModules) || communicationModules.length === 0;

    return (
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card
          title={
            <Space>
              <WifiOutlined />
              <span>Communication Modules</span>
              <Badge count={Array.isArray(communicationModules) ? communicationModules.length : 0} showZero />
            </Space>
          }
          extra={
            <Button icon={<ReloadOutlined />} onClick={fetchAllData} loading={loading}>
              Refresh
            </Button>
          }
        >
          {isEmpty ? (
            <Empty description="No communication modules found" />
          ) : (
          <Table
            columns={[
              {
                title: 'Module ID',
                dataIndex: 'id',
                key: 'id',
                width: 100,
              },
              {
                title: 'Site',
                key: 'site',
                render: (_, record) => (
                  <Space direction="vertical" size={4}>
                    <Text strong>{record.site?.name || 'Unknown'}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {record.site?.location || 'No location'}
                    </Text>
                  </Space>
                ),
              },
              {
                title: 'Equipment PN',
                dataIndex: 'equipmentPn',
                key: 'equipmentPn',
              },
              {
                title: 'Device Type',
                key: 'deviceType',
                render: (_, record) => (
                  <Tag color="blue">{moduleTypeLabel(record.deviceType)}</Tag>
                ),
              },
              {
                title: 'Status',
                key: 'status',
                render: (_, record) => (
                  <Badge
                    status={record.status === 'online' ? 'success' : record.status === 'fault' ? 'warning' : 'error'}
                    text={
                      <Text strong style={{ color: record.status === 'online' ? '#52c41a' : record.status === 'fault' ? '#fa8c16' : '#ff4d4f' }}>
                        {record.status === 'online' ? 'ONLINE' : record.status === 'fault' ? 'FAULT' : 'OFFLINE'}
                      </Text>
                    }
                  />
                ),
              },
              {
                title: 'Signal (RSSI)',
                key: 'rssi',
                render: (_, record) => {
                  const rssi = record.rssi || 0;
                  const quality = rssi > 60 ? 'Excellent' : rssi > 40 ? 'Good' : rssi > 20 ? 'Fair' : 'Poor';
                  const color = rssi > 60 ? '#52c41a' : rssi > 40 ? '#13c2c2' : rssi > 20 ? '#fa8c16' : '#ff4d4f';

                  return (
                    <Space direction="vertical" size={4}>
                      <Tag color={rssi > 60 ? 'green' : rssi > 40 ? 'cyan' : rssi > 20 ? 'orange' : 'red'}>
                        {rssi}
                      </Tag>
                      <Text type="secondary" style={{ fontSize: 12, color }}>
                        {quality}
                      </Text>
                    </Space>
                  );
                },
              },
              {
                title: 'Devices',
                dataIndex: 'loadedNumber',
                key: 'loadedNumber',
                render: (value) => <Text strong>{value || 0}</Text>,
              },
              {
                title: 'Last Update',
                key: 'updateTime',
                render: (_, record) => (
                  <Text type="secondary">
                    {record.updateTime ? new Date(record.updateTime).toLocaleString() : 'N/A'}
                  </Text>
                ),
              },
              {
                title: 'Actions',
                key: 'actions',
                render: (_, record) => (
                  <Button
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => handleViewCommModuleDetails(record.id, record.equipmentPn)}
                    style={{ background: '#13c2c2', borderColor: '#13c2c2', color: '#fff' }}
                  >
                    Details
                  </Button>
                ),
              },
            ]}
            dataSource={Array.isArray(communicationModules) ? communicationModules : []}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 10 }}
          />
          )}
        </Card>
      </Space>
    );
  };


  // Users and channels management
  const UsersContent = () => (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Card 
            title={
              <Space>
                <UserOutlined />
                <span>Sub Owners</span>
                <Badge count={Array.isArray(owners) ? owners.length : 0} showZero />
              </Space>
            }
          >
            <List
              dataSource={Array.isArray(owners) ? owners : []}
              renderItem={(owner) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <Avatar style={{ backgroundColor: '#13c2c2' }}>
                        {owner.nickName?.[0]?.toUpperCase() || owner.userName?.[0]?.toUpperCase() || <UserOutlined />}
                      </Avatar>
                    }
                    title={
                      <Space direction="vertical" size={0}>
                        <Text strong>{owner.nickName || owner.userName}</Text>
                        <Text type="secondary" style={{ fontSize: '12px' }}>@{owner.userName}</Text>
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size={4} style={{ marginTop: 8 }}>
                        {owner.email && (
                          <div>
                            <MailOutlined style={{ marginRight: 6, fontSize: '12px', color: '#13c2c2' }} />
                            <Text type="secondary" style={{ fontSize: '12px' }}>{owner.email}</Text>
                          </div>
                        )}
                        {owner.phone && (
                          <div>
                            <PhoneOutlined style={{ marginRight: 6, fontSize: '12px', color: '#13c2c2' }} />
                            <Text type="secondary" style={{ fontSize: '12px' }}>{owner.phone}</Text>
                          </div>
                        )}
                        <div>
                          <Text type="secondary" style={{ fontSize: '11px' }}>
                            User ID: {owner.userId}
                          </Text>
                        </div>
                        {owner.remark && (
                          <Text type="secondary" italic style={{ fontSize: '11px' }}>
                            {owner.remark}
                          </Text>
                        )}
                      </Space>
                    }
                  />
                </List.Item>
              )}
              pagination={{ pageSize: 5 }}
            />
          </Card>
        </Col>

        <Col span={12}>
          <Card 
            title={
              <Space>
                <TeamOutlined />
                <span>Channel Providers</span>
                <Badge count={Array.isArray(channelProviders) ? channelProviders.length : 0} showZero />
              </Space>
            }
          >
            <List
              dataSource={Array.isArray(channelProviders) ? channelProviders : []}
              renderItem={(provider) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar icon={<TeamOutlined />} />}
                    title={provider.channelName}
                    description={
                      <Space direction="vertical" size={2}>
                        <Text type="secondary">Provider: {provider.providerName}</Text>
                        <Text type="secondary">Contact: {provider.contactInfo}</Text>
                        <Badge 
                          status={provider.status === 'active' ? 'success' : 'default'} 
                          text={provider.status} 
                        />
                      </Space>
                    }
                  />
                </List.Item>
              )}
              pagination={{ pageSize: 5 }}
            />
          </Card>
        </Col>
      </Row>

      {Array.isArray(channelTree) && channelTree.length > 0 && (
        <Card 
          title={
            <Space>
              <ClusterOutlined />
              <span>Channel Tree Structure</span>
            </Space>
          }
        >
          <List
            dataSource={Array.isArray(channelTree) ? channelTree : []}
            renderItem={(node) => (
              <List.Item>
                <List.Item.Meta
                  avatar={<Avatar>{node.userName.charAt(0)}</Avatar>}
                  title={node.userName}
                  description={
                    <Space direction="vertical" size={2}>
                      <Text type="secondary">Nick: {node.nickName}</Text>
                      <Text type="secondary">Email: {node.email}</Text>
                      <Text type="secondary">Phone: {node.phone}</Text>
                      {node.childCompanyList.length > 0 && (
                        <Text type="secondary">
                          Sub-companies: {node.childCompanyList.length}
                        </Text>
                      )}
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      )}
    </Space>
  );

  const tabItems: TabsProps['items'] = [
    {
      key: 'dashboard',
      label: (
        <Space>
          <DashboardOutlined />
          Dashboard
        </Space>
      ),
      children: <div style={{ padding: 0, margin: 0, minHeight: 'calc(100vh - 120px)', width: '100%', overflowX: 'hidden', boxSizing: 'border-box' }}><StationsContent /></div>,
    },
    {
      key: 'stations',
      label: (
        <Space>
          <DatabaseOutlined />
          Stations
          <Badge count={Array.isArray(stations) ? stations.length : 0} showZero size="small" />
        </Space>
      ),
      children: <div style={{ padding: 0, margin: 0, minHeight: 'calc(100vh - 120px)', width: '100%', overflowX: 'hidden', boxSizing: 'border-box' }}><StationsContent /></div>,
    },
    // {
    //   key: 'sync',
    //   label: (
    //     <Space>
    //       <SyncOutlined />
    //       Data Sync
    //     </Space>
    //   ),
    //   children: <div style={{ padding: 0, margin: 0, minHeight: 'calc(100vh - 120px)', width: '100%', overflowX: 'hidden', boxSizing: 'border-box' }}><SyncContent /></div>,
    // },
    {
      key: 'alarms',
      label: (
        <Space>
          <BellOutlined />
          Alarms
          <Badge count={Array.isArray(alarms) ? alarms.filter(a => a.status === 'active').length : 0} showZero size="small" />
        </Space>
      ),
      children: <div style={{ padding: 0, margin: 0, minHeight: 'calc(100vh - 120px)', width: '100%', overflowX: 'hidden', boxSizing: 'border-box' }}><AlarmsContent /></div>,
    },
    {
      key: 'communication',
      label: (
        <Space>
          <WifiOutlined />
          Communication
          <Badge count={Array.isArray(communicationModules) ? communicationModules.length : 0} showZero size="small" />
        </Space>
      ),
      children: <div style={{ padding: 0, margin: 0, minHeight: 'calc(100vh - 120px)', width: '100%', overflowX: 'hidden', boxSizing: 'border-box' }}><CommunicationModulesContent /></div>,
    },
    {
      key: 'users',
      label: (
        <Space>
          <TeamOutlined />
          Users & Channels
        </Space>
      ),
      children: <div style={{ padding: 0, margin: 0, minHeight: 'calc(100vh - 120px)', width: '100%', overflowX: 'hidden', boxSizing: 'border-box' }}>{usersLoading && !usersLoaded ? <div style={{ padding: 48, textAlign: 'center' }}><Spin tip="Loading HopeCloud users…" /></div> : <UsersContent />}</div>,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5', margin: 0, padding: 0 }}>
      <Content style={{ padding: 0, margin: 0, width: '100%', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ 
          padding: '16px 24px', 
          borderBottom: '1px solid #d9d9d9',
          marginBottom: 0,
          background: '#ffffff',
          borderRadius: 0,
          marginTop: 0,
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          <Row justify="space-between" align="middle" style={{ padding: 0, width: '100%' }}>
            <Col>
              <Space size="large">
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                }}>
                  <CloudServerOutlined style={{ color: '#fff', fontSize: '24px' }} />
                </div>
                <div>
                  <Title level={2} style={{ margin: '0 0 4px 0', color: '#262626' }}>
                    HopeCloud Management Platform
                  </Title>
                  <Text type="secondary" style={{ fontSize: '14px' }}>
                    Comprehensive solar power monitoring and control system
                  </Text>
                  <br />
                  <Space size="middle" style={{ marginTop: '8px' }}>
                    <Badge 
                      status={isHealthy ? 'success' : 'error'} 
                      text={isHealthy ? 'Connected' : 'Connection Issues'} 
                    />
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      |
                    </Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {Array.isArray(stations) ? stations.length : 0} stations • {Array.isArray(alarms) ? alarms.filter(a => a.status === 'active').length : 0} active alarms
                    </Text>
                  </Space>
                </div>
              </Space>
            </Col>
            <Col>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={fetchAllData}
                loading={loading}
                size="large"
              >
                Refresh All Data
              </Button>
            </Col>
          </Row>
        </div>

        {loading ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '100px 0',
            background: '#fff',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
          }}>
            <Spin size="large" />
            <div style={{ marginTop: 24 }}>
              <Text style={{ fontSize: '16px', color: '#666' }}>
                Loading HopeCloud data and services...
              </Text>
              <br />
              <Text type="secondary" style={{ fontSize: '14px' }}>
                This may take a few moments to fetch all API endpoints
              </Text>
            </div>
          </div>
        ) : (
          <div style={{
            background: '#fff',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
            overflow: 'hidden'
          }}>
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              size="large"
              items={tabItems}
              style={{ margin: 0, width: '100%', overflow: 'hidden' }}
              tabBarStyle={{ 
                paddingLeft: '24px',
                paddingRight: '24px',
                marginBottom: 0,
                background: '#ffffff',
                borderBottom: '1px solid #d9d9d9',
                width: '100%',
                boxSizing: 'border-box'
              }}
            />
          </div>
        )}

        {/* Enhanced Station Details Modal */}
        <Modal
          title={
            <Space>
              <ThunderboltOutlined style={{ color: '#13c2c2' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <Text style={{ fontSize: '18px', fontWeight: 600 }}>
                  {selectedStation ? selectedStation.name : 'Station Details'}
                </Text>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Tag color="cyan">Comprehensive View</Tag>
                  {selectedStation && (
                    <>
                      <Tag color={selectedStation.status === 1 ? 'success' : 'error'}>
                        {selectedStation.status === 1 ? 'Online' : 'Offline'}
                      </Tag>
                      {selectedStation.kwp > 0 && <Tag color="purple">{selectedStation.kwp} kWp</Tag>}
                      {selectedStation.powerPlantType && <Tag color="orange">{selectedStation.powerPlantType}</Tag>}
                    </>
                  )}
                </div>
              </div>
            </Space>
          }
          open={stationDetailVisible}
          onCancel={() => {
            setStationDetailVisible(false);
            setSelectedStation(null);
            setDevices([]);
            setRealtimeData([]);
          }}
          footer={[
            <Button 
              key="refresh" 
              icon={<ReloadOutlined />} 
              onClick={() => selectedStation && handleViewStationDetailsModal(selectedStation.id)}
              loading={loading}
            >
              Refresh
            </Button>,
            <Button key="close" onClick={() => {
              setStationDetailVisible(false);
              setSelectedStation(null);
              setDevices([]);
              setRealtimeData([]);
            }}>
              Close
            </Button>
          ]}
          width={1200}
        >
          {selectedStation && (
            <Tabs
              defaultActiveKey="overview"
              items={[
                {
                  key: 'overview',
                  label: 'Station Overview',
                  children: (
                    <Space direction="vertical" size="large" style={{ width: '100%' }}>
                      <Row gutter={16}>
                        <Col span={8}>
                          <Card
                            size="small"
                            style={{
                              background: DESIGN_TOKENS.backgrounds.blue,
                              border: `1px solid ${DESIGN_TOKENS.backgrounds.blueBorder}`,
                            }}
                          >
                            <Statistic
                              title={<span style={{ color: 'rgba(0,0,0,0.85)', fontWeight: 500 }}>Current Power</span>}
                              value={selectedStation.nowKw}
                              precision={2}
                              suffix="kW"
                              prefix={<ThunderboltOutlined style={{ color: DESIGN_TOKENS.status.info }} />}
                              valueStyle={{ color: DESIGN_TOKENS.status.info, fontWeight: 600 }}
                            />
                            {selectedStation.kwp > 0 && (
                              <Progress
                                percent={Math.min(Math.round(((selectedStation.nowKw || 0) / selectedStation.kwp) * 100), 100)}
                                strokeColor={DESIGN_TOKENS.status.info}
                                style={{ marginTop: 12 }}
                              />
                            )}
                          </Card>
                        </Col>
                        <Col span={8}>
                          <Card
                            size="small"
                            style={{
                              background: DESIGN_TOKENS.backgrounds.green,
                              border: `1px solid ${DESIGN_TOKENS.backgrounds.greenBorder}`,
                            }}
                          >
                            <Statistic
                              title={<span style={{ color: 'rgba(0,0,0,0.85)', fontWeight: 500 }}>Today Generation</span>}
                              value={selectedStation.todayKwh}
                              precision={1}
                              suffix="kWh"
                              prefix={<SunOutlined style={{ color: DESIGN_TOKENS.status.success }} />}
                              valueStyle={{ color: DESIGN_TOKENS.status.success, fontWeight: 600 }}
                            />
                          </Card>
                        </Col>
                        <Col span={8}>
                          <Card
                            size="small"
                            style={{
                              background: selectedStation.status === 1
                                ? DESIGN_TOKENS.backgrounds.green
                                : DESIGN_TOKENS.backgrounds.red,
                              border: selectedStation.status === 1
                                ? `1px solid ${DESIGN_TOKENS.backgrounds.greenBorder}`
                                : `1px solid ${DESIGN_TOKENS.backgrounds.redBorder}`,
                            }}
                          >
                            <Statistic
                              title={<span style={{ color: 'rgba(0,0,0,0.85)', fontWeight: 500 }}>Status</span>}
                              value={selectedStation.status === 1 ? 'Online' : 'Offline'}
                              prefix={selectedStation.status === 1 ?
                                <CheckCircleOutlined style={{ color: DESIGN_TOKENS.status.success }} /> :
                                <ExclamationCircleOutlined style={{ color: DESIGN_TOKENS.status.error }} />
                              }
                              valueStyle={{
                                color: selectedStation.status === 1 ? DESIGN_TOKENS.status.success : DESIGN_TOKENS.status.error,
                                fontWeight: 600
                              }}
                            />
                          </Card>
                        </Col>
                      </Row>

                      <Card
                        title={
                          <span style={{ fontSize: '16px', fontWeight: 600, color: 'rgba(0,0,0,0.85)' }}>
                            Complete Station Information
                          </span>
                        }
                        size="small"
                        style={{
                          background: DESIGN_TOKENS.backgrounds.purple,
                          border: `1px solid ${DESIGN_TOKENS.backgrounds.purpleBorder}`,
                        }}
                      >
                        {/* The stored data carries name, address, capacity and update time; the vendor
                            list adds owner, company and region. Fields marked with a gap are shown as "-"
                            when absent, so the maintainer can see what the API leaves empty. */}
                        <Descriptions column={3} size="small" bordered>
                          {([
                            ['Station Name', null, selectedStation.name],
                            ['Owner', 'gap', selectedStation.ownerName],
                            ['Company', 'gap', selectedStation.companyName],
                            ['Address', null, selectedStation.address],
                            ['City', 'gap', selectedStation.city],
                            ['Province', 'gap', selectedStation.province],
                            ['District', 'gap', selectedStation.district],
                            ['Plant Type', 'gap', selectedStation.powerPlantType],
                            ['Network Type', 'gap', selectedStation.networkType],
                            ['Capacity', null, selectedStation.kwp > 0 ? `${selectedStation.kwp} kWp` : undefined],
                            ['Orientation', 'gap', toNumber(selectedStation.orientationAngle) !== undefined ? `${selectedStation.orientationAngle}°` : undefined],
                            ['Dip Angle', 'gap', toNumber(selectedStation.dipAngle) !== undefined ? `${selectedStation.dipAngle}°` : undefined],
                            ['Coordinates', null, selectedStation.latitude && selectedStation.longitude ? `${selectedStation.latitude}, ${selectedStation.longitude}` : undefined],
                            ['Owner Phone', 'gap', selectedStation.ownerPhone],
                            ['Plant Contact', 'gap', selectedStation.plantContact],
                            ['Plant Phone', 'gap', selectedStation.plantContactPhone],
                            ['Service Provider', 'gap', selectedStation.serviceProviderName],
                            ['Service Phone', 'gap', selectedStation.serviceProviderPhone],
                            ['Payment Type', 'gap', selectedStation.paymentType],
                            ['Subassemblies', 'gap', selectedStation.subassemblyNumber || undefined],
                            ['Last Update', null, selectedStation.updateTime ? formatHopeCloudTime(selectedStation.updateTime) : undefined],
                            ['Network Time', 'gap', selectedStation.networkTime],
                          ] as [string, 'gap' | null, React.ReactNode][])
                            .filter(([, gap, value]) => gap || (value !== undefined && value !== null && value !== ''))
                            .map(([label, gap, value]) => (
                              <Descriptions.Item key={label} label={gap ? withGap(label, 'hopeCloudStationProfile') : label}>
                                {value === undefined || value === null || value === '' ? '-' : value}
                              </Descriptions.Item>
                            ))}
                        </Descriptions>

                        {selectedStation.remark && (
                          <div style={{
                            marginTop: 16,
                            background: DESIGN_TOKENS.backgrounds.orange,
                            border: `1px solid ${DESIGN_TOKENS.backgrounds.orangeBorder}`,
                            borderRadius: '6px',
                            padding: '12px'
                          }}>
                            <Text strong style={{ color: 'rgba(0,0,0,0.85)' }}>Remarks:</Text>
                            <br />
                            <Text style={{ color: 'rgba(0,0,0,0.65)' }}>{selectedStation.remark}</Text>
                          </div>
                        )}
                      </Card>
                    </Space>
                  ),
                },
                {
                  key: 'devices',
                  label: `Station Devices (${Array.isArray(devices) ? devices.length : 0})`,
                  children: (Array.isArray(devices) && devices.length > 0) ? (
                    <Table
                      columns={[
                        {
                          title: 'Device Name',
                          dataIndex: 'equipmentName',
                          key: 'equipmentName',
                        },
                        {
                          title: 'Serial Number',
                          dataIndex: 'equipmentSn',
                          key: 'equipmentSn',
                        },
                        {
                          title: 'Model',
                          dataIndex: 'equipmentModel',
                          key: 'equipmentModel',
                        },
                        {
                          title: 'Status',
                          dataIndex: 'status',
                          key: 'status',
                          render: (status: number) => (
                            <Badge status={inverterStatus(status).badge} text={inverterStatus(status).label} />
                          ),
                        },
                        {
                          title: 'Current Power',
                          dataIndex: 'nowKw',
                          key: 'nowKw',
                          render: (power: number) => `${(power || 0).toFixed(2)} kW`,
                        },
                        {
                          title: 'Rated Power',
                          dataIndex: 'ratedPower',
                          key: 'ratedPower',
                          render: (power: number) => (toNumber(power) !== undefined ? `${power} kW` : '-'),
                        },
                        {
                          title: 'Actions',
                          key: 'actions',
                          render: (_, record) => (
                            <Space size={4}>
                              <Button 
                                size="small"
                                icon={<ToolOutlined />}
                                onClick={() => handleViewDeviceDetails(record)}
                              >
                                Details
                              </Button>
                              <Button
                                size="small"
                                icon={<BarChartOutlined />}
                                onClick={() => handleOpenEquipmentStatsDashboard(record.equipmentSn, record.equipmentName)}
                                style={{ background: 'linear-gradient(135deg, #f9f0ff 0%, #d3adf7 100%)', borderColor: '#722ed1' }}
                              >
                                ⚡ Equipment Stats
                              </Button>
                            </Space>
                          ),
                        },
                      ]}
                      dataSource={Array.isArray(devices) ? devices : []}
                      rowKey="id"
                      size="small"
                      pagination={{ pageSize: 10 }}
                    />
                  ) : (
                    <Empty description="No devices found for this station" />
                  ),
                },
                {
                  key: 'money',
                  label: 'Daromad va prognoz',
                  children: selectedStation ? (
                    <StationInsightCard
                      provider="hopecloud"
                      stationId={String(selectedStation.id)}
                      energy={{
                        todayKwh: toNumber(selectedStation.todayKwh),
                        monthKwh: toNumber(selectedStation.monKwh),
                        yearKwh: toNumber(selectedStation.yearKwh),
                        totalKwh: toNumber(selectedStation.sumKwh),
                      }}
                    />
                  ) : null,
                },
                {
                  key: 'realtime',
                  label: 'Real-time Data',
                  children: (Array.isArray(realtimeData) && realtimeData.length > 0) ? (
                    <Space direction="vertical" size="large" style={{ width: '100%' }}>
                      {Array.isArray(realtimeData) && realtimeData.map((data, index) => (
                        <Card
                          key={index}
                          size="small"
                          title={
                            <span style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(0,0,0,0.85)' }}>
                              Current Real-time Metrics
                            </span>
                          }
                          extra={data.time ? <Text type="secondary">Measured {formatHopeCloudTime(data.time)}</Text> : undefined}
                          style={{
                            background: DESIGN_TOKENS.backgrounds.green,
                            border: `1px solid ${DESIGN_TOKENS.backgrounds.greenBorder}`,
                          }}
                        >
                          {/* getPowerPlantRealData returns only power and its time; the yields come
                              from the station record. */}
                          <Row gutter={16}>
                            {[
                              { title: 'Active Power', value: toNumber(data.nowKw), suffix: data.powerUnit || 'kW', color: DESIGN_TOKENS.status.info, icon: <ThunderboltOutlined /> },
                              { title: 'Day Yield', value: toNumber(selectedStation.todayKwh), suffix: 'kWh', color: DESIGN_TOKENS.status.success, icon: <SunOutlined /> },
                              { title: 'Total Yield', value: toNumber(selectedStation.sumKwh), suffix: 'kWh', color: DESIGN_TOKENS.status.purple },
                              { title: 'Efficiency', value: undefined, suffix: '%', color: DESIGN_TOKENS.status.warning, gap: true },
                            ].map((tile) => (
                              <Col span={6} key={tile.title}>
                                <Card size="small" style={{ background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                                  <Statistic
                                    title={
                                      <span style={{ color: 'rgba(0,0,0,0.65)' }}>
                                        {'gap' in tile ? withGap(tile.title, 'hopeCloudStationEfficiency') : tile.title}
                                      </span>
                                    }
                                    value={tile.value ?? '-'}
                                    suffix={tile.value !== undefined ? tile.suffix : undefined}
                                    valueStyle={{ color: tile.color }}
                                    prefix={tile.icon}
                                  />
                                </Card>
                              </Col>
                            ))}
                          </Row>
                        </Card>
                      ))}
                    </Space>
                  ) : (
                    <div style={{
                      background: DESIGN_TOKENS.backgrounds.orange,
                      border: `1px solid ${DESIGN_TOKENS.backgrounds.orangeBorder}`,
                      borderRadius: '12px',
                      padding: '48px 24px',
                      textAlign: 'center'
                    }}>
                      <Empty description="No real-time data available" />
                    </div>
                  ),
                },
              ]}
            />
          )}
        </Modal>

        {/* Device Details Drawer */}
        <Drawer
          title={
            <Space>
              <ToolOutlined />
              {selectedDevice ? selectedDevice.equipmentName : 'Device Details'}
            </Space>
          }
          placement="right"
          onClose={() => {
            setDeviceDrawerVisible(false);
            setSelectedDevice(null);
            setEquipmentDetails(null);
            setEquipmentRealtimeData(null);
            setEquipmentAlarms([]);
          }}
          open={deviceDrawerVisible}
          width={600}
        >
          {selectedDevice && (
            <Tabs
              defaultActiveKey="basic"
              items={[
                {
                  key: 'basic',
                  label: 'Basic Info',
                  children: (
                    <Space direction="vertical" size="large" style={{ width: '100%' }}>
                      <Card
                        size="small"
                        title={
                          <span style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(0,0,0,0.85)' }}>
                            Basic Device Information
                          </span>
                        }
                        style={{
                          background: DESIGN_TOKENS.backgrounds.purple,
                          border: `1px solid ${DESIGN_TOKENS.backgrounds.purpleBorder}`,
                        }}
                      >
                        <Descriptions column={1} size="small">
                          <Descriptions.Item label="Equipment Name">{selectedDevice.equipmentName}</Descriptions.Item>
                          <Descriptions.Item label="Serial Number">{selectedDevice.equipmentSn}</Descriptions.Item>
                          <Descriptions.Item label="Model">{selectedDevice.equipmentModel}</Descriptions.Item>
                          {toNumber(selectedDevice.ratedPower) !== undefined && (
                            <Descriptions.Item label="Rated Power">{selectedDevice.ratedPower} kW</Descriptions.Item>
                          )}
                          <Descriptions.Item label="Current Power">{(toNumber(selectedDevice.nowKw) ?? 0).toFixed(2)} kW</Descriptions.Item>
                          <Descriptions.Item label="Status">
                            <Badge status={inverterStatus(selectedDevice.status).badge} text={inverterStatus(selectedDevice.status).label} />
                          </Descriptions.Item>
                        </Descriptions>
                      </Card>

                      {equipmentDetails && (
                        <Card
                          size="small"
                          title={
                            <span style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(0,0,0,0.85)' }}>
                              Advanced Equipment Details
                            </span>
                          }
                          style={{
                            background: DESIGN_TOKENS.backgrounds.blue,
                            border: `1px solid ${DESIGN_TOKENS.backgrounds.blueBorder}`,
                          }}
                        >
                          <Descriptions column={1} size="small">
                            {([
                              ['Name', equipmentDetails.equipmentName],
                              ['Model', equipmentDetails.equipmentModel],
                              ['Rated Power', toNumber(equipmentDetails.ratedPower) !== undefined ? `${equipmentDetails.ratedPower} kW` : undefined],
                              ['Datalogger', equipmentDetails.divertorName || equipmentDetails.equipmentPn],
                              ['Software DC/AC', equipmentDetails.softDcacCode],
                              ['Software DC/DC', equipmentDetails.softDcdcCode],
                              ['Parameters DC/AC', equipmentDetails.paramDcacCode],
                              ['Parameters DC/DC', equipmentDetails.paramDcdcCode],
                              ['Today', toNumber(equipmentDetails.todayKwh) !== undefined ? `${equipmentDetails.todayKwh} kWh` : undefined],
                              ['Total', toNumber(equipmentDetails.sumKwh) !== undefined ? `${equipmentDetails.sumKwh} kWh` : undefined],
                              ['Last Update', equipmentDetails.updateTime ? formatHopeCloudTime(equipmentDetails.updateTime) : undefined],
                            ] as [string, React.ReactNode][])
                              .filter(([, value]) => value !== undefined && value !== null && value !== '')
                              .map(([label, value]) => (
                                <Descriptions.Item key={label} label={label}>{value}</Descriptions.Item>
                              ))}
                            <Descriptions.Item label={withGap('Firmware Version', 'hopeCloudFirmware')}>
                              {(equipmentDetails as any).firmwareVersion || '-'}
                            </Descriptions.Item>
                          </Descriptions>
                        </Card>
                      )}
                    </Space>
                  ),
                },
                {
                  key: 'realtime',
                  label: 'Real-time Data',
                  children: equipmentRealtimeData ? (() => {
                    // getEquipmentData: nowKw, powerFactor and internalTemperature at the top level,
                    // everything else in paramData.paramList under the inverter's own keys
                    const params = equipmentRealtimeData.paramData?.paramList;
                    const triple = (keys: string[]) => {
                      const values = keys.map((k) => paramNumber(params, k));
                      return values.every((v) => v !== undefined) ? values.join(' / ') : undefined;
                    };
                    const tiles: { title: string; value: number | string | undefined; suffix?: string }[] = [
                      { title: 'Active Power', value: toNumber(equipmentRealtimeData.nowKw) ?? paramNumber(params, 'ACActivePower'), suffix: 'kW' },
                      { title: 'DC Input Power', value: paramNumber(params, 'DCInputPower'), suffix: 'kW' },
                      { title: 'Grid Voltage AB / BC / CA', value: triple(['gridABLineVoltage', 'gridBCLineVoltage', 'gridCALineVoltage']), suffix: 'V' },
                      { title: 'Grid Current A / B / C', value: triple(['gridAPhaseCurrentIa', 'gridBPhaseCurrentIb', 'gridCPhaseCurrentIc']), suffix: 'A' },
                      { title: 'Grid Frequency', value: paramNumber(params, 'gridFrequency'), suffix: 'Hz' },
                      { title: 'Power Factor', value: toNumber(equipmentRealtimeData.powerFactor) ?? paramNumber(params, 'powerFactor') },
                      { title: 'Internal Temperature', value: toNumber(equipmentRealtimeData.internalTemperature) ?? paramNumber(params, 'internalTemperature'), suffix: '°C' },
                      { title: 'Inverter Efficiency', value: paramNumber(params, 'inverterEfficiency'), suffix: '%' },
                    ];
                    const state = paramText(params, 'inverterState');
                    return (
                      <Card
                        size="small"
                        title="Equipment Real-time Metrics"
                        extra={equipmentRealtimeData.paramData?.time ? <Text type="secondary">Measured {formatHopeCloudTime(equipmentRealtimeData.paramData.time)}</Text> : undefined}
                      >
                        {state && (
                          <div style={{ marginBottom: 12 }}>
                            <Text type="secondary">Inverter state: </Text><Tag>{state}</Tag>
                          </div>
                        )}
                        <Row gutter={[16, 16]}>
                          {tiles.filter((t) => t.value !== undefined).map((t) => (
                            <Col span={12} key={t.title}>
                              <Statistic title={t.title} value={t.value} suffix={t.suffix} />
                            </Col>
                          ))}
                        </Row>
                      </Card>
                    );
                  })() : (
                    <Empty description="No real-time data available" />
                  ),
                },
                {
                  key: 'alarms',
                  label: 'Device Alarms',
                  children: (
                    <Card 
                      size="small" 
                      title="Equipment Alarm History"
                      extra={
                        <Button
                          size="small"
                          icon={<ReloadOutlined />}
                          onClick={() => handleViewEquipmentAlarms(selectedDevice.equipmentSn)}
                        >
                          Load Alarms
                        </Button>
                      }
                    >
                      {(Array.isArray(equipmentAlarms) && equipmentAlarms.length > 0) ? (
                        <List
                          dataSource={Array.isArray(equipmentAlarms) ? equipmentAlarms : []}
                          renderItem={(alarm) => (
                            <List.Item>
                              <List.Item.Meta
                                avatar={
                                  <Avatar 
                                    icon={<AlertOutlined />} 
                                    style={{ backgroundColor: '#ff4d4f' }} 
                                  />
                                }
                                title={alarm.alarmContent || alarm.message || alarmTypeLabel(alarm.alarmType)}
                                description={
                                  <Space direction="vertical" size={2}>
                                    <Text>
                                      {alarmTypeLabel(alarm.alarmType)} · {alarmGradeLabel(alarm.alarmGrade)}
                                      {alarm.alarmCode ? ` · code ${alarm.alarmCode}` : ''}
                                    </Text>
                                    <Text type="secondary" style={{ fontSize: '12px' }}>
                                      {formatHopeCloudTime(alarm.reportedTime || alarm.occurredAt)}
                                      {alarm.restoreTime ? ` → ${formatHopeCloudTime(alarm.restoreTime)}` : ''}
                                    </Text>
                                  </Space>
                                }
                              />
                            </List.Item>
                          )}
                          pagination={{ pageSize: 5 }}
                        />
                      ) : (
                        <Empty description="No alarms found for this device" />
                      )}
                    </Card>
                  ),
                },
                {
                  key: 'statistics',
                  label: 'Statistics',
                  children: (
                    <Card size="small" title="Equipment Performance Statistics">
                      <Space wrap>
                        <Button
                          icon={<BarChartOutlined />}
                          onClick={() => handleOpenEquipmentStatsDashboard(selectedDevice.equipmentSn, selectedDevice.equipmentName)}
                        >
                          Daily / Monthly / Yearly Statistics
                        </Button>
                        <Button
                          icon={<LineChartOutlined />}
                          onClick={() => handleViewEquipmentHistory(selectedDevice)}
                          style={{ background: '#13c2c2', borderColor: '#13c2c2', color: '#fff' }}
                        >
                          Historical Data
                        </Button>
                      </Space>
                    </Card>
                  ),
                },
              ]}
            />
          )}
        </Drawer>

        {/* Create Station Modal */}
        <Modal
          title="Create New Power Station"
          open={createStationVisible}
          onCancel={() => setCreateStationVisible(false)}
          footer={null}
          width={800}
        >
          <Form
            layout="vertical"
            onFinish={handleCreateStation}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="plantName"
                  label="Station Name"
                  rules={[{ required: true, message: 'Please input station name' }]}
                >
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="powerPlantType"
                  label="Plant Type"
                  rules={[{ required: true, message: 'Please select plant type' }]}
                >
                  <Select>
                    {stationConfigTypes?.powerPlantTypes && Object.entries(stationConfigTypes.powerPlantTypes).map(([key, value]) => (
                      <Select.Option key={key} value={key}>{value}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="networkType"
                  label="Network Type"
                  rules={[{ required: true, message: 'Please select network type' }]}
                >
                  <Select>
                    {stationConfigTypes?.networkTypes && Object.entries(stationConfigTypes.networkTypes).map(([key, value]) => (
                      <Select.Option key={key} value={key}>{value}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="kwp" label="Capacity (kWp)">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="address" label="Address">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="country" label="Country">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="province" label="Province">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="city" label="City">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="longitude" label="Longitude">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="latitude" label="Latitude">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item
                  name="snList"
                  label="Device Serial Numbers"
                  rules={[{ required: true, message: 'Please input device serial numbers' }]}
                >
                  <Input.TextArea placeholder="Enter serial numbers, one per line" rows={4} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item>
              <Space>
                <Button
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  style={{ background: '#13c2c2', borderColor: '#13c2c2', color: '#fff' }}
                >
                  Create Station
                </Button>
                <Button onClick={() => setCreateStationVisible(false)} icon={<CloseOutlined />}>
                  Cancel
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        {/* Bind Devices Modal */}
        <Modal
          title="Bind Devices to Station"
          open={bindDevicesVisible}
          onCancel={() => setBindDevicesVisible(false)}
          footer={null}
        >
          <Form
            layout="vertical"
            onFinish={(values) => {
              const deviceData: BindDevicesDto = {
                snList: values.snList?.split('\n').filter((sn: string) => sn.trim()) || [],
                pnList: values.pnList?.split('\n').filter((pn: string) => pn.trim()) || [],
              };
              handleBindDevices(selectedStationId, deviceData);
            }}
          >
            <Form.Item
              name="snList"
              label="Device Serial Numbers"
              rules={[{ required: true, message: 'Please input device serial numbers' }]}
            >
              <Input.TextArea placeholder="Enter serial numbers, one per line" rows={4} />
            </Form.Item>
            <Form.Item name="pnList" label="Device Part Numbers (Optional)">
              <Input.TextArea placeholder="Enter part numbers, one per line" rows={4} />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button
                  htmlType="submit"
                  icon={<LinkOutlined />}
                  style={{ background: '#13c2c2', borderColor: '#13c2c2', color: '#fff' }}
                >
                  Bind Devices
                </Button>
                <Button onClick={() => setBindDevicesVisible(false)} icon={<CloseOutlined />}>
                  Cancel
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        {/* Alarm Details Modal */}
        <Modal
          title={
            <Space>
              <AlertOutlined />
              <span>Alarm Details</span>
              {!selectedAlarmDetails?.causesAnalysis && !selectedAlarmDetails?.diagnosticAdvice && (
                <Tag color="orange">Basic Info</Tag>
              )}
            </Space>
          }
          open={alarmDetailVisible}
          onCancel={() => {
            setAlarmDetailVisible(false);
            setSelectedAlarmDetails(null);
          }}
          footer={[
            <Button key="close" onClick={() => {
              setAlarmDetailVisible(false);
              setSelectedAlarmDetails(null);
            }}>
              Close
            </Button>
          ]}
          width={700}
        >
          {selectedAlarmDetails && (
            <>
              {!selectedAlarmDetails.causesAnalysis && !selectedAlarmDetails.diagnosticAdvice && (
                <Alert
                  message="Limited Information Available"
                  description="Detailed analysis and diagnostic advice are temporarily unavailable. Showing basic alarm information."
                  type="warning"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              )}
              <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="Alarm ID">{selectedAlarmDetails.alarmId}</Descriptions.Item>
              <Descriptions.Item label="Plant">{selectedAlarmDetails.plantName}</Descriptions.Item>
              <Descriptions.Item label="Alarm Code">{selectedAlarmDetails.alarmCode}</Descriptions.Item>
              <Descriptions.Item label="Device SN">{selectedAlarmDetails.equipmentSn || selectedAlarmDetails.deviceSn}</Descriptions.Item>
              <Descriptions.Item label="Equipment PN">{selectedAlarmDetails.equipmentPn}</Descriptions.Item>
              <Descriptions.Item label="Alarm Level">{alarmGradeLabel(selectedAlarmDetails.alarmGrade)}</Descriptions.Item>
              <Descriptions.Item label="Status" span={2}>
                <Badge 
                  status={selectedAlarmDetails.status === 'active' ? 'error' : 'success'} 
                  text={selectedAlarmDetails.status === 'active' ? 'Active' : 'Resolved'} 
                />
              </Descriptions.Item>
              <Descriptions.Item label="Alarm Content" span={2}>
                {selectedAlarmDetails.alarmContent || selectedAlarmDetails.message}
              </Descriptions.Item>
              <Descriptions.Item label="Reported Time">{formatHopeCloudTime(selectedAlarmDetails.reportedTime || selectedAlarmDetails.occurredAt)}</Descriptions.Item>
              <Descriptions.Item label="Restore Time">{selectedAlarmDetails.restoreTime ? formatHopeCloudTime(selectedAlarmDetails.restoreTime) : '-'}</Descriptions.Item>
              {selectedAlarmDetails.causesAnalysis && (
                <Descriptions.Item label="Causes Analysis" span={2}>
                  {selectedAlarmDetails.causesAnalysis}
                </Descriptions.Item>
              )}
              {selectedAlarmDetails.diagnosticAdvice && (
                <Descriptions.Item label="Diagnostic Advice" span={2}>
                  {selectedAlarmDetails.diagnosticAdvice}
                </Descriptions.Item>
              )}
            </Descriptions>
            </>
          )}
        </Modal>

        {/* Communication Module Details Modal */}
        <Modal
          title="Communication Module Details"
          open={commModuleVisible}
          onCancel={() => {
            setCommModuleVisible(false);
            setSelectedCommModule(null);
          }}
          footer={[
            <Button key="close" onClick={() => {
              setCommModuleVisible(false);
              setSelectedCommModule(null);
            }}>
              Close
            </Button>
          ]}
          width={600}
        >
          {selectedCommModule && (
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="Module Name">{selectedCommModule.divertorName}</Descriptions.Item>
              <Descriptions.Item label="Part Number">{selectedCommModule.equipmentPn}</Descriptions.Item>
              <Descriptions.Item label="Device Type">{moduleTypeLabel(selectedCommModule.deviceType)}</Descriptions.Item>
              <Descriptions.Item label="Status">
                <Badge
                  status={selectedCommModule.status === 'online' ? 'success' : selectedCommModule.status === 'fault' ? 'warning' : 'error'}
                  text={selectedCommModule.status === 'online' ? 'Online' : selectedCommModule.status === 'fault' ? 'Fault' : 'Offline'}
                />
              </Descriptions.Item>
              <Descriptions.Item label="Signal (0-100)">{selectedCommModule.rssi}</Descriptions.Item>
              <Descriptions.Item label="Loaded Number">{selectedCommModule.loadedNumber}</Descriptions.Item>
              {selectedCommModule.iccid && (
                <Descriptions.Item label="ICCID" span={2}>{selectedCommModule.iccid}</Descriptions.Item>
              )}
              {selectedCommModule.latitude && selectedCommModule.longitude && (
                <>
                  <Descriptions.Item label="Latitude">{selectedCommModule.latitude}</Descriptions.Item>
                  <Descriptions.Item label="Longitude">{selectedCommModule.longitude}</Descriptions.Item>
                </>
              )}
              {selectedCommModule.operatorType && (
                <Descriptions.Item label="Operator">{selectedCommModule.operatorType}</Descriptions.Item>
              )}
              {selectedCommModule.powerPlantName && (
                <Descriptions.Item label="Power Plant">{selectedCommModule.powerPlantName}</Descriptions.Item>
              )}
              {selectedCommModule.updateTime && (
                <Descriptions.Item label="Last Update">{formatHopeCloudTime(selectedCommModule.updateTime)}</Descriptions.Item>
              )}
            </Descriptions>
          )}
        </Modal>

      </Content>


      {/* Communication Module Details Modal */}
      <Modal
        title={<><WifiOutlined /> Communication Module Details</>}
        open={commModuleDetailsVisible}
        onCancel={() => setCommModuleDetailsVisible(false)}
        width={600}
        footer={[
          <Button key="close" onClick={() => setCommModuleDetailsVisible(false)}>
            Close
          </Button>
        ]}
      >
        {selectedCommModuleDetails && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="Module ID">{selectedCommModuleDetails.id}</Descriptions.Item>
            <Descriptions.Item label="Equipment PN">{selectedCommModuleDetails.equipmentPn}</Descriptions.Item>
            <Descriptions.Item label="Name">{selectedCommModuleDetails.divertorName}</Descriptions.Item>
            <Descriptions.Item label="Device Type">{moduleTypeLabel(selectedCommModuleDetails.deviceType)}</Descriptions.Item>
            <Descriptions.Item label="Status">
              <Badge
                status={selectedCommModuleDetails.status === 'online' ? 'success' : selectedCommModuleDetails.status === 'fault' ? 'warning' : 'error'}
                text={selectedCommModuleDetails.status === 'online' ? 'Online' : selectedCommModuleDetails.status === 'fault' ? 'Fault' : 'Offline'}
              />
            </Descriptions.Item>
            <Descriptions.Item label="Signal (0-100)">{selectedCommModuleDetails.rssi}</Descriptions.Item>
            <Descriptions.Item label="Loaded Devices">{selectedCommModuleDetails.loadedNumber}</Descriptions.Item>
            {selectedCommModuleDetails.iccid && (
              <Descriptions.Item label="ICCID">{selectedCommModuleDetails.iccid}</Descriptions.Item>
            )}
            {selectedCommModuleDetails.operatorType && (
              <Descriptions.Item label="Operator">{selectedCommModuleDetails.operatorType}</Descriptions.Item>
            )}
            {selectedCommModuleDetails.updateTime && (
              <Descriptions.Item label="Last Update">{formatHopeCloudTime(selectedCommModuleDetails.updateTime)}</Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>

      {/* Station Historical Data Modal */}
      <Modal
        title={
          <Space>
            <LineChartOutlined />
            {selectedStationForHistory?.name ? `${selectedStationForHistory.name} - Historical Data` : 'Station Historical Data'}
          </Space>
        }
        open={stationHistoryVisible}
        onCancel={() => {
          setStationHistoryVisible(false);
          setSelectedStationForHistory(null);
        }}
        width={1200}
        style={{ top: 20 }}
        footer={null}
      >
        {selectedStationForHistory && (
          <HopeCloudStationHistory 
            stationId={selectedStationForHistory.id}
            stationName={selectedStationForHistory.name}
          />
        )}
      </Modal>

      {/* Equipment Historical Data Modal */}
      <Modal
        title={
          <Space>
            <BarChartOutlined />
            {selectedEquipmentForHistory?.equipmentName ? `${selectedEquipmentForHistory.equipmentName} - Historical Data` : 'Equipment Historical Data'}
          </Space>
        }
        open={equipmentHistoryVisible}
        onCancel={() => {
          setEquipmentHistoryVisible(false);
          setSelectedEquipmentForHistory(null);
        }}
        width={1200}
        style={{ top: 20 }}
        footer={null}
      >
        {selectedEquipmentForHistory && (
          <HopeCloudEquipmentHistory 
            deviceSn={selectedEquipmentForHistory.equipmentSn}
            equipmentName={selectedEquipmentForHistory.equipmentName}
            inverterSn={selectedEquipmentForHistory.equipmentSn}
          />
        )}
      </Modal>

      {/* Statistics Dashboard */}
      <StatisticsDashboard
        open={statisticsDashboardVisible}
        onClose={handleCloseStatisticsDashboard}
        stationId={selectedStationIdForStats}
        equipmentSn={selectedEquipmentSnForStats}
        title={statisticsDashboardTitle}
      />
      
    </Layout>
  );
};

export default HopeCloudManagement;