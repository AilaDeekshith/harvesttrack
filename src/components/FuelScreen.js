import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  ScrollView, StyleSheet, SafeAreaView,
  StatusBar, FlatList, Modal, Alert
} from 'react-native';
import g from '../styles/globalStyles';
import Colors from '../constants/colors';
import { useAuth } from '../context/AuthContext';
import {
  fetchFuelByOwnerApi, fetchVehiclesApi,
  addFuelApi, updateFuelApi, deleteFuelApi,
  fetchVehicleFuelStatsApi,
} from '../services/api';

// ── Format date
const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

// ── Format short date for grouping
const formatShortDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
};

// ── Group fuel by vehicle
const groupByVehicle = (fuels) => {
  const groups = {};
  fuels.forEach(f => {
    const key = f.vehicle?.id || 'unknown';
    if (!groups[key]) {
      groups[key] = {
        vehicle: f.vehicle,
        fuels:   [],
      };
    }
    groups[key].fuels.push(f);
  });
  return Object.values(groups);
};

const emptyForm = {
  vehicleId: null,
  litres:    '',
  cost:      '',
  fuelDate:  new Date().toISOString(),
  notes:     '',
};

export default function FuelScreen() {

  const { owner }                           = useAuth();
  const [fuels,          setFuels]          = useState([]);
  const [vehicles,       setVehicles]       = useState([]);
  const [loading,        setLoading]        = useState(false);
  const [viewMode,       setViewMode]       = useState('list'); // 'list' | 'byVehicle'
  const [form,           setForm]           = useState(emptyForm);
  const [errors,         setErrors]         = useState({});
  const [editingId,      setEditingId]      = useState(null);
  const [addModal,       setAddModal]       = useState(false);
  const [vehicleModal,   setVehicleModal]   = useState(false);
  const [detailModal,    setDetailModal]    = useState(false);
  const [selectedFuel,   setSelectedFuel]   = useState(null);
  const [vehicleStats,   setVehicleStats]   = useState({});
  const [vehicleSearch,  setVehicleSearch]  = useState('');
  const [search,         setSearch]         = useState('');
  const [selectedVehicleFilter, setSelectedVehicleFilter] = useState(null);

  useEffect(() => {
    if (!owner?.id) return;
    fetchData();
  }, [owner?.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [fuelData, vehicleData] = await Promise.all([
        fetchFuelByOwnerApi(owner.id),
        fetchVehiclesApi(owner.id),
      ]);
      setFuels(fuelData?.data   || []);
      setVehicles(vehicleData?.data || []);
    } catch (e) {
      console.error('fetchData error:', e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatsForVehicle = async (vehicleId) => {
    try {
      const data = await fetchVehicleFuelStatsApi(vehicleId);
      setVehicleStats(prev => ({
        ...prev,
        [vehicleId]: data?.data || {},
      }));
    } catch (e) {
      console.error('fetchStats error:', e.message);
    }
  };

  // ── Filter fuels
  const filteredFuels = fuels.filter(f => {
    const matchesSearch = !search ||
      f?.registrationNumber?.toLowerCase()
        .includes(search.toLowerCase()) ||
      f?.type?.toLowerCase().includes(search.toLowerCase());
    const matchesVehicle = !selectedVehicleFilter ||
      f?.registrationNumber === selectedVehicleFilter;
    return matchesSearch && matchesVehicle;
  });

  const groupedFuels = groupByVehicle(filteredFuels);

  // ── Total stats
  const totalCost   = filteredFuels.reduce((s, f) => s + (f.cost   || 0), 0);
  const totalLitres = filteredFuels.reduce((s, f) => s + (f.litres || 0), 0);

  // ── Validate
  const validate = () => {
    const e = {};
    if (!form.vehicleId) e.vehicle = 'Please select a vehicle';
    if (!form.litres.trim()) e.litres = 'Enter litres';
    else if (isNaN(form.litres) || parseFloat(form.litres) <= 0)
      e.litres = 'Enter valid litres';
    if (!form.cost.trim()) e.cost = 'Enter cost';
    else if (isNaN(form.cost) || parseFloat(form.cost) <= 0)
      e.cost = 'Enter valid cost';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Open Add Modal
  const openAdd = () => {
    setForm(emptyForm);
    setEditingId(null);
    setErrors({});
    setAddModal(true);
  };

  // ── Open Edit Modal
  const openEdit = (fuel) => {
    setForm({
      vehicleId: fuel?.registrationNumber,
      litres:    String(fuel.litres),
      cost:      String(fuel.cost),
      fuelDate:  fuel.fuelDate,
      notes:     fuel.notes || '',
    });
    setEditingId(fuel?.id);
    setErrors({});
    setAddModal(true);
  };

  // ── Save (Add or Edit)
  const handleSave = async () => {
    if (!validate()) return;

    const payload = {
      vehicleId: vehicles?.filter(vehicle => vehicle?.registrationNumber === form?.vehicleId)?.[0]?.id,
      litres:    parseFloat(form.litres),
      cost:      parseFloat(form.cost),
      fuelDate:  form.fuelDate || new Date().toISOString(),
      notes:     form.notes,
    };

    try {
      if (editingId) {
        await updateFuelApi(editingId, payload);
      } else {
        await addFuelApi(payload);
      }
      setAddModal(false);
      setForm(emptyForm);
      setEditingId(null);
      await fetchData();
      Alert.alert(
        '✅ Success',
        editingId ? 'Fuel entry updated!' : 'Fuel entry added!'
      );
    } catch (e) {
      Alert.alert('Error', 'Failed to save fuel entry.');
    }
  };

  // ── Delete
  const handleDelete = (id) => {
    Alert.alert(
      'Delete Fuel Entry',
      'Are you sure you want to delete this fuel entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await deleteFuelApi(id);
              setDetailModal(false);
              await fetchData();
            } catch (e) {
              Alert.alert('Error', 'Failed to delete fuel entry.');
            }
          }
        }
      ]
    );
  };

  // ── Filtered vehicles for picker
  const filteredVehiclesForPicker = vehicles.filter(v =>
    v.registrationNumber?.toLowerCase()
      .includes(vehicleSearch.toLowerCase()) ||
    v.type?.toLowerCase().includes(vehicleSearch.toLowerCase())
  );

  // ── Fuel Card
  const FuelCard = ({ fuel }) => (
    <TouchableOpacity
      style={s.fuelCard}
      onPress={() => { setSelectedFuel(fuel); setDetailModal(true); }}
      activeOpacity={0.8}
    >
      <View style={s.fuelCardLeft}>
        <View style={s.fuelIconBox}>
          <Text style={s.fuelIcon}>⛽</Text>
        </View>
        <View>
          <Text style={s.fuelCardVehicle}>
            🚜 {fuel?.registrationNumber}
          </Text>
          <Text style={s.fuelCardDate}>{formatShortDate(fuel.fuelDate)}</Text>
          {fuel.notes ? (
            <Text style={s.fuelCardNotes} numberOfLines={1}>
              📝 {fuel.notes}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={s.fuelCardRight}>
        <Text style={s.fuelCardCost}>₹{fuel.cost?.toFixed(0)}</Text>
        <Text style={s.fuelCardLitres}>{fuel.litres}L</Text>
        <Text style={s.fuelCardRate}>
          ₹{(fuel.cost / fuel.litres).toFixed(1)}/L
        </Text>
      </View>
    </TouchableOpacity>
  );

  // ── Vehicle Group Card
  const VehicleGroupCard = ({ group }) => {
    const stats = vehicleStats[group.vehicle?.id] || {};
    const groupTotal = group.fuels.reduce((s, f) => s + (f.cost || 0), 0);
    const groupLitres = group.fuels.reduce((s, f) => s + (f.litres || 0), 0);

    return (
      <View style={s.vehicleGroup}>
        {/* Vehicle Header */}
        <View style={s.vehicleGroupHeader}>
          <View style={s.vehicleGroupLeft}>
            <View style={s.vehicleGroupIcon}>
              <Text style={s.vehicleGroupIconText}>🚜</Text>
            </View>
            <View>
              <Text style={s.vehicleGroupName}>
                {group.vehicle?.registrationNumber}
              </Text>
              <Text style={s.vehicleGroupType}>
                {group.vehicle?.type} • {group.fuels.length} entries
              </Text>
            </View>
          </View>
          <View style={s.vehicleGroupStats}>
            <Text style={s.vehicleGroupCost}>₹{groupTotal.toFixed(0)}</Text>
            <Text style={s.vehicleGroupLitres}>{groupLitres.toFixed(1)}L</Text>
          </View>
        </View>

        {/* Fuel entries for this vehicle */}
        {group.fuels.map(fuel => (
          <TouchableOpacity
            key={fuel.id}
            style={s.fuelRow}
            onPress={() => { setSelectedFuel(fuel); setDetailModal(true); }}
            activeOpacity={0.7}
          >
            <Text style={s.fuelRowDate}>{formatShortDate(fuel.fuelDate)}</Text>
            <View style={s.fuelRowRight}>
              <Text style={s.fuelRowLitres}>{fuel.litres}L</Text>
              <Text style={s.fuelRowCost}>₹{fuel.cost?.toFixed(0)}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={g.container}>
      <StatusBar backgroundColor={Colors.primary} barStyle="light-content" />

      {/* ── Header */}
      <View style={g.header}>
        <View>
          <Text style={g.headerGreeting}>Track</Text>
          <Text style={g.headerTitle}>Fuel Management</Text>
        </View>
        <TouchableOpacity style={s.addHeaderBtn} onPress={openAdd}>
          <Text style={s.addHeaderBtnText}>＋ Add</Text>
        </TouchableOpacity>
      </View>

      {/* ── Summary Cards */}
      <View style={s.summaryRow}>
        <View style={[s.summaryCard, { backgroundColor: Colors.primary }]}>
          <Text style={s.summaryIcon}>💰</Text>
          <Text style={s.summaryValue}>₹{totalCost.toFixed(0)}</Text>
          <Text style={s.summaryLabel}>Total Cost</Text>
        </View>
        <View style={[s.summaryCard, { backgroundColor: '#2980b9' }]}>
          <Text style={s.summaryIcon}>⛽</Text>
          <Text style={s.summaryValue}>{totalLitres.toFixed(1)}L</Text>
          <Text style={s.summaryLabel}>Total Litres</Text>
        </View>
        <View style={[s.summaryCard, { backgroundColor: '#8e44ad' }]}>
          <Text style={s.summaryIcon}>📋</Text>
          <Text style={s.summaryValue}>{filteredFuels.length}</Text>
          <Text style={s.summaryLabel}>Entries</Text>
        </View>
      </View>

      {/* ── Vehicle Filter Pills */}
      <View style={{marginBottom: 8}}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.vehicleFilterRow}
      >
        <TouchableOpacity
          style={[
            s.vehicleFilterChip,
            !selectedVehicleFilter && s.vehicleFilterChipActive
          ]}
          onPress={() => setSelectedVehicleFilter(null)}
        >
          <Text style={[
            s.vehicleFilterChipText,
            !selectedVehicleFilter && s.vehicleFilterChipTextActive
          ]}>
            All
          </Text>
        </TouchableOpacity>
        {vehicles.map((v,index) => (
          <TouchableOpacity
            key={index}
            style={[
              s.vehicleFilterChip,
              selectedVehicleFilter === v.registrationNumber && s.vehicleFilterChipActive
            ]}
            onPress={() => setSelectedVehicleFilter(
              selectedVehicleFilter === v.registrationNumber ? null : v.registrationNumber
            )}
          >
            <Text style={[
              s.vehicleFilterChipText,
              selectedVehicleFilter === v.id && s.vehicleFilterChipTextActive
            ]}>
              🚜 {v.registrationNumber}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      </View>
      {/* ── Content */}
      {filteredFuels.length === 0 ? (
        <View style={s.emptyContainer}>
          <Text style={s.emptyIcon}>⛽</Text>
          <Text style={s.emptyText}>No fuel entries</Text>
          <Text style={s.emptySub}>Tap "+ Add" to add your first fuel entry</Text>
        </View>
      ) : (
        <FlatList
          data={filteredFuels}
          keyExtractor={(item,index) => String(index)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.listContent}
          renderItem={({ item }) => <FuelCard fuel={item} />}
        />
      )}

      {/* ── Add / Edit Modal */}
      <Modal visible={addModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>

            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>
                {editingId ? '✏️ Edit Fuel Entry' : '⛽ Add Fuel Entry'}
              </Text>
              <TouchableOpacity onPress={() => setAddModal(false)}>
                <Text style={s.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>

              {/* Vehicle Selector */}
              <Text style={g.inputLabel}>Vehicle *</Text>
              <TouchableOpacity
                style={[s.selector, errors.vehicle && s.selectorError]}
                onPress={() => { setVehicleSearch(''); setVehicleModal(true); }}
              >
                {form.vehicleId ? (
                  <View style={s.selectedItem}>
                    <Text style={s.selectorIcon}>🚜</Text>
                    <View>
                      <Text style={s.selectorName}>
                        {vehicles.find(v => v.registrationNumber === form.vehicleId)
                          ?.registrationNumber}
                      </Text>
                      <Text style={s.selectorSub}>
                        {vehicles.find(v => v.registrationNumber === form.vehicleId)?.type}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={s.selectorPlaceholder}>
                    🚜 Tap to select vehicle...
                  </Text>
                )}
                <Text style={s.selectorArrow}>›</Text>
              </TouchableOpacity>
              {errors.vehicle &&
                <Text style={s.errorText}>{errors.vehicle}</Text>}

              {/* Litres & Cost Row */}
              <View style={s.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={g.inputLabel}>Litres *</Text>
                  <TextInput
                    style={[g.input, errors.litres && s.inputError]}
                    placeholder="e.g. 20.5"
                    keyboardType="decimal-pad"
                    value={form.litres}
                    onChangeText={v => setForm({ ...form, litres: v })}
                  />
                  {errors.litres &&
                    <Text style={s.errorText}>{errors.litres}</Text>}
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={g.inputLabel}>Total Cost (₹) *</Text>
                  <TextInput
                    style={[g.input, errors.cost && s.inputError]}
                    placeholder="e.g. 2000"
                    keyboardType="number-pad"
                    value={form.cost}
                    onChangeText={v => setForm({ ...form, cost: v })}
                  />
                  {errors.cost &&
                    <Text style={s.errorText}>{errors.cost}</Text>}
                </View>
              </View>

              {/* Rate per litre preview */}
              {form.litres && form.cost &&
               !isNaN(form.litres) && !isNaN(form.cost) &&
               parseFloat(form.litres) > 0 && (
                <View style={s.ratePreview}>
                  <Text style={s.ratePreviewText}>
                    ₹{(parseFloat(form.cost) / parseFloat(form.litres)).toFixed(2)} per litre
                  </Text>
                </View>
              )}

              {/* Notes */}
              <Text style={g.inputLabel}>Notes (Optional)</Text>
              <TextInput
                style={[g.input, { height: 70, textAlignVertical: 'top' }]}
                placeholder="e.g. Filled at HP petrol pump"
                multiline
                value={form.notes}
                onChangeText={v => setForm({ ...form, notes: v })}
              />

              {/* Buttons */}
              <View style={s.modalBtns}>
                <TouchableOpacity
                  style={[g.btnOutline, s.modalBtnHalf]}
                  onPress={() => setAddModal(false)}
                >
                  <Text style={g.btnOutlineText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[g.btnPrimary, s.modalBtnHalf]}
                  onPress={handleSave}
                >
                  <Text style={g.btnPrimaryText}>
                    {editingId ? 'Update' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </View>

            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Detail Modal */}
      <Modal visible={detailModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>

            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>⛽ Fuel Details</Text>
              <TouchableOpacity onPress={() => setDetailModal(false)}>
                <Text style={s.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedFuel && (
              <ScrollView showsVerticalScrollIndicator={false}>

                {/* Cost Banner */}
                <View style={s.detailBanner}>
                  <Text style={s.detailBannerLabel}>Total Cost</Text>
                  <Text style={s.detailBannerValue}>
                    ₹{selectedFuel.cost?.toFixed(0)}
                  </Text>
                  <Text style={s.detailBannerSub}>
                    {selectedFuel.litres}L @
                    ₹{(selectedFuel.cost / selectedFuel.litres).toFixed(2)}/L
                  </Text>
                </View>

                {/* Details */}
                {[
                  { label: '🚜 Vehicle',  value: selectedFuel?.registrationNumber },
                  { label: '📋 Type',     value: selectedFuel?.type },
                  { label: '⛽ Litres',   value: `${selectedFuel.litres} L` },
                  { label: '💰 Cost',     value: `₹${selectedFuel.cost?.toFixed(2)}` },
                  { label: '💧 Rate',     value: `₹${(selectedFuel.cost / selectedFuel.litres).toFixed(2)}/L` },
                  { label: '📅 Date',     value: formatDate(selectedFuel.fuelDate) },
                ].map((item, i, arr) => (
                  <View key={i}>
                    <View style={s.detailRow}>
                      <Text style={s.detailLabel}>{item.label}</Text>
                      <Text style={s.detailValue}>{item.value || '—'}</Text>
                    </View>
                    {i < arr.length - 1 && <View style={s.detailDivider} />}
                  </View>
                ))}

                {selectedFuel.notes ? (
                  <>
                    <View style={s.detailDivider} />
                    <View style={s.notesBox}>
                      <Text style={s.detailLabel}>📝 Notes</Text>
                      <Text style={s.notesText}>{selectedFuel.notes}</Text>
                    </View>
                  </>
                ) : null}

                {/* Edit Button */}
                <TouchableOpacity
                  style={s.editBtn}
                  onPress={() => {
                    setDetailModal(false);
                    openEdit(selectedFuel);
                  }}
                >
                  <Text style={s.editBtnText}>✏️  Edit Entry</Text>
                </TouchableOpacity>

                {/* Delete Button */}
                <TouchableOpacity
                  style={s.deleteBtn}
                  onPress={() => handleDelete(selectedFuel.id)}
                >
                  <Text style={s.deleteBtnText}>🗑️  Delete Entry</Text>
                </TouchableOpacity>

              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Vehicle Picker Modal */}
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
              data={filteredVehiclesForPicker}
              keyExtractor={item => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    s.pickerItem,
                    form.vehicleId === item.id && s.pickerItemActive
                  ]}
                  onPress={() => {
                    setForm({ ...form, vehicleId: item.registrationNumber });
                    setVehicleModal(false);
                  }}
                >
                  <View style={[
                    s.pickerAvatar,
                    form.vehicleId === item.id && { backgroundColor: Colors.primary }
                  ]}>
                    <Text style={s.pickerAvatarText}>🚜</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.selectorName}>{item.registrationNumber}</Text>
                    <Text style={s.selectorSub}>📋 {item.type}</Text>
                  </View>
                  {form.vehicleId === item.id &&
                    <Text style={{ color: Colors.primary, fontSize: 18 }}>✓</Text>}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({

  // ── Header
  addHeaderBtn: {
    backgroundColor: '#ffffff33',
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: '#ffffff55',
  },
  addHeaderBtnText: { color: Colors.white, fontWeight: '700', fontSize: 14 },

  // ── Summary
  summaryRow: {
    flexDirection: 'row', padding: 16, gap: 10,
  },
  summaryCard: {
    flex: 1, borderRadius: 14,
    padding: 14, alignItems: 'center',
  },
  summaryIcon:  { fontSize: 22, marginBottom: 4 },
  summaryValue: { color: Colors.white, fontSize: 16, fontWeight: '800' },
  summaryLabel: { color: '#ffffffcc', fontSize: 10, marginTop: 2 },

  // ── Toggle
  viewToggle: {
    flexDirection: 'row', marginHorizontal: 16,
    backgroundColor: Colors.background,
    borderRadius: 12, padding: 4, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  toggleBtn: {
    flex: 1, paddingVertical: 8,
    borderRadius: 10, alignItems: 'center',
  },
  toggleBtnActive:    { backgroundColor: Colors.primary },
  toggleBtnText:      { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  toggleBtnTextActive:{ color: Colors.white },

  // ── Search
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white,
    marginHorizontal: 16, marginBottom: 8,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 4,
    borderWidth: 1, borderColor: Colors.border,
    elevation: 2,
  },
  searchIcon:  { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text, paddingVertical: 10 },
  clearSearch: { fontSize: 16, color: Colors.textLight, paddingLeft: 8 },

  // ── Vehicle Filter Pills
  vehicleFilterRow: {
    paddingHorizontal: 16, paddingBottom: 15, gap: 8, height: 50, margin: 0
  },
  vehicleFilterChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, backgroundColor: Colors.white,
    borderWidth: 1, borderColor: Colors.border,
  },
  vehicleFilterChipActive:    { backgroundColor: Colors.primary, borderColor: Colors.white },
  vehicleFilterChipText:      { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  vehicleFilterChipTextActive:{ color: Colors.white },

  // ── List
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },

  // ── Fuel Card (List View)
  fuelCard: {
    backgroundColor: Colors.white, borderRadius: 14,
    padding: 14, marginBottom: 10,
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05,
    shadowRadius: 5, elevation: 2,
  },
  fuelCardLeft:    { flexDirection: 'row', alignItems: 'center', flex: 1 },
  fuelIconBox: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#fff3e0',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  fuelIcon:        { fontSize: 22 },
  fuelCardVehicle:    { fontSize: 14, fontWeight: '700', color: Colors.text },
  fuelCardDate: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  fuelCardNotes:   { fontSize: 11, color: Colors.textLight, marginTop: 2 },
  fuelCardRight:   { alignItems: 'flex-end' },
  fuelCardCost:    { fontSize: 16, fontWeight: '800', color: Colors.primary },
  fuelCardLitres:  { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  fuelCardRate:    { fontSize: 11, color: Colors.textLight, marginTop: 1 },

  // ── Vehicle Group Card (By Vehicle View)
  vehicleGroup: {
    backgroundColor: Colors.white, borderRadius: 16,
    marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.05,
    shadowRadius: 5, elevation: 2,
    overflow: 'hidden',
  },
  vehicleGroupHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 14,
    backgroundColor: '#f8fff8',
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  vehicleGroupLeft:    { flexDirection: 'row', alignItems: 'center' },
  vehicleGroupIcon: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 10,
  },
  vehicleGroupIconText: { fontSize: 20 },
  vehicleGroupName:     { fontSize: 15, fontWeight: '700', color: Colors.text },
  vehicleGroupType:     { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  vehicleGroupStats:    { alignItems: 'flex-end' },
  vehicleGroupCost:     { fontSize: 16, fontWeight: '800', color: Colors.primary },
  vehicleGroupLitres:   { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

  fuelRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  fuelRowDate:    { fontSize: 13, color: Colors.text },
  fuelRowRight:   { flexDirection: 'row', gap: 16 },
  fuelRowLitres:  { fontSize: 13, color: Colors.textMuted },
  fuelRowCost:    { fontSize: 13, fontWeight: '700', color: Colors.primary },

  // ── Empty
  emptyContainer: {
    flex: 1, alignItems: 'center',
    justifyContent: 'center', marginTop: 60,
  },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: '700', color: Colors.text },
  emptySub:  { fontSize: 13, color: Colors.textLight, marginTop: 6 },

  // ── Modal
  modalOverlay: {
    flex: 1, backgroundColor: '#00000066',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  modalClose: { fontSize: 18, color: Colors.textMuted, padding: 4 },

  // ── Selector
  selector: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.background, borderRadius: 12,
    padding: 14, borderWidth: 1.5, borderColor: Colors.border,
    justifyContent: 'space-between', marginBottom: 14,
  },
  selectorError:       { borderColor: '#e74c3c' },
  selectorPlaceholder: { color: Colors.textLight, fontSize: 14, flex: 1 },
  selectorArrow:       { color: Colors.textLight, fontSize: 22 },
  selectedItem:        { flexDirection: 'row', alignItems: 'center', flex: 1 },
  selectorIcon:        { fontSize: 20, marginRight: 10 },
  selectorName:        { fontSize: 15, fontWeight: '600', color: Colors.text },
  selectorSub:         { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

  // ── Rate Preview
  ratePreview: {
    backgroundColor: '#e8f5e9', borderRadius: 10,
    padding: 10, alignItems: 'center', marginBottom: 14,
  },
  ratePreviewText: {
    color: Colors.primary, fontSize: 14, fontWeight: '700',
  },

  // ── Row
  row: { flexDirection: 'row', marginBottom: 0 },

  // ── Modal Buttons
  modalBtns: {
    flexDirection: 'row', gap: 12,
    marginTop: 8, marginBottom: 16,
  },
  modalBtnHalf: { flex: 1, marginHorizontal: 0 },

  // ── Detail Modal
  detailBanner: {
    backgroundColor: '#e8f5e9', borderRadius: 14,
    padding: 18, alignItems: 'center', marginBottom: 16,
  },
  detailBannerLabel: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  detailBannerValue: {
    fontSize: 32, fontWeight: '800',
    color: Colors.primary, marginTop: 4,
  },
  detailBannerSub: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },

  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 10,
  },
  detailLabel:  { fontSize: 13, color: Colors.textMuted },
  detailValue:  { fontSize: 14, fontWeight: '600', color: Colors.text },
  detailDivider:{ height: 1, backgroundColor: Colors.border },

  notesBox:  { paddingVertical: 10 },
  notesText: { fontSize: 13, color: Colors.text, marginTop: 4, lineHeight: 20 },

  editBtn: {
    backgroundColor: '#e8f5e9', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
    marginTop: 16, marginBottom: 8,
    borderWidth: 1, borderColor: '#c8e6c9',
  },
  editBtnText: { color: Colors.primary, fontSize: 15, fontWeight: '700' },

  deleteBtn: {
    backgroundColor: '#fdecea', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1, borderColor: '#fadbd8',
  },
  deleteBtnText: { color: '#e74c3c', fontSize: 15, fontWeight: '700' },

  // ── Picker
  pickerItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pickerItemActive: { backgroundColor: '#e8f5e9' },
  pickerAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 10,
  },
  pickerAvatarText: { fontSize: 18 },

  // ── Input Error
  inputError: { borderColor: '#e74c3c', borderWidth: 1.5 },
  errorText:  { color: '#e74c3c', fontSize: 12, marginBottom: 8, marginLeft: 2 },
});