import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView,
  StyleSheet, SafeAreaView, StatusBar,
  FlatList, Modal, Alert
} from 'react-native';
import g from '../styles/globalStyles';
import Colors from '../constants/colors';
import {
  createJobApi, deleteJobApi, fetchActivitiesApi,
  fetchCustomersApi, fetchJobsApi, fetchVehiclesApi,
  updateJobApi, updatePaymentStatusApi
} from '../services/api';
import { useAuth } from '../context/AuthContext';

// ── Format seconds to readable
const formatDuration = (secs) => {
  const s = parseInt(secs);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

const formatTime = (secs) => {
  const h = String(Math.floor(secs / 3600)).padStart(2, '0');
  const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
};

const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
};

const calculateElapsedSeconds = (startTimeOrDate) => {
  let startDate;
  if (typeof startTimeOrDate === 'string') {
    if (startTimeOrDate.includes('T')) {
      startDate = new Date(startTimeOrDate);
    } else {
      const today   = new Date();
      const timeStr = startTimeOrDate.toUpperCase();
      const [time, period] = timeStr.split(' ');
      const [hours, minutes] = time.split(':');
      let hour = parseInt(hours);
      if (period === 'PM' && hour !== 12) hour += 12;
      if (period === 'AM' && hour === 12) hour = 0;
      startDate = new Date(
        today.getFullYear(), today.getMonth(), today.getDate(),
        hour, parseInt(minutes), 0
      );
    }
  } else {
    startDate = startTimeOrDate;
  }
  const now = new Date();
  return Math.max(0, Math.floor((now - startDate) / 1000));
};

const groupByDate = (jobs) => {
  const groups = {};
  jobs.forEach(job => {
    const key = job.date;
    if (!groups[key]) groups[key] = [];
    groups[key].push(job);
  });
  return Object.entries(groups)
    .sort(([a], [b]) => new Date(b) - new Date(a))
    .map(([date, items]) => ({ date, items }));
};

// ── Payment status config
const PAYMENT_STATUS = {
  paid:    { label: 'paid',    color: '#1a6b3a', bg: '#e8f5e9', icon: '✅' },
  unpaid:  { label: 'unpaid',  color: '#e74c3c', bg: '#fdecea', icon: '❌' },
};

const FILTERS = ['All', 'Today', 'This Week', 'This Month'];
const CROPS   = ['All Crops', 'Rice', 'Wheat', 'Maize', 'Cotton', 'Sugarcane', 'Soybean'];

const emptyJobForm = {
  customerId: null,
  activityId: null,
  acres:      '',
  cost:       '',
  vehicleId:  null,
  notes:      '',
};

