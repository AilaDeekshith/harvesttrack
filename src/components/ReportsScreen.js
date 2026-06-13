import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  FlatList,
  Modal,
} from "react-native";
import g from "../styles/globalStyles";
import Colors from "../constants/colors";
import { dashBoardDailyEarningsApi, dashboardReportApi } from "../services/api";
import { useAuth } from "../context/AuthContext";

// ── Same jobs data (replace with shared state/context later)
const ALL_JOBS = [
  {
    id: "1",
    customerName: "Raju Reddy",
    village: "Nalgonda",
    crop: "Rice",
    acres: "3.5",
    rate: "300",
    amount: "1050",
    duration: "7800",
    date: "2024-01-15",
  },
  {
    id: "2",
    customerName: "Suresh Kumar",
    village: "Warangal",
    crop: "Wheat",
    acres: "2.0",
    rate: "300",
    amount: "600",
    duration: "5400",
    date: "2024-01-15",
  },
  {
    id: "3",
    customerName: "Venkat Rao",
    village: "Karimnagar",
    crop: "Maize",
    acres: "5.0",
    rate: "350",
    amount: "1750",
    duration: "10800",
    date: "2024-01-14",
  },
  {
    id: "4",
    customerName: "Lakshmi Devi",
    village: "Khammam",
    crop: "Cotton",
    acres: "1.5",
    rate: "400",
    amount: "600",
    duration: "3600",
    date: "2024-01-14",
  },
  {
    id: "5",
    customerName: "Ramesh Babu",
    village: "Nizamabad",
    crop: "Rice",
    acres: "4.0",
    rate: "300",
    amount: "1200",
    duration: "9000",
    date: "2024-01-13",
  },
  {
    id: "6",
    customerName: "Krishna Murthy",
    village: "Adilabad",
    crop: "Soybean",
    acres: "2.5",
    rate: "350",
    amount: "875",
    duration: "6300",
    date: "2024-01-13",
  },
  {
    id: "7",
    customerName: "Raju Reddy",
    village: "Nalgonda",
    crop: "Rice",
    acres: "2.0",
    rate: "300",
    amount: "600",
    duration: "4500",
    date: "2024-01-12",
  },
  {
    id: "8",
    customerName: "Suresh Kumar",
    village: "Warangal",
    crop: "Wheat",
    acres: "3.0",
    rate: "300",
    amount: "900",
    duration: "7200",
    date: "2024-01-12",
  },
  {
    id: "9",
    customerName: "Venkat Rao",
    village: "Karimnagar",
    crop: "Rice",
    acres: "4.5",
    rate: "300",
    amount: "1350",
    duration: "9900",
    date: "2024-01-11",
  },
  {
    id: "10",
    customerName: "Ramesh Babu",
    village: "Nizamabad",
    crop: "Maize",
    acres: "2.0",
    rate: "350",
    amount: "700",
    duration: "5400",
    date: "2024-01-11",
  },
  {
    id: "11",
    customerName: "Lakshmi Devi",
    village: "Khammam",
    crop: "Cotton",
    acres: "1.0",
    rate: "400",
    amount: "400",
    duration: "2700",
    date: "2024-01-10",
  },
  {
    id: "12",
    customerName: "Krishna Murthy",
    village: "Adilabad",
    crop: "Soybean",
    acres: "3.0",
    rate: "350",
    amount: "1050",
    duration: "7500",
    date: "2024-01-10",
  },
];

const PERIODS = ["This Week", "This Month", "Last Month", "All Time"];

