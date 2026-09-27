import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors, radii, spacing, typography } from '../../constants/theme';
import { slotsPerPage, type BinderDoc } from '../../storage/binder';
import { Panel, PirateButton, SectionHeading } from '../ui';

interface BinderLibraryProps {
  binders: BinderDoc[];
  onOpen: (id: string) => void;
  onCreate: (title: string, description: string) => void;
  onRename: (id: string, title: string, description: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString();
}

/**
 * La estantería: todos los binders guardados. Es la primera pantalla porque
 * tener varios sin poder elegir cuál abrir no serviría de nada.
 */
export function BinderLibrary({
  binders,
  onOpen,
  onCreate,
  onRename,
  onDuplicate,
  onDelete,
}: BinderLibraryProps) {
  /** `new` para crear, un id para renombrar, `null` cerrado. */
  const [editing, setEditing] = useState<'new' | string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  /** Borrar no tiene deshacer: hace falta un segundo toque. */
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  const openCreate = () => {
    setDraftTitle('');
    setDraftDescription('');
    setEditing('new');
  };

  const openRename = (doc: BinderDoc) => {
    setDraftTitle(doc.title);
    setDraftDescription(doc.description);
    setEditing(doc.id);
  };

  const submit = () => {
    if (editing === 'new') onCreate(draftTitle, draftDescription);
    else if (editing) onRename(editing, draftTitle, draftDescription);
    setEditing(null);
  };

  return (
    <>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.heading}>Mis binders</Text>
          <Text style={styles.headerMeta}>
            {binders.length === 0
              ? 'Ninguno todavía'
              : `${binders.length} ${binders.length === 1 ? 'binder' : 'binders'} guardados`}
          </Text>
        </View>
        <PirateButton label="+ Nuevo binder" variant="primary" onPress={openCreate} />
      </View>

      {binders.length === 0 ? (
        <Panel crowned style={styles.empty}>
          <MaterialDesignIcons name="book-open-outline" size={40} color={colors.textFaint} />
          <Text style={styles.emptyTitle}>Aún no tienes ningún binder</Text>
          <Text style={styles.emptyText}>
            Crea uno para ir colocando cartas del catálogo por páginas. Se guarda solo.
          </Text>
          <PirateButton label="Crear mi primer binder" variant="primary" onPress={openCreate} />
        </Panel>
      ) : (
        <View style={styles.grid}>
          {binders.map((doc) => {
            const cards = doc.slots.filter(Boolean).length;
            const pages = Math.max(1, Math.ceil(doc.slots.length / slotsPerPage(doc.gridSize)));
            const deleting = confirmingDelete === doc.id;

            return (
              <Panel key={doc.id} style={styles.card}>
                <Pressable
                  onPress={() => onOpen(doc.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Abrir ${doc.title}`}
                  style={({ pressed }) => [styles.cardBody, pressed && styles.pressed]}
                >
                  {doc.cover ? (
                    <Image
                      source={doc.cover}
                      style={styles.cover}
                      contentFit="cover"
                      recyclingKey={doc.id}
                    />
                  ) : null}
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {doc.title}
                  </Text>
                  <Text style={styles.cardDescription} numberOfLines={2}>
                    {doc.description || 'Sin descripción.'}
                  </Text>

                  <View style={styles.cardMeta}>
                    <View style={styles.metaItem}>
                      <MaterialDesignIcons name="cards-outline" size={13} color={colors.textMuted} />
                      <Text style={styles.metaText}>{cards}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <MaterialDesignIcons name="book-open-outline" size={13} color={colors.textMuted} />
                      <Text style={styles.metaText}>
                        {pages} {pages === 1 ? 'página' : 'páginas'}
                      </Text>
                    </View>
                    <View style={styles.metaItem}>
                      <MaterialDesignIcons name="grid" size={13} color={colors.textMuted} />
                      <Text style={styles.metaText}>{doc.gridSize}</Text>
                    </View>
                    <Text style={styles.metaDate}>{formatDate(doc.updatedAt)}</Text>
                  </View>
                </Pressable>

                <View style={styles.cardActions}>
                  <IconAction icon="pencil-outline" label="Renombrar" onPress={() => openRename(doc)} />
                  <IconAction
                    icon="content-copy"
                    label="Duplicar"
                    onPress={() => onDuplicate(doc.id)}
                  />
                  <IconAction
                    icon={deleting ? 'check' : 'trash-can-outline'}
                    label={deleting ? `Confirmar borrado de ${doc.title}` : `Eliminar ${doc.title}`}
                    danger
                    onPress={() => {
                      if (!deleting) {
                        setConfirmingDelete(doc.id);
                        return;
                      }
                      onDelete(doc.id);
                      setConfirmingDelete(null);
                    }}
                  />
                </View>

                {deleting ? (
                  <Pressable onPress={() => setConfirmingDelete(null)}>
                    <Text style={styles.cancelDelete}>
                      Toca el visto para borrarlo, o aquí para dejarlo.
                    </Text>
                  </Pressable>
                ) : null}
              </Panel>
            );
          })}
        </View>
      )}

      <Modal
        visible={editing !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditing(null)}
      >
        <View style={styles.backdrop}>
          <Panel crowned style={styles.dialog}>
            <SectionHeading title={editing === 'new' ? 'Nuevo binder' : 'Renombrar binder'} />
            <TextInput
              value={draftTitle}
              onChangeText={setDraftTitle}
              placeholder="Nombre del binder"
              placeholderTextColor={colors.textFaint}
              style={styles.input}
              autoFocus
              onSubmitEditing={submit}
            />
            <TextInput
              value={draftDescription}
              onChangeText={setDraftDescription}
              placeholder="Descripción (opcional)"
              placeholderTextColor={colors.textFaint}
              style={[styles.input, styles.inputArea]}
              multiline
            />
            <View style={styles.dialogActions}>
              <PirateButton label="Cancelar" variant="ghost" onPress={() => setEditing(null)} />
              <PirateButton
                label={editing === 'new' ? 'Crear y abrir' : 'Guardar'}
                variant="primary"
                onPress={submit}
              />
            </View>
          </Panel>
        </View>
      </Modal>
    </>
  );
}

function IconAction({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.iconAction, danger && styles.iconDanger, pressed && styles.pressed]}
    >
      <MaterialDesignIcons
        name={icon as 'pencil-outline'}
        size={16}
        color={danger ? colors.error : colors.textMuted}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  headerText: { gap: 2 },
  heading: { ...typography.display, color: colors.goldInk },
  headerMeta: { ...typography.caption, color: colors.textMuted },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  emptyTitle: { ...typography.title, color: colors.text },
  emptyText: { ...typography.caption, color: colors.textMuted, textAlign: 'center', maxWidth: 340 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  card: { width: 280, gap: spacing.sm },
  cardBody: { gap: spacing.xs },
  cover: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs,
  },
  cardTitle: { ...typography.title, color: colors.text },
  cardDescription: { ...typography.caption, color: colors.textMuted, minHeight: 30 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { ...typography.caption, color: colors.textMuted },
  metaDate: { ...typography.caption, color: colors.textFaint, marginLeft: 'auto' },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  iconAction: {
    width: 30,
    height: 30,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSunken,
  },
  iconDanger: { borderColor: colors.error },
  cancelDelete: { ...typography.caption, color: colors.error, textAlign: 'right' },
  pressed: { opacity: 0.7 },
  backdrop: {
    flex: 1,
    backgroundColor: colors.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  dialog: { width: '100%', maxWidth: 420, gap: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSunken,
    color: colors.text,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    ...typography.body,
  },
  inputArea: { minHeight: 64, textAlignVertical: 'top' },
  dialogActions: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end' },
});
