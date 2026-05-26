import { Text, TouchableOpacity, View } from "react-native";
import Dashboard from "./src/components/Dashboard";
import CustomersScreen from "./src/components/CustomersScreen";
import VehicleScreen from "./src/components/VehicleScreen";
import JobsScreen from "./src/components/JobsScreen";
import ReportsScreen from "./src/components/ReportsScreen";

import styles from "./src/styles/globalStyles";
import { useState } from "react";
import AuthScreen from "./src/components/AuthScreen";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

const tabs = [
  { key: "dashboard", label: "Home", icon: "🏠" },
  { key: "customers", label: "Customers", icon: "👥" },
  { key: "jobs", label: "Jobs", icon: "📋" },
  { key: "vehicles", label: "Vehicles", icon: "🚜" },
  { key: "reports", label: "Reports", icon: "📊" },
];

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");

  if (!isLoggedIn) {
    return <AuthScreen onLogin={() => setIsLoggedIn(true)} />;
  }

  const renderScreen = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard />;
      case "customers":
        return <CustomersScreen />;
      case "vehicles":
        return <VehicleScreen />;
      case "jobs":
        return <JobsScreen />;
      case "reports":
        return <ReportsScreen />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <View style={styles.appContainer}>
      {/* Screen Content */}
      <View style={styles.screenContent}>{renderScreen()}</View>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItem}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              {/* Active Indicator Pill */}
              {isActive && <View style={styles.tabActivePill} />}

              <Text style={[styles.tabIcon, isActive && styles.tabIconActive]}>
                {tab.icon}
              </Text>
              <Text
                style={[styles.tabLabel, isActive && styles.tabLabelActive]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
