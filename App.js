import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import AuthScreen      from './src/components/AuthScreen';
import DashboardScreen from './src/components/Dashboard';
import CustomersScreen from './src/components/CustomersScreen';
import JobsScreen      from './src/components/JobsScreen';
import ReportsScreen   from './src/components/ReportsScreen';
import VehiclesScreen  from './src/components/VehicleScreen';
import Colors          from './src/constants/colors';
import { TouchableOpacity, Text } from 'react-native';
import FuelScreen from './src/components/FuelScreen';

const tabs = [
  { key: 'dashboard', label: 'Home',      icon: '🏠' },
  { key: 'customers', label: 'Customers', icon: '👥' },
  { key: 'jobs',      label: 'Jobs',      icon: '📋' },
  { key: "vehicles", label: "Vehicles", icon: "🚜" },
    { key: 'fuel',      label: 'Fuel',      icon: '⛽' },
  { key: 'reports',   label: 'Reports',   icon: '📊' },
];

// ── Main App wrapped inside AuthProvider
function MainApp() {
  const { isAuthenticated, loading, owner, logout, forceLogout } = useAuth();
  const [activeTab, setActiveTab] = React.useState('dashboard');

  // ── Show spinner while checking stored login
  if (loading) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={{ marginTop: 12, color: '#888' }}>Loading...</Text>
      </View>
    );
  }

  // ── Show login if not authenticated
  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  if (!owner || !owner.id) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // ── Show main app if authenticated
  const renderScreen = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardScreen onLogout={logout} />;
      case 'customers': return <CustomersScreen onLogout={forceLogout} />;
      case 'jobs':      return <JobsScreen      onLogout={forceLogout} />;
      case 'vehicles': return <VehiclesScreen  onLogout={forceLogout} />;
      case 'fuel': return <FuelScreen onLogout={forceLogout} />;
      case 'reports':   return <ReportsScreen   onLogout={forceLogout} />;
      default:          return <DashboardScreen onLogout={logout} />;
    }
  };

  return (
    <View style={s.appContainer}>
      <View style={s.screenContent}>
        {renderScreen()}
      </View>

      {/* Bottom Tab Bar */}
      <View style={s.tabBar}>
        {tabs.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={s.tabItem}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              {isActive && <View style={s.tabActivePill} />}
              <Text style={[s.tabIcon, isActive && s.tabIconActive]}>
                {tab.icon}
              </Text>
              <Text style={[s.tabLabel, isActive && s.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

const s = StyleSheet.create({
  loadingContainer: {
    flex: 1, justifyContent: 'center',
    alignItems: 'center', backgroundColor: '#f4f6f8',
  },
  appContainer:  { flex: 1, backgroundColor: '#f4f6f8' },
  screenContent: { flex: 1 },
  tabBar: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#e8e8e8',
    paddingBottom: 10, paddingTop: 8,
    shadowColor: '#000', shadowOpacity: 0.08,
    shadowRadius: 10, elevation: 12,
  },
  tabItem: {
    flex: 1, alignItems: 'center',
    justifyContent: 'center', paddingTop: 4,
    position: 'relative',
  },
  tabActivePill: {
    position: 'absolute', top: -8,
    width: 36, height: 4,
    backgroundColor: Colors.primary, borderRadius: 10,
  },
  tabIcon:        { fontSize: 22 },
  tabIconActive:  { transform: [{ scale: 1.15 }] },
  tabLabel:       { fontSize: 10, color: '#aaa', marginTop: 3, fontWeight: '500' },
  tabLabelActive: { color: Colors.primary, fontWeight: '700' },
});