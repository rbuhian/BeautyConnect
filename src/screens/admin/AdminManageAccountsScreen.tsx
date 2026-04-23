import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Image,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Settings2, ChevronLeft, User, Eye, EyeOff } from 'lucide-react-native';
import { COLORS, FONT_SIZES, SPACING, RADIUS } from '../../constants';
import {
  searchAccountByEmail,
  adminResetUserPassword,
  adminResetUserEmail,
  adminFreezeAccount,
  adminDeleteAccount,
  adminElevateToAdmin,
  AccountSearchResult,
} from '../../services/admin';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AdminStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AdminStackParamList, 'AdminManageAccounts'>;

type ModalMode = 'password' | 'email' | null;

export default function AdminManageAccountsScreen({ navigation }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<AccountSearchResult[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<AccountSearchResult | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Modal state
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [modalValue, setModalValue] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSelectedAccount(null);
    const result = await searchAccountByEmail(searchQuery.trim());
    setSearching(false);
    if (result.data) {
      setResults(result.data);
      if (result.data.length === 0) {
        Alert.alert('No Results', 'No accounts found matching that email.');
      }
    } else {
      Alert.alert('Error', result.error?.message || 'Search failed.');
    }
  };

  const openModal = (mode: ModalMode) => {
    setModalValue(mode === 'email' && selectedAccount ? selectedAccount.email : '');
    setShowPassword(false);
    setModalMode(mode);
  };

  const closeModal = () => {
    setModalMode(null);
    setModalValue('');
  };

  const handleModalSubmit = async () => {
    if (!selectedAccount) return;

    if (modalMode === 'password') {
      if (modalValue.length < 6) {
        Alert.alert('Invalid', 'Password must be at least 6 characters.');
        return;
      }
      setModalLoading(true);
      const result = await adminResetUserPassword(selectedAccount.id, modalValue);
      setModalLoading(false);
      if (result.error) {
        Alert.alert('Error', result.error.message);
      } else {
        closeModal();
        Alert.alert('Success', 'Password has been updated.');
      }
    } else if (modalMode === 'email') {
      if (!modalValue.includes('@')) {
        Alert.alert('Invalid', 'Please enter a valid email address.');
        return;
      }
      setModalLoading(true);
      const result = await adminResetUserEmail(selectedAccount.id, modalValue.trim());
      setModalLoading(false);
      if (result.error) {
        Alert.alert('Error', result.error.message);
      } else {
        setSelectedAccount({ ...selectedAccount, email: modalValue.trim() });
        closeModal();
        Alert.alert('Success', 'Email has been updated.');
      }
    }
  };

  const handleFreezeAccount = () => {
    if (!selectedAccount) return;
    const isFrozen = selectedAccount.is_suspended;
    Alert.alert(
      isFrozen ? 'Unfreeze Account' : 'Freeze Account',
      isFrozen
        ? `Unfreeze account for ${selectedAccount.name || selectedAccount.email}?`
        : `Freeze account for ${selectedAccount.name || selectedAccount.email}? They will not be able to log in.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isFrozen ? 'Unfreeze' : 'Freeze',
          style: isFrozen ? 'default' : 'destructive',
          onPress: async () => {
            setActionLoading(true);
            const result = await adminFreezeAccount(selectedAccount.id, !isFrozen);
            setActionLoading(false);
            if (result.error) {
              Alert.alert('Error', result.error.message);
            } else {
              const updated = { ...selectedAccount, is_suspended: !isFrozen };
              setSelectedAccount(updated);
              setResults((prev) => prev.map((r) => r.id === updated.id ? updated : r));
              Alert.alert('Success', isFrozen ? 'Account unfrozen.' : 'Account frozen.');
            }
          },
        },
      ]
    );
  };

  const handleElevateToAdmin = () => {
    if (!selectedAccount) return;
    if (selectedAccount.role === 'admin') {
      Alert.alert('Already Admin', 'This account already has admin privileges.');
      return;
    }
    Alert.alert(
      'Elevate to Admin',
      `Grant admin privileges to ${selectedAccount.name || selectedAccount.email}? This will give them full admin access to the app.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Elevate',
          onPress: async () => {
            setActionLoading(true);
            const result = await adminElevateToAdmin(selectedAccount.id);
            setActionLoading(false);
            if (result.error) {
              Alert.alert('Error', result.error.message);
            } else {
              const updated = { ...selectedAccount, role: 'admin' };
              setSelectedAccount(updated);
              setResults((prev) => prev.map((r) => r.id === updated.id ? updated : r));
              Alert.alert('Success', `${selectedAccount.name || selectedAccount.email} is now an admin.`);
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    if (!selectedAccount) return;
    Alert.alert(
      'Delete Account',
      `Permanently delete the account for ${selectedAccount.name || selectedAccount.email}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            const result = await adminDeleteAccount(selectedAccount.id);
            setActionLoading(false);
            if (result.error) {
              Alert.alert('Error', result.error.message);
            } else {
              setSelectedAccount(null);
              setResults((prev) => prev.filter((r) => r.id !== selectedAccount.id));
              Alert.alert('Deleted', 'Account has been deleted.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Accounts</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Settings2 size={56} color={COLORS.primary} strokeWidth={1.5} />
        </View>

        {/* Search Row */}
        <View style={styles.searchRow}>
          <View style={styles.searchInputWrapper}>
            <User size={16} color={COLORS.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search account"
              placeholderTextColor={COLORS.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>
          <TouchableOpacity onPress={handleSearch} activeOpacity={0.85} disabled={searching}>
            <LinearGradient
              colors={[COLORS.gradientStart, COLORS.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.searchButton}
            >
              {searching ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.searchButtonText}>Search</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Search Results */}
        {results.length > 0 && !selectedAccount && (
          <View style={styles.resultsContainer}>
            {results.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.resultCard}
                onPress={() => setSelectedAccount(item)}
                activeOpacity={0.8}
              >
                {item.avatar ? (
                  <Image source={{ uri: item.avatar }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <User size={18} color={COLORS.textSecondary} />
                  </View>
                )}
                <View style={styles.resultInfo}>
                  <Text style={styles.resultName}>{item.name || 'Unnamed'}</Text>
                  <Text style={styles.resultEmail}>{item.email}</Text>
                  <Text style={styles.resultRole}>{item.role}</Text>
                </View>
                {item.is_suspended && (
                  <View style={styles.frozenBadge}>
                    <Text style={styles.frozenBadgeText}>Frozen</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Selected Account Actions */}
        {selectedAccount && (
          <View style={styles.actionsContainer}>
            <View style={styles.selectedCard}>
              {selectedAccount.avatar ? (
                <Image source={{ uri: selectedAccount.avatar }} style={styles.selectedAvatar} />
              ) : (
                <View style={[styles.avatarFallback, styles.selectedAvatarFallback]}>
                  <User size={24} color={COLORS.textSecondary} />
                </View>
              )}
              <View style={styles.selectedInfo}>
                <Text style={styles.selectedName}>{selectedAccount.name || 'Unnamed'}</Text>
                <Text style={styles.selectedEmail}>{selectedAccount.email}</Text>
                {selectedAccount.is_suspended && (
                  <View style={styles.frozenBadge}>
                    <Text style={styles.frozenBadgeText}>Frozen</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity onPress={() => setSelectedAccount(null)}>
                <Text style={styles.changeText}>Change</Text>
              </TouchableOpacity>
            </View>

            {actionLoading && (
              <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: SPACING.md }} />
            )}

            <ActionButton label="Reset Account Password" onPress={() => openModal('password')} />
            <ActionButton label="Reset Account Email" onPress={() => openModal('email')} />
            <ActionButton
              label={selectedAccount.is_suspended ? 'Unfreeze Account' : 'Freeze Account'}
              onPress={handleFreezeAccount}
            />
            <ActionButton
              label={selectedAccount.role === 'admin' ? 'Already an Admin' : 'Elevate to Admin'}
              onPress={handleElevateToAdmin}
              disabled={selectedAccount.role === 'admin'}
              accent
            />
            <ActionButton label="Delete Account" onPress={handleDeleteAccount} danger />
          </View>
        )}
      </ScrollView>

      {/* Input Modal */}
      <Modal visible={modalMode !== null} transparent animationType="fade" onRequestClose={closeModal}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {modalMode === 'password' ? 'Reset Password' : 'Reset Email'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {modalMode === 'password'
                ? `Set new password for ${selectedAccount?.email}`
                : `New email for ${selectedAccount?.name || selectedAccount?.email}`}
            </Text>

            <View style={styles.modalInputWrapper}>
              <TextInput
                style={styles.modalInput}
                value={modalValue}
                onChangeText={setModalValue}
                placeholder={modalMode === 'password' ? 'Enter new password' : 'Enter new email'}
                placeholderTextColor={COLORS.textSecondary}
                secureTextEntry={modalMode === 'password' && !showPassword}
                autoCapitalize="none"
                keyboardType={modalMode === 'email' ? 'email-address' : 'default'}
                autoFocus
              />
              {modalMode === 'password' && (
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                  {showPassword
                    ? <EyeOff size={18} color={COLORS.textSecondary} />
                    : <Eye size={18} color={COLORS.textSecondary} />}
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={closeModal}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleModalSubmit}
                disabled={modalLoading}
                activeOpacity={0.85}
                style={styles.modalConfirmButtonWrapper}
              >
                <LinearGradient
                  colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalConfirmButton}
                >
                  {modalLoading
                    ? <ActivityIndicator size="small" color={COLORS.white} />
                    : <Text style={styles.modalConfirmText}>Confirm</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function ActionButton({
  label,
  onPress,
  danger,
  accent,
  disabled,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
  accent?: boolean;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.actionButton,
        danger && styles.actionButtonDanger,
        accent && styles.actionButtonAccent,
        disabled && styles.actionButtonDisabled,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={disabled}
    >
      <Text style={[
        styles.actionButtonText,
        danger && styles.actionButtonTextDanger,
        accent && styles.actionButtonTextAccent,
        disabled && styles.actionButtonTextDisabled,
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  scrollContent: {
    padding: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.md,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  searchRow: {
    flexDirection: 'row',
    width: '100%',
    gap: SPACING.sm,
    alignItems: 'center',
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xxl,
    borderWidth: 1,
    borderColor: COLORS.gradientStart,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
  },
  searchButton: {
    borderRadius: RADIUS.xxl,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    minWidth: 80,
    alignItems: 'center',
  },
  searchButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.white,
  },
  resultsContainer: {
    width: '100%',
    gap: SPACING.sm,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.chipBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  resultEmail: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  resultRole: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.primary,
    textTransform: 'capitalize',
    marginTop: 2,
  },
  frozenBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.round,
  },
  frozenBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: '#1565C0',
  },
  actionsContainer: {
    width: '100%',
    gap: SPACING.sm,
  },
  selectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.gradientStart,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  selectedAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  selectedAvatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  selectedInfo: {
    flex: 1,
    gap: 2,
  },
  selectedName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  selectedEmail: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  changeText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
  actionButton: {
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.gradientStart,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  actionButtonDanger: {
    borderColor: COLORS.error,
  },
  actionButtonAccent: {
    borderColor: '#7B2D8B',
    backgroundColor: '#F3E5F5',
  },
  actionButtonDisabled: {
    opacity: 0.45,
  },
  actionButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  actionButtonTextDanger: {
    color: COLORS.error,
  },
  actionButtonTextAccent: {
    color: '#7B2D8B',
  },
  actionButtonTextDisabled: {
    color: COLORS.textSecondary,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    gap: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: -SPACING.sm,
  },
  modalInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.gradientStart,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.inputBackground,
  },
  modalInput: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    paddingVertical: SPACING.md,
  },
  eyeButton: {
    padding: SPACING.sm,
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  modalCancelText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  modalConfirmButtonWrapper: {
    flex: 1,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  modalConfirmButton: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.white,
  },
  modalInfo: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  modalInfoEmail: {
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
});
