import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  User,
  Phone,
  ShieldCheck,
  ShieldX,
  FileText,
  ImageIcon,
} from 'lucide-react-native';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../../constants';
import { AdminStackParamList } from '../../navigation/types';
import {
  getVerificationDetail,
  approveVerification,
  rejectVerification,
  VerificationDetail,
} from '../../services/admin';
import { Loading } from '../../components';
import { formatDistanceToNow } from 'date-fns';

type Props = NativeStackScreenProps<AdminStackParamList, 'AdminVerificationDetail'>;

export default function AdminVerificationDetailScreen({ navigation, route }: Props) {
  const { verificationId } = route.params;
  const [detail, setDetail] = useState<VerificationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    (async () => {
      const result = await getVerificationDetail(verificationId);
      if (result.data) setDetail(result.data);
      setLoading(false);
    })();
  }, [verificationId]);

  const handleApprove = () => {
    Alert.alert(
      'Approve Verification',
      `Mark ${detail?.professional_name || 'this professional'} as verified?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            if (!detail) return;
            setActionLoading(true);
            const result = await approveVerification(verificationId, detail.professional_id);
            setActionLoading(false);
            if (result.error) {
              Alert.alert('Error', result.error.message);
              return;
            }
            Alert.alert('Approved', 'Professional has been verified.', [
              { text: 'OK', onPress: () => navigation.goBack() },
            ]);
          },
        },
      ]
    );
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      Alert.alert('Required', 'Please enter a reason for rejection.');
      return;
    }
    if (!detail) return;
    setActionLoading(true);
    setShowRejectModal(false);
    const result = await rejectVerification(verificationId, detail.professional_id, rejectReason.trim());
    setActionLoading(false);
    if (result.error) {
      Alert.alert('Error', result.error.message);
      return;
    }
    Alert.alert('Rejected', 'Verification has been rejected.', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  if (loading) return <Loading />;
  if (!detail) return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verification Review</Text>
      </View>
      <View style={styles.emptyCenter}>
        <Text style={styles.emptyText}>Verification not found.</Text>
      </View>
    </SafeAreaView>
  );

  const submittedAgo = formatDistanceToNow(new Date(detail.submitted_at), { addSuffix: true });
  const isAlreadyReviewed = detail.status !== 'pending';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verification Review</Text>
        {isAlreadyReviewed && (
          <View style={[styles.reviewedBadge, detail.status === 'verified' ? styles.verifiedBadge : styles.rejectedBadge]}>
            <Text style={[styles.reviewedBadgeText, detail.status === 'verified' ? { color: COLORS.success } : { color: COLORS.error }]}>
              {detail.status === 'verified' ? 'Verified' : 'Rejected'}
            </Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Professional info */}
        <View style={styles.card}>
          {detail.professional_avatar ? (
            <Image source={{ uri: detail.professional_avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <User size={28} color={COLORS.textSecondary} />
            </View>
          )}
          <View style={styles.proInfo}>
            <Text style={styles.proName}>{detail.professional_name || 'Unnamed'}</Text>
            <View style={styles.proPhone}>
              <Phone size={14} color={COLORS.textSecondary} />
              <Text style={styles.proPhoneText}>{detail.professional_phone}</Text>
            </View>
            <Text style={styles.submittedAgo}>Submitted {submittedAgo}</Text>
          </View>
        </View>

        {/* Government ID */}
        <Text style={styles.sectionTitle}>Government-issued ID</Text>
        {detail.id_document_signed_url ? (
          <Image
            source={{ uri: detail.id_document_signed_url }}
            style={styles.idImage}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.noDocCard}>
            <ImageIcon size={24} color={COLORS.textSecondary} />
            <Text style={styles.noDocText}>No ID document uploaded</Text>
          </View>
        )}

        {/* Certificates */}
        {detail.certificate_signed_urls.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>
              Certificates / Licenses ({detail.certificate_signed_urls.length})
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.certScroll}>
              {detail.certificate_signed_urls.map((url, i) => (
                <Image key={i} source={{ uri: url }} style={styles.certImage} resizeMode="cover" />
              ))}
            </ScrollView>
          </>
        )}

        {/* Submission notes */}
        {detail.submission_notes && (
          <>
            <Text style={styles.sectionTitle}>Notes from Professional</Text>
            <View style={styles.notesCard}>
              <FileText size={16} color={COLORS.textSecondary} />
              <Text style={styles.notesText}>{detail.submission_notes}</Text>
            </View>
          </>
        )}

        {/* Previous rejection notes (if resubmission) */}
        {detail.admin_notes && detail.status === 'pending' && (
          <>
            <Text style={styles.sectionTitle}>Previous Rejection Reason</Text>
            <View style={[styles.notesCard, { backgroundColor: '#FFEBEE' }]}>
              <FileText size={16} color={COLORS.error} />
              <Text style={[styles.notesText, { color: COLORS.error }]}>{detail.admin_notes}</Text>
            </View>
          </>
        )}

        {/* Action buttons */}
        {!isAlreadyReviewed && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={handleApprove}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <ShieldCheck size={20} color={COLORS.white} />
                  <Text style={styles.actionButtonText}>Approve</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => setShowRejectModal(true)}
              disabled={actionLoading}
            >
              <ShieldX size={20} color={COLORS.white} />
              <Text style={styles.actionButtonText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Reject modal */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reason for Rejection</Text>
            <Text style={styles.modalSubtitle}>
              This message will be shown to the professional.
            </Text>
            <TextInput
              style={styles.reasonInput}
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="e.g. ID photo is blurry, please resubmit..."
              placeholderTextColor={COLORS.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => { setShowRejectModal(false); setRejectReason(''); }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmRejectButton]}
                onPress={handleReject}
              >
                <Text style={styles.confirmRejectText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: { padding: SPACING.xs },
  headerTitle: {
    flex: 1,
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  reviewedBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.round,
  },
  verifiedBadge: { backgroundColor: '#E8F5E9' },
  rejectedBadge: { backgroundColor: '#FFEBEE' },
  reviewedBadgeText: { fontSize: FONT_SIZES.xs, fontWeight: '700' },
  content: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.chipBackground },
  avatarFallback: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.chipBackground,
    justifyContent: 'center', alignItems: 'center',
  },
  proInfo: { flex: 1 },
  proName: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  proPhone: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  proPhoneText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  submittedAgo: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  sectionTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  idImage: {
    width: '100%',
    height: 220,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.chipBackground,
  },
  noDocCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  noDocText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  certScroll: { marginBottom: SPACING.sm },
  certImage: {
    width: 120,
    height: 120,
    borderRadius: RADIUS.sm,
    marginRight: SPACING.sm,
    backgroundColor: COLORS.chipBackground,
  },
  notesCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  notesText: { flex: 1, fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.xl },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  approveButton: { backgroundColor: COLORS.success },
  rejectButton: { backgroundColor: COLORS.error },
  actionButtonText: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.white },
  emptyCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  modalTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  modalSubtitle: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginBottom: SPACING.md },
  reasonInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
    minHeight: 100,
    marginBottom: SPACING.lg,
  },
  modalActions: { flexDirection: 'row', gap: SPACING.md },
  modalButton: { flex: 1, paddingVertical: SPACING.md, borderRadius: RADIUS.md, alignItems: 'center' },
  cancelButton: { backgroundColor: COLORS.chipBackground },
  confirmRejectButton: { backgroundColor: COLORS.error },
  cancelButtonText: { fontSize: FONT_SIZES.md, fontWeight: '600', color: COLORS.textPrimary },
  confirmRejectText: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.white },
});
