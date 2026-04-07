import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
  Modal,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, X } from 'lucide-react-native';
import { ClientScreenProps } from '../../navigation/types';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../../constants';

const { width, height } = Dimensions.get('window');
const NUM_COLUMNS = 3;
const TILE_GAP = 3;
const TILE_SIZE = (width - TILE_GAP * (NUM_COLUMNS + 1)) / NUM_COLUMNS;

export default function GalleryScreen({ navigation, route }: ClientScreenProps<'Gallery'>) {
  const { photos, title = 'Photo Gallery' } = route.params;
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const renderTile = ({ item, index }: { item: string; index: number }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => setSelectedIndex(index)}
    >
      <Image source={{ uri: item }} style={styles.tile} />
    </TouchableOpacity>
  );

  return (
    <LinearGradient
      colors={[COLORS.gradientStart, COLORS.gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <Text style={styles.photoCount}>{photos.length} photos</Text>
        </View>

        {/* Tile grid */}
        {photos.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No photos available.</Text>
          </View>
        ) : (
          <FlatList
            data={photos}
            renderItem={renderTile}
            keyExtractor={(_, i) => String(i)}
            numColumns={NUM_COLUMNS}
            contentContainerStyle={styles.grid}
            columnWrapperStyle={styles.row}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>

      {/* Lightbox modal */}
      {selectedIndex !== null && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedIndex(null)}
        >
          <StatusBar hidden />
          <View style={styles.lightbox}>
            <TouchableOpacity
              style={styles.lightboxClose}
              onPress={() => setSelectedIndex(null)}
            >
              <X size={26} color={COLORS.white} />
            </TouchableOpacity>

            <FlatList
              data={photos}
              renderItem={({ item }) => (
                <View style={styles.lightboxPage}>
                  <Image
                    source={{ uri: item }}
                    style={styles.lightboxImage}
                    resizeMode="contain"
                  />
                </View>
              )}
              keyExtractor={(_, i) => String(i)}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={selectedIndex}
              getItemLayout={(_, index) => ({
                length: width,
                offset: width * index,
                index,
              })}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / width);
                setSelectedIndex(index);
              }}
            />

            <Text style={styles.lightboxCounter}>
              {selectedIndex + 1} / {photos.length}
            </Text>
          </View>
        </Modal>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.white,
  },
  photoCount: {
    fontSize: FONT_SIZES.sm,
    color: 'rgba(255,255,255,0.7)',
  },

  grid: {
    paddingHorizontal: TILE_GAP,
    paddingBottom: SPACING.xl,
  },
  row: {
    gap: TILE_GAP,
    marginBottom: TILE_GAP,
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },

  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: FONT_SIZES.md,
  },

  // Lightbox
  lightbox: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
  },
  lightboxClose: {
    position: 'absolute',
    top: 50,
    right: SPACING.lg,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxPage: {
    width,
    height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxImage: {
    width,
    height: height * 0.8,
  },
  lightboxCounter: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    color: 'rgba(255,255,255,0.7)',
    fontSize: FONT_SIZES.sm,
  },
});
