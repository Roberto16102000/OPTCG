import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '../constants/theme';



const MAX_PAGE_BUTTONS = 7;



/** Page numbers with ellipsis, e.g. [1, 2, 3, '…', 10]. */

export function buildPageList(current: number, total: number): (number | 'ellipsis')[] {

  if (total <= 1) return total === 1 ? [1] : [];

  if (total <= MAX_PAGE_BUTTONS) {

    return Array.from({ length: total }, (_, i) => i + 1);

  }



  const pages = new Set<number>([1, total, current, current - 1, current + 1]);

  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);

  const out: (number | 'ellipsis')[] = [];



  for (let i = 0; i < sorted.length; i++) {

    const p = sorted[i];

    if (i > 0 && p - sorted[i - 1] > 1) out.push('ellipsis');

    out.push(p);

  }

  return out;

}



interface CatalogPaginationProps {

  currentPage: number;

  totalPages: number;

  onPageChange: (page: number) => void;

}



export function CatalogPagination({

  currentPage,

  totalPages,

  onPageChange,

}: CatalogPaginationProps) {

  if (totalPages <= 1) return null;



  const pages = buildPageList(currentPage, totalPages);

  const canPrev = currentPage > 1;

  const canNext = currentPage < totalPages;



  return (

    <View style={styles.wrap}>

      <Pressable

        style={({ pressed }) => [

          styles.navBtn,

          !canPrev && styles.navBtnDisabled,

          pressed && canPrev && styles.btnPressed,

        ]}

        onPress={() => canPrev && onPageChange(currentPage - 1)}

        disabled={!canPrev}

      >

        <Text style={[styles.navText, !canPrev && styles.navTextDisabled]}>PREV</Text>

      </Pressable>



      <ScrollView

        horizontal

        showsHorizontalScrollIndicator={false}

        contentContainerStyle={styles.pagesRow}

      >

        {pages.map((p, i) =>

          p === 'ellipsis' ? (

            <Text key={`e-${i}`} style={styles.ellipsis}>

              …

            </Text>

          ) : (

            <Pressable

              key={p}

              style={({ pressed }) => [

                styles.pageBtn,

                p === currentPage && styles.pageBtnActive,

                pressed && styles.btnPressed,

              ]}

              onPress={() => onPageChange(p)}

            >

              <Text

                style={[styles.pageText, p === currentPage && styles.pageTextActive]}

              >

                {p}

              </Text>

            </Pressable>

          )

        )}

      </ScrollView>



      <Pressable

        style={({ pressed }) => [

          styles.navBtn,

          !canNext && styles.navBtnDisabled,

          pressed && canNext && styles.btnPressed,

        ]}

        onPress={() => canNext && onPageChange(currentPage + 1)}

        disabled={!canNext}

      >

        <Text style={[styles.navText, !canNext && styles.navTextDisabled]}>NEXT</Text>

      </Pressable>

    </View>

  );

}



const styles = StyleSheet.create({

  wrap: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: spacing.xs,

    flexShrink: 1,

  },

  pagesRow: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: 4,

  },

  navBtn: {

    paddingHorizontal: spacing.sm,

    paddingVertical: 6,

    borderWidth: 1,

    borderColor: colors.border,

    backgroundColor: colors.glass,

    borderRadius: radii.sm,

    minWidth: 48,

    alignItems: 'center',

  },

  navBtnDisabled: { opacity: 0.35 },

  navText: {

    color: colors.text,

    fontSize: 11,

    fontWeight: '700',

  },

  navTextDisabled: { color: colors.textMuted },

  pageBtn: {

    minWidth: 32,

    height: 32,

    paddingHorizontal: 6,

    borderWidth: 1,

    borderColor: colors.border,

    backgroundColor: colors.glass,

    borderRadius: radii.sm,

    alignItems: 'center',

    justifyContent: 'center',

  },

  pageBtnActive: {

    backgroundColor: colors.gold,

    borderColor: colors.gold,

  },

  pageText: {

    color: colors.text,

    fontSize: 12,

    fontWeight: '600',

  },

  pageTextActive: {

    color: colors.textOnGold,

    fontWeight: '800',

  },

  ellipsis: {

    color: colors.textMuted,

    fontSize: 14,

    paddingHorizontal: 4,

    lineHeight: 32,

  },

  btnPressed: { transform: [{ scale: 0.94 }] },

});

