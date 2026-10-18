import { lazy, Suspense } from "react";
import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  RouterProvider,
  Navigate,
} from "react-router-dom";
import { Spin } from "antd";
import App from "../App";
import {
  NotFound,
  SignIn,
  ActivateAccount,
  ResetPassword,
  ForgotPassword,
} from "@pages";
import { LayoutProtect } from "@pages";
import { LoginProtect } from "@pages";

// Loading component for suspense fallback
const PageLoader = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    width: '100%'
  }}>
    <Spin size="large" tip="Loading..." />
  </div>
);

// Lazy load admin layout and pages
const AdminLayout = lazy(() => import("../pages/admin/admin-layout"));
const Dashboard = lazy(() => import("../pages/admin/dashboard"));
const UserManagement = lazy(() => import("../pages/admin/users/user-management"));
const UserStationsManagement = lazy(() => import("../pages/admin/user-stations/user-stations-management"));
const HopeCloudManagement = lazy(() => import("../pages/admin/hopecloud/hopecloud-management"));
const SyncDataManagement = lazy(() => import("../pages/admin/hopecloud/sync-data-management"));
const SitesManagement = lazy(() => import("../pages/admin/sites/sites-management"));
const FusionSolarManagement = lazy(() => import("../pages/admin/fusion-solar/fusion-solar-management"));
const ReportsManagement = lazy(() => import("../pages/admin/reports/reports-management"));
const MonitoringManagement = lazy(() => import("../pages/admin/monitoring/monitoring-management"));
const AnalyticsManagement = lazy(() => import("../pages/admin/analytics/analytics-management"));
const NotificationsManagement = lazy(() => import("../pages/admin/notifications/notifications-management"));
const DevicesManagement = lazy(() => import("../pages/admin/devices/devices-management"));
const AvailabilityPage = lazy(() => import("../pages/admin/availability/availability-page"));
const TemperaturePage = lazy(() => import("../pages/admin/availability/temperature-page"));
const PlanPage = lazy(() => import("../pages/admin/plan/plan-page"));
const HuaweiStations = lazy(() => import("../pages/admin/huawei/huawei-stations"));

// Lazy load Fsolar pages
const FsolarRealTimeMonitoring = lazy(() => import("../pages/admin/fsolar/real-time-monitoring"));
const FsolarDevicesManagement = lazy(() => import("../pages/admin/fsolar/devices-management"));
const FsolarDeviceSettings = lazy(() => import("../pages/admin/fsolar/device-settings"));
const FsolarEnergyAnalytics = lazy(() => import("../pages/admin/fsolar/energy-analytics"));
const FsolarHistoricalData = lazy(() => import("../pages/admin/fsolar/historical-data"));
const FsolarTemplatesManagement = lazy(() => import("../pages/admin/fsolar/templates-management"));
const FsolarTasksManagement = lazy(() => import("../pages/admin/fsolar/tasks-management"));
const FsolarTaskMonitoring = lazy(() => import("../pages/admin/fsolar/task-monitoring"));
const FsolarRunRecords = lazy(() => import("../pages/admin/fsolar/run-records"));
const FsolarDeviceAlarms = lazy(() => import("../pages/admin/fsolar/device-alarms"));

// Lazy load SolisCloud pages
const SolisCloudDashboard = lazy(() => import("../pages/admin/soliscloud/dashboard"));
const SolisCloudStations = lazy(() => import("../pages/admin/soliscloud/stations"));
const StationDetailPage = lazy(() => import("../pages/admin/soliscloud/station-detail"));
const StationChartsPage = lazy(() => import("../pages/admin/soliscloud/station-charts"));
const SolisCloudInverters = lazy(() => import("../pages/admin/soliscloud/inverters"));
const InverterDetailPage = lazy(() => import("../pages/admin/soliscloud/inverter-detail"));
const InverterChartsPage = lazy(() => import("../pages/admin/soliscloud/inverter-charts"));
const SolisCloudAlarms = lazy(() => import("../pages/admin/soliscloud/alarms"));
const SolisCloudCollectors = lazy(() => import("../pages/admin/soliscloud/collectors"));
const CollectorDetailPage = lazy(() => import("../pages/admin/soliscloud/collector-detail"));
const CollectorDiagnosticsPage = lazy(() => import("../pages/admin/soliscloud/collector-diagnostics"));
const EPMListPage = lazy(() => import("../pages/admin/soliscloud/epm-list"));
const EPMDetailPage = lazy(() => import("../pages/admin/soliscloud/epm-detail"));
const EPMChartsPage = lazy(() => import("../pages/admin/soliscloud/epm-charts"));
const WeatherListPage = lazy(() => import("../pages/admin/soliscloud/weather-list"));
const WeatherDetailPage = lazy(() => import("../pages/admin/soliscloud/weather-detail"));
const SolisCloudAPITest = lazy(() => import("../pages/admin/soliscloud/api-test"));

