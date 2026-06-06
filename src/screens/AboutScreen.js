import React, { useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { Cloud, Heart, Code2, Server, Smartphone, Globe } from 'lucide-react-native';
import { ThemeContext } from '../context/ThemeContext';
import Header from '../components/Header';

export default function AboutScreen() {
  const { colors } = useContext(ThemeContext);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <Header title="About Application" />

      <View style={styles.content}>
        {/* Brand layout section */}
        <View style={styles.brandSection}>
          <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
            <Cloud size={48} color={colors.primary} />
          </View>
          <Text style={[styles.titleText, { color: colors.text }]}>Kiran</Text>
          <Text style={[styles.versionText, { color: colors.textSecondary }]}>v1.0.0 (Production Stable)</Text>
        </View>

        {/* Core Purpose statement card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardText, { color: colors.text }]}>
            Kiran is a complete, production-ready React Native mobile storage organizer. It works like Google Drive, providing personal cloud storage for folders, documents, links, and passwords securely in one single interface.
          </Text>
        </View>

        {/* Tech Stack definitions specifications */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Technologies & Specs</Text>
        
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Tech Row: Core Client */}
          <View style={[styles.techRow, { borderBottomColor: colors.border }]}>
            <Smartphone size={20} color={colors.primary} style={styles.techIcon} />
            <View style={styles.techDetails}>
              <Text style={[styles.techLabel, { color: colors.text }]}>React Native Client</Text>
              <Text style={[styles.techSub, { color: colors.textSecondary }]}>Functional Components & Global Context Providers</Text>
            </View>
          </View>

          {/* Tech Row: Navigation */}
          <View style={[styles.techRow, { borderBottomColor: colors.border }]}>
            <Code2 size={20} color={colors.accent} style={styles.techIcon} />
            <View style={styles.techDetails}>
              <Text style={[styles.techLabel, { color: colors.text }]}>React Navigation Stack</Text>
              <Text style={[styles.techSub, { color: colors.textSecondary }]}>Bottom tabs combined with detailed stack routers</Text>
            </View>
          </View>

          {/* Tech Row: Server */}
          <View style={[styles.techRow, { borderBottomColor: colors.border }]}>
            <Server size={20} color={colors.warning} style={styles.techIcon} />
            <View style={styles.techDetails}>
              <Text style={[styles.techLabel, { color: colors.text }]}>Firebase Storage</Text>
              <Text style={[styles.techSub, { color: colors.textSecondary }]}>Binary documents and media stored in the app bucket</Text>
            </View>
          </View>

          {/* Tech Row: Database */}
          <View style={styles.techRow}>
            <Globe size={20} color="#8B5CF6" style={styles.techIcon} />
            <View style={styles.techDetails}>
              <Text style={[styles.techLabel, { color: colors.text }]}>Cloud Firestore</Text>
              <Text style={[styles.techSub, { color: colors.textSecondary }]}>Realtime document database for folders, files, links, and credentials</Text>
            </View>
          </View>
        </View>

        {/* Architecture details */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Hybrid Sync Architecture</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 40 }]}>
          <Text style={[styles.archText, { color: colors.text }]}>
            Kiran keeps a local <Text style={{ fontWeight: '700' }}>AsyncStorage cache</Text> on the device so your folders, files, links, and passwords remain visible even when cloud sync is unavailable.
          </Text>
          <View style={styles.heartRow}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>Crafted with </Text>
            <Heart size={14} color={colors.danger} style={{ fill: colors.danger }} />
            <Text style={[styles.footerText, { color: colors.textSecondary }]}> for nagasivakiran</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  brandSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  titleText: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  versionText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    marginVertical: 8,
  },
  cardText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 20,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  techRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  techIcon: {
    marginRight: 14,
  },
  techDetails: {
    flex: 1,
  },
  techLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  techSub: {
    fontSize: 11,
    marginTop: 2,
  },
  archText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },
  heartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    borderTopWidth: 0.5,
    borderTopColor: '#E2E8F0',
    paddingTop: 12,
  },
  footerText: {
    fontSize: 11,
    fontWeight: '600',
  }
});
