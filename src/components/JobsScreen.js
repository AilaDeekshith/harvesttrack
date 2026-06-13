import React, { useState, useRef, useEffect, use } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView,
  StyleSheet, SafeAreaView, StatusBar,
  FlatList, Modal, Alert
} from 'react-native';
import g from '../styles/globalStyles';
import Colors from '../constants/colors';
import { createJobApi, deleteJobApi, fetchActivitiesApi, fetchCustomersApi, fetchJobsApi, fetchVehiclesApi, updateJobApi } from '../services/api';
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

// ── Format seconds → HH:MM:SS
const formatTime = (secs) => {
  const h = String(Math.floor(secs / 3600)).padStart(2, '0');
  const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
};

// ── Format date
const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
};

// ── Calculate elapsed time from startTime (e.g., "03:50 pm" or ISO string)
const calculateElapsedSeconds = (startTimeOrDate) => {
  let startDate;
  
  if (typeof startTimeOrDate === 'string') {
    // If it's an ISO datetime string (from API)
    if (startTimeOrDate.includes('T')) {
      startDate = new Date(startTimeOrDate);
    } else {
      // If it's a time string like "03:50 pm", treat it as today
      const today = new Date();
      const timeStr = startTimeOrDate.toUpperCase();
      const [time, period] = timeStr.split(' ');
      const [hours, minutes] = time.split(':');
      let hour = parseInt(hours);
      
      if (period === 'PM' && hour !== 12) hour += 12;
      if (period === 'AM' && hour === 12) hour = 0;
      
      startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour, parseInt(minutes), 0);
    }
  } else {
    startDate = startTimeOrDate;
  }
  
  const now = new Date();
  return Math.max(0, Math.floor((now - startDate) / 1000));
};

// ── Group jobs by date
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

const FILTERS = ['All', 'Today', 'This Week', 'This Month'];
const CROPS   = ['All Crops', 'Rice', 'Wheat', 'Maize', 'Cotton', 'Sugarcane', 'Soybean'];

const emptyJobForm = { 
  customerId: null, 
  activityId: null, 
  acres: '', 
  cost: '', 
  vehicleId: null,
  notes: '',
  ownerId: 1,
};