// Lazy load User pages
const UserLayout = lazy(() => import("../pages/user/user-layout"));
const UserDashboard = lazy(() => import("../pages/user/user-dashboard"));
const UserInvertersDetail = lazy(() => import("../pages/user/user-inverters-detail"));
const SolarMonitor = lazy(() => import("../pages/user/solar-monitor"));

// Lazy load Partner pages
const PartnerLayout = lazy(() => import("../pages/partner/partner-layout"));
const PartnerDashboard = lazy(() => import("../pages/partner/partner-dashboard"));

// Auth components
const DashboardRedirect = lazy(() => import("../components/auth/dashboard-redirect"));

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<App />}>
      <Route
        index
        element={
          <LoginProtect>
            <SignIn />
          </LoginProtect>
        }
      />
      <Route 
        path="activate" 
        element={
          <LoginProtect>
            <ActivateAccount />
          </LoginProtect>
        } 
      />
      <Route 
        path="reset-password" 
        element={
          <LoginProtect>
            <ResetPassword />
          </LoginProtect>
        } 
      />
      <Route 
        path="forgot-password" 
        element={
          <LoginProtect>
            <ForgotPassword />
          </LoginProtect>
        } 
      />
      <Route path="*" element={<NotFound />} />

      {/* Dashboard Redirect - Auto-redirect based on role */}
      <Route
        path="dashboard"
        element={
          <LayoutProtect>
            <Suspense fallback={<PageLoader />}>
              <DashboardRedirect />
            </Suspense>
          </LayoutProtect>
        }
      />

      {/* USER ROUTES */}
      <Route
        path="user"
        element={
          <LayoutProtect>
            <Suspense fallback={<PageLoader />}>
              <UserLayout />
            </Suspense>
          </LayoutProtect>
        }
      >
        <Route index element={<Suspense fallback={<PageLoader />}><UserDashboard /></Suspense>} />
        <Route path="inverters" element={<Suspense fallback={<PageLoader />}><UserInvertersDetail /></Suspense>} />
      </Route>

      {/* PARTNER ROUTES */}
      <Route
        path="partner"
        element={
          <LayoutProtect>
            <Suspense fallback={<PageLoader />}>
              <PartnerLayout />
            </Suspense>
          </LayoutProtect>
        }
      >
        <Route index element={<Suspense fallback={<PageLoader />}><PartnerDashboard /></Suspense>} />
        <Route path="inverters" element={<Suspense fallback={<PageLoader />}><UserInvertersDetail /></Suspense>} />
        {/* The vendor consoles used to live here. They are operator tools that read
            every customer's data, so they are admin-only now. */}
        <Route path="*" element={<Navigate to="/partner" replace />} />
      </Route>

      {/* ADMIN ROUTES */}
      <Route
        path="admin"
        element={
          <LayoutProtect>
            <Suspense fallback={<PageLoader />}>
              <AdminLayout />
            </Suspense>
          </LayoutProtect>
        }
      >
        <Route index element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
        <Route path="sites" element={<Suspense fallback={<PageLoader />}><SitesManagement /></Suspense>} />
        <Route path="devices" element={<Suspense fallback={<PageLoader />}><DevicesManagement /></Suspense>} />
        <Route path="hopecloud" element={<Navigate to="/admin/hopecloud/real-time-data" replace />} />
        <Route path="hopecloud/real-time-data" element={<Suspense fallback={<PageLoader />}><HopeCloudManagement /></Suspense>} />
        <Route path="hopecloud/sync-data" element={<Suspense fallback={<PageLoader />}><SyncDataManagement /></Suspense>} />
        <Route path="fusion-solar" element={<Suspense fallback={<PageLoader />}><FusionSolarManagement /></Suspense>} />
        <Route path="reports" element={<Suspense fallback={<PageLoader />}><ReportsManagement /></Suspense>} />
        <Route path="monitoring" element={<Suspense fallback={<PageLoader />}><MonitoringManagement /></Suspense>} />
        <Route path="analytics" element={<Suspense fallback={<PageLoader />}><AnalyticsManagement /></Suspense>} />
        <Route path="availability" element={<Suspense fallback={<PageLoader />}><AvailabilityPage /></Suspense>} />
        <Route path="temperature" element={<Suspense fallback={<PageLoader />}><TemperaturePage /></Suspense>} />
        <Route path="plan" element={<Suspense fallback={<PageLoader />}><PlanPage /></Suspense>} />
        <Route path="huawei" element={<Suspense fallback={<PageLoader />}><HuaweiStations /></Suspense>} />
        <Route path="notifications" element={<Suspense fallback={<PageLoader />}><NotificationsManagement /></Suspense>} />
        <Route path="users" element={<Suspense fallback={<PageLoader />}><UserManagement /></Suspense>} />
        <Route path="user-stations" element={<Suspense fallback={<PageLoader />}><UserStationsManagement /></Suspense>} />
        {/* Fsolar routes */}
        <Route path="fsolar" element={<Navigate to="/admin/fsolar/realtime" replace />} />
        <Route path="fsolar/realtime" element={<Suspense fallback={<PageLoader />}><FsolarRealTimeMonitoring /></Suspense>} />
        <Route path="fsolar/devices" element={<Suspense fallback={<PageLoader />}><FsolarDevicesManagement /></Suspense>} />
        <Route path="fsolar/settings" element={<Suspense fallback={<PageLoader />}><FsolarDeviceSettings /></Suspense>} />
        <Route path="fsolar/energy" element={<Suspense fallback={<PageLoader />}><FsolarEnergyAnalytics /></Suspense>} />
        <Route path="fsolar/history" element={<Suspense fallback={<PageLoader />}><FsolarHistoricalData /></Suspense>} />
        <Route path="fsolar/templates" element={<Suspense fallback={<PageLoader />}><FsolarTemplatesManagement /></Suspense>} />
        <Route path="fsolar/tasks" element={<Suspense fallback={<PageLoader />}><FsolarTasksManagement /></Suspense>} />
        <Route path="fsolar/monitor" element={<Suspense fallback={<PageLoader />}><FsolarTaskMonitoring /></Suspense>} />
        <Route path="fsolar/records" element={<Suspense fallback={<PageLoader />}><FsolarRunRecords /></Suspense>} />
        <Route path="fsolar/alarms" element={<Suspense fallback={<PageLoader />}><FsolarDeviceAlarms /></Suspense>} />
        {/* SolisCloud routes */}
        <Route path="soliscloud" element={<Navigate to="/admin/soliscloud/dashboard" replace />} />
        <Route path="soliscloud/dashboard" element={<Suspense fallback={<PageLoader />}><SolisCloudDashboard /></Suspense>} />
        <Route path="soliscloud/stations" element={<Suspense fallback={<PageLoader />}><SolisCloudStations /></Suspense>} />
        <Route path="soliscloud/stations/:id" element={<Suspense fallback={<PageLoader />}><StationDetailPage /></Suspense>} />
        <Route path="soliscloud/stations/:id/charts" element={<Suspense fallback={<PageLoader />}><StationChartsPage /></Suspense>} />
        <Route path="soliscloud/inverters" element={<Suspense fallback={<PageLoader />}><SolisCloudInverters /></Suspense>} />
        <Route path="soliscloud/inverters/:id" element={<Suspense fallback={<PageLoader />}><InverterDetailPage /></Suspense>} />
        <Route path="soliscloud/inverters/:id/charts" element={<Suspense fallback={<PageLoader />}><InverterChartsPage /></Suspense>} />
        <Route path="soliscloud/alarms" element={<Suspense fallback={<PageLoader />}><SolisCloudAlarms /></Suspense>} />
        <Route path="soliscloud/collectors" element={<Suspense fallback={<PageLoader />}><SolisCloudCollectors /></Suspense>} />
        <Route path="soliscloud/collectors/:id" element={<Suspense fallback={<PageLoader />}><CollectorDetailPage /></Suspense>} />
        <Route path="soliscloud/collectors/:sn/diagnostics" element={<Suspense fallback={<PageLoader />}><CollectorDiagnosticsPage /></Suspense>} />
        <Route path="soliscloud/epm" element={<Suspense fallback={<PageLoader />}><EPMListPage /></Suspense>} />
        <Route path="soliscloud/epm/:id" element={<Suspense fallback={<PageLoader />}><EPMDetailPage /></Suspense>} />
        <Route path="soliscloud/epm/:id/charts" element={<Suspense fallback={<PageLoader />}><EPMChartsPage /></Suspense>} />
        <Route path="soliscloud/weather" element={<Suspense fallback={<PageLoader />}><WeatherListPage /></Suspense>} />
        <Route path="soliscloud/weather/:sn" element={<Suspense fallback={<PageLoader />}><WeatherDetailPage /></Suspense>} />
        {/* Developer scratch page, not something a customer should be able to open. */}
        {import.meta.env.DEV && (
          <Route path="soliscloud/api-test" element={<Suspense fallback={<PageLoader />}><SolisCloudAPITest /></Suspense>} />
        )}
      </Route>
    </Route>
  )
);

const Router = () => {
  return <RouterProvider router={router} />;
};

export default Router;