// ── Helpers
const formatDuration = (secs) => {
  const s = parseInt(secs);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

export default function ReportsScreen() {
  const [period, setPeriod] = useState("All Time");
  const [activeTab, setActiveTab] = useState("overview");
  const [customerModal, setCustomerModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [stats, setStats] = useState({
    totalHours: 0,
    totalJobs: 0,
    totalEarnings: 0,
    totalAcres: 0,
    avgPerJob: 0,
    avgPerAcre: 0,
  });

  const [dailyEarnings, setDailyEarnings] = useState([]);
  const { owner } = useAuth();

  // ── Filter by period
  const filterByPeriod = (jobs) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (period === "This Week") {
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 7);
      return jobs.filter((j) => new Date(j.date) >= weekAgo);
    }
    if (period === "This Month") {
      return jobs.filter((j) => {
        const d = new Date(j.date);
        return (
          d.getMonth() === today.getMonth() &&
          d.getFullYear() === today.getFullYear()
        );
      });
    }
    if (period === "Last Month") {
      const lastMonth = today.getMonth() === 0 ? 11 : today.getMonth() - 1;
      const lastYear =
        today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
      return jobs.filter((j) => {
        const d = new Date(j.date);
        return d.getMonth() === lastMonth && d.getFullYear() === lastYear;
      });
    }
    return jobs;
  };

  const filtered = filterByPeriod(ALL_JOBS);

  // ── Crop breakdown
  const cropBreakdown = () => {
    const map = {};
    filtered.forEach((j) => {
      if (!map[j.crop]) map[j.crop] = { jobs: 0, acres: 0, amount: 0 };
      map[j.crop].jobs += 1;
      map[j.crop].acres += parseFloat(j.acres);
      map[j.crop].amount += parseInt(j.amount);
    });
    return Object.entries(map)
      .map(([crop, data]) => ({ crop, ...data }))
      .sort((a, b) => b.amount - a.amount);
  };

  // ── Customer breakdown
  const customerBreakdown = () => {
    const map = {};
    filtered.forEach((j) => {
      if (!map[j.customerName]) {
        map[j.customerName] = {
          name: j.customerName,
          village: j.village,
          jobs: 0,
          acres: 0,
          amount: 0,
          duration: 0,
        };
      }
      map[j.customerName].jobs += 1;
      map[j.customerName].acres += parseFloat(j.acres);
      map[j.customerName].amount += parseInt(j.amount);
      map[j.customerName].duration += parseInt(j.duration);
    });
    return Object.values(map).sort((a, b) => b.amount - a.amount);
  };

  // ── Daily breakdown (last 7 days)
  const dailyBreakdown = () => {
    const map = {};
    filtered.forEach((j) => {
      if (!map[j.date])
        map[j.date] = { date: j.date, jobs: 0, amount: 0, acres: 0 };
      map[j.date].jobs += 1;
      map[j.date].amount += parseInt(j.amount);
      map[j.date].acres += parseFloat(j.acres);
    });
    return Object.values(map)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 7);
  };

  const crops = cropBreakdown();
  const customers = customerBreakdown();
  const daily = dailyBreakdown();
  const maxAmount = Math.max(...daily.map((d) => d.amount), 1);
  const maxCropAmount = Math.max(...crops.map((c) => c.amount), 1);

  // ── Bar chart bar
  const Bar = ({ value, max, color = Colors.primary }) => (
    <View style={g.barBg}>
      <View
        style={[
          g.barFill,
          {
            width: `${Math.max((value / max) * 100, 4)}%`,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );

  const fetchStats = async () => {
    const from =
      period === "This Week"
        ? new Date(Date.now() - 7 * 24 * 3600 * 1000)
        : period === "This Month"
          ? new Date(new Date().setDate(1))
          : period === "Last Month"
            ? new Date(new Date().setMonth(new Date().getMonth() - 1, 1))
            : null;
    const to =
      period === "This Week" || period === "This Month"
        ? new Date()
        : period === "Last Month"
          ? new Date(new Date().setDate(0))
          : null;
    console.log("Fetching stats with from:", from, "to:", to); // Debugging log
    try {
      const data = await dashboardReportApi(owner?.id, from ? from.toISOString() : "", to ? to.toISOString() : ""); // Replace 1 with actual ownerId
      console.log("Fetched dashboard stats:", data); // Debugging log
      setStats(
        {
          totalHours: data?.data?.totalHours || 0,
          totalJobs: data?.data?.totalJobs || 0,
          totalEarnings: data?.data?.totalEarnings || 0,
          totalAcres: data?.data?.totalAcres || 0,
          avgPerJob: data?.data?.avgAmountPerJob || 0,
          avgPerAcre: data?.data?.avgAmountPerAcre || 0,
        } || {},
      );
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchDailyEarnings = async () => {
    const from =
      period === "This Week"
        ? new Date(Date.now() - 7 * 24 * 3600 * 1000)
        : period === "This Month"
          ? new Date(new Date().setDate(1))
          : period === "Last Month"
            ? new Date(new Date().setMonth(new Date().getMonth() - 1, 1))
            : null;
    const to =
      period === "This Week" || period === "This Month"
        ? new Date()
        : period === "Last Month"
          ? new Date(new Date().setDate(0))
          : null;
    try {
      const data = await dashBoardDailyEarningsApi(owner?.id, from ? from.toISOString() : "", to ? to.toISOString() : ""); // Replace 1 with actual ownerId
      console.log("Fetched daily earnings:", data); // Debugging log
      setDailyEarnings(data?.data || []);
    } catch (error) {
      console.error("Error fetching daily earnings:", error);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [period]);

  useEffect(() => {
    fetchDailyEarnings();
  }, [stats]);

  // ────────────────────────────────────────
  // TAB: OVERVIEW
  // ────────────────────────────────────────
  const renderOverview = () => (
    <>
      {/* KPI Cards */}
      <View style={g.kpiGrid}>
        {[
          {
            icon: "💰",
            label: "Total Earnings",
            value: `₹${stats.totalEarnings.toLocaleString()}`,
            color: Colors.primary,
          },
          {
            icon: "📋",
            label: "Total Jobs",
            value: stats.totalJobs,
            color: "#e67e22",
          },
          {
            icon: "📐",
            label: "Total Acres",
            value: `${stats.totalAcres.toFixed(1)} ac`,
            color: "#2980b9",
          },
          {
            icon: "⏱",
            label: "Total Hours",
            value: `${stats.totalHours}h`,
            color: "#8e44ad",
          },
          {
            icon: "📊",
            label: "Avg / Job",
            value: `₹${stats.avgPerJob}`,
            color: "#16a085",
          },
          {
            icon: "🌾",
            label: "Avg / Acre",
            value: `₹${stats.avgPerAcre}`,
            color: "#c0392b",
          },
        ].map((kpi, i) => (
          <View key={i} style={[g.kpiCard, { borderLeftColor: kpi.color }]}>
            <Text style={g.kpiIcon}>{kpi.icon}</Text>
            <Text style={[g.kpiValue, { color: kpi.color }]}>{kpi.value}</Text>
            <Text style={g.kpiLabel}>{kpi.label}</Text>
          </View>
        ))}
      </View>

      {/* Daily Earnings Chart */}
      <View style={g.chartCard}>
        <Text style={g.chartTitle}>📅 Daily Earnings</Text>
        {dailyEarnings?.length === 0 ? (
          <Text style={g.noData}>No data for this period</Text>
        ) : (
          dailyEarnings?.map((d, i) => (
            <View key={i} style={g.barRow}>
              <Text style={g.barLabel}>
                {new Date(Object.keys(d)[0]).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "numeric",
                  year: "2-digit",
                })}
              </Text>
              <View style={g.barWrapper}>
                <Bar value={Object.values(d)[0]} max={maxAmount} />
              </View>
              <Text style={g.barValue}>₹{Object.values(d)[0]?.toLocaleString()}</Text>
            </View>
          ))
        )}
      </View>
    </>
  );

  console.log("Rendering with stats:", stats, "dailyEarnings:", dailyEarnings); // Debugging log

  // ────────────────────────────────────────
  // TAB: CROPS
  // ────────────────────────────────────────
  const CROP_COLORS = {
    Rice: "#27ae60",
    Wheat: "#f39c12",
    Maize: "#e67e22",
    Cotton: "#3498db",
    Sugarcane: "#9b59b6",
    Soybean: "#1abc9c",
    Other: "#95a5a6",
  };

  const renderCrops = () => (
    <>
      {/* Crop Breakdown Chart */}
      <View style={g.chartCard}>
        <Text style={g.chartTitle}>🌾 Earnings by Crop</Text>
        {crops.length === 0 ? (
          <Text style={g.noData}>No data for this period</Text>
        ) : (
          crops.map((c, i) => (
            <View key={i} style={g.barRow}>
              <Text style={g.barLabel}>{c.crop}</Text>
              <View style={g.barWrapper}>
                <Bar
                  value={c.amount}
                  max={maxCropAmount}
                  color={CROP_COLORS[c.crop] || Colors.primary}
                />
              </View>
              <Text style={g.barValue}>₹{c.amount.toLocaleString()}</Text>
            </View>
          ))
        )}
      </View>

      {/* Crop Detail Cards */}
      <Text style={[g.sectionTitle, { paddingHorizontal: 0, marginTop: 4 }]}>
        Crop Breakdown
      </Text>
      {crops.map((c, i) => (
        <View
          key={i}
          style={[
            g.cropCard,
            { borderLeftColor: CROP_COLORS[c.crop] || Colors.primary },
          ]}
        >
          <View style={g.cropCardTop}>
            <View
              style={[
                g.cropDot,
                { backgroundColor: CROP_COLORS[c.crop] || Colors.primary },
              ]}
            />
            <Text style={g.cropCardName}>{c.crop}</Text>
            <Text style={g.cropCardAmount}>₹{c.amount.toLocaleString()}</Text>
          </View>
          <View style={g.cropCardStats}>
            <View style={g.cropStatChip}>
              <Text style={g.cropStatText}>📋 {c.jobs} jobs</Text>
            </View>
            <View style={g.cropStatChip}>
              <Text style={g.cropStatText}>📐 {c.acres.toFixed(1)} acres</Text>
            </View>
            <View style={g.cropStatChip}>
              <Text style={g.cropStatText}>
                💰 ₹{Math.round(c.amount / c.acres)}/ac
              </Text>
            </View>
          </View>
        </View>
      ))}
    </>
  );

  // ────────────────────────────────────────
  // TAB: CUSTOMERS
  // ────────────────────────────────────────
  const renderCustomers = () => (
    <>
      <Text style={[g.sectionTitle, { paddingHorizontal: 0 }]}>
        Top Customers
      </Text>
      {customers.map((c, i) => (
        <TouchableOpacity
          key={i}
          style={g.customerCard}
          onPress={() => {
            setSelectedCustomer(c);
            setCustomerModal(true);
          }}
          activeOpacity={0.8}
        >
          {/* Rank Badge */}
          <View style={[g.rankBadge, i < 3 && g.rankBadgeTop]}>
            <Text style={g.rankText}>{i + 1}</Text>
          </View>

          {/* Avatar */}
          <View style={g.customerAvatar}>
            <Text style={g.customerAvatarText}>{c.name.charAt(0)}</Text>
          </View>

          {/* Info */}
          <View style={g.customerInfo}>
            <Text style={g.customerName}>{c.name}</Text>
            <Text style={g.customerMeta}>
              📍 {c.village} • 📋 {c.jobs} jobs
            </Text>
          </View>

          {/* Amount */}
          <View style={g.customerAmountBox}>
            <Text style={g.customerAmount}>₹{c.amount.toLocaleString()}</Text>
            <Text style={g.customerAcres}>{c.acres.toFixed(1)} ac</Text>
          </View>
        </TouchableOpacity>
      ))}
    </>
  );

  // ────────────────────────────────────────
  // MAIN RENDER
  // ────────────────────────────────────────
  return (
    <SafeAreaView style={g.container}>
      <StatusBar backgroundColor={Colors.primary} barStyle="light-content" />

      {/* Header */}
      <View style={g.header}>
        <View>
          <Text style={g.headerGreeting}>Analytics</Text>
          <Text style={g.headerTitle}>Reports</Text>
        </View>
        <View style={g.headerEarnings}>
          <Text style={g.headerEarningsValue}>
            ₹{stats.totalEarnings.toLocaleString()}
          </Text>
          <Text style={g.headerEarningsLabel}>{period}</Text>
        </View>
      </View>

      {/* Period Filter */}
      <View style={g.periodRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={g.periodScroll}
        >
          {PERIODS.map((p) => (
            <TouchableOpacity
              key={p}
              style={[g.periodChip, period === p && g.periodChipActive]}
              onPress={() => setPeriod(p)}
            >
              <Text
                style={[
                  g.periodChipText,
                  period === p && g.periodChipTextActive,
                ]}
              >
                {p}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Tab Bar */}
      <View style={g.tabRow}>
        {[
          { key: "overview", label: "📊 Overview" },
          // { key: 'crops',      label: '🌾 Crops'     },
          // { key: "customers", label: "👥 Customers" },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[g.tabBtn, activeTab === tab.key && g.tabBtnActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text
              style={[
                g.tabBtnText,
                activeTab === tab.key && g.tabBtnTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={g.scrollContent}
      >
        {activeTab === "overview" && renderOverview()}
        {activeTab === "crops" && renderCrops()}
        {activeTab === "customers" && renderCustomers()}
      </ScrollView>

      {/* Customer Detail Modal */}
      <Modal visible={customerModal} animationType="slide" transparent>
        <View style={g.modalOverlay}>
          <View style={g.modalSheet}>
            <View style={g.modalHeader}>
              <Text style={g.modalTitle}>👤 Customer Report</Text>
              <TouchableOpacity onPress={() => setCustomerModal(false)}>
                <Text style={g.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedCustomer && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Customer Banner */}
                <View style={g.customerBanner}>
                  <View style={g.customerBannerAvatar}>
                    <Text style={g.customerBannerAvatarText}>
                      {selectedCustomer.name.charAt(0)}
                    </Text>
                  </View>
                  <Text style={g.customerBannerName}>
                    {selectedCustomer.name}
                  </Text>
                  <Text style={g.customerBannerVillage}>
                    📍 {selectedCustomer.village}
                  </Text>
                </View>

                {/* Stats Grid */}
                <View style={g.modalStatsGrid}>
                  {[
                    {
                      icon: "💰",
                      label: "Total Paid",
                      value: `₹${selectedCustomer.amount.toLocaleString()}`,
                      color: Colors.primary,
                    },
                    {
                      icon: "📋",
                      label: "Total Jobs",
                      value: selectedCustomer.jobs,
                      color: "#e67e22",
                    },
                    {
                      icon: "📐",
                      label: "Total Acres",
                      value: `${selectedCustomer.acres.toFixed(1)} ac`,
                      color: "#2980b9",
                    },
                    {
                      icon: "⏱",
                      label: "Total Time",
                      value: formatDuration(selectedCustomer.duration),
                      color: "#8e44ad",
                    },
                  ].map((stat, i) => (
                    <View
                      key={i}
                      style={[g.modalStatCard, { borderTopColor: stat.color }]}
                    >
                      <Text style={g.modalStatIcon}>{stat.icon}</Text>
                      <Text style={[g.modalStatValue, { color: stat.color }]}>
                        {stat.value}
                      </Text>
                      <Text style={g.modalStatLabel}>{stat.label}</Text>
                    </View>
                  ))}
                </View>

                {/* Per Job Average */}
                <View style={g.avgCard}>
                  <Text style={g.avgLabel}>Average per Job</Text>
                  <View style={g.avgRow}>
                    <View style={g.avgItem}>
                      <Text style={g.avgValue}>
                        ₹
                        {Math.round(
                          selectedCustomer.amount / selectedCustomer.jobs,
                        )}
                      </Text>
                      <Text style={g.avgSub}>Earnings</Text>
                    </View>
                    <View style={g.avgDivider} />
                    <View style={g.avgItem}>
                      <Text style={g.avgValue}>
                        {(
                          selectedCustomer.acres / selectedCustomer.jobs
                        ).toFixed(1)}{" "}
                        ac
                      </Text>
                      <Text style={g.avgSub}>Acres</Text>
                    </View>
                    <View style={g.avgDivider} />
                    <View style={g.avgItem}>
                      <Text style={g.avgValue}>
                        {formatDuration(
                          selectedCustomer.duration / selectedCustomer.jobs,
                        )}
                      </Text>
                      <Text style={g.avgSub}>Time</Text>
                    </View>
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
