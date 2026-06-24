import { StyleSheet } from "react-native";
import Colors from "../constants/colors";

const globalStyles = StyleSheet.create({
  // ── Layout
  appContainer: { flex: 1, backgroundColor: Colors.background },
  screenContent: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  // ── Header
  header: {
    backgroundColor: Colors.primary,
    padding: 20,
    paddingTop: 50,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerGreeting: { color: Colors.primaryLight, fontSize: 13 },
  headerTitle: {
    color: Colors.white,
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 2,
  },
  headerIcon: {
    backgroundColor: "#ffffff22",
    borderRadius: 50,
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  headerIconText: { fontSize: 24 },

  // ── Stats Cards
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 16,
    gap: 12,
  },
  statCard: {
    width: "47%",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
  },
  statIcon: { fontSize: 24, marginBottom: 6 },
  statValue: { color: Colors.white, fontSize: 22, fontWeight: "bold" },
  statLabel: { color: "#ffffffcc", fontSize: 12, marginTop: 2 },

  // ── Section
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 12,
  },

  // ── Job Card
  jobCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: Colors.cardShadow,
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  jobLeft: { flex: 1 },
  jobCustomer: { fontSize: 15, fontWeight: "700", color: Colors.text },
  jobMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  jobRight: { alignItems: "flex-end" },
  jobAmount: { fontSize: 15, fontWeight: "700", color: Colors.primary },
  jobBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 4,
  },
  jobBadgeText: { fontSize: 11, fontWeight: "600" },

  // ── Bottom Tab Bar
  tabBar: {
    flexDirection: "row",
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingBottom: 10,
    paddingTop: 8,
    shadowColor: Colors.cardShadow,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 4,
    position: "relative",
  },
  tabActivePill: {
    position: "absolute",
    top: -8,
    width: 36,
    height: 4,
    backgroundColor: Colors.primary,
    borderRadius: 10,
  },
  tabIcon: { fontSize: 22 },
  tabIconActive: { transform: [{ scale: 1.15 }] },
  tabLabel: {
    fontSize: 10,
    color: Colors.textLight,
    marginTop: 3,
    fontWeight: "500",
  },
  tabLabelActive: { color: Colors.primary, fontWeight: "700" },

  // ── Placeholder Screen
  placeholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },
  placeholderIcon: { fontSize: 56, marginBottom: 12 },
  placeholderText: { fontSize: 20, fontWeight: "700", color: Colors.text },
  placeholderSub: { fontSize: 14, color: Colors.textLight, marginTop: 6 },

  // ── Common Buttons
  btnPrimary: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginHorizontal: 16,
  },
  btnPrimaryText: { color: Colors.white, fontSize: 16, fontWeight: "700" },

  btnOutline: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    marginHorizontal: 16,
  },
  btnOutlineText: { color: Colors.primary, fontSize: 16, fontWeight: "700" },

  // ── Input
  input: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textMuted,
    marginBottom: 4,
  },

  // ── CustomerScreen styles

  // Header Add Button
  addHeaderBtn: {
    backgroundColor: "#ffffff33",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ffffff55",
  },
  addHeaderBtnText: { color: Colors.white, fontWeight: "700", fontSize: 14 },

  // Search
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    margin: 16,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    paddingVertical: 10,
  },
  clearSearch: { fontSize: 16, color: Colors.textLight, paddingLeft: 8 },

  // Count
  countRow: { paddingHorizontal: 16, marginBottom: 8 },
  countText: { fontSize: 13, color: Colors.textMuted, fontWeight: "500" },

  // List
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },

  // Card
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: { color: Colors.white, fontSize: 20, fontWeight: "bold" },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: "700", color: Colors.text },
  cardPhone: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  cardVillage: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  cardActions: { flexDirection: "column", gap: 6 },
  editBtn: {
    backgroundColor: "#e8f5e9",
    borderRadius: 8,
    padding: 8,
    alignItems: "center",
  },
  editBtnText: { fontSize: 16 },
  deleteBtn: {
    backgroundColor: "#fdecea",
    borderRadius: 8,
    padding: 8,
    alignItems: "center",
  },
  deleteBtnText: { fontSize: 16 },

  // Stats chips
  cardStats: { flexDirection: "row", gap: 8 },
  statChip: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: "center",
  },
  statChipLabel: { fontSize: 11, color: Colors.textMuted },
  statChipValue: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
    marginTop: 2,
  },

  // Empty state
  emptyContainer: { alignItems: "center", marginTop: 80 },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: "700", color: Colors.text },
  emptySub: {
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 6,
    textAlign: "center",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "#00000066",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: Colors.text },
  modalClose: { fontSize: 18, color: Colors.textMuted, padding: 4 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "#00000066",
    justifyContent: "flex-end", // ← Keep at bottom
  },
  modalSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "90%", // ← Increase from 85% to 90%
    minHeight: "50%", // ← Add minimum height
  },

  // Modal Buttons
  modalBtns: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
    marginBottom: 8,
  },
  modalBtnHalf: { flex: 1, marginHorizontal: 0 },

  // Input error
  inputError: { borderColor: "#e74c3c", borderWidth: 1.5 },
  errorText: {
    color: "#e74c3c",
    fontSize: 12,
    marginTop: -8,
    marginBottom: 8,
    marginLeft: 4,
  },

  // report screen styles

  scrollContent: { padding: 16, paddingBottom: 100 },

  // Header
  headerEarnings: { alignItems: "flex-end" },
  headerEarningsValue: { color: Colors.white, fontSize: 18, fontWeight: "800" },
  headerEarningsLabel: {
    color: Colors.primaryLight,
    fontSize: 12,
    marginTop: 2,
  },

  // Period Filter
  periodRow: { marginTop: 12 },
  periodScroll: { paddingHorizontal: 16, gap: 8 },
  periodChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  periodChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  periodChipText: { fontSize: 13, color: Colors.textMuted, fontWeight: "600" },
  periodChipTextActive: { color: Colors.white },

  // Internal Tab Bar
  tabRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  tabBtnActive: { backgroundColor: Colors.primary },
  tabBtnText: { fontSize: 12, fontWeight: "600", color: Colors.textMuted },
  tabBtnTextActive: { color: Colors.white },

  // KPI Grid
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  kpiCard: {
    width: "47%",
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  kpiIcon: { fontSize: 22, marginBottom: 6 },
  kpiValue: { fontSize: 20, fontWeight: "800" },
  kpiLabel: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

  // Chart Card
  chartCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 14,
  },
  noData: {
    color: Colors.textLight,
    fontSize: 14,
    textAlign: "center",
    padding: 20,
  },

  // Bar Chart
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  barLabel: {
    width: 52,
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: "500",
  },
  barWrapper: { flex: 1, marginHorizontal: 8 },
  barBg: {
    backgroundColor: Colors.background,
    borderRadius: 6,
    height: 20,
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: 6 },
  barValue: {
    width: 60,
    fontSize: 11,
    color: Colors.text,
    fontWeight: "700",
    textAlign: "right",
  },

  // Crop Cards
  cropCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cropCardTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  cropDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  cropCardName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text,
  },
  cropCardAmount: { fontSize: 16, fontWeight: "800", color: Colors.primary },
  cropCardStats: { flexDirection: "row", gap: 8 },
  cropStatChip: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  cropStatText: { fontSize: 12, color: Colors.textMuted, fontWeight: "500" },

  // Customer Cards
  customerCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  rankBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.border,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  rankBadgeTop: { backgroundColor: "#f39c12" },
  rankText: { fontSize: 12, fontWeight: "800", color: Colors.white },
  customerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  customerAvatarText: { color: Colors.white, fontWeight: "700", fontSize: 16 },
  customerInfo: { flex: 1 },
  customerName: { fontSize: 14, fontWeight: "700", color: Colors.text },
  customerMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  customerAmountBox: { alignItems: "flex-end" },
  customerAmount: { fontSize: 15, fontWeight: "800", color: Colors.primary },
  customerAcres: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "#00000066",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: Colors.text },
  modalClose: { fontSize: 18, color: Colors.textMuted, padding: 4 },

  // Customer Banner
  customerBanner: {
    alignItems: "center",
    paddingVertical: 20,
    backgroundColor: Colors.primaryFade || "#e8f5e9",
    borderRadius: 16,
    marginBottom: 16,
  },
  customerBannerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  customerBannerAvatarText: {
    color: Colors.white,
    fontSize: 26,
    fontWeight: "800",
  },
  customerBannerName: { fontSize: 18, fontWeight: "800", color: Colors.text },
  customerBannerVillage: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 4,
  },

  // Modal Stats Grid
  modalStatsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  modalStatCard: {
    width: "47%",
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    borderTopWidth: 3,
  },
  modalStatIcon: { fontSize: 20, marginBottom: 4 },
  modalStatValue: { fontSize: 18, fontWeight: "800" },
  modalStatLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },

  // Average Card
  avgCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avgLabel: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: "600",
    marginBottom: 12,
  },
  avgRow: { flexDirection: "row", alignItems: "center" },
  avgItem: { flex: 1, alignItems: "center" },
  avgValue: { fontSize: 16, fontWeight: "800", color: Colors.text },
  avgSub: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },
  avgDivider: { width: 1, height: 40, backgroundColor: Colors.border },

  // Modal Items (for dropdown selections)
  modalItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalItemActive: { backgroundColor: "#e8f5e9" },
  modalItemText: { fontSize: 15, color: Colors.text, fontWeight: "500" },
  modalItemTextActive: { color: Colors.primary, fontWeight: "700" },
  modalItemCheck: { color: Colors.primary, fontSize: 16, fontWeight: "700" },

  // Input Text (for readonly text in inputs)
  inputText: { fontSize: 15, color: Colors.text, fontWeight: "500" },
  inputPlaceholder: {
    fontSize: 15,
    color: Colors.textLight,
    fontWeight: "400",
  },
});

export default globalStyles;
