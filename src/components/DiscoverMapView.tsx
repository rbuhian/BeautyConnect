import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import MapView from 'react-native-map-clustering';
import { Marker, Circle, Region } from 'react-native-maps';
import { MapPin, Star, Navigation } from 'lucide-react-native';
import { COLORS, SPACING, FONT_SIZES, RADIUS, CURRENCY } from '../constants';
import { ProfessionalWithDetails, UserLocation } from '../services/client';

const MANILA_REGION: Region = {
  latitude: 14.5995,
  longitude: 120.9842,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

const HOME_SERVICE_RADIUS_METERS = 3000;

interface DiscoverMapViewProps {
  professionals: ProfessionalWithDetails[];
  userLocation?: UserLocation;
  favorites: string[];
  onPressCard: (professionalId: string) => void;
  onToggleFavorite: (professionalId: string) => void;
}

export default function DiscoverMapView({
  professionals,
  userLocation,
  onPressCard,
}: DiscoverMapViewProps) {
  const [selectedPro, setSelectedPro] = useState<ProfessionalWithDetails | null>(null);
  const [regionChanged, setRegionChanged] = useState(false);
  const [visiblePros, setVisiblePros] = useState<ProfessionalWithDetails[] | null>(null);
  const currentRegion = useRef<Region | null>(null);
  const isFirstRegionChange = useRef(true);

  const mappablePros = professionals.filter(
    (p) => p.latitude != null && p.longitude != null
  );

  const displayedPros = visiblePros ?? mappablePros;

  const initialRegion: Region = userLocation
    ? {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      }
    : MANILA_REGION;

  const handleRegionChangeComplete = useCallback((region: Region) => {
    currentRegion.current = region;
    // Skip the initial automatic region change fired on mount
    if (isFirstRegionChange.current) {
      isFirstRegionChange.current = false;
      return;
    }
    setRegionChanged(true);
  }, []);

  const handleSearchThisArea = useCallback(() => {
    if (!currentRegion.current) return;
    const { latitude, longitude, latitudeDelta, longitudeDelta } = currentRegion.current;
    const minLat = latitude - latitudeDelta / 2;
    const maxLat = latitude + latitudeDelta / 2;
    const minLng = longitude - longitudeDelta / 2;
    const maxLng = longitude + longitudeDelta / 2;

    const inBounds = mappablePros.filter(
      (p) =>
        p.latitude! >= minLat &&
        p.latitude! <= maxLat &&
        p.longitude! >= minLng &&
        p.longitude! <= maxLng
    );
    setVisiblePros(inBounds);
    setRegionChanged(false);
    setSelectedPro(null);
  }, [mappablePros]);

  const handleMarkerPress = useCallback((pro: ProfessionalWithDetails) => {
    setSelectedPro(pro);
  }, []);

  const handleMapPress = useCallback(() => {
    setSelectedPro(null);
  }, []);

  const renderPreviewCard = () => {
    if (!selectedPro) return null;
    const priceText =
      selectedPro.min_price != null
        ? selectedPro.max_price != null && selectedPro.max_price !== selectedPro.min_price
          ? `${CURRENCY.symbol}${selectedPro.min_price.toLocaleString()} – ${CURRENCY.symbol}${selectedPro.max_price.toLocaleString()}`
          : `${CURRENCY.symbol}${selectedPro.min_price.toLocaleString()}`
        : null;

    return (
      <View style={styles.previewCard}>
        <View style={styles.previewInner}>
          {/* Avatar */}
          {selectedPro.user.avatar ? (
            <Image source={{ uri: selectedPro.user.avatar }} style={styles.previewAvatar} />
          ) : (
            <View style={styles.previewAvatarFallback}>
              <MapPin size={20} color={COLORS.primary} />
            </View>
          )}

          {/* Info */}
          <View style={styles.previewInfo}>
            <Text style={styles.previewName} numberOfLines={1}>
              {selectedPro.user.name || 'Beauty Professional'}
            </Text>
            <View style={styles.previewMeta}>
              <Star size={12} color={COLORS.warning} fill={COLORS.warning} />
              <Text style={styles.previewRating}>
                {selectedPro.avg_rating > 0
                  ? selectedPro.avg_rating.toFixed(1)
                  : 'New'}
              </Text>
              {selectedPro.total_reviews > 0 && (
                <Text style={styles.previewReviews}>
                  ({selectedPro.total_reviews})
                </Text>
              )}
              {priceText && (
                <Text style={styles.previewPrice}> · {priceText}</Text>
              )}
            </View>
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={styles.previewButton}
            onPress={() => onPressCard(selectedPro.id)}
          >
            <Text style={styles.previewButtonText}>View</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={initialRegion}
        onRegionChangeComplete={handleRegionChangeComplete}
        onPress={handleMapPress}
        showsUserLocation={!!userLocation}
        showsMyLocationButton={false}
        // Default provider — no Google key needed
        provider={undefined}
      >
        {displayedPros.map((pro) => {
          const isHomeService =
            pro.location_type === 'home_service' || pro.location_type === 'both';
          return (
            <React.Fragment key={pro.id}>
              {isHomeService && (
                <Circle
                  center={{ latitude: pro.latitude!, longitude: pro.longitude! }}
                  radius={HOME_SERVICE_RADIUS_METERS}
                  fillColor="rgba(201,160,220,0.12)"
                  strokeColor={COLORS.primary}
                  strokeWidth={1}
                />
              )}
              <Marker
                coordinate={{ latitude: pro.latitude!, longitude: pro.longitude! }}
                onPress={() => handleMarkerPress(pro)}
                pinColor={COLORS.primary}
                tracksViewChanges={false}
              />
            </React.Fragment>
          );
        })}
      </MapView>

      {/* Search this area button */}
      {regionChanged && (
        <View style={styles.searchAreaWrapper} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.searchAreaButton}
            onPress={handleSearchThisArea}
            activeOpacity={0.85}
          >
            <Navigation size={14} color={COLORS.primary} />
            <Text style={styles.searchAreaText}>Search this area</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Professional count badge */}
      {visiblePros !== null && (
        <TouchableOpacity
          style={styles.resetBadge}
          onPress={() => { setVisiblePros(null); setRegionChanged(false); setSelectedPro(null); }}
        >
          <Text style={styles.resetBadgeText}>
            {displayedPros.length} visible · Reset
          </Text>
        </TouchableOpacity>
      )}

      {renderPreviewCard()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  searchAreaWrapper: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  searchAreaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.round,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  searchAreaText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.primary,
  },
  resetBadge: {
    position: 'absolute',
    top: 12,
    right: SPACING.md,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADIUS.round,
  },
  resetBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: '#7B1FA2',
  },
  previewCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: Platform.OS === 'ios' ? 32 : SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  previewInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  previewAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.chipBackground,
  },
  previewAvatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewInfo: {
    flex: 1,
  },
  previewName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  previewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flexWrap: 'wrap',
  },
  previewRating: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  previewReviews: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  previewPrice: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  previewButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  previewButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.white,
  },
});
