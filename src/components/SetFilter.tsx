import { useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { colors, spacing } from '../constants/theme';
import { formatSetDisplayName, getSetCodeFromName, sortSetNames } from '../utils/cards';

interface SetFilterProps {
  sets: string[];
  setCounts: Record<string, number>;
  totalCount: number;
  value: string | null;
  onChange: (setName: string | null) => void;
}

function formatCount(n: number): string {
  return `${n} card${n === 1 ? '' : 's'}`;
}

export function SetFilter({ sets, setCounts, totalCount, value, onChange }: SetFilterProps) {
  const { width } = useWindowDimensions();
  const sideBySide = width >= 480;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filteredSets = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = !q
      ? sets
      : sets.filter((name) => {
          const display = formatSetDisplayName(name).toLowerCase();
          return (
            display.includes(q) ||
            name.toLowerCase().includes(q) ||
            (getSetCodeFromName(name)?.toLowerCase().includes(q) ?? false)
          );
        });
    return sortSetNames(list);
  }, [sets, query]);

  const selectedCount = value ? (setCounts[value] ?? 0) : totalCount;
  const label = value
    ? `${formatSetDisplayName(value)} · ${formatCount(selectedCount)}`
    : `All sets · ${formatCount(totalCount)}`;

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  return (
    <>
      <Pressable
        style={({ pressed }) => [
          styles.trigger,
          sideBySide && styles.triggerInline,
          pressed && styles.triggerPressed,
        ]}
        onPress={() => setOpen(true)}
      >
        <Text style={[styles.triggerLabel, sideBySide && styles.triggerLabelInline]}>Set</Text>
        <Text style={[styles.triggerValue, sideBySide && styles.triggerValueInline]} numberOfLines={1}>
          {label} ▾
        </Text>
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Filter by set</Text>
            <TextInput
              style={styles.search}
              placeholder="Search set (OP14, ST-30...)"
              placeholderTextColor={colors.textMuted}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
            />
            <ScrollView
              style={styles.list}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              showsVerticalScrollIndicator
            >
              {filteredSets.length === 0 && query.trim() ? (
                <Text style={styles.empty}>No matching sets</Text>
              ) : (
                (['__all__', ...filteredSets] as string[]).map((item) => {
                  const isAll = item === '__all__';
                  const selected = isAll ? value === null : value === item;
                  return (
                    <Pressable
                      key={item}
                      style={[styles.option, selected && styles.optionSelected]}
                      onPress={() => {
                        onChange(isAll ? null : item);
                        close();
                      }}
                    >
                      <View style={styles.optionRow}>
                        <Text
                          style={[styles.optionText, selected && styles.optionTextSelected]}
                          numberOfLines={2}
                        >
                          {isAll ? 'All sets' : formatSetDisplayName(item)}
                        </Text>
                        <Text style={styles.optionCount}>
                          {isAll ? totalCount : (setCounts[item] ?? 0)}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
            <Pressable style={styles.closeBtn} onPress={close}>
              <Text style={styles.closeBtnText}>Close</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    marginBottom: spacing.sm,
  },
  triggerInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  triggerPressed: { opacity: 0.85 },
  triggerLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  triggerLabelInline: {
    width: 92,
    minWidth: 92,
    marginBottom: 0,
  },
  triggerValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.glass,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  triggerValueInline: {
    flex: 1,
    minWidth: 0,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '75%',
    width: '100%',
    padding: spacing.md,
    borderTopWidth: 1,
    borderColor: colors.border,
    flexDirection: 'column',
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  search: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  list: {
    flexGrow: 0,
    flexShrink: 1,
    maxHeight: 360,
    ...Platform.select({
      web: { overflow: 'scroll' as const },
      default: {},
    }),
  },
  listContent: {
    paddingBottom: spacing.xs,
  },
  option: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    marginBottom: 2,
  },
  optionSelected: { backgroundColor: colors.surfaceRaised },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  optionText: { color: colors.text, fontSize: 14, flex: 1 },
  optionTextSelected: { color: colors.primary, fontWeight: '700' },
  optionCount: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    minWidth: 36,
    textAlign: 'right',
  },
  empty: { color: colors.textMuted, textAlign: 'center', padding: spacing.lg },
  closeBtn: {
    marginTop: spacing.sm,
    padding: spacing.md,
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  closeBtnText: { color: colors.textMuted, fontWeight: '600' },
});