export default function JobsScreen() {

  const { owner } = useAuth();

  const [viewMode,        setViewMode]        = useState('jobs');
  const [customers,       setCustomers]       = useState([]);
  const [activities,      setActivities]      = useState([]);
  const [vehicles,        setVehicles]        = useState([]);
  const [jobs,            setJobs]            = useState([]);
  const [search,          setSearch]          = useState('');
  const [activeFilter,    setActiveFilter]    = useState('All');
  const [cropFilter,      setCropFilter]      = useState('All Crops');
  const [selectedJob,     setSelectedJob]     = useState(null);
  const [detailModal,     setDetailModal]     = useState(false);
  const [cropModal,       setCropModal]       = useState(false);
  const [paymentModal,    setPaymentModal]    = useState(false); // ← New
  const [step,            setStep]            = useState('setup');
  const [jobForm,         setJobForm]         = useState(emptyJobForm);
  const [errors,          setErrors]          = useState({});
  const [customerModal,   setCustomerModal]   = useState(false);
  const [customerSearch,  setCustomerSearch]  = useState('');
  const [activityModal,   setActivityModal]   = useState(false);
  const [vehicleModal,    setVehicleModal]    = useState(false);
  const [vehicleSearch,   setVehicleSearch]   = useState('');
  const [elapsed,         setElapsed]         = useState(0);
  const [isPaused,        setIsPaused]        = useState(false);
  const [updatingPayment, setUpdatingPayment] = useState(false); // ← New
  const timerRef = useRef(null);

  useEffect(() => {
    if (detailModal && selectedJob?.status === 'in-progress') {
      const initialElapsed = calculateElapsedSeconds(
        selectedJob.startDate || selectedJob.startTime
      );
      setElapsed(initialElapsed);
      timerRef.current = setInterval(() => {
        setElapsed(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [detailModal, selectedJob]);

  const filterJobs = () => {
    let filtered = [...jobs];
    if (search) {
      filtered = filtered.filter(j =>
        j.customerName?.toLowerCase().includes(search.toLowerCase()) ||
        j.village?.toLowerCase().includes(search.toLowerCase()) ||
        j.crop?.toLowerCase().includes(search.toLowerCase())
      );
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (activeFilter === 'Today') {
      filtered = filtered.filter(j => {
        const d = new Date(j.date);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === today.getTime();
      });
    } else if (activeFilter === 'This Week') {
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 7);
      filtered = filtered.filter(j => new Date(j.date) >= weekAgo);
    } else if (activeFilter === 'This Month') {
      filtered = filtered.filter(j => {
        const d = new Date(j.date);
        return d.getMonth()    === today.getMonth() &&
               d.getFullYear() === today.getFullYear();
      });
    }
    if (cropFilter !== 'All Crops') {
      filtered = filtered.filter(j => j.crop === cropFilter);
    }
    filtered.sort((a, b) => {
      const dateA = new Date(a.startDate || a.date);
      const dateB = new Date(b.startDate || b.date);
      return dateB - dateA;
    });
    return filtered;
  };

  const filteredCustomers = customers.filter(c =>
    c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.village?.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const filteredVehicles = vehicles.filter(v =>
    v.registrationNumber?.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
    v.type?.toLowerCase().includes(vehicleSearch.toLowerCase())
  );

  const validate = () => {
    const e = {};
    if (!jobForm.customerId) e.customer = 'Please select a customer';
    if (!jobForm.activityId) e.activity = 'Please select an activity';
    if (!jobForm.acres.trim()) e.acres = 'Enter acres';
    else if (isNaN(jobForm.acres) || parseFloat(jobForm.acres) <= 0)
      e.acres = 'Enter valid acres';
    if (!jobForm.cost.trim()) e.cost = 'Enter cost';
    else if (isNaN(jobForm.cost) || parseFloat(jobForm.cost) <= 0)
      e.cost = 'Enter valid cost';
    if (!jobForm.vehicleId) e.vehicle = 'Please select a vehicle';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleStart = async () => {
    if (!validate()) return;
    const jobData = {
      customerId: jobForm.customerId,
      activityId: jobForm.activityId,
      vehicleId:  jobForm.vehicleId,
      acres:      parseFloat(jobForm.acres),
      cost:       parseFloat(jobForm.cost),
      notes:      jobForm.notes,
      status:     'in-progress',
      paymentStatus: 'unpaid',    // ← Default unpaid on start
      startDate:  new Date().toISOString(),
      ownerId:    owner?.id,
    };
    try {
      await createJobApi(jobData);
      setJobForm(emptyJobForm);
      setErrors({});
      setViewMode('jobs');
      await fetchJobs();
    } catch (error) {
      Alert.alert('Error', 'Failed to start job. Please try again.');
    }
  };

  const handleCompleteJob = async (job) => {
    Alert.alert(
      'Complete Job?',
      `Mark job for ${job.customerName} as complete?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete', style: 'default',
          onPress: async () => {
            try {
              const startTime       = new Date(job.startDate);
              const endTime         = new Date();
              const durationSeconds = Math.floor((endTime - startTime) / 1000);
              const durationHours   = durationSeconds / 3600;
              const amount          = (job.cost * durationHours).toFixed(2);

              await updateJobApi(job.id, {
                ...job,
                status:    'finished',
                endDate:   endTime.toISOString(),
                amount,
                duration:  durationSeconds,
              });

              setDetailModal(false);
              await fetchJobs();
              Alert.alert('✅ Job Completed', 'Job completed successfully.');
            } catch (error) {
              Alert.alert('Error', 'Failed to complete job.');
            }
          }
        }
      ]
    );
  };

  // ── Update Payment Status
  const handleUpdatePayment = async (paymentStatus) => {
    if (!selectedJob) return;
    setUpdatingPayment(true);
    try {
      await updatePaymentStatusApi(selectedJob.id, paymentStatus);

      // Update local state immediately
      setSelectedJob(prev => ({ ...prev, paymentStatus }));
      setJobs(prev =>
        prev.map(j =>
          j.id === selectedJob.id
            ? { ...j, paymentStatus }
            : j
        )
      );

      setPaymentModal(false);
      Alert.alert(
        '✅ Payment Updated',
        `Payment marked as ${PAYMENT_STATUS[paymentStatus]?.label}`
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to update payment status.');
    } finally {
      setUpdatingPayment(false);
    }
  };

  const handleDelete = (id, name) => {
    Alert.alert(
      'Delete Job',
      `Delete job for "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await deleteJobApi(id);
              setDetailModal(false);
              fetchJobs();
            } catch (error) {
              console.error('Error deleting job:', error.message);
            }
          }
        }
      ]
    );
  };

  const fetchCustomers = async () => {
    try {
      const data = await fetchCustomersApi(owner?.id);
      setCustomers(data?.data || []);
    } catch (e) { console.error('fetchCustomers:', e.message); }
  };

  const fetchActivities = async () => {
    try {
      const data = await fetchActivitiesApi();
      setActivities(data?.data || []);
    } catch (e) { console.error('fetchActivities:', e.message); }
  };

  const fetchVehicles = async () => {
    try {
      const data = await fetchVehiclesApi(owner?.id);
      setVehicles(data?.data || []);
    } catch (e) { console.error('fetchVehicles:', e.message); }
  };

  const fetchJobs = async () => {
    try {
      const data = await fetchJobsApi(owner?.id);
      setJobs(data?.data || []);
    } catch (e) { console.error('fetchJobs:', e.message); }
  };

  useEffect(() => {
    if (!owner?.id) return;
    fetchJobs();
    fetchCustomers();
    fetchActivities();
    fetchVehicles();
  }, [owner?.id]);

  // ── Payment Status Badge Component
  const PaymentBadge = ({ status, small = false }) => {
    const config = PAYMENT_STATUS[status] || PAYMENT_STATUS.unpaid;
    return (
      <View style={[
        s.paymentBadge,
        { backgroundColor: config.bg },
        small && s.paymentBadgeSmall
      ]}>
        <Text style={[
          s.paymentBadgeText,
          { color: config.color },
          small && s.paymentBadgeTextSmall
        ]}>
          {config.icon} {config.label}
        </Text>
      </View>
    );
  };

  // ── Job Card
  const JobCard = ({ job }) => {
    const isInProgress  = job.status === 'in-progress';
    const paymentConfig = PAYMENT_STATUS[job.paymentStatus] || PAYMENT_STATUS.unpaid;

    return (
      <TouchableOpacity
        style={s.jobCard}
        onPress={() => { setSelectedJob(job); setDetailModal(true); }}
        activeOpacity={0.8}
      >
        {/* Left color bar — changes by payment status */}
        <View style={[
          s.jobCardBar,
          isInProgress
            ? { backgroundColor: '#e67e22' }
            : { backgroundColor: paymentConfig.color }
        ]} />

        <View style={s.jobCardContent}>
          {/* Top Row */}
          <View style={s.jobCardTop}>
            <View style={s.jobCardLeft}>
              <Text style={s.jobCardName}>{job.customerName}</Text>
              <Text style={s.jobCardMeta}>📍 {job.village}</Text>
            </View>
            <View style={s.jobCardRight}>
              {isInProgress ? (
                <View style={[s.cropBadge, { backgroundColor: '#fff3cd' }]}>
                  <Text style={[s.cropBadgeText, { color: '#ff9800' }]}>
                    🟢 In Progress
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={s.jobCardAmount}>₹{job.amount}</Text>
                  {/* ── Payment Status Badge on card */}
                  <PaymentBadge status={job.paymentStatus} small />
                </>
              )}
            </View>
          </View>

          {/* Bottom Row */}
          <View style={s.jobCardBottom}>
            <View style={s.jobChip}>
              <Text style={s.jobChipText}>📐 {job.acres} ac</Text>
            </View>
            {job.duration ? (
              <View style={s.jobChip}>
                <Text style={s.jobChipText}>⏱ {formatDuration(job.duration)}</Text>
              </View>
            ) : null}
            <View style={s.jobChip}>
              <Text style={s.jobChipText}>💰 ₹{job.rate}/hr</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const SectionHeader = ({ date, items }) => {
    const finishedJobs = items.filter(j => j.status === 'finished');
    const paidAmount   = finishedJobs
      .filter(j => j.paymentStatus === 'paid')
      .reduce((s, j) => s + parseFloat(j.amount || 0), 0);
    const unpaidAmount = finishedJobs
      .filter(j => j.paymentStatus !== 'paid')
      .reduce((s, j) => s + parseFloat(j.amount || 0), 0);

    return (
      <View style={s.sectionHeader}>
        <Text style={s.sectionDate}>{formatDate(date)}</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {paidAmount > 0 && (
            <View style={[s.sectionBadge, { backgroundColor: '#e8f5e9' }]}>
              <Text style={[s.sectionBadgeText, { color: '#1a6b3a' }]}>
                ✅ ₹{paidAmount.toFixed(0)}
              </Text>
            </View>
          )}
          {unpaidAmount > 0 && (
            <View style={[s.sectionBadge, { backgroundColor: '#fdecea' }]}>
              <Text style={[s.sectionBadgeText, { color: '#e74c3c' }]}>
                ❌ ₹{unpaidAmount.toFixed(0)}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderSetup = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>

      <View style={s.fieldGroup}>
        <Text style={g.inputLabel}>Select Customer *</Text>
        <TouchableOpacity
          style={[s.selector, errors.customer && s.selectorError]}
          onPress={() => { setCustomerSearch(''); setCustomerModal(true); }}
        >
          {jobForm.customerId ? (
            <View style={s.selectedCustomer}>
              <View style={s.selectorAvatar}>
                <Text style={s.selectorAvatarText}>
                  {customers.find(c => c.id === jobForm.customerId)?.name.charAt(0)}
                </Text>
              </View>
              <View>
                <Text style={s.selectorName}>
                  {customers.find(c => c.id === jobForm.customerId)?.name}
                </Text>
                <Text style={s.selectorSub}>
                  📍 {customers.find(c => c.id === jobForm.customerId)?.address}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={s.selectorPlaceholder}>👤 Tap to select customer...</Text>
          )}
          <Text style={s.selectorArrow}>›</Text>
        </TouchableOpacity>
        {errors.customer && <Text style={s.errorText}>{errors.customer}</Text>}
      </View>

      <View style={s.fieldGroup}>
        <Text style={g.inputLabel}>Activity Type *</Text>
        <TouchableOpacity
          style={[s.selector, errors.activity && s.selectorError]}
          onPress={() => setActivityModal(true)}
        >
          <Text style={jobForm.activityId ? s.selectorName : s.selectorPlaceholder}>
            {jobForm.activityId
              ? `🌾 ${activities?.find(a => a.id === jobForm.activityId)?.activityName}`
              : '🌾 Select activity...'}
          </Text>
          <Text style={s.selectorArrow}>›</Text>
        </TouchableOpacity>
        {errors.activity && <Text style={s.errorText}>{errors.activity}</Text>}
      </View>

      <View style={s.row}>
        <View style={[s.fieldGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={g.inputLabel}>Acres *</Text>
          <TextInput
            style={[g.input, errors.acres && s.inputError]}
            placeholder="e.g. 3.5"
            keyboardType="decimal-pad"
            value={jobForm.acres}
            onChangeText={v => setJobForm({ ...jobForm, acres: v })}
          />
          {errors.acres && <Text style={s.errorText}>{errors.acres}</Text>}
        </View>
        <View style={[s.fieldGroup, { flex: 1, marginLeft: 8 }]}>
          <Text style={g.inputLabel}>Cost (₹/hour) *</Text>
          <TextInput
            style={[g.input, errors.cost && s.inputError]}
            placeholder="e.g. 300"
            keyboardType="number-pad"
            value={jobForm.cost}
            onChangeText={v => setJobForm({ ...jobForm, cost: v })}
          />
          {errors.cost && <Text style={s.errorText}>{errors.cost}</Text>}
        </View>
      </View>

      <View style={s.fieldGroup}>
        <Text style={g.inputLabel}>Vehicle Used *</Text>
        <TouchableOpacity
          style={[s.selector, errors.vehicle && s.selectorError]}
          onPress={() => { setVehicleSearch(''); setVehicleModal(true); }}
        >
          {jobForm.vehicleId ? (
            <View style={s.selectedCustomer}>
              <View style={s.selectorAvatar}>
                <Text style={s.selectorAvatarText}>🚜</Text>
              </View>
              <View>
                <Text style={s.selectorName}>
                  {vehicles.find(v => v.id === jobForm.vehicleId)?.registrationNumber}
                </Text>
                <Text style={s.selectorSub}>
                  📋 {vehicles.find(v => v.id === jobForm.vehicleId)?.type}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={s.selectorPlaceholder}>🚜 Tap to select vehicle...</Text>
          )}
          <Text style={s.selectorArrow}>›</Text>
        </TouchableOpacity>
        {errors.vehicle && <Text style={s.errorText}>{errors.vehicle}</Text>}
      </View>

      <View style={s.fieldGroup}>
        <Text style={g.inputLabel}>Notes (Optional)</Text>
        <TextInput
          style={[g.input, { height: 80, textAlignVertical: 'top' }]}
          placeholder="Any extra info about this job..."
          multiline
          value={jobForm.notes}
          onChangeText={v => setJobForm({ ...jobForm, notes: v })}
        />
      </View>

      <TouchableOpacity style={s.startBtn} onPress={handleStart}>
        <Text style={s.startBtnIcon}>▶</Text>
        <Text style={s.startBtnText}>Start Job</Text>
      </TouchableOpacity>

    </ScrollView>
  );

  const renderJobsList = () => {
    const filteredJobs  = filterJobs();
    const groupedJobs   = groupByDate(filteredJobs);
    const totalEarnings = filteredJobs
      .filter(j => j.status === 'finished')
      .reduce((sum, j) => sum + parseFloat(j.amount || 0), 0);
    const paidTotal     = filteredJobs
      .filter(j => j.paymentStatus === 'paid')
      .reduce((sum, j) => sum + parseFloat(j.amount || 0), 0);
    const unpaidTotal   = filteredJobs
      .filter(j => j.status === 'finished' && j.paymentStatus !== 'paid')
      .reduce((sum, j) => sum + parseFloat(j.amount || 0), 0);

    return (
      <>
        <View style={g.header}>
          <View>
            <Text style={g.headerGreeting}>History</Text>
            <Text style={g.headerTitle}>All Jobs</Text>
          </View>
          <View style={s.headerStats}>
            <Text style={s.headerStatValue}>₹{totalEarnings.toLocaleString()}</Text>
            <Text style={s.headerStatLabel}>{filteredJobs.length} jobs</Text>
          </View>
        </View>

        {/* ── Payment Summary Banner */}
        <View style={s.paymentSummaryRow}>
          <View style={[s.paymentSummaryCard, { backgroundColor: '#e8f5e9' }]}>
            <Text style={s.paymentSummaryIcon}>✅</Text>
            <View>
              <Text style={[s.paymentSummaryAmount, { color: '#1a6b3a' }]}>
                ₹{paidTotal.toFixed(0)}
              </Text>
              <Text style={s.paymentSummaryLabel}>Paid</Text>
            </View>
          </View>
          <View style={[s.paymentSummaryCard, { backgroundColor: '#fdecea' }]}>
            <Text style={s.paymentSummaryIcon}>❌</Text>
            <View>
              <Text style={[s.paymentSummaryAmount, { color: '#e74c3c' }]}>
                ₹{unpaidTotal.toFixed(0)}
              </Text>
              <Text style={s.paymentSummaryLabel}>Unpaid</Text>
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
          <TouchableOpacity
            style={s.startJobHeaderBtn}
            onPress={() => { setViewMode('start'); setStep('setup'); }}
            activeOpacity={0.85}
          >
            <Text style={s.startJobHeaderBtnIcon}>▶️</Text>
            <Text style={s.startJobHeaderBtnText}>START NEW JOB</Text>
          </TouchableOpacity>
        </View>

        <View style={s.searchContainer}>
          <Text style={s.searchIcon}>🔍</Text>
          <TextInput
            style={s.searchInput}
            placeholder="Search customer, village, crop..."
            placeholderTextColor={Colors.textLight}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={s.clearSearch}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={s.filterRow}>
          <FlatList
            horizontal showsHorizontalScrollIndicator={false}
            data={FILTERS} keyExtractor={item => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[s.filterChip, activeFilter === item && s.filterChipActive]}
                onPress={() => setActiveFilter(item)}
              >
                <Text style={[
                  s.filterChipText,
                  activeFilter === item && s.filterChipTextActive
                ]}>
                  {item}
                </Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          />
        </View>

        {groupedJobs.length === 0 ? (
          <View style={s.emptyContainer}>
            <Text style={s.emptyIcon}>📋</Text>
            <Text style={s.emptyText}>No jobs found</Text>
            <Text style={s.emptySub}>Start a job to see it here</Text>
          </View>
        ) : (
          <FlatList
            data={groupedJobs}
            keyExtractor={item => item.date}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.listContent}
            renderItem={({ item }) => (
              <View>
                <SectionHeader date={item.date} items={item.items} />
                {item.items.map(job => (
                  <JobCard key={job.id} job={job} />
                ))}
              </View>
            )}
          />
        )}
      </>
    );
  };

  return (
    <SafeAreaView style={g.container}>
      <StatusBar backgroundColor={Colors.primary} barStyle="light-content" />

      {viewMode === 'jobs' ? (
        <>
          {renderJobsList()}

          {/* ── Job Detail Modal */}
          <Modal visible={detailModal} animationType="slide" transparent>
            <View style={s.modalOverlay}>
              <View style={s.modalSheet}>

                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>📋 Job Details</Text>
                  <TouchableOpacity onPress={() => setDetailModal(false)}>
                    <Text style={s.modalClose}>✕</Text>
                  </TouchableOpacity>
                </View>

                {selectedJob && (
                  <ScrollView showsVerticalScrollIndicator={false}>

                    {/* Timer for in-progress */}
                    {selectedJob.status === 'in-progress' && (
                      <View style={[s.timerCard, { marginBottom: 16 }]}>
                        <Text style={s.timerLabel}>⏱ Job In Progress</Text>
                        <Text style={s.timerClock}>{formatTime(elapsed)}</Text>
                        <Text style={s.timerSub}>
                          Started: {selectedJob.startTime || 'N/A'}
                        </Text>
                      </View>
                    )}

                    {/* Amount for finished */}
                    {selectedJob.status === 'finished' && (
                      <View style={s.detailAmountBox}>
                        <Text style={s.detailAmountLabel}>Total Amount</Text>
                        <Text style={s.detailAmount}>
                          ₹{selectedJob.amount}
                        </Text>
                        <Text style={s.detailAmountSub}>
                          {formatDuration(selectedJob.duration)}
                        </Text>
                      </View>
                    )}

                    {/* ── Payment Status Section (only for finished jobs) */}
                    {selectedJob.status === 'finished' && (
                      <View style={s.paymentSection}>
                        <View style={s.paymentSectionLeft}>
                          <Text style={s.paymentSectionTitle}>
                            💳 Payment Status
                          </Text>
                          <PaymentBadge status={selectedJob.paymentStatus} />
                        </View>
                        <TouchableOpacity
                          style={s.changePaymentBtn}
                          onPress={() => setPaymentModal(true)}
                        >
                          <Text style={s.changePaymentBtnText}>
                            Change
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Job Details */}
                    {[
                      { label: '👤 Customer', value: selectedJob.customerName },
                      { label: '📍 Village',  value: selectedJob.village },
                      { label: '🌾 Crop',     value: selectedJob.crop },
                      { label: '📐 Acres',    value: `${selectedJob.acres} acres` },
                      { label: '💰 Rate',     value: `₹${selectedJob.rate}/hour` },
                      { label: '⏱ Duration',  value: formatDuration(selectedJob.duration) },
                      { label: '📅 Date',     value: formatDate(selectedJob.date) },
                      { label: '🕐 Start',    value: selectedJob.startTime },
                      { label: '🕑 End',      value: selectedJob.endTime },
                    ].map((item, i, arr) => (
                      <View key={i}>
                        <View style={s.detailRow}>
                          <Text style={s.detailLabel}>{item.label}</Text>
                          <Text style={s.detailValue}>{item.value || '—'}</Text>
                        </View>
                        {i < arr.length - 1 && <View style={s.detailDivider} />}
                      </View>
                    ))}

                    {selectedJob.notes ? (
                      <>
                        <View style={s.detailDivider} />
                        <View style={s.notesBox}>
                          <Text style={s.detailLabel}>📝 Notes</Text>
                          <Text style={s.notesText}>{selectedJob.notes}</Text>
                        </View>
                      </>
                    ) : null}

                    {/* Complete Job Button */}
                    {selectedJob.status === 'in-progress' && (
                      <TouchableOpacity
                        style={s.saveBtn}
                        onPress={() => handleCompleteJob(selectedJob)}
                      >
                        <Text style={s.saveBtnText}>✅ Complete Job</Text>
                      </TouchableOpacity>
                    )}

                    {/* Delete Button */}
                    <TouchableOpacity
                      style={s.deleteBtn}
                      onPress={() => handleDelete(
                        selectedJob.id, selectedJob.customerName
                      )}
                    >
                      <Text style={s.deleteBtnText}>🗑️  Delete Job</Text>
                    </TouchableOpacity>

                  </ScrollView>
                )}
              </View>
            </View>
          </Modal>

          {/* ── Payment Status Modal */}
          <Modal visible={paymentModal} animationType="slide" transparent>
            <View style={s.modalOverlay}>
              <View style={[s.modalSheet, { maxHeight: '45%' }]}>

                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>💳 Update Payment</Text>
                  <TouchableOpacity onPress={() => setPaymentModal(false)}>
                    <Text style={s.modalClose}>✕</Text>
                  </TouchableOpacity>
                </View>

                <Text style={s.paymentModalSub}>
                  Select payment status for this job
                </Text>

                {/* Payment Options */}
                {Object.entries(PAYMENT_STATUS).map(([key, config]) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      s.paymentOption,
                      { backgroundColor: config.bg },
                      selectedJob?.paymentStatus === key && s.paymentOptionActive,
                    ]}
                    onPress={() => handleUpdatePayment(key)}
                    disabled={updatingPayment}
                  >
                    <View style={s.paymentOptionLeft}>
                      <Text style={s.paymentOptionIcon}>{config.icon}</Text>
                      <View>
                        <Text style={[
                          s.paymentOptionLabel,
                          { color: config.color }
                        ]}>
                          {config.label}
                        </Text>
                        <Text style={s.paymentOptionDesc}>
                          {key === 'paid'
                            ? 'Full payment received'
                            : key === 'unpaid'
                            ? 'Payment not received yet'
                            : 'Partial payment received'}
                        </Text>
                      </View>
                    </View>
                    {selectedJob?.paymentStatus === key && (
                      <Text style={{ color: config.color, fontSize: 18 }}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}

              </View>
            </View>
          </Modal>

          {/* Crop Filter Modal */}
          <Modal visible={cropModal} animationType="slide" transparent>
            <View style={s.modalOverlay}>
              <View style={[s.modalSheet, { maxHeight: '55%' }]}>
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>🌾 Filter by Crop</Text>
                  <TouchableOpacity onPress={() => setCropModal(false)}>
                    <Text style={s.modalClose}>✕</Text>
                  </TouchableOpacity>
                </View>
                {CROPS.map(crop => (
                  <TouchableOpacity
                    key={crop}
                    style={[s.cropItem, cropFilter === crop && s.cropItemActive]}
                    onPress={() => { setCropFilter(crop); setCropModal(false); }}
                  >
                    <Text style={[
                      s.cropItemText,
                      cropFilter === crop && s.cropItemTextActive
                    ]}>
                      {crop === 'All Crops' ? '🌿' : '🌾'} {crop}
                    </Text>
                    {cropFilter === crop &&
                      <Text style={{ color: Colors.primary }}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Modal>
        </>
      ) : (
        <>
          <View style={g.header}>
            <View>
              <Text style={g.headerGreeting}>New Job</Text>
              <Text style={g.headerTitle}>Start a Job</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setViewMode('jobs');
                setStep('setup');
                setJobForm(emptyJobForm);
                setErrors({});
                fetchJobs();
              }}
            >
              <Text style={s.backBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {step === 'setup' && renderSetup()}

          {/* Customer Picker */}
          <Modal visible={customerModal} animationType="slide" transparent>
            <View style={s.modalOverlay}>
              <View style={s.modalSheet}>
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>👤 Select Customer</Text>
                  <TouchableOpacity onPress={() => setCustomerModal(false)}>
                    <Text style={s.modalClose}>✕</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={[g.input, { marginBottom: 12 }]}
                  placeholder="🔍 Search customer..."
                  value={customerSearch}
                  onChangeText={setCustomerSearch}
                />
                <FlatList
                  data={filteredCustomers}
                  keyExtractor={item => String(item.id)}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        s.customerPickerItem,
                        jobForm.customerId === item.id && s.customerPickerItemActive
                      ]}
                      onPress={() => {
                        setJobForm({ ...jobForm, customerId: item.id });
                        setCustomerModal(false);
                      }}
                    >
                      <View style={[
                        s.selectorAvatar,
                        jobForm.customerId === item.id && { backgroundColor: Colors.primary }
                      ]}>
                        <Text style={s.selectorAvatarText}>
                          {item.name.charAt(0)}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.selectorName}>{item.name}</Text>
                        <Text style={s.selectorSub}>📍 {item.address}</Text>
                      </View>
                      {jobForm.customerId === item.id &&
                        <Text style={{ color: Colors.primary, fontSize: 18 }}>✓</Text>}
                    </TouchableOpacity>
                  )}
                />
              </View>
            </View>
          </Modal>

          {/* Activity Picker */}
          <Modal visible={activityModal} animationType="slide" transparent>
            <View style={s.modalOverlay}>
              <View style={[s.modalSheet, { maxHeight: '50%' }]}>
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>🌾 Select Activity</Text>
                  <TouchableOpacity onPress={() => setActivityModal(false)}>
                    <Text style={s.modalClose}>✕</Text>
                  </TouchableOpacity>
                </View>
                {activities.map(activity => (
                  <TouchableOpacity
                    key={String(activity.id)}
                    style={[
                      s.cropItem,
                      jobForm.activityId === activity.id && s.cropItemActive
                    ]}
                    onPress={() => {
                      setJobForm({ ...jobForm, activityId: activity.id });
                      setActivityModal(false);
                    }}
                  >
                    <Text style={[
                      s.cropItemText,
                      jobForm.activityId === activity.id && s.cropItemTextActive
                    ]}>
                      🌾 {activity.activityName}
                    </Text>
                    {jobForm.activityId === activity.id &&
                      <Text style={{ color: Colors.primary }}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Modal>

          {/* Vehicle Picker */}
          <Modal visible={vehicleModal} animationType="slide" transparent>
            <View style={s.modalOverlay}>
              <View style={s.modalSheet}>
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>🚜 Select Vehicle</Text>
                  <TouchableOpacity onPress={() => setVehicleModal(false)}>
                    <Text style={s.modalClose}>✕</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={[g.input, { marginBottom: 12 }]}
                  placeholder="🔍 Search vehicle..."
                  value={vehicleSearch}
                  onChangeText={setVehicleSearch}
                />
                <FlatList
                  data={filteredVehicles}
                  keyExtractor={item => String(item.id)}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        s.customerPickerItem,
                        jobForm.vehicleId === item.id && s.customerPickerItemActive
                      ]}
                      onPress={() => {
                        setJobForm({ ...jobForm, vehicleId: item.id });
                        setVehicleModal(false);
                      }}
                    >
                      <View style={[
                        s.selectorAvatar,
                        jobForm.vehicleId === item.id && { backgroundColor: Colors.primary }
                      ]}>
                        <Text style={s.selectorAvatarText}>🚜</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.selectorName}>{item.registrationNumber}</Text>
                        <Text style={s.selectorSub}>📋 {item.type}</Text>
                      </View>
                      {jobForm.vehicleId === item.id &&
                        <Text style={{ color: Colors.primary, fontSize: 18 }}>✓</Text>}
                    </TouchableOpacity>
                  )}
                />
              </View>
            </View>
          </Modal>
        </>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({

  headerStats:     { alignItems: 'flex-end' },
  headerStatValue: { color: Colors.white, fontSize: 18, fontWeight: '800' },
  headerStatLabel: { color: Colors.primaryLight, fontSize: 12, marginTop: 2 },
  backBtn:         { fontSize: 24, color: Colors.white, padding: 4 },

  // ── Payment Summary Banner
  paymentSummaryRow: {
    flexDirection: 'row', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  paymentSummaryCard: {
    flex: 1, flexDirection: 'row',
    alignItems: 'center', gap: 10,
    borderRadius: 14, padding: 12,
  },
  paymentSummaryIcon:   { fontSize: 24 },
  paymentSummaryAmount: { fontSize: 16, fontWeight: '800' },
  paymentSummaryLabel:  { fontSize: 11, color: Colors.textMuted, marginTop: 2 },

  // ── Payment Badge
  paymentBadge: {
    borderRadius: 10, paddingHorizontal: 10,
    paddingVertical: 4, marginTop: 4,
  },
  paymentBadgeSmall:     { paddingHorizontal: 8, paddingVertical: 3, marginTop: 3 },
  paymentBadgeText:      { fontSize: 12, fontWeight: '700' },
  paymentBadgeTextSmall: { fontSize: 10 },

  // ── Payment Section in Modal
  paymentSection: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', backgroundColor: Colors.background,
    borderRadius: 14, padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  paymentSectionLeft:  { gap: 6 },
  paymentSectionTitle: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  changePaymentBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8,
  },
  changePaymentBtnText: { color: Colors.white, fontSize: 13, fontWeight: '700' },

  // ── Payment Modal
  paymentModalSub: {
    fontSize: 13, color: Colors.textMuted,
    marginBottom: 16,
  },
  paymentOption: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', borderRadius: 14,
    padding: 14, marginBottom: 10,
  },
  paymentOptionActive: { borderWidth: 2, borderColor: Colors.primary },
  paymentOptionLeft:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  paymentOptionIcon:   { fontSize: 24 },
  paymentOptionLabel:  { fontSize: 15, fontWeight: '700' },
  paymentOptionDesc:   { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

  startJobHeaderBtn: {
    backgroundColor: Colors.primary, borderRadius: 18,
    paddingVertical: 16, paddingHorizontal: 24,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    shadowColor: Colors.primary, shadowOpacity: 0.45,
    shadowRadius: 12, elevation: 8, marginVertical: 8,
  },
  startJobHeaderBtnIcon: { fontSize: 22, marginRight: 12 },
  startJobHeaderBtnText: { color: Colors.white, fontSize: 17, fontWeight: '800' },

  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white,
    margin: 16, marginBottom: 8,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 4,
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  searchIcon:  { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text, paddingVertical: 10 },
  clearSearch: { fontSize: 16, color: Colors.textLight, paddingLeft: 8 },

  filterRow: { marginBottom: 8 },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, backgroundColor: Colors.white,
    borderWidth: 1, borderColor: Colors.border,
  },
  filterChipActive:    { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText:      { fontSize: 13, color: Colors.textMuted, fontWeight: '600' },
  filterChipTextActive:{ color: Colors.white },

  listContent: { paddingHorizontal: 16, paddingBottom: 100 },

  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8, marginTop: 8,
  },
  sectionDate:     { fontSize: 14, fontWeight: '700', color: Colors.text },
  sectionBadge: {
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  sectionBadgeText: { fontSize: 11, fontWeight: '600' },

  jobCard: {
    backgroundColor: Colors.white, borderRadius: 14,
    marginBottom: 10, flexDirection: 'row',
    shadowColor: '#000', shadowOpacity: 0.05,
    shadowRadius: 5, elevation: 2, overflow: 'hidden',
  },
  jobCardBar:     { width: 5, backgroundColor: Colors.primary },
  jobCardContent: { flex: 1, padding: 14 },
  jobCardTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 10,
  },
  jobCardLeft:   { flex: 1 },
  jobCardName:   { fontSize: 15, fontWeight: '700', color: Colors.text },
  jobCardMeta:   { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  jobCardRight:  { alignItems: 'flex-end' },
  jobCardAmount: { fontSize: 16, fontWeight: '800', color: Colors.primary },

  cropBadge: {
    backgroundColor: '#e8f5e9', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3, marginTop: 4,
  },
  cropBadgeText: { fontSize: 11, color: Colors.primary, fontWeight: '600' },

  jobCardBottom: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  jobChip: {
    backgroundColor: Colors.background, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  jobChipText: { fontSize: 11, color: Colors.textMuted, fontWeight: '500' },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  emptyIcon:      { fontSize: 56, marginBottom: 12 },
  emptyText:      { fontSize: 18, fontWeight: '700', color: Colors.text },
  emptySub:       { fontSize: 13, color: Colors.textLight, marginTop: 6 },

  modalOverlay: { flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  modalClose: { fontSize: 18, color: Colors.textMuted, padding: 4 },

  detailAmountBox: {
    backgroundColor: '#e8f5e9', borderRadius: 14,
    padding: 18, alignItems: 'center', marginBottom: 16,
  },
  detailAmountLabel: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  detailAmount:      { fontSize: 32, fontWeight: '800', color: Colors.primary, marginTop: 4 },
  detailAmountSub:   { fontSize: 12, color: Colors.textMuted, marginTop: 4 },

  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10,
  },
  detailLabel:  { fontSize: 13, color: Colors.textMuted },
  detailValue:  { fontSize: 14, fontWeight: '600', color: Colors.text },
  detailDivider:{ height: 1, backgroundColor: Colors.border },

  notesBox:  { paddingVertical: 10 },
  notesText: { fontSize: 13, color: Colors.text, marginTop: 4, lineHeight: 20 },

  deleteBtn: {
    backgroundColor: '#fdecea', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
    marginTop: 8, marginBottom: 8,
    borderWidth: 1, borderColor: '#fadbd8',
  },
  deleteBtnText: { color: '#e74c3c', fontSize: 15, fontWeight: '700' },

  cropItem: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  cropItemActive:    { backgroundColor: '#e8f5e9' },
  cropItemText:      { fontSize: 15, color: Colors.text },
  cropItemTextActive:{ color: Colors.primary, fontWeight: '700' },

  scrollContent: { padding: 16, paddingBottom: 100 },
  fieldGroup:    { marginBottom: 16 },
  row:           { flexDirection: 'row' },

  selector: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white, borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: Colors.border,
    justifyContent: 'space-between',
  },
  selectorError:       { borderColor: '#e74c3c', borderWidth: 1.5 },
  selectorPlaceholder: { color: Colors.textLight, fontSize: 14, flex: 1 },
  selectorArrow:       { color: Colors.textLight, fontSize: 22, fontWeight: '300' },
  selectedCustomer:    { flexDirection: 'row', alignItems: 'center', flex: 1 },
  selectorAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  selectorAvatarText: { color: Colors.primary, fontWeight: '700', fontSize: 16 },
  selectorName:       { fontSize: 15, fontWeight: '600', color: Colors.text },
  selectorSub:        { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

  startBtn: {
    backgroundColor: Colors.primary, borderRadius: 16,
    paddingVertical: 18, flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center', marginTop: 8,
    shadowColor: Colors.primary, shadowOpacity: 0.4,
    shadowRadius: 12, elevation: 6,
  },
  startBtnIcon: { fontSize: 20, color: Colors.white, marginRight: 10 },
  startBtnText: { fontSize: 18, fontWeight: '800', color: Colors.white },

  timerCard: {
    backgroundColor: Colors.primary, borderRadius: 24,
    padding: 32, alignItems: 'center', marginBottom: 20,
    shadowColor: Colors.primary, shadowOpacity: 0.4,
    shadowRadius: 16, elevation: 8,
  },
  timerLabel: { color: Colors.primaryLight, fontSize: 14, fontWeight: '600', marginBottom: 12 },
  timerClock: { color: Colors.white, fontSize: 52, fontWeight: '800', letterSpacing: 2 },
  timerSub:   { color: '#ffffff99', fontSize: 13, marginTop: 8, marginBottom: 20 },

  infoCard: {
    backgroundColor: Colors.white, borderRadius: 16,
    padding: 16, marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.05,
    shadowRadius: 6, elevation: 2,
  },
  infoCardTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 14 },
  infoRow:    { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  infoLabel:  { fontSize: 13, color: Colors.textMuted },
  infoValue:  { fontSize: 14, fontWeight: '600', color: Colors.text },
  infoDivider:{ height: 1, backgroundColor: Colors.border },

  saveBtn: {
    backgroundColor: Colors.primary, borderRadius: 16,
    paddingVertical: 18, alignItems: 'center', marginBottom: 12,
    shadowColor: Colors.primary, shadowOpacity: 0.3,
    shadowRadius: 10, elevation: 5,
  },
  saveBtnText: { fontSize: 17, fontWeight: '800', color: Colors.white },

  inputError: { borderColor: '#e74c3c', borderWidth: 1.5 },
  errorText:  { color: '#e74c3c', fontSize: 12, marginTop: -10, marginBottom: 8, marginLeft: 2 },

  customerPickerItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  customerPickerItemActive: { backgroundColor: '#e8f5e9' },

  subFilterRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12,
  },
});