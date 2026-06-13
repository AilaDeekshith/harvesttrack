import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
  Modal,
  Alert,
  FlatList,
} from "react-native";
import g from "../styles/globalStyles";
import Colors from "../constants/colors";
import { addVehicleApi, deleteVehicleApi, fetchVehiclesApi, updateVehicleApi } from "../services/api";
import { useAuth } from "../context/AuthContext";

const emptyForm = { type: "", registrationNumber: "", fuelType: "", ownerId: 1 };

const VEHICLE_TYPES = ["Combine Harvester", "Tractor", "Plow", "Seed Drill", "Baler", "Sprayer"];

const FUEL_TYPES = ["Diesel", "Petrol", "Electric", "CNG"];

export default function VehicleScreen() {
  const [vehicles, setVehicles] = useState([]);
  const [search, setSearch] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [errors, setErrors] = useState({});
  const [typeModal, setTypeModal] = useState(false);
  const [fuelModal, setFuelModal] = useState(false);
  const { owner } = useAuth();

  // ── Filter vehicles by search
  const filtered = vehicles?.filter(
    (v) =>
      v.registrationNumber?.toLowerCase().includes(search.toLowerCase()) ||
      v.type?.toLowerCase().includes(search.toLowerCase()),
  );

  // ── Validation
  const validate = () => {
    const e = {};
    if (!form.type.trim()) e.type = "Vehicle type is required";
    if (!form.registrationNumber.trim()) e.registrationNumber = "Registration number is required";
    if (!form.fuelType.trim()) e.fuelType = "Fuel type is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Open Add Modal
  const openAdd = () => {
    setForm(emptyForm);
    setEditingId(null);
    setErrors({});
    setModalVisible(true);
  };

  // ── Open Edit Modal
  const openEdit = (vehicle) => {
    setForm({
      type: vehicle.type,
      registrationNumber: vehicle.registrationNumber,
      fuelType: vehicle.fuelType,
    });
    setEditingId(vehicle.id);
    setErrors({});
    setModalVisible(true);
  };

  // ── Save (Add or Edit)
  const handleSave = async () => {
    if (!validate()) return;

    form.ownerId = owner?.id; // Ensure ownerId is included in the form data
    if (editingId) {
      // Edit existing
      await updateVehicleApi(editingId, form) // Replace 1 with actual ownerId
        .then((data) => console.log("Vehicle saved to server:", data))
        .catch((error) =>
          console.error("Error saving vehicle:", error.message),
        );
    } else {
      // Send to API
       await addVehicleApi(form) // Replace 1 with actual ownerId
        .then((data) => console.log("Vehicle saved to server:", data))
        .catch((error) =>
          console.error("Error saving vehicle:", error.message),
        );
    }
    setModalVisible(false);
    setForm(emptyForm);
    setEditingId(null);
    fetchVehicles(); // Refresh list from server
  };

  // ── Delete
  const handleDelete = (id, name) => {
    Alert.alert(
      "Delete Vehicle",
      `Are you sure you want to delete "${name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            // Send delete request to API
            await deleteVehicleApi(id) // Replace 1 with actual ownerId
              .then(() => console.log("Vehicle deleted from server"))
              .catch((error) =>
                console.error("Error deleting vehicle:", error.message),
              );
          },
        },
      ],
    );
  };

  const fetchVehicles = async () => {
    await fetchVehiclesApi(owner?.id) // Replace 1 with actual ownerId
      .then((data) => setVehicles(data?.data || []))
      .catch((error) => console.error("Error fetching vehicles:", error.message));
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  // ── Vehicle Card
  const VehicleCard = ({ item }) => (
    <View style={g.card}>
      {/* Avatar + Info */}
      <View style={g.cardTop}>
        <View style={g.avatar}>
          <Text style={g.avatarText}>🚜</Text>
        </View>
        <View style={g.cardInfo}>
          <Text style={g.cardName}>🏷️ {item.registrationNumber}</Text>
        </View>
        {/* Action Buttons */}
        <View style={[g.cardActions, { flexDirection: 'row', gap: 8 }]}>
          <TouchableOpacity style={g.editBtn} onPress={() => openEdit(item)}>
            <Text style={g.editBtnText}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={g.deleteBtn}
            onPress={() => handleDelete(item.id, item.registrationNumber)}
          >
            <Text style={g.deleteBtnText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Details Row */}
      <View style={g.cardStats}>
        <View style={g.statChip}>
          <Text style={g.statChipLabel}>📋 Type</Text>
          <Text style={g.statChipValue}>{item.type}</Text>
        </View>
        <View style={g.statChip}>
          <Text style={g.statChipLabel}>⛽ Fuel</Text>
          <Text style={g.statChipValue}>{item.fuelType}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={g.container}>
      <StatusBar backgroundColor={Colors.primary} barStyle="light-content" />

      {/* Header */}
      <View style={g.header}>
        <View>
          <Text style={g.headerGreeting}>Manage</Text>
          <Text style={g.headerTitle}>Vehicles</Text>
        </View>
        <TouchableOpacity style={g.addHeaderBtn} onPress={openAdd}>
          <Text style={g.addHeaderBtnText}>＋ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={g.searchContainer}>
        <Text style={g.searchIcon}>🔍</Text>
        <TextInput
          style={g.searchInput}
          placeholder="Search by registration number or type..."
          placeholderTextColor={Colors.textLight}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Text style={g.clearSearch}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Count */}
      <View style={g.countRow}>
        <Text style={g.countText}>
          {filtered.length} {filtered.length === 1 ? "Vehicle" : "Vehicles"}
          {search ? ` found for "${search}"` : " total"}
        </Text>
      </View>

      {/* Vehicle List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <VehicleCard item={item} />}
        contentContainerStyle={g.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={g.emptyContainer}>
            <Text style={g.emptyIcon}>🚜</Text>
            <Text style={g.emptyText}>No vehicles found</Text>
            <Text style={g.emptySub}>
              {search
                ? "Try a different search"
                : 'Tap "+ Add" to add your first vehicle'}
            </Text>
          </View>
        }
      />

      {/* ── Add / Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={g.modalOverlay}>
          <View style={g.modalSheet}>
            {/* Modal Header */}
            <View style={g.modalHeader}>
              <Text style={g.modalTitle}>
                {editingId ? "✏️ Edit Vehicle" : "➕ Add Vehicle"}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={g.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>

              {/* Vehicle Type */}
              <Text style={g.inputLabel}>Vehicle Type *</Text>
              <TouchableOpacity
                style={[g.input, errors.type && g.inputError]}
                onPress={() => setTypeModal(true)}
              >
                <Text style={form.type ? g.inputText : g.inputPlaceholder}>
                  {form.type || "Select vehicle type..."}
                </Text>
              </TouchableOpacity>
              {errors.type && <Text style={g.errorText}>{errors.type}</Text>}

              {/* Registration Number */}
              <Text style={g.inputLabel}>Registration Number *</Text>
              <TextInput
                style={[g.input, errors.registrationNumber && g.inputError]}
                placeholder="e.g. TS01AB1234"
                value={form.registrationNumber}
                onChangeText={(v) => setForm({ ...form, registrationNumber: v })}
              />
              {errors.registrationNumber && (
                <Text style={g.errorText}>{errors.registrationNumber}</Text>
              )}

              {/* Fuel Type */}
              <Text style={g.inputLabel}>Fuel Type *</Text>
              <TouchableOpacity
                style={[g.input, errors.fuelType && g.inputError]}
                onPress={() => setFuelModal(true)}
              >
                <Text style={form.fuelType ? g.inputText : g.inputPlaceholder}>
                  {form.fuelType || "Select fuel type..."}
                </Text>
              </TouchableOpacity>
              {errors.fuelType && <Text style={g.errorText}>{errors.fuelType}</Text>}

              {/* Buttons */}
              <View style={g.modalBtns}>
                <TouchableOpacity
                  style={[g.btnOutline, g.modalBtnHalf]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={g.btnOutlineText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[g.btnPrimary, g.modalBtnHalf]}
                  onPress={handleSave}
                >
                  <Text style={g.btnPrimaryText}>
                    {editingId ? "Update" : "Save"}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Vehicle Type Modal */}
      <Modal visible={typeModal} animationType="slide" transparent>
        <View style={g.modalOverlay}>
          <View style={[g.modalSheet, { maxHeight: "50%" }]}>
            <View style={g.modalHeader}>
              <Text style={g.modalTitle}>Select Vehicle Type</Text>
              <TouchableOpacity onPress={() => setTypeModal(false)}>
                <Text style={g.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            {VEHICLE_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[g.modalItem, form.type === type && g.modalItemActive]}
                onPress={() => {
                  setForm({ ...form, type });
                  setTypeModal(false);
                }}
              >
                <Text style={[g.modalItemText, form.type === type && g.modalItemTextActive]}>
                  {type}
                </Text>
                {form.type === type && <Text style={g.modalItemCheck}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* ── Fuel Type Modal */}
      <Modal visible={fuelModal} animationType="slide" transparent>
        <View style={g.modalOverlay}>
          <View style={[g.modalSheet, { maxHeight: "40%" }]}>
            <View style={g.modalHeader}>
              <Text style={g.modalTitle}>Select Fuel Type</Text>
              <TouchableOpacity onPress={() => setFuelModal(false)}>
                <Text style={g.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            {FUEL_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[g.modalItem, form.fuelType === type && g.modalItemActive]}
                onPress={() => {
                  setForm({ ...form, fuelType: type });
                  setFuelModal(false);
                }}
              >
                <Text style={[g.modalItemText, form.fuelType === type && g.modalItemTextActive]}>
                  {type}
                </Text>
                {form.fuelType === type && <Text style={g.modalItemCheck}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
