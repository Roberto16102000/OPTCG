import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  fetchOptcgPrices,
  formatUsd,
  isParallelVariant,
  priceRowsForCatalogCard,
  tcgplayerSearchUrl,
  type OptcgPriceRow,
} from '../utils/optcgPrices';

interface CardMarketPriceProps {
  code: string;
  catalogCardId: string;
  theme?: 'dark' | 'light' | 'wanted';
}

export function CardMarketPrice({
  code,
  catalogCardId,
  theme = 'wanted',
}: CardMarketPriceProps) {
  const wanted = theme === 'wanted';
  const light = theme === 'light';
  const [status, setStatus] = useState<'loading' | 'ok' | 'empty' | 'error'>('loading');
  const [rows, setRows] = useState<OptcgPriceRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setRows([]);
    void fetchOptcgPrices(code)
      .then((data) => {
        if (cancelled) return;
        const filtered = priceRowsForCatalogCard(data, catalogCardId);
        if (!filtered.length) {
          setStatus('empty');
          return;
        }
        setRows(filtered);
        setStatus('ok');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [code, catalogCardId]);

  if (status === 'empty') return null;

  const titleStyle = wanted ? styles.titleWanted : light ? styles.titleLight : styles.title;
  const mutedStyle = wanted ? styles.mutedWanted : light ? styles.mutedLight : styles.muted;
  const rowStyle = wanted ? styles.rowWanted : light ? styles.rowLight : styles.rowDark;
  const marketStyle = wanted ? styles.marketWanted : light ? styles.marketLight : styles.market;

  return (
    <View style={styles.wrap}>
      <View style={wanted ? styles.headerRow : undefined}>
        <Text style={titleStyle}>TCGPLAYER MARKET</Text>
        {status === 'ok' ? (
          <Pressable
            onPress={() => Linking.openURL(tcgplayerSearchUrl(catalogCardId || code))}
            accessibilityRole="link"
          >
            <Text style={wanted ? styles.linkWanted : styles.link}>Ver en TCGplayer ↗</Text>
          </Pressable>
        ) : null}
      </View>
      {status === 'loading' ? <Text style={mutedStyle}>Cargando precios…</Text> : null}
      {status === 'error' ? <Text style={mutedStyle}>Precio no disponible.</Text> : null}
      {status === 'ok'
        ? rows.map((row) => {
            const label = isParallelVariant(row) ? 'Parallel' : 'Normal';
            return (
              <View key={row.card_image_id || row.card_name} style={[rowStyle, styles.rowHighlight]}>
                <View style={styles.rowTop}>
                  <Text style={mutedStyle}>{label}</Text>
                  <Text style={marketStyle}>{formatUsd(row.market_price)}</Text>
                </View>
                <Text style={mutedStyle}>
                  Inventario {formatUsd(row.inventory_price)}
                  {row.date_scraped ? ` · ${row.date_scraped}` : ''}
                </Text>
              </View>
            );
          })
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 4, gap: 8 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.1,
    textTransform: 'uppercase',
    color: '#e8b923',
  },
  titleLight: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.1,
    textTransform: 'uppercase',
    color: '#92400e',
  },
  titleWanted: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#e8b923',
  },
  muted: { fontSize: 12, color: '#7b9ec4' },
  mutedLight: { fontSize: 12, color: '#64748b' },
  mutedWanted: { fontSize: 11, color: '#9eb5cc' },
  rowDark: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(12, 31, 61, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(232, 185, 35, 0.22)',
    gap: 4,
  },
  rowLight: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    gap: 4,
  },
  rowWanted: {
    paddingVertical: 6,
    paddingHorizontal: 0,
    gap: 4,
  },
  rowHighlight: {},
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  market: { fontSize: 17, fontWeight: '800', color: '#ffd54f' },
  marketLight: { fontSize: 17, fontWeight: '800', color: '#b45309' },
  marketWanted: { fontSize: 20, fontWeight: '800', color: '#ffd54f' },
  link: { fontSize: 12, fontWeight: '700', color: '#e8b923' },
  linkWanted: { fontSize: 11, fontWeight: '700', color: '#c8dce8' },
});
