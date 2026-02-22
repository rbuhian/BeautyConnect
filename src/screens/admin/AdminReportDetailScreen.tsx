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
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowLeft, User, Flag, CheckCircle, XCircle, AlertTriangle } from 'lucide-react-native';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../../constants';
import { AdminStackParamList } from '../../navigation/types';
import {
  getReportDetail,
  reviewReport,
  ReportDetail,
  toggleClientSuspension,
} from '../../services/admin';
import { Loading } from '../../components';
import { formatDistanceToNow } from 'date-fns';

type Props = NativeStackScreenProps<AdminStackParamList, 'AdminReportDetail'>;

const REASON_LABELS: Record<string, string> = {
  harassment: 'Harassment',
  inappropriate_content: 'Inappropriate Content',
  fraud: 'Fraud',
  unsafe_practices: 'Unsafe Practices',
  no_show: 'No-Show',
  spam: 'Spam',
  other: 'Other',
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#FFF3E0', text: '#F57C00' },
  actioned: { bg: '#FFEBEE', text: '#C62828' },
  dismissed: { bg: '#F5F5F5', text: '#757575' },
  reviewed: { bg: '#E3F2FD', text: '#1565C0' },
};

export default function AdminReportDetailScreen({ navigation, route }: Props) {
  const { reportId } = route.params;
  const [detail, setDetail] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    (async () => {
      const result = await getReportDetail(reportId);
      if (result.data) {
        setDetail(result.data);
        setAdminNotes(result.data.admin_notes || '');
      }
      setLoading(false);
    })();
  }, [reportId]);

  const handleDismiss = () => {
    Alert.alert(
      'Dismiss Report',
      'Mark this report as reviewed and dismissed? No action will be taken against the reported user.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Dismiss',
          onPress: async () => {
            setActionLoading(true);
            const result = await reviewReport(reportId, 'dismissed', adminNotes.trim() || undefined);
            setActionLoading(false);
            if (result.error) {
              Alert.alert('Error', result.error.message);
              return;
            }
            Alert.alert('Dismissed', 'Report has been dismissed.', [
              { text: 'OK', onPress: () => navigation.goBack() },
            ]);
          },
        },
      ]
    );
  };

  const handleTakeAction = () => {
    if (!detail) return;
    const reportedName = detail.reported_name || 'this user';
    Alert.alert(
      'Take Action',
      `Choose an action for ${reportedName}:`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Actioned Only',
          onPress: async () => {
            setActionLoading(true);
            const result = await reviewReport(reportId, 'actioned', adminNotes.trim() || undefined);
            setActionLoading(false);
            if (result.error) {
              Alert.alert('Error', result.error.message);
              return;
            }
            Alert.alert('Actioned', 'Report has been marked as actioned.', [
              { text: 'OK', onPress: () => navigation.goBack() },
            ]);
          },
        },
        {
          text: 'Action + Suspend User',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            const [reviewRes, suspendRes] = await Promise.all([
              reviewReport(reportId, 'actioned', adminNotes.trim() || undefined),
              toggleClientSuspension(detail.reported_user_id, true),
            ]);
            setActionLoading(false);
            if (reviewRes.error || suspendRes.error) {
              Alert.alert('Error', reviewRes.error?.message || suspendRes.error?.message || 'Unknown error');
              return;
            }
            Alert.alert('Done', `${reportedName} has been suspended and report actioned.`, [
              { text: 'OK', onPress: () => navigation.goBack() },
            ]);
          },
        },
      ]
    );
  };

  if (loading) return <Loading />;
  if (!detail) return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report Review</Text>
      </View>
      <View style={styles.emptyCenter}>
        <Text style={styles.emptyText}>Report not found.</Text>
      </View>
    </SafeAreaView>
  );

  const isPending = detail.status === 'pending';
  const statusStyle = STATUS_COLORS[detail.status] || STATUS_COLORS.pending;
  const reportedAgo = formatDistanceToNow(new Date(detail.created_at), { addSuffix: true });
  const isAutoFlagged = detail.total_reports_against >= 3;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report Review</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
          <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>
            {detail.status.charAt(0).toUpperCase() + detail.status.slice(1)}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Reporter */}
        <Text style={styles.sectionLabel}>Reported By</Text>
        <View style={styles.userCard}>
          {detail.reporter_avatar ? (
            <Image source={{ uri: detail.reporter_avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <User size={22} color={COLORS.textSecondary} />
            </View>
          )}
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{detail.reporter_name || 'Unknown'}</Text>
            <Text style={styles.userPhone}>{detail.reporter_phone || ''}</Text>
          </View>
        </View>

        {/* Reported user */}
        <Text style={styles.sectionLabel}>Reported User</Text>
        <View style={styles.userCard}>
          {detail.reported_avatar ? (
            <Image source={{ uri: detail.reported_avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <User size={22} color={COLORS.textSecondary} />
            </View>
          )}
          <View style={styles.userInfo}>
            <View style={styles.reportedNameRow}>
              <Text style={styles.userName}>{detail.reported_name || 'Unknown'}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>
                  {detail.reported_role === 'professional' ? 'Pro' : 'Client'}
                </Text>
              </View>
            </View>
            <Text style={styles.userPhone}>{detail.reported_phone || ''}</Text>
          </View>
          {isAutoFlagged && (
            <View style={styles.flagChip}>
              <AlertTriangle size={12} color={COLORS.error} />
              <Text style={styles.flagChipText}>{detail.total_reports_against} reports</Text>
            </View>
          )}
        </View>

        {/* Reason + timing */}
        <Text style={styles.sectionLabel}>Report Details</Text>
        <View style={styles.detailCard}>
          <View style={styles.reasonRow}>
            <View style={styles.reasonChip}>
              <Flag size={12} color={COLORS.error} />
              <Text style={styles.reasonChipText}>
                {REASON_LABELS[detail.reason] || detail.reason}
              </Text>
            </View>
            <Text style={styles.agoText}>{reportedAgo}</Text>
          </View>
          {detail.details ? (
            <Text style={styles.detailsText}>{detail.details}</Text>
          ) : (
            <Text style={styles.noDetailsText}>No additional details provided.</Text>
          )}
        </View>

        {/* Admin notes */}
        <Text style={styles.sectionLabel}>Admin Notes</Text>
        {isPending ? (
          <TextInput
            style={styles.notesInput}
            value={adminNotes}
            onChangeText={setAdminNotes}
            placeholder="Add notes (optional)..."
            placeholderTextColor={COLORS.textSecondary}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        ) : (
          <View style={styles.notesCard}>
            <Text style={styles.notesText}>{detail.admin_notes || 'No notes recorded.'}</Text>
          </View>
        )}

        {/* Action buttons */}
        {isPending && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.dismissButton]}
              onPress={handleDismiss}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color={COLORS.textPrimary} />
              ) : (
                <>
                  <XCircle size={18} color={COLORS.textPrimary} />
                  <Text style={styles.dismissButtonText}>Dismiss</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButton2]}
              onPress={handleTakeAction}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <CheckCircle size={18} color={COLORS.white} />
                  <Text style={styles.actionButtonText}>Take Action</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.round,
  },
  statusBadgeText: { fontSize: FONT_SIZES.xs, fontWeight: '700' },
  content: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  sectionLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.xs,
    marginTop: SPACING.md,
  },
  userCard: {
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
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.chipBackground },
  avatarFallback: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: COLORS.chipBackground,
    justifyContent: 'center', alignItems: 'center',
  },
  userInfo: { flex: 1 },
  reportedNameRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  userName: { fontSize: FONT_SIZES.md, fontWeight: '600', color: COLORS.textPrimary },
  userPhone: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 2 },
  roleBadge: {
    backgroundColor: COLORS.chipBackground,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  roleBadgeText: { fontSize: 10, fontWeight: '600', color: COLORS.textSecondary },
  flagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFEBEE',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.round,
  },
  flagChipText: { fontSize: FONT_SIZES.xs, fontWeight: '700', color: COLORS.error },
  detailCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  reasonChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFEBEE',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.round,
  },
  reasonChipText: { fontSize: FONT_SIZES.xs, fontWeight: '700', color: COLORS.error },
  agoText: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  detailsText: { fontSize: FONT_SIZES.sm, color: COLORS.textPrimary, lineHeight: 20 },
  noDetailsText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, fontStyle: 'italic' },
  notesInput: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
    minHeight: 80,
  },
  notesCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  notesText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, lineHeight: 20 },
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
  dismissButton: {
    backgroundColor: COLORS.chipBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionButton2: { backgroundColor: COLORS.error },
  dismissButtonText: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary },
  actionButtonText: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.white },
  emptyCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary },
});
