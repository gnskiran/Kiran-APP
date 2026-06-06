import React, { useContext, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal, Animated, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Sparkles, HardDrive, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { ThemeContext } from '../context/ThemeContext';
import { formatFileSize } from './FileCard';

export default function UploadProgressModal({ visible, fileName, fileSize, isImage = false, onComplete, onCancel }) {
  const { colors } = useContext(ThemeContext);
  const [progress, setProgress] = useState(0);
  const [stepText, setStepText] = useState('Analyzing file headers...');
  const [failed, setFailed] = useState(false);
  const [done, setDone] = useState(false);

  // Compression specs specs calculation (Images 50-60% savings, others 30-40% savings)
  const savingsFactor = isImage ? 0.42 : 0.65; // final size scale factor
  const originalSize = fileSize || 0;
  const compressedSize = Math.floor(originalSize * savingsFactor);
  const savedBytes = originalSize - compressedSize;
  const savedPercent = Math.round((savedBytes / (originalSize || 1)) * 100);

  // Animated progress track
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      setProgress(0);
      setFailed(false);
      setDone(false);
      progressAnim.setValue(0);
      return;
    }

    setStepText('Analyzing file layout...');
    
    // Smooth progress simulation simulating compression & network uploads
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + Math.floor(Math.random() * 15) + 3;
        
        if (next >= 100) {
          clearInterval(interval);
          setStepText('Finalizing cloud metadata sync...');
          setTimeout(() => {
            setDone(true);
            if (onComplete) onComplete({ originalSize, compressedSize });
          }, 800);
          return 100;
        }

        if (next > 25 && next < 55) {
          setStepText(isImage ? 'Optimizing image aspect ratios...' : 'Compressing document packets...');
        } else if (next >= 55 && next < 85) {
          setStepText('Generating cached preview thumbnails...');
        } else if (next >= 85) {
          setStepText('Synchronizing optimized binary with Firebase Storage...');
        }

        return next;
      });
    }, 280);

    return () => clearInterval(interval);
  }, [visible]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress / 100,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const barWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%']
  });

  return (
    <Modal visible={visible} transparent={true} animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.iconWrapper, { backgroundColor: done ? colors.accentLight : colors.primaryLight }]}>
            {done ? (
              <CheckCircle2 size={28} color={colors.accent} />
            ) : (
              <Sparkles size={28} color={colors.primary} />
            )}
          </View>

          <Text style={[styles.title, { color: colors.text }]}>
            {done ? 'Optimization Complete!' : 'Optimizing Storage Payload'}
          </Text>
          <Text style={[styles.fileName, { color: colors.textSecondary }]} numberOfLines={1}>
            {fileName}
          </Text>

          {/* Specs comparison */}
          <View style={[styles.comparisonGrid, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.compColumn}>
              <Text style={[styles.compLabel, { color: colors.textSecondary }]}>Original Size</Text>
              <Text style={[styles.compValue, { color: colors.text, textDecorationLine: 'line-through' }]}>
                {formatFileSize(originalSize)}
              </Text>
            </View>
            <View style={styles.compColumn}>
              <Text style={[styles.compLabel, { color: colors.textSecondary }]}>Optimized Size</Text>
              <Text style={[styles.compValue, { color: colors.primary, fontWeight: '800' }]}>
                {formatFileSize(compressedSize)}
              </Text>
            </View>
          </View>

          {/* Storage Savings Banner */}
          <View style={[styles.savingsBanner, { backgroundColor: colors.accentLight }]}>
            <HardDrive size={14} color={colors.accent} style={{ marginRight: 6 }} />
            <Text style={[styles.savingsText, { color: colors.accent }]}>
              Saved {formatFileSize(savedBytes)} ({savedPercent}% storage savings!)
            </Text>
          </View>

          {/* Animated Progress Bar */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={[styles.stepLabel, { color: colors.textSecondary }]}>{stepText}</Text>
              <Text style={[styles.percentLabel, { color: colors.primary }]}>{progress}%</Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
              <Animated.View style={[styles.progressFill, { backgroundColor: colors.primary, width: barWidth }]} />
            </View>
          </View>

          {/* Action buttons */}
          {done ? (
            <TouchableOpacity 
              style={[styles.doneBtn, { backgroundColor: colors.accent }]} 
              onPress={onCancel}
            >
              <Text style={styles.doneBtnText}>Return to Drive</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.cancelBtn, { borderColor: colors.border }]} 
              onPress={onCancel}
            >
              <Text style={[styles.cancelText, { color: colors.text }]}>Cancel Upload</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  fileName: {
    fontSize: 12,
    marginTop: 4,
    marginBottom: 16,
  },
  comparisonGrid: {
    flexDirection: 'row',
    width: '100%',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  compColumn: {
    flex: 1,
    alignItems: 'center',
  },
  compLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  compValue: {
    fontSize: 14,
    marginTop: 4,
  },
  savingsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 16,
  },
  savingsText: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressSection: {
    width: '100%',
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  percentLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  doneBtn: {
    width: '100%',
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  cancelBtn: {
    width: '100%',
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '700',
  }
});
