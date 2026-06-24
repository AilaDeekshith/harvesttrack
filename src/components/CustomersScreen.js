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
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import g from "../styles/globalStyles";
import Colors from "../constants/colors";
import {
  addCustomerApi,
  deleteCustomerApi,
  fetchCustomerApi,
  updateCustomerApi,
} from "../services/api";
import { useAuth } from "../context/AuthContext";

const emptyForm = { name: "", phone: "", address: "" };

export default function CustomersScreen() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [errors, setErrors] = useState({});
  const { owner } = useAuth();

  // ── Filter customers by search
  const filtered = customers.filter(
    (c) =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search) ||
      c.address?.toLowerCase().includes(search.toLowerCase()),
  );

  // ── Validation
  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.phone.trim()) e.phone = "Phone is required";
    else if (!/^[0-9]{10}$/.test(form.phone))
      e.phone = "Enter valid 10-digit number";
    if (!form.address.trim()) e.address = "Address is required";
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
  const openEdit = (customer) => {
    setForm({
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
    });
    setEditingId(customer.id);
    setErrors({});
    setModalVisible(true);
  };

  // ── Save (Add or Edit)
  const handleSave = async () => {
    if (!validate()) return;

    if (editingId) {
      // Edit existing
      await updateCustomerApi(editingId, owner?.id, form) // Replace with actual ownerId
        .then((data) => console.log("Updated on server:", data))
        .catch((error) =>
          console.error("Error updating on server:", error.message),
        );
      fetchData();
    } else {
      // Add new
      await addCustomerApi(owner?.id, form) // Replace with actual ownerId
        .then((data) => console.log("Saved to server:", data))
        .catch((error) =>
          console.error("Error saving to server:", error.message),
        );
    }
    setModalVisible(false);
    setForm(emptyForm);
    setEditingId(null);
    fetchData();
  };

  // ── Delete
  const handleDelete = (id, name) => {
    Alert.alert(
      "Delete Customer",
      `Are you sure you want to delete "${name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteCustomerApi(id, owner?.id) // Replace with actual ownerId
              .then((data) => console.log("Deleted from server:", data))
              .catch((error) =>
                console.error("Error deleting from server:", error.message),
              );
            fetchData();
          },
        },
      ],
    );
  };

  // ── Customer Card
  const CustomerCard = ({ item }) => (
    <View style={g.card}>
      {/* Avatar + Info */}
      <View style={g.cardTop}>
        <View style={g.avatar}>
          <Text style={g.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={g.cardInfo}>
          <Text style={g.cardName}>{item.name}</Text>
          <Text style={g.cardPhone}>📞 {item.phone}</Text>
          <Text style={g.cardVillage}>📍 {item.address}</Text>
        </View>
        {/* Action Buttons */}
        <View style={g.cardActions}>
          <TouchableOpacity style={g.editBtn} onPress={() => openEdit(item)}>
            <Text style={g.editBtnText}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={g.deleteBtn}
            onPress={() => handleDelete(item.id, item.name)}
          >
            <Text style={g.deleteBtnText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Row */}
      <View style={g.cardStats}>
        <View style={g.statChip}>
          <Text style={g.statChipLabel}>🌾 Acres</Text>
          <Text style={g.statChipValue}>{item.acres}</Text>
        </View>
        <View style={g.statChip}>
          <Text style={g.statChipLabel}>📋 Jobs</Text>
          <Text style={g.statChipValue}>{item.jobsCount}</Text>
        </View>
        <View style={g.statChip}>
          <Text style={g.statChipLabel}>💰 Paid</Text>
          <Text style={g.statChipValue}>₹{item.amount}</Text>
        </View>
      </View>
    </View>
  );

  const fetchData = async () => {
    try {
      const json = await fetchCustomerApi(owner?.id); // Replace with actual ownerId
      setCustomers(json?.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      // setLoading(false);
    }
  };

  useEffect(() => {
    if (owner && owner.id) {
      fetchData();
    }
  }, [owner]);

  return (
    <SafeAreaView style={g.container}>
      <StatusBar backgroundColor={Colors.primary} barStyle="light-content" />

      {/* Header */}
      <View style={g.header}>
        <View>
          <Text style={g.headerGreeting}>Manage</Text>
          <Text style={g.headerTitle}>Customers</Text>
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
          placeholder="Search by name, phone, village..."
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
          {filtered.length} {filtered.length === 1 ? "Customer" : "Customers"}
          {search ? ` found for "${search}"` : " total"}
        </Text>
      </View>

      {/* Customer List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <CustomerCard item={item} />}
        contentContainerStyle={g.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={g.emptyContainer}>
            <Text style={g.emptyIcon}>👥</Text>
            <Text style={g.emptyText}>No customers found</Text>
            <Text style={g.emptySub}>
              {search
                ? "Try a different search"
                : 'Tap "+ Add" to add your first customer'}
            </Text>
          </View>
        }
      />

      {/* ── Add / Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
          <TouchableOpacity
            style={g.modalOverlay}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={g.modalSheet}
              onPress={() => {}} // ← Prevent close when tapping inside
            >
              {/* Modal Header */}
              <View style={g.modalHeader}>
                <Text style={g.modalTitle}>
                  {editingId ? "✏️ Edit Customer" : "➕ Add Customer"}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Text style={g.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Name */}
                <Text style={g.inputLabel}>Full Name *</Text>
                <TextInput
                  style={[g.input, errors.name && g.inputError]}
                  placeholder="e.g. Raju Reddy"
                  value={form.name}
                  onChangeText={(v) => setForm({ ...form, name: v })}
                />
                {errors.name && <Text style={g.errorText}>{errors.name}</Text>}

                {/* Phone */}
                <Text style={g.inputLabel}>Phone Number *</Text>
                <TextInput
                  style={[g.input, errors.phone && g.inputError]}
                  placeholder="10-digit mobile number"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={form.phone}
                  onChangeText={(v) => setForm({ ...form, phone: v })}
                />
                {errors.phone && (
                  <Text style={g.errorText}>{errors.phone}</Text>
                )}

                {/* Village */}
                <Text style={g.inputLabel}>Village / Area *</Text>
                <TextInput
                  style={[g.input, errors.address && g.inputError]}
                  placeholder="e.g. Nalgonda"
                  value={form.address}
                  onChangeText={(v) => setForm({ ...form, address: v })}
                />
                {errors.address && (
                  <Text style={g.errorText}>{errors.address}</Text>
                )}

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
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
