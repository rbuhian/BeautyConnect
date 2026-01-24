import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';
import { COLORS, SPACING } from '../constants';

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: number;
  editable?: boolean;
  onChange?: (rating: number) => void;
  spacing?: number;
  activeColor?: string;
  inactiveColor?: string;
}

export default function StarRating({
  rating,
  maxRating = 5,
  size = 24,
  editable = false,
  onChange,
  spacing = SPACING.xs,
  activeColor = COLORS.warning,
  inactiveColor = COLORS.border,
}: StarRatingProps) {
  const handlePress = (index: number) => {
    if (editable && onChange) {
      onChange(index + 1);
    }
  };

  const renderStar = (index: number) => {
    const filled = index < rating;
    const halfFilled = index < rating && index + 1 > rating;

    const star = (
      <Star
        key={index}
        size={size}
        color={filled ? activeColor : inactiveColor}
        fill={filled ? activeColor : 'transparent'}
        strokeWidth={1.5}
      />
    );

    if (editable) {
      return (
        <TouchableOpacity
          key={index}
          onPress={() => handlePress(index)}
          activeOpacity={0.7}
          style={{ marginRight: index < maxRating - 1 ? spacing : 0 }}
        >
          {star}
        </TouchableOpacity>
      );
    }

    return (
      <View
        key={index}
        style={{ marginRight: index < maxRating - 1 ? spacing : 0 }}
      >
        {star}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {Array.from({ length: maxRating }, (_, index) => renderStar(index))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
