import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowLeft,
  ShieldCheck,
  ShieldAlert,
  Shield,
  Clock,
  Upload,
  X,
  Plus,
  FileText,
} from 'lucide-react-native';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../../constants';
import { useAuth } from '../../hooks/useAuth';
import { getMyVerification, submitVerification } from '../../services/verification';
import { getVerificationSignedUrl } from '../../services/storage';
import { ProfessionalVerification, VerificationStatus } from '../../types';
import { Loading } from '../../components';

const MAX_CERTIFICATES = 5;

export default function VerificationScreen({ navigation }: any) {
  const { user, professionalProfile, refreshProfessionalProfile } = useAuth();
  const [verification, setVerification] = useState<ProfessionalVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [idDocumentUri, setIdDocumentUri] = useState<string | null>(null);
  const [certificateUris, setCertificateUris] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  // Signed URLs for viewing submitted docs (pending/rejected state)
  const [idSignedUrl, setIdSignedUrl] = useState<string | null>(null);
  const [certSignedUrls, setCertSignedUrls] = useState<string[]>([]);

  const verificationStatus: VerificationStatus =
    professionalProfile?.verification_status || 'unverified';

  const fetchVerification = useCallback(async () => {
    if (!professionalProfile?.id) return;
    const result = await getMyVerification(professionalProfile.id);
    if (result.data) {
      setVerification(result.data);
      // Load signed URLs for submitted docs
      if (result.data.id_document_path) {
        try {
          const url = await getVerificationSignedUrl(result.data.id_document_path);
          setIdSignedUrl(url);
        } catch { /* ignore */ }
      }
      const urls: string[] = [];
      for (const path of result.data.certificate_paths) {
        try {
          urls.push(await getVerificationSignedUrl(path));
        } catch { /* ignore */ }
      }
      setCertSignedUrls(urls);
    }
    setLoading(false);
  }, [professionalProfile?.id]);

  useEffect(() => {
    fetchVerification();
  }, [fetchVerification]);

  const pickIdDocument = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setIdDocumentUri(result.assets[0].uri);
    }
  };

  const pickCertificate = async () => {
    if (certificateUris.length >= MAX_CERTIFICATES) {
      Alert.alert('Limit reached', `You can upload up to ${MAX_CERTIFICATES} certificates.`);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setCertificateUris((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const removeCertificate = (index: number) => {
    setCertificateUris((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!idDocumentUri) {
      Alert.alert('Required', 'Please upload a government-issued ID before submitting.');
      return;
    }
    if (!professionalProfile?.id || !user?.id) return;

    setSubmitting(true);
    const result = await submitVerification(
      professionalProfile.id,
      user.id,
      idDocumentUri,
      certificateUris,
      notes.trim() || undefined
    );
    setSubmitting(false);

    if (result.error) {
      Alert.alert('Error', result.error.message);
      return;
    }

    await refreshProfessionalProfile();
    setVerification(result.data);
    setIdDocumentUri(null);
    setCertificateUris([]);
    setNotes('');
    Alert.alert('Submitted', 'Your verification request has been submitted for review.');
    fetchVerification();
  };

  const renderStatusBadge = () => {
    const configs = {
      unverified: { label: 'Not Verified', color: COLORS.textSecondary, bg: COLORS.chipBackground },
      pending: { label: 'Under Review', color: '#F57C00', bg: '#FFF3E0' },
      verified: { label: 'Verified', color: COLORS.success, bg: '#E8F5E9' },
      rejected: { label: 'Rejected', color: COLORS.error, bg: '#FFEBEE' },
    };
    const cfg = configs[verificationStatus];
    return (
      <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
        <Text style={[styles.statusBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
      </View>
    );
  };

  const renderUploadForm = () => (
    <View>
      {verificationStatus === 'rejected' && verification?.admin_notes && (
        <View style={styles.rejectionCard}>
          <ShieldAlert size={20} color={COLORS.error} />
          <View style={{ flex: 1 }}>
            <Text style={styles.rejectionTitle}>Rejection Reason</Text>
            <Text style={styles.rejectionText}>{verification.admin_notes}</Text>
          </View>
        </View>
      )}

      {/* Government ID */}
      <Text style={styles.sectionLabel}>Government-issued ID <Text style={styles.required}>*</Text></Text>
      <Text style={styles.sectionHint}>Passport, driver's license, national ID, etc.</Text>
      {idDocumentUri ? (
        <View style={styles.docPreviewRow}>
          <Image source={{ uri: idDocumentUri }} style={styles.docPreview} />
          <TouchableOpacity style={styles.removeDocButton} onPress={() => setIdDocumentUri(null)}>
            <X size={16} color={COLORS.white} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.changeDocButton} onPress={pickIdDocument}>
            <Text style={styles.changeDocText}>Change</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.uploadButton} onPress={pickIdDocument}>
          <Upload size={20} color={COLORS.primary} />
          <Text style={styles.uploadButtonText}>Upload ID Photo</Text>
        </TouchableOpacity>
      )}

      {/* Certificates */}
      <Text style={[styles.sectionLabel, { marginTop: SPACING.lg }]}>
        Certificates / Licenses <Text style={styles.optional}>(Optional)</Text>
      </Text>
      <Text style={styles.sectionHint}>Cosmetology license, beauty school certificate, etc. (up to 5)</Text>
      <View style={styles.certGrid}>
        {certificateUris.map((uri, i) => (
          <View key={i} style={styles.certItem}>
            <Image source={{ uri }} style={styles.certPreview} />
            <TouchableOpacity style={styles.removeCertButton} onPress={() => removeCertificate(i)}>
              <X size={14} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        ))}
        {certificateUris.length < MAX_CERTIFICATES && (
          <TouchableOpacity style={styles.addCertButton} onPress={pickCertificate}>
            <Plus size={24} color={COLORS.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Notes */}
      <Text style={[styles.sectionLabel, { marginTop: SPACING.lg }]}>Additional Notes <Text style={styles.optional}>(Optional)</Text></Text>
      <TextInput
        style={styles.notesInput}
        value={notes}
        onChangeText={setNotes}
        placeholder="Any additional information for the reviewer..."
        placeholderTextColor={COLORS.textSecondary}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      <TouchableOpacity
        style={[styles.submitButton, (!idDocumentUri || submitting) && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={!idDocumentUri || submitting}
      >
        {submitting ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={styles.submitButtonText}>
            {verificationStatus === 'rejected' ? 'Resubmit for Review' : 'Submit for Review'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderPendingState = () => (
    <View style={styles.stateCard}>
      <Clock size={48} color="#F57C00" />
      <Text style={styles.stateTitle}>Under Review</Text>
      <Text style={styles.stateText}>
        Your verification documents are being reviewed by our team. This usually takes 1–2 business days.
      </Text>
      {idSignedUrl && (
        <View style={{ marginTop: SPACING.lg, width: '100%' }}>
          <Text style={styles.submittedLabel}>Submitted ID</Text>
          <Image source={{ uri: idSignedUrl }} style={styles.submittedDoc} resizeMode="cover" />
        </View>
      )}
      {certSignedUrls.length > 0 && (
        <View style={{ marginTop: SPACING.md, width: '100%' }}>
          <Text style={styles.submittedLabel}>Submitted Certificates</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {certSignedUrls.map((url, i) => (
              <Image key={i} source={{ uri: url }} style={styles.submittedCert} resizeMode="cover" />
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );

  const renderVerifiedState = () => (
    <View style={styles.stateCard}>
      <ShieldCheck size={64} color={COLORS.success} />
      <Text style={[styles.stateTitle, { color: COLORS.success }]}>You're Verified!</Text>
      <Text style={styles.stateText}>
        Your identity has been verified. A verified badge is now displayed on your profile.
      </Text>
    </View>
  );

  if (loading) return <Loading />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Identity Verification</Text>
        {renderStatusBadge()}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Intro card */}
        <View style={styles.introCard}>
          <Shield size={32} color={COLORS.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.introTitle}>Build Client Trust</Text>
            <Text style={styles.introText}>
              Verified professionals get a badge on their profile, helping clients feel confident booking with you.
            </Text>
          </View>
        </View>

        {verificationStatus === 'verified' && renderVerifiedState()}
        {verificationStatus === 'pending' && renderPendingState()}
        {(verificationStatus === 'unverified' || verificationStatus === 'rejected') && renderUploadForm()}
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
  introCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  introTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  introText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, lineHeight: 20 },
  rejectionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    backgroundColor: '#FFEBEE',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  rejectionTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.error,
    marginBottom: 4,
  },
  rejectionText: { fontSize: FONT_SIZES.sm, color: COLORS.error },
  sectionLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  required: { color: COLORS.error },
  optional: { color: COLORS.textSecondary, fontWeight: '400' },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.lg,
  },
  uploadButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
  docPreviewRow: { position: 'relative' },
  docPreview: {
    width: '100%',
    height: 180,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.chipBackground,
  },
  removeDocButton: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: COLORS.error,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changeDocButton: {
    position: 'absolute',
    bottom: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  changeDocText: { fontSize: FONT_SIZES.xs, color: COLORS.white, fontWeight: '600' },
  certGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  certItem: { width: 80, height: 80, position: 'relative' },
  certPreview: { width: 80, height: 80, borderRadius: RADIUS.sm, backgroundColor: COLORS.chipBackground },
  removeCertButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: COLORS.error,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addCertButton: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.white,
    minHeight: 100,
    marginTop: SPACING.xs,
  },
  submitButton: {
    marginTop: SPACING.xl,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.white },
  stateCard: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  stateTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  stateText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  submittedLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  submittedDoc: {
    width: '100%',
    height: 160,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.chipBackground,
  },
  submittedCert: {
    width: 100,
    height: 100,
    borderRadius: RADIUS.sm,
    marginRight: SPACING.sm,
    backgroundColor: COLORS.chipBackground,
  },
});
