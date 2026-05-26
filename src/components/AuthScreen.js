import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, StatusBar,
  ScrollView, KeyboardAvoidingView, Platform, SafeAreaViewBase
} from 'react-native';
import Colors from '../constants/colors';

export default function AuthScreen({ onLogin }) {
  const [isLogin, setIsLogin]       = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]       = useState(false);

  // ── Form State
  const [form, setForm] = useState({
    name: '', phone: '', village: '', password: '', confirmPassword: ''
  });
  const [errors, setErrors] = useState({});

  // ── Update form field
  const update = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  // ── Validation
  const validate = () => {
    const e = {};

    if (!isLogin && !form.name.trim())
      e.name = 'Name is required';

    if (!form.phone.trim())
      e.phone = 'Phone number is required';
    else if (!/^[0-9]{10}$/.test(form.phone))
      e.phone = 'Enter valid 10-digit number';

    if (!isLogin && !form.village.trim())
      e.village = 'Village is required';

    if (!form.password.trim())
      e.password = 'Password is required';
    else if (form.password.length < 6)
      e.password = 'Password must be at least 6 characters';

    if (!isLogin && form.password !== form.confirmPassword)
      e.confirmPassword = 'Passwords do not match';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit
  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);

    // TODO: Connect to API
    setTimeout(() => {
      setLoading(false);
      onLogin();
    }, 1500);
  };

  // ── Switch between Login / Register
  const switchMode = () => {
    setIsLogin(prev => !prev);
    setForm({ name: '', phone: '', village: '', password: '', confirmPassword: '' });
    setErrors({});
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar backgroundColor={Colors.primary} barStyle="light-content" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Top Banner */}
          <View style={s.banner}>
            <View style={s.logoCircle}>
              <Text style={s.logoIcon}>🌾</Text>
            </View>
            <Text style={s.appName}>HarvestTrack</Text>
            <Text style={s.appTagline}>Manage your harvest business</Text>
          </View>

          {/* ── Card */}
          <View style={s.card}>

            {/* Tab Switch */}
            <View style={s.tabSwitch}>
              <TouchableOpacity
                style={[s.tabBtn, isLogin && s.tabBtnActive]}
                onPress={() => !isLogin && switchMode()}
              >
                <Text style={[s.tabBtnText, isLogin && s.tabBtnTextActive]}>
                  Login
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.tabBtn, !isLogin && s.tabBtnActive]}
                onPress={() => isLogin && switchMode()}
              >
                <Text style={[s.tabBtnText, !isLogin && s.tabBtnTextActive]}>
                  Register
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={s.cardTitle}>
              {isLogin ? 'Welcome Back 👋' : 'Create Account 🚜'}
            </Text>
            <Text style={s.cardSubtitle}>
              {isLogin
                ? 'Login to manage your harvest business'
                : 'Register to get started with HarvestTrack'}
            </Text>

            {/* ── Name (Register only) */}
            {!isLogin && (
              <View style={s.fieldGroup}>
                <Text style={s.label}>Full Name *</Text>
                <View style={[s.inputBox, errors.name && s.inputBoxError]}>
                  <Text style={s.inputIcon}>👤</Text>
                  <TextInput
                    style={s.input}
                    placeholder="e.g. Raju Reddy"
                    placeholderTextColor={Colors.textLight}
                    value={form.name}
                    onChangeText={v => update('name', v)}
                  />
                </View>
                {errors.name && <Text style={s.errorText}>{errors.name}</Text>}
              </View>
            )}

            {/* ── Phone */}
            <View style={s.fieldGroup}>
              <Text style={s.label}>Phone Number *</Text>
              <View style={[s.inputBox, errors.phone && s.inputBoxError]}>
                <Text style={s.inputIcon}>📞</Text>
                <TextInput
                  style={s.input}
                  placeholder="10-digit mobile number"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={form.phone}
                  onChangeText={v => update('phone', v)}
                />
              </View>
              {errors.phone && <Text style={s.errorText}>{errors.phone}</Text>}
            </View>

            {/* ── Village (Register only) */}
            {!isLogin && (
              <View style={s.fieldGroup}>
                <Text style={s.label}>Village / Area *</Text>
                <View style={[s.inputBox, errors.village && s.inputBoxError]}>
                  <Text style={s.inputIcon}>📍</Text>
                  <TextInput
                    style={s.input}
                    placeholder="e.g. Nalgonda"
                    placeholderTextColor={Colors.textLight}
                    value={form.village}
                    onChangeText={v => update('village', v)}
                  />
                </View>
                {errors.village && <Text style={s.errorText}>{errors.village}</Text>}
              </View>
            )}

            {/* ── Password */}
            <View style={s.fieldGroup}>
              <Text style={s.label}>Password *</Text>
              <View style={[s.inputBox, errors.password && s.inputBoxError]}>
                <Text style={s.inputIcon}>🔒</Text>
                <TextInput
                  style={s.input}
                  placeholder="Min 6 characters"
                  placeholderTextColor={Colors.textLight}
                  secureTextEntry={!showPassword}
                  value={form.password}
                  onChangeText={v => update('password', v)}
                />
                <TouchableOpacity onPress={() => setShowPassword(p => !p)}>
                  <Text style={s.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
              {errors.password && <Text style={s.errorText}>{errors.password}</Text>}
            </View>

            {/* ── Confirm Password (Register only) */}
            {!isLogin && (
              <View style={s.fieldGroup}>
                <Text style={s.label}>Confirm Password *</Text>
                <View style={[s.inputBox, errors.confirmPassword && s.inputBoxError]}>
                  <Text style={s.inputIcon}>🔒</Text>
                  <TextInput
                    style={s.input}
                    placeholder="Re-enter your password"
                    placeholderTextColor={Colors.textLight}
                    secureTextEntry={!showPassword}
                    value={form.confirmPassword}
                    onChangeText={v => update('confirmPassword', v)}
                  />
                </View>
                {errors.confirmPassword &&
                  <Text style={s.errorText}>{errors.confirmPassword}</Text>}
              </View>
            )}

            {/* ── Forgot Password */}
            {isLogin && (
              <TouchableOpacity style={s.forgotBtn}>
                <Text style={s.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>
            )}

            {/* ── Submit Button */}
            <TouchableOpacity
              style={[s.submitBtn, loading && s.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={s.submitBtnText}>
                {loading
                  ? '⏳ Please wait...'
                  : isLogin ? '🔓 Login' : '🚀 Create Account'}
              </Text>
            </TouchableOpacity>

            {/* ── Switch Mode */}
            <View style={s.switchRow}>
              <Text style={s.switchText}>
                {isLogin ? "Don't have an account? " : 'Already have an account? '}
              </Text>
              <TouchableOpacity onPress={switchMode}>
                <Text style={s.switchLink}>
                  {isLogin ? 'Register' : 'Login'}
                </Text>
              </TouchableOpacity>
            </View>

          </View>

          {/* ── Footer */}
          <Text style={s.footer}>
            🌾 HarvestTrack — Built for Harvest Owners
          </Text>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({

  container:     { flex: 1, backgroundColor: Colors.primary },
  scrollContent: { flexGrow: 1, paddingBottom: 30 },

  // ── Banner
  banner: {
    alignItems: 'center',
    paddingTop: 50, paddingBottom: 30,
  },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#ffffff22',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
    borderWidth: 2, borderColor: '#ffffff44',
  },
  logoIcon:    { fontSize: 38 },
  appName: {
    color: Colors.white, fontSize: 28,
    fontWeight: '800', letterSpacing: 1,
  },
  appTagline: {
    color: '#ffffffaa', fontSize: 14,
    marginTop: 6,
  },

  // ── Card
  card: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },

  // ── Tab Switch
  tabSwitch: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 12, padding: 4,
    marginBottom: 20,
  },
  tabBtn: {
    flex: 1, paddingVertical: 10,
    borderRadius: 10, alignItems: 'center',
  },
  tabBtnActive:    { backgroundColor: Colors.primary },
  tabBtnText:      { fontSize: 14, fontWeight: '600', color: Colors.textMuted },
  tabBtnTextActive:{ color: Colors.white },

  // ── Title
  cardTitle: {
    fontSize: 20, fontWeight: '800',
    color: Colors.text, marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13, color: Colors.textMuted,
    marginBottom: 20, lineHeight: 18,
  },

  // ── Fields
  fieldGroup:  { marginBottom: 14 },
  label: {
    fontSize: 13, fontWeight: '600',
    color: Colors.textMuted, marginBottom: 6,
  },
  inputBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12, paddingHorizontal: 14,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  inputBoxError: { borderColor: '#e74c3c' },
  inputIcon:     { fontSize: 16, marginRight: 10 },
  input: {
    flex: 1, paddingVertical: 14,
    fontSize: 15, color: Colors.text,
  },
  eyeIcon: { fontSize: 18, paddingLeft: 8 },
  errorText: {
    color: '#e74c3c', fontSize: 12,
    marginTop: 4, marginLeft: 2,
  },

  // ── Forgot
  forgotBtn:  { alignSelf: 'flex-end', marginBottom: 16, marginTop: -4 },
  forgotText: { color: Colors.primary, fontSize: 13, fontWeight: '600' },

  // ── Submit
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 4,
    shadowColor: Colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 10, elevation: 5,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: {
    color: Colors.white, fontSize: 16,
    fontWeight: '800',
  },

  // ── Switch
  switchRow: {
    flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', marginTop: 20,
  },
  switchText: { fontSize: 14, color: Colors.textMuted },
  switchLink: {
    fontSize: 14, color: Colors.primary,
    fontWeight: '700',
  },

  // ── Footer
  footer: {
    textAlign: 'center', color: '#ffffff88',
    fontSize: 12, marginTop: 24,
  },
});