export default function JobsScreen() {
  // ── View Mode: 'jobs' (list) or 'start' (new job form)
  const [viewMode, setViewMode] = useState('jobs');

  // ── API Data
  const [customers, setCustomers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  // ──────────────────────────────────────────────
  // JOBS LIST STATE
  // ──────────────────────────────────────────────
  const [jobs, setJobs]               = useState([]);
  const [search, setSearch]           = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [cropFilter, setCropFilter]   = useState('All Crops');
  const [selectedJob, setSelectedJob] = useState(null);
  const [detailModal, setDetailModal] = useState(false);
  const [cropModal, setCropModal]     = useState(false);

  // ──────────────────────────────────────────────
  // START JOB STATE
  // ──────────────────────────────────────────────
  const [step, setStep]                   = useState('setup');
  const [jobForm, setJobForm]             = useState(emptyJobForm);
  const [errors, setErrors]               = useState({});
  const [customerModal, setCustomerModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [activityModal, setActivityModal] = useState(false);
  const [vehicleModal, setVehicleModal]   = useState(false);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [elapsed, setElapsed]             = useState(0);
  const [startTime, setStartTime]         = useState(null);
  const [isPaused, setIsPaused]           = useState(false);
  const timerRef                          = useRef(null);
  const [summary, setSummary]             = useState(null);
  const [runningJob, setRunningJob]       = useState(null);  // Track the current running job
  const { owner } = useAuth();

  // ── Timer logic for job detail modal
  useEffect(() => {
    if (detailModal && selectedJob?.status === 'in-progress') {
      // Calculate initial elapsed time from job's actual start
      const initialElapsed = calculateElapsedSeconds(selectedJob.startDate || selectedJob.startTime);
      setElapsed(initialElapsed);
      
      timerRef.current = setInterval(() => {
        setElapsed(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [detailModal, selectedJob]);

  // ── Filter logic
  const filterJobs = () => {
    let filtered = [...jobs];

    // Search
    if (search) {
      filtered = filtered.filter(j =>
        j.customerName.toLowerCase().includes(search.toLowerCase()) ||
        j.village.toLowerCase().includes(search.toLowerCase()) ||
        j.crop.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Date filter
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
        return d.getMonth() === today.getMonth() &&
               d.getFullYear() === today.getFullYear();
      });
    }

    // Crop filter
    if (cropFilter !== 'All Crops') {
      filtered = filtered.filter(j => j.crop === cropFilter);
    }

    // Sort by latest first (by startDate or date)
    filtered.sort((a, b) => {
      const dateA = new Date(a.startDate || a.date);
      const dateB = new Date(b.startDate || b.date);
      return dateB - dateA;
    });

    return filtered;
  };

  // ── Filtered customers for start job
  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.village.toLowerCase().includes(customerSearch.toLowerCase())
  );

  // ── Filtered vehicles for start job
  const filteredVehicles = vehicles.filter(v =>
    v.registrationNumber.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
    v.type?.toLowerCase().includes(vehicleSearch.toLowerCase())
  );

  // ── Validate setup form
  const validate = () => {
    const e = {};
    if (!jobForm.customerId)   e.customer = 'Please select a customer';
    if (!jobForm.activityId)   e.activity = 'Please select an activity';
    if (!jobForm.acres.trim())       e.acres    = 'Enter acres';
    else if (isNaN(jobForm.acres) || parseFloat(jobForm.acres) <= 0) e.acres = 'Enter valid acres';
    if (!jobForm.cost.trim()) e.cost     = 'Enter cost';
    else if (isNaN(jobForm.cost) || parseFloat(jobForm.cost) <= 0) e.cost = 'Enter valid cost';
    if (!jobForm.vehicleId)   e.vehicle   = 'Please select a vehicle';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Start Job
  const handleStart = async() => {
    if (!validate()) return;
    
    const jobData = {
      customerId: jobForm.customerId,
      activityId: jobForm.activityId,
      vehicleId: jobForm.vehicleId,
      acres: parseFloat(jobForm.acres),
      cost: parseFloat(jobForm.cost),
      notes: jobForm.notes,
      status: 'in-progress',
      startDate: new Date().toISOString(),
      ownerId: owner?.id,
    };

    console.log('Starting job with details:', jobData);

    try {
      const data = await createJobApi(jobData);
      console.log("Job created:", data);
      
      // Reset form and show jobs list
      setJobForm(emptyJobForm);
      setErrors({});
      setViewMode('jobs');
      
      // Refresh jobs list
      await fetchJobs();
    } catch (error) {
      console.error("Error saving job:", error.message);
      Alert.alert('Error', 'Failed to start job. Please try again.');
    }
  };

  // ── Complete Job (from modal)
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
              // Calculate duration and amount based on elapsed time since job start
              const startTime = new Date(job.startDate);
              const endTime = new Date();
              const durationInSeconds = Math.floor((endTime - startTime) / 1000);
              const durationInHours = durationInSeconds / 3600;
              const amount = (job.cost * durationInHours).toFixed(2);
              
              const updateData = {
                ...job,
                status: 'finished',
                endDate: endTime.toISOString(),
                amount: amount,
                duration: durationInSeconds,
              };
              
              await updateJobApi(job.id, updateData);
              
              setDetailModal(false);
              await fetchJobs();
              Alert.alert('✅ Job Completed', 'Job status updated successfully.');
            } catch (error) {
              console.error("Error completing job:", error.message);
              Alert.alert('Error', 'Failed to complete job. Please try again.');
            }
          }
        }
      ]
    );
  };

  // ── Pause / Resume
  const togglePause = () => setIsPaused(prev => !prev);

  // ── Save Job & Reset
  const handleSaveJob = async () => {
    Alert.alert('✅ Job Saved!', `Job completed successfully.`, [
      {
        text: 'OK', onPress: () => {
          setStep('setup');
          setJobForm(emptyJobForm);
          setElapsed(0);
          setSummary(null);
          setRunningJob(null);
          setErrors({});
          setViewMode('jobs');
          fetchJobs();
        }
      }
    ]);
  };

  // ── Reset to setup
  const handleNewJob = () => {
    setStep('setup');
    setJobForm(emptyJobForm);
    setElapsed(0);
    setSummary(null);
    setRunningJob(null);
    setErrors({});
  };

  const filteredJobs  = filterJobs();
  const groupedJobs   = groupByDate(filteredJobs);
  const totalEarnings = filteredJobs.reduce((sum, j) => sum + parseInt(j.amount), 0);
  const totalAcres    = filteredJobs.reduce((sum, j) => sum + parseFloat(j.acres), 0);

  // ── Delete job
  const handleDelete = (id, name) => {
    Alert.alert(
      'Delete Job',
      `Delete job for "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            await deleteJobApi(id).then(() => {
              setStep('jobs');
              setDetailModal(false);
              fetchJobs();
            }).catch((error) => {
              console.error("Error deleting job:", error.message);
            });
          }
        }
      ]
    );

  };

  const fetchCustomers = async () => {
    try {
      const data = await fetchCustomersApi(owner?.id); // Replace with actual ownerId
      setCustomers(data?.data || []);
    } catch (error) {
      console.error("Error fetching customers:", error.message);
    }
  };

  const fetchActivities = async () => {
    try {
      const data = await fetchActivitiesApi(); // Replace with actual ownerId
      setActivities(data?.data || []);
    } catch (error) {
      console.error("Error fetching activities:", error.message);
    }
  };

  const fetchVehicles = async () => {
    try {
      const data = await fetchVehiclesApi(owner?.id); // Replace with actual ownerId
      setVehicles(data?.data || []);
    } catch (error) {
      console.error("Error fetching vehicles:", error.message);
    }
  };

  const fetchJobs = async () => {
    try {
      const data = await fetchJobsApi(owner?.id); // Replace with actual ownerId
      setJobs(data?.data || []);
    } catch (error) {
      console.error("Error fetching jobs:", error.message);
    }
  };

  useEffect(() => {
    fetchJobs();
    fetchCustomers();
    fetchActivities();
    fetchVehicles();
  }, []);

  // ── Job Card
  const JobCard = ({ job }) => (
    <TouchableOpacity
      style={s.jobCard}
      onPress={() => { setSelectedJob(job); setDetailModal(true); }}
      activeOpacity={0.8}
    >
      {/* Left color bar */}
      <View style={s.jobCardBar} />

      <View style={s.jobCardContent}>
        {/* Top Row */}
        <View style={s.jobCardTop}>
          <View style={s.jobCardLeft}>
            <Text style={s.jobCardName}>{job.customerName}</Text>
            <Text style={s.jobCardMeta}>📍 {job.village}</Text>
          </View>
          <View style={s.jobCardRight}>
            {job.status === 'in-progress' ? (
              <View style={[s.cropBadge, { backgroundColor: '#fff3cd' }]}>
                <Text style={[s.cropBadgeText, { color: '#ff9800' }]}>🟢 In Progress</Text>
              </View>
            ) : (
              <Text style={s.jobCardAmount}>₹{job.amount}</Text>
            )}
          </View>
        </View>

        {/* Bottom Row */}
        <View style={s.jobCardBottom}>
          <View style={s.jobChip}>
            <Text style={s.jobChipText}>📐 {job.acres} ac</Text>
          </View>
          <View style={s.jobChip}>
            <Text style={s.jobChipText}>⏱ {formatDuration(job.duration)}</Text>
          </View>
          <View style={s.jobChip}>
            <Text style={s.jobChipText}>💰 ₹{job.rate}/hr</Text>
          </View>
          <View style={s.jobChip}>
            <Text style={s.jobChipText}>🕐 {job.startTime}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  // ── Section Header (date group)
  const SectionHeader = ({ date, items }) => (
    <View style={s.sectionHeader}>
      <Text style={s.sectionDate}>{formatDate(date)}</Text>
      <View style={s.sectionBadge}>
        <Text style={s.sectionBadgeText}>
          {items.length} job{items.length > 1 ? 's' : ''}  •  ₹{items?.filter(j => j.status === 'finished')?.reduce((s, j) => s + parseInt(j.amount), 0)}
        </Text>
      </View>
    </View>
  );

  // ────────────────────────────────────────────
  // RENDER: START JOB SETUP SCREEN
  // ────────────────────────────────────────────
  const renderSetup = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>

      {/* ── Select Customer */}
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
                <Text style={s.selectorName}>{customers.find(c => c.id === jobForm.customerId)?.name}</Text>
                <Text style={s.selectorSub}>
                  📍 {customers.find(c => c.id === jobForm.customerId)?.address}  •  🌾 {customers.find(c => c.id === jobForm.customerId)?.acres} acres
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

      {/* ── Activity Type */}
      <View style={s.fieldGroup}>
        <Text style={g.inputLabel}>Activity Type *</Text>
        <TouchableOpacity
          style={[s.selector, errors.activity && s.selectorError]}
          onPress={() => setActivityModal(true)}
        >
          <Text style={jobForm.activityId ? s.selectorName : s.selectorPlaceholder}>
            {jobForm.activityId ? `🌾 ${activities?.find(a => a.id === jobForm.activityId)?.activityName}` : '🌾 Select activity...'}
          </Text>
          <Text style={s.selectorArrow}>›</Text>
        </TouchableOpacity>
        {errors.activity && <Text style={s.errorText}>{errors.activity}</Text>}
      </View>

      {/* ── Acres & Price Row */}
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
          <Text style={g.inputLabel}>Cost (₹) per hour</Text>
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

      {/* ── Select Vehicle */}
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
                <Text style={s.selectorName}>{vehicles.find(v => v.id === jobForm.vehicleId)?.registrationNumber}</Text>
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

      {/* ── Notes */}
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

      {/* ── Start Button */}
      <TouchableOpacity style={s.startBtn} onPress={handleStart}>
        <Text style={s.startBtnIcon}>▶</Text>
        <Text style={s.startBtnText}>Start Job</Text>
      </TouchableOpacity>

    </ScrollView>
  );

  // ────────────────────────────────────────────
  // RENDER: RUNNING SCREEN
  // ────────────────────────────────────────────
  const renderRunning = () => {
    if (!runningJob) return null;
    
    // Calculate current amount based on elapsed time
    const durationInHours = elapsed / 3600;
    const currentAmount = (runningJob.cost * durationInHours).toFixed(2);
    
    return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>

      {/* Live Timer Card */}
      <View style={s.timerCard}>
        <Text style={s.timerLabel}>⏱ Job In Progress</Text>
        <Text style={s.timerClock}>{formatTime(elapsed)}</Text>
        <Text style={s.timerSub}>
          Started at {startTime?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>

        {/* Pause / Resume */}
        <TouchableOpacity
          style={[s.pauseBtn, isPaused && s.pauseBtnActive]}
          onPress={togglePause}
        >
          <Text style={s.pauseBtnText}>{isPaused ? '▶  Resume' : '⏸  Pause'}</Text>
        </TouchableOpacity>
      </View>

      {/* Current Amount Card */}
      <View style={s.estimateCard}>
        <Text style={s.estimateLabel}>💰 Current Amount</Text>
        <Text style={s.estimateValue}>₹{currentAmount}</Text>
        <Text style={s.estimateSub}>
          ₹{runningJob.cost}/hour × {durationInHours.toFixed(2)}h
        </Text>
      </View>

      {/* Job Info Card */}
      <View style={s.infoCard}>
        <Text style={s.infoCardTitle}>📋 Job Details</Text>
        <View style={s.infoRow}>
          <Text style={s.infoLabel}>👤 Customer</Text>
          <Text style={s.infoValue}>{runningJob.customer?.name}</Text>
        </View>
        <View style={s.infoDivider} />
        <View style={s.infoRow}>
          <Text style={s.infoLabel}>🌾 Activity</Text>
          <Text style={s.infoValue}>{runningJob.activity?.activityName}</Text>
        </View>
        <View style={s.infoDivider} />
        <View style={s.infoRow}>
          <Text style={s.infoLabel}>💰 Cost</Text>
          <Text style={s.infoValue}>₹{runningJob.cost} / hour</Text>
        </View>
        <View style={s.infoDivider} />
        <View style={s.infoRow}>
          <Text style={s.infoLabel}>🚜 Vehicle</Text>
          <Text style={s.infoValue}>{runningJob.vehicle?.registrationNumber}</Text>
        </View>
      </View>

      {/* Stop Button */}
      <TouchableOpacity style={s.stopBtn} onPress={handleStop}>
        <Text style={s.stopBtnIcon}>⏹</Text>
        <Text style={s.stopBtnText}>Stop Job</Text>
      </TouchableOpacity>

    </ScrollView>
    );
  };

  // ────────────────────────────────────────────
  // RENDER: SUMMARY SCREEN
  // ────────────────────────────────────────────
  const renderSummary = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>

      {/* Success Banner */}
      <View style={s.successBanner}>
        <Text style={s.successIcon}>✅</Text>
        <Text style={s.successTitle}>Job Completed!</Text>
        <Text style={s.successSub}>Here's your job summary</Text>
      </View>

      {/* Summary Card */}
      <View style={s.summaryCard}>

        {/* Amount Highlight */}
        <View style={s.summaryAmountBox}>
          <Text style={s.summaryAmountLabel}>Total Amount</Text>
          <Text style={s.summaryAmount}>₹{summary?.amount}</Text>
          <Text style={s.summaryAmountSub}>
            {summary?.acres} acres × ₹{summary?.rate}/acre
          </Text>
        </View>

        <View style={s.summaryDivider} />

        {/* Details */}
        {[
          { label: '👤 Customer',   value: summary?.customer?.name },
          { label: '🌾 Activity',   value: summary?.activity?.activityName },
          { label: '📐 Acres',      value: `${summary?.acres} acres` },
          { label: '💰 Cost',      value: `₹${summary?.cost}/hour` },
          { label: '🚜 Vehicle',    value: summary?.vehicle?.registrationNumber },
          { label: '⏱ Duration',    value: formatDuration(summary?.duration || 0) },
          { label: '🕐 Start Time', value: summary?.startTime?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
          { label: '🕑 End Time',   value: summary?.endTime?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
        ].map((item, i) => (
          <View key={i}>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>{item.label}</Text>
              <Text style={s.infoValue}>{item.value}</Text>
            </View>
            {i < 7 && <View style={s.infoDivider} />}
          </View>
        ))}

        {/* Notes */}
        {summary?.notes ? (
          <>
            <View style={s.infoDivider} />
            <View style={s.notesRow}>
              <Text style={s.infoLabel}>📝 Notes</Text>
              <Text style={s.notesValue}>{summary.notes}</Text>
            </View>
          </>
        ) : null}
      </View>

      {/* Action Buttons */}
      <TouchableOpacity style={s.saveBtn} onPress={handleSaveJob}>
        <Text style={s.saveBtnText}>💾  Save Job</Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.newJobBtn} onPress={handleNewJob}>
        <Text style={s.newJobBtnText}>＋  Start New Job</Text>
      </TouchableOpacity>

    </ScrollView>
  );

  // ────────────────────────────────────────────
  // RENDER: JOBS LIST VIEW
  // ────────────────────────────────────────────
  const renderJobsList = () => {
    const filteredJobs  = filterJobs();
    const groupedJobs   = groupByDate(filteredJobs);
    const totalEarnings = filteredJobs.filter(job => job.status === 'finished').reduce((sum, j) => sum + parseInt(j.amount), 0);
    const totalAcres    = filteredJobs.reduce((sum, j) => sum + parseFloat(j.acres), 0);

    return (
      <>
        {/* ── Header */}
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

        {/* ── Start Job Button */}
        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <TouchableOpacity
            style={s.startJobHeaderBtn}
            onPress={() => {
              setViewMode('start');
              setStep('setup');
            }}
            activeOpacity={0.85}
          >
            <Text style={s.startJobHeaderBtnIcon}>▶️</Text>
            <Text style={s.startJobHeaderBtnText}>START NEW JOB</Text>
          </TouchableOpacity>
        </View>

        {/* ── Search */}
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

        {/* ── Date Filters */}
        <View style={s.filterRow}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={FILTERS}
            keyExtractor={item => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[s.filterChip, activeFilter === item && s.filterChipActive]}
                onPress={() => setActiveFilter(item)}
              >
                <Text style={[s.filterChipText, activeFilter === item && s.filterChipTextActive]}>
                  {item}
                </Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          />
        </View>

        {/* ── Crop Filter + Summary Row */}
        <View style={s.subFilterRow}>
          <TouchableOpacity style={s.cropFilterBtn} onPress={() => setCropModal(true)}>
            <Text style={s.cropFilterText}>
              🌾 {cropFilter}
            </Text>
            <Text style={s.cropFilterArrow}>▾</Text>
          </TouchableOpacity>

          <View style={s.summaryChips}>
            <View style={s.summaryChip}>
              <Text style={s.summaryChipText}>📐 {totalAcres.toFixed(1)} ac</Text>
            </View>
            <View style={s.summaryChip}>
              <Text style={s.summaryChipText}>💰 ₹{totalEarnings.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        {/* ── Jobs List */}
        {groupedJobs.length === 0 ? (
          <View style={s.emptyContainer}>
            <Text style={s.emptyIcon}>📋</Text>
            <Text style={s.emptyText}>No jobs found</Text>
            <Text style={s.emptySub}>
              {search ? 'Try a different search' : 'Start a job to see it here'}
            </Text>
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

      {/* Show Jobs List or Start Job Form based on viewMode */}
      {viewMode === 'jobs' ? (
        <>
          {renderJobsList()}

          {/* ── Job Detail Modal */}
          <Modal visible={detailModal} animationType="slide" transparent>
            <View style={s.modalOverlay}>
              <View style={s.modalSheet}>

                {/* Modal Header */}
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>📋 Job Details</Text>
                  <TouchableOpacity onPress={() => setDetailModal(false)}>
                    <Text style={s.modalClose}>✕</Text>
                  </TouchableOpacity>
                </View>

                {selectedJob && (
                  <ScrollView showsVerticalScrollIndicator={false}>
                    {/* Show Timer for In-Progress Jobs */}
                    {selectedJob.status === 'in-progress' && (
                      <View style={[s.timerCard, { marginHorizontal: 16, marginTop: 16 }]}>
                        <Text style={s.timerLabel}>⏱ Job In Progress</Text>
                        <Text style={s.timerClock}>{formatTime(elapsed)}</Text>
                        <Text style={s.timerSub}>
                          Started: {selectedJob.startTime ? selectedJob.startTime : 'N/A'}
                        </Text>
                      </View>
                    )}
                    
                    {/* Amount Banner */}
                    {selectedJob.status === 'finished' && (
                      <View style={s.detailAmountBox}>
                        <Text style={s.detailAmountLabel}>Total Amount</Text>
                        <Text style={s.detailAmount}>₹{selectedJob.amount}</Text>
                        <Text style={s.detailAmountSub}>
                          {formatDuration(selectedJob.duration)}
                        </Text>
                      </View>
                    )}

                    {/* Details */}
                    {[
                      { label: '👤 Customer',  value: selectedJob.customerName },
                      { label: '📍 Village',   value: selectedJob.village },
                      { label: '🌾 Crop',      value: selectedJob.crop },
                      { label: '📐 Acres',     value: `${selectedJob.acres} acres` },
                      { label: '💰 Rate',      value: `₹${selectedJob.rate}/hour` },
                      { label: '⏱ Duration',   value: formatDuration(selectedJob.duration) },
                      { label: '📅 Date',      value: formatDate(selectedJob.date) },
                      { label: '🕐 Start',     value: selectedJob.startTime },
                      { label: '🕑 End',       value: selectedJob.endTime },
                    ].map((item, i, arr) => (
                      <View key={i}>
                        <View style={s.detailRow}>
                          <Text style={s.detailLabel}>{item.label}</Text>
                          <Text style={s.detailValue}>{item.value}</Text>
                        </View>
                        {i < arr.length - 1 && <View style={s.detailDivider} />}
                      </View>
                    ))}

                    {/* Notes */}
                    {selectedJob.notes ? (
                      <>
                        <View style={s.detailDivider} />
                        <View style={s.notesBox}>
                          <Text style={s.detailLabel}>📝 Notes</Text>
                          <Text style={s.notesText}>{selectedJob.notes}</Text>
                        </View>
                      </>
                    ) : null}

                    {/* Complete Job Button (for in-progress) */}
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
                      onPress={() => handleDelete(selectedJob.id, selectedJob.customerName)}
                    >
                      <Text style={s.deleteBtnText}>🗑️  Delete Job</Text>
                    </TouchableOpacity>
                  </ScrollView>
                )}
              </View>
            </View>
          </Modal>

          {/* ── Crop Filter Modal */}
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
                    <Text style={[s.cropItemText, cropFilter === crop && s.cropItemTextActive]}>
                      {crop === 'All Crops' ? '🌿' : '🌾'} {crop}
                    </Text>
                    {cropFilter === crop && <Text style={{ color: Colors.primary }}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Modal>
        </>
      ) : (
        <>
          {/* Header for Start Job Mode */}
          <View style={g.header}>
            <View>
              <Text style={g.headerGreeting}>
                {step === 'setup' ? 'New Job' : '✅ Done'}
              </Text>
              <Text style={g.headerTitle}>
                {step === 'setup' ? 'Start a Job' : 'Job Summary'}
              </Text>
            </View>
            {/* Back to Jobs List Button */}
            <TouchableOpacity
              onPress={() => {
                setViewMode('jobs');
                setStep('setup');
                setJobForm(emptyJobForm);
                setElapsed(0);
                setSummary(null);
                setRunningJob(null);
                setErrors({});
                fetchJobs();
              }}
            >
              <Text style={s.backBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Screen Content */}
          {step === 'setup' && renderSetup()}
          {step === 'summary' && renderSummary()}

          {/* ── Customer Picker Modal */}
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
                  keyExtractor={item => item.id}
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
                        <Text style={s.selectorAvatarText}>{item.name.charAt(0)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.selectorName}>{item.name}</Text>
                        <Text style={s.selectorSub}>📍 {item.address}</Text>
                      </View>
                      {jobForm.customerId === item.id && (
                        <Text style={{ color: Colors.primary, fontSize: 18 }}>✓</Text>
                      )}
                    </TouchableOpacity>
                  )}
                />
              </View>
            </View>
          </Modal>

          {/* ── Activity Picker Modal for Start Job */}
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
                    key={activity?.id}
                    style={[s.cropItem, jobForm.activityId === activity.id && s.cropItemActive]}
                    onPress={() => {
                        setJobForm({ ...jobForm, activityId: activity.id });
                        setActivityModal(false);
                      }}
                  >
                    <Text style={[s.cropItemText, jobForm.activityId === activity.id && s.cropItemTextActive]}>
                      🌾 {activity.activityName}
                    </Text>
                    {jobForm.activityId === activity.id && <Text style={{ color: Colors.primary }}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Modal>

          {/* ── Vehicle Picker Modal for Start Job */}
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
                  keyExtractor={item => item.id}
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
                      {jobForm.vehicleId === item.id && (
                        <Text style={{ color: Colors.primary, fontSize: 18 }}>✓</Text>
                      )}
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

// ── Styles
const s = StyleSheet.create({

  // Header
  headerStats:     { alignItems: 'flex-end' },
  headerStatValue: { color: Colors.white, fontSize: 18, fontWeight: '800' },
  headerStatLabel: { color: Colors.primaryLight, fontSize: 12, marginTop: 2 },

  // Start Job Header Button
  startJobHeaderBtn: {
    backgroundColor: Colors.primary, borderRadius: 18,
    paddingVertical: 16, paddingHorizontal: 24, flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: Colors.primary, shadowOpacity: 0.45,
    shadowRadius: 12, elevation: 8,
    marginVertical: 8,
  },
  startJobHeaderBtnIcon: { fontSize: 22, marginRight: 12, color: Colors.white },
  startJobHeaderBtnText: { color: Colors.white, fontSize: 17, fontWeight: '800', letterSpacing: 0.5 },

  // Back Button
  backBtn: { fontSize: 24, color: Colors.white, padding: 4 },

  // Search
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white,
    margin: 16, marginBottom: 8,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 4,
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOpacity: 0.04,
    shadowRadius: 4, elevation: 2,
  },
  searchIcon:  { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text, paddingVertical: 10 },
  clearSearch: { fontSize: 16, color: Colors.textLight, paddingLeft: 8 },

  // Date Filters
  filterRow:         { marginBottom: 8 },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, backgroundColor: Colors.white,
    borderWidth: 1, borderColor: Colors.border,
  },
  filterChipActive:    { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText:      { fontSize: 13, color: Colors.textMuted, fontWeight: '600' },
  filterChipTextActive:{ color: Colors.white },

  // Sub filter row
  subFilterRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, marginBottom: 12,
  },
  cropFilterBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: Colors.border,
    gap: 6,
  },
  cropFilterText:  { fontSize: 13, color: Colors.text, fontWeight: '600' },
  cropFilterArrow: { fontSize: 12, color: Colors.textMuted },

  summaryChips: { flexDirection: 'row', gap: 8 },
  summaryChip: {
    backgroundColor: '#e8f5e9', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  summaryChipText: { fontSize: 12, color: Colors.primary, fontWeight: '700' },

  // List
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },

  // Section Header
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8, marginTop: 8,
  },
  sectionDate:  { fontSize: 14, fontWeight: '700', color: Colors.text },
  sectionBadge: {
    backgroundColor: Colors.background,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: Colors.border,
  },
  sectionBadgeText: { fontSize: 11, color: Colors.textMuted, fontWeight: '600' },

  // Job Card
  jobCard: {
    backgroundColor: Colors.white, borderRadius: 14,
    marginBottom: 10, flexDirection: 'row',
    shadowColor: '#000', shadowOpacity: 0.05,
    shadowRadius: 5, elevation: 2,
    overflow: 'hidden',
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

  // Empty
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyIcon:      { fontSize: 56, marginBottom: 12 },
  emptyText:      { fontSize: 18, fontWeight: '700', color: Colors.text },
  emptySub:       { fontSize: 13, color: Colors.textLight, marginTop: 6 },

  // Modal
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

  // Detail Modal
  detailAmountBox: {
    backgroundColor: '#e8f5e9', borderRadius: 14,
    padding: 18, alignItems: 'center', marginBottom: 16,
  },
  detailAmountLabel: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  detailAmount:      { fontSize: 32, fontWeight: '800', color: Colors.primary, marginTop: 4 },
  detailAmountSub:   { fontSize: 12, color: Colors.textMuted, marginTop: 4 },

  detailRow:    { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  detailLabel:  { fontSize: 13, color: Colors.textMuted },
  detailValue:  { fontSize: 14, fontWeight: '600', color: Colors.text },
  detailDivider:{ height: 1, backgroundColor: Colors.border },

  notesBox:  { paddingVertical: 10 },
  notesText: { fontSize: 13, color: Colors.text, marginTop: 4, lineHeight: 20 },

  deleteBtn: {
    backgroundColor: '#fdecea', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
    marginTop: 16, marginBottom: 8,
    borderWidth: 1, borderColor: '#fadbd8',
  },
  deleteBtnText: { color: '#e74c3c', fontSize: 15, fontWeight: '700' },

  // Crop Modal
  cropItem: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  cropItemActive:    { backgroundColor: '#e8f5e9' },
  cropItemText:      { fontSize: 15, color: Colors.text },
  cropItemTextActive:{ color: Colors.primary, fontWeight: '700' },

  // START JOB STYLES
  scrollContent: { padding: 16, paddingBottom: 100 },

  fieldGroup: { marginBottom: 16 },
  row:        { flexDirection: 'row', marginBottom: 0 },

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
    justifyContent: 'center', alignItems: 'center',
    marginRight: 10,
  },
  selectorAvatarText: { color: Colors.primary, fontWeight: '700', fontSize: 16 },
  selectorName:       { fontSize: 15, fontWeight: '600', color: Colors.text },
  selectorSub:        { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

  estimateCard: {
    backgroundColor: '#e8f5e9', borderRadius: 14,
    padding: 16, marginBottom: 16, alignItems: 'center',
    borderWidth: 1, borderColor: '#c8e6c9',
  },
  estimateLabel: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  estimateValue: { fontSize: 28, fontWeight: '800', color: Colors.primary, marginTop: 4 },
  estimateSub:   { fontSize: 12, color: Colors.textMuted, marginTop: 4 },

  startBtn: {
    backgroundColor: Colors.primary, borderRadius: 16,
    paddingVertical: 18, flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center',
    marginTop: 8,
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
  pauseBtn: {
    backgroundColor: '#ffffff22', borderRadius: 30,
    paddingHorizontal: 28, paddingVertical: 12,
    borderWidth: 1, borderColor: '#ffffff44',
  },
  pauseBtnActive: { backgroundColor: '#ffffff44' },
  pauseBtnText:   { color: Colors.white, fontSize: 15, fontWeight: '700' },

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

  stopBtn: {
    backgroundColor: '#e74c3c', borderRadius: 16,
    paddingVertical: 18, flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#e74c3c', shadowOpacity: 0.4,
    shadowRadius: 12, elevation: 6,
  },
  stopBtnIcon: { fontSize: 18, color: Colors.white, marginRight: 10 },
  stopBtnText: { fontSize: 18, fontWeight: '800', color: Colors.white },

  successBanner: { alignItems: 'center', paddingVertical: 24 },
  successIcon:   { fontSize: 56, marginBottom: 8 },
  successTitle:  { fontSize: 22, fontWeight: '800', color: Colors.text },
  successSub:    { fontSize: 14, color: Colors.textMuted, marginTop: 4 },

  summaryCard: {
    backgroundColor: Colors.white, borderRadius: 20,
    padding: 20, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.06,
    shadowRadius: 8, elevation: 3,
  },
  summaryAmountBox: {
    backgroundColor: Colors.primaryFade || '#e8f5e9',
    borderRadius: 14, padding: 20, alignItems: 'center', marginBottom: 16,
  },
  summaryAmountLabel: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  summaryAmount:      { fontSize: 36, fontWeight: '800', color: Colors.primary, marginTop: 4 },
  summaryAmountSub:   { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  summaryDivider:     { height: 1, backgroundColor: Colors.border, marginBottom: 8 },

  notesRow:   { paddingVertical: 10 },
  notesValue: { fontSize: 13, color: Colors.text, marginTop: 4, lineHeight: 20 },

  saveBtn: {
    backgroundColor: Colors.primary, borderRadius: 16,
    paddingVertical: 18, alignItems: 'center', marginBottom: 12,
    shadowColor: Colors.primary, shadowOpacity: 0.3,
    shadowRadius: 10, elevation: 5,
  },
  saveBtnText: { fontSize: 17, fontWeight: '800', color: Colors.white },

  newJobBtn: {
    borderWidth: 1.5, borderColor: Colors.primary,
    borderRadius: 16, paddingVertical: 16,
    alignItems: 'center', marginBottom: 20,
  },
  newJobBtnText: { fontSize: 16, fontWeight: '700', color: Colors.primary },

  inputError: { borderColor: '#e74c3c', borderWidth: 1.5 },
  errorText:  { color: '#e74c3c', fontSize: 12, marginTop: -10, marginBottom: 8, marginLeft: 2 },

  customerPickerItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  customerPickerItemActive: { backgroundColor: Colors.primaryFade || '#e8f5e9' },
});
