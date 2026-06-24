import React, { use, useEffect, useState } from 'react';
import {
  View, Text, ScrollView,SafeAreaView, StatusBar,
} from 'react-native';

import styles from '../styles/globalStyles'
import { fetchRecentJobsApi, getDashboardStatsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.6:8080';

// ─── Dashboard Screen ──────────────────────────────────
const Dashboard = () => {
  const [stats, setStats] = useState({
    totalCustomers: 12,
    activeJobs: 3,
    jobsCompletedToday: 5,
    todayEarnings: 4500,
  });

  const { owner } = useAuth();

  const [recentJobs, setRecentJobs] = useState([]);

  function convertSeconds(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600); // 3600 seconds in an hour
  const minutes = Math.floor((totalSeconds % 3600) / 60); // Remainder divided by 60
  const seconds = totalSeconds % 60; // Remaining seconds

  return { hours, minutes, seconds };
}

  const fetchRecentJobs = async () => {
    try {
      const data = await fetchRecentJobsApi(owner?.id); // Replace with actual ownerId
      setRecentJobs(data?.data || []);
    } catch (error) {
      console.error('Error fetching recent jobs:', error);
    }
  }

  const fetchstats = async () => {
    try {
      const data = await getDashboardStatsApi(owner?.id); // Replace with actual ownerId
      setStats({
        totalCustomers: data?.totalCustomers || 0,
        activeJobs: data?.activeJobs || 0,
        jobsCompletedToday: data?.jobsCompletedToday || 0,
        todayEarnings: data?.todayEarnings || 0,
      } || {});
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }
  useEffect(() => {
    if (!owner || !owner.id) {
      return; // Wait for owner to be available
    }
    fetchRecentJobs();
    fetchstats();  
  }, [owner?.id]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#1a6b3a" barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>HarvestTrack</Text>
        </View>
        <View style={styles.headerIcon}>
          <Text style={styles.headerIconText}>🌾</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#1a6b3a' }]}>
            <Text style={styles.statIcon}>👥</Text>
            <Text style={styles.statValue}>{stats.totalCustomers}</Text>
            <Text style={styles.statLabel}>Total Customers</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#e67e22' }]}>
            <Text style={styles.statIcon}>⚙️</Text>
            <Text style={styles.statValue}>{stats.activeJobs}</Text>
            <Text style={styles.statLabel}>Active Jobs</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#2980b9' }]}>
            <Text style={styles.statIcon}>✅</Text>
            <Text style={styles.statValue}>{stats.jobsCompletedToday}</Text>
            <Text style={styles.statLabel}>Done Today</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#8e44ad' }]}>
            <Text style={styles.statIcon}>💰</Text>
            <Text style={styles.statValue}>₹{stats.todayEarnings}</Text>
            <Text style={styles.statLabel}>Today's Earnings</Text>
          </View>
        </View>

        {/* Recent Jobs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Jobs</Text>
          {recentJobs.map((job) => (
            <View key={job.id} style={styles.jobCard}>
              <View style={styles.jobLeft}>
                <Text style={styles.jobCustomer}>{job.customerName}</Text>
                <Text style={styles.jobMeta}>🌾 {job.acres} acres  •  ⏱ {convertSeconds(job.duration).hours}h {convertSeconds(job.duration).minutes}m</Text>
              </View>
              <View style={styles.jobRight}>
                <Text style={styles.jobAmount}>
                  {job.status === 'in-progress' ? '🟢 Active' : `₹${job.amount}`}
                </Text>
                <View style={[
                  styles.jobBadge,
                  { backgroundColor: job.status === 'in-progress' ? '#e8f5e9' : '#e3f2fd' }
                ]}>
                  <Text style={[
                    styles.jobBadgeText,
                    { color: job.status === 'in-progress' ? '#1a6b3a' : '#2980b9' }
                  ]}>
                    {job.status === 'in-progress' ? 'In Progress' : 'Completed'}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

export default Dashboard;