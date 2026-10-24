import React from "react";
import type { MenuProps } from "antd";
import {
  AppstoreOutlined,
  BarChartOutlined,
  BellOutlined,
  CloudServerOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  FireOutlined,
  HomeOutlined,
  LineChartOutlined,
  SettingOutlined as DeviceOutlined,
  ThunderboltOutlined,
  UserOutlined,
  WifiOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import AppShell from "../../components/layout/AppShell";
import { useAuth } from "../../helpers/hooks/useAuth";

/** Pages the read-only viewer cannot use: they manage accounts or start syncs. */
const VIEWER_HIDDEN = new Set(["/admin/users", "/admin/user-stations", "/admin/hopecloud/sync-data"]);

/** Only the menu differs between roles; the frame itself lives in AppShell. */
const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isViewer = user?.role === "viewer";

  const sidebarItems: MenuProps["items"] = [
    {
      key: "general-dashboard",
      icon: <AppstoreOutlined />,
      label: "General Dashboard",
      children: [
        {
          key: "/admin",
          icon: <DashboardOutlined />,
          label: "Dashboard",
          onClick: () => navigate("/admin"),
        },
        {
          key: "/admin/availability",
          icon: <LineChartOutlined />,
          label: "Ishlash foizi",
          onClick: () => navigate("/admin/availability"),
        },
        {
          key: "/admin/temperature",
          icon: <FireOutlined />,
          label: "Invertor harorati",
          onClick: () => navigate("/admin/temperature"),
        },
        {
          key: "/admin/plan",
          icon: <BarChartOutlined />,
          label: "Reja va haqiqat",
          onClick: () => navigate("/admin/plan"),
        },
        // Hidden - Not yet implemented
        // {
        //   key: "/admin/sites",
        //   icon: <HomeOutlined />,
        //   label: "Sites Management",
        //   onClick: () => navigate("/admin/sites"),
        // },
        // {
        //   key: "/admin/devices",
        //   icon: <DeviceOutlined />,
        //   label: "Devices Management",
        //   onClick: () => navigate("/admin/devices"),
        // },
        // {
        //   key: "/admin/fusion-solar",
        //   icon: <ThunderboltOutlined />,
        //   label: "FusionSolar",
        //   onClick: () => navigate("/admin/fusion-solar"),
        // },
        // {
        //   key: "/admin/reports",
        //   icon: <FileTextOutlined />,
        //   label: "Reports",
        //   onClick: () => navigate("/admin/reports"),
        // },
        // {
        //   key: "/admin/monitoring",
        //   icon: <MonitorOutlined />,
        //   label: "Monitoring",
        //   onClick: () => navigate("/admin/monitoring"),
        // },
        // {
        //   key: "/admin/analytics",
        //   icon: <BarChartOutlined />,
        //   label: "Analytics",
        //   onClick: () => navigate("/admin/analytics"),
        // },
        // {
        //   key: "/admin/notifications",
        //   icon: <BellOutlined />,
        //   label: "Notifications",
        //   onClick: () => navigate("/admin/notifications"),
        // },
        {
          key: "/admin/users",
          icon: <UserOutlined />,
          label: "User Management",
          onClick: () => navigate("/admin/users"),
        },
        {
          key: "/admin/user-stations",
          icon: <ThunderboltOutlined />,
          label: "Station Assignment",
          onClick: () => navigate("/admin/user-stations"),
        },
      ],
    },
    {
      key: "hopecloud",
      icon: <CloudServerOutlined />,
      label: "HopeCloud",
      children: [
        {
          key: "/admin/hopecloud/real-time-data",
          icon: <ThunderboltOutlined />,
          label: "Real Time Data",
          onClick: () => navigate("/admin/hopecloud/real-time-data"),
        },
        {
          key: "/admin/hopecloud/sync-data",
          icon: <DatabaseOutlined />,
          label: "Sync Data",
          onClick: () => navigate("/admin/hopecloud/sync-data"),
        },
      ],
    },
    {
      key: "huawei",
      icon: <ThunderboltOutlined />,
      label: "Huawei",
      children: [
        {
          key: "/admin/huawei",
          icon: <DatabaseOutlined />,
          label: "Stansiyalar",
          onClick: () => navigate("/admin/huawei"),
        },
      ],
    },
    // Hidden 2026-10-15: FSolar settings, templates, tasks, monitor and run records (remote control
    // is switched off and FSolar is only the two office units), SolisCloud EPM and Weather (no such
    // hardware installed) and the API test page (development only). Their routes still exist.
    {
      key: "fsolar",
      icon: <ThunderboltOutlined />,
      label: "Fsolar",
      children: [
        {
          key: "/admin/fsolar/realtime",
          icon: <DashboardOutlined />,
          label: "Real-time Monitor",
          onClick: () => navigate("/admin/fsolar/realtime"),
        },
        {
          key: "/admin/fsolar/devices",
          icon: <DeviceOutlined />,
          label: "Devices",
          onClick: () => navigate("/admin/fsolar/devices"),
        },
        {
          key: "/admin/fsolar/energy",
          icon: <BarChartOutlined />,
          label: "Energy Analytics",
          onClick: () => navigate("/admin/fsolar/energy"),
        },
        {
          key: "/admin/fsolar/history",
          icon: <LineChartOutlined />,
          label: "Historical Data",
          onClick: () => navigate("/admin/fsolar/history"),
        },
        {
          key: "/admin/fsolar/alarms",
          icon: <BellOutlined />,
          label: "Device Alarms",
          onClick: () => navigate("/admin/fsolar/alarms"),
        },
      ],
    },
    {
      key: "soliscloud",
      icon: <CloudServerOutlined />,
      label: "SolisCloud",
      children: [
        {
          key: "/admin/soliscloud/dashboard",
          icon: <DashboardOutlined />,
          label: "Dashboard",
          onClick: () => navigate("/admin/soliscloud/dashboard"),
        },
        {
          key: "/admin/soliscloud/stations",
          icon: <HomeOutlined />,
          label: "Stations",
          onClick: () => navigate("/admin/soliscloud/stations"),
        },
        {
          key: "/admin/soliscloud/inverters",
          icon: <ThunderboltOutlined />,
          label: "Inverters",
          onClick: () => navigate("/admin/soliscloud/inverters"),
        },
        {
          key: "/admin/soliscloud/alarms",
          icon: <BellOutlined />,
          label: "Alarms",
          onClick: () => navigate("/admin/soliscloud/alarms"),
        },
        {
          key: "/admin/soliscloud/collectors",
          icon: <WifiOutlined />,
          label: "Collectors",
          onClick: () => navigate("/admin/soliscloud/collectors"),
        },
      ],
    },
  ];

  const items: MenuProps["items"] = isViewer
    ? sidebarItems.map((group: any) =>
        group?.children
          ? { ...group, children: group.children.filter((item: any) => !VIEWER_HIDDEN.has(item?.key)) }
          : group,
      )
    : sidebarItems;

  return (
    <AppShell
      items={items}
      profilePath="/admin/profile"
      fallbackName={isViewer ? "Kuzatuvchi" : "Admin"}
    />
  );
};

export default AdminLayout;
