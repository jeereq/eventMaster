import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { RsvpField } from '../../lib/rsvpFormFields';
import {
  buildRsvpPreferencesPayload,
  parseFieldOptions,
  restoreFieldValuesFromPreferences,
} from '../../lib/rsvpFormFields';
import type { GuestRsvpData, RsvpStatus } from '../../types/rsvp';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { colors } from '../../theme/colors';

interface Props {
  guest: GuestRsvpData;
  rsvpFields: RsvpField[];
  onSubmit: (rsvp: RsvpStatus, preferences: ReturnType<typeof buildRsvpPreferencesPayload>) => Promise<void>;
}

const MEAL_OPTIONS = [
  { value: 'none', label: 'Standard' },
  { value: 'vegetarian', label: 'Végétarien' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'halal', label: 'Halal' },
  { value: 'kosher', label: 'Kosher' },
  { value: 'gluten_free', label: 'Sans gluten' },
];

export function RsvpResponseForm({ guest, rsvpFields, onSubmit }: Props) {
  const prefs = guest.preferences;
  const [rsvpStatus, setRsvpStatus] = useState<RsvpStatus>(
    guest.rsvp === 'DECLINED' ? 'DECLINED' : 'ACCEPTED',
  );
  const [allergies, setAllergies] = useState(prefs?.allergies ?? '');
  const [specialMeal, setSpecialMeal] = useState(prefs?.specialMeal ?? 'none');
  const [notes, setNotes] = useState(prefs?.notes ?? '');
  const [fieldValues, setFieldValues] = useState<Record<string, unknown>>(() =>
    restoreFieldValuesFromPreferences(rsvpFields, prefs),
  );
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(guest.rsvp !== 'PENDING');

  const locked = guest.rsvpLocked ?? false;

  const handleSubmit = async () => {
    if (locked) {
      setError('La date de l\'événement est passée. Votre réponse ne peut plus être modifiée.');
      return;
    }

    for (const field of rsvpFields) {
      if (!field.required) continue;
      const val = fieldValues[field.id];
      if (val === undefined || val === null || val === '') {
        setError(`Le champ « ${field.label} » est obligatoire.`);
        return;
      }
    }

    setError('');
    setLoading(true);
    try {
      const preferences = buildRsvpPreferencesPayload({
        allergies,
        specialMeal,
        notes,
        rsvpFields,
        fieldValues,
      });
      await onSubmit(rsvpStatus, preferences);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'envoi.');
    } finally {
      setLoading(false);
    }
  };

  const customFieldsBlock = useMemo(
    () =>
      rsvpFields.map((field) => (
        <RsvpCustomField
          key={field.id}
          field={field}
          value={fieldValues[field.id]}
          onChange={(val) => setFieldValues((prev) => ({ ...prev, [field.id]: val }))}
        />
      )),
    [rsvpFields, fieldValues],
  );

  if (locked && guest.rsvp !== 'PENDING') {
    return null;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{submitted ? 'Modifier ma réponse' : 'Confirmer votre présence'}</Text>

      {error ? <Alert variant="error" message={error} /> : null}
      {submitted ? (
        <Alert variant="success" message="Votre réponse a bien été enregistrée. Merci !" />
      ) : null}

      <View style={styles.choiceRow}>
        <ChoiceButton
          label="J'accepte"
          active={rsvpStatus === 'ACCEPTED'}
          onPress={() => setRsvpStatus('ACCEPTED')}
          tone="accept"
        />
        <ChoiceButton
          label="Je décline"
          active={rsvpStatus === 'DECLINED'}
          onPress={() => setRsvpStatus('DECLINED')}
          tone="decline"
        />
      </View>

      {rsvpStatus === 'ACCEPTED' ? (
        <View style={styles.fields}>
          <Input
            label="Allergies alimentaires"
            value={allergies}
            onChangeText={setAllergies}
            placeholder="Ex. arachides, fruits de mer…"
          />

          <View style={styles.mealBlock}>
            <Text style={styles.mealLabel}>Régime / menu</Text>
            <View style={styles.mealGrid}>
              {MEAL_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => setSpecialMeal(opt.value)}
                  style={[styles.mealChip, specialMeal === opt.value && styles.mealChipActive]}
                >
                  <Text
                    style={[styles.mealChipText, specialMeal === opt.value && styles.mealChipTextActive]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Input
            label="Notes pour l'organisateur"
            value={notes}
            onChangeText={setNotes}
            placeholder="Message optionnel…"
            multiline
            numberOfLines={3}
            style={styles.textarea}
          />

          {customFieldsBlock}
        </View>
      ) : null}

      {!locked ? (
        <Button
          title={submitted ? 'Mettre à jour ma réponse' : 'Envoyer ma réponse'}
          onPress={handleSubmit}
          loading={loading}
        />
      ) : null}
    </View>
  );
}

function ChoiceButton({
  label,
  active,
  onPress,
  tone,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  tone: 'accept' | 'decline';
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.choiceBtn,
        active && tone === 'accept' && styles.choiceAccept,
        active && tone === 'decline' && styles.choiceDecline,
      ]}
    >
      <Text
        style={[
          styles.choiceText,
          active && tone === 'accept' && styles.choiceTextAccept,
          active && tone === 'decline' && styles.choiceTextDecline,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function RsvpCustomField({
  field,
  value,
  onChange,
}: {
  field: RsvpField;
  value: unknown;
  onChange: (val: unknown) => void;
}) {
  if (field.type === 'yes_no' || field.type === 'checkbox') {
    const checked = Boolean(value);
    return (
      <Pressable onPress={() => onChange(!checked)} style={styles.checkRow}>
        <View style={[styles.checkbox, checked && styles.checkboxOn]}>
          {checked ? <Text style={styles.checkmark}>✓</Text> : null}
        </View>
        <Text style={styles.checkLabel}>
          {field.label}
          {field.required ? ' *' : ''}
        </Text>
      </Pressable>
    );
  }

  if (field.type === 'select' || field.type === 'radio') {
    const options = parseFieldOptions(field.options);
    return (
      <View style={styles.mealBlock}>
        <Text style={styles.mealLabel}>
          {field.label}
          {field.required ? ' *' : ''}
        </Text>
        <View style={styles.mealGrid}>
          {options.map((opt) => (
            <Pressable
              key={opt}
              onPress={() => onChange(opt)}
              style={[styles.mealChip, value === opt && styles.mealChipActive]}
            >
              <Text style={[styles.mealChipText, value === opt && styles.mealChipTextActive]}>{opt}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    );
  }

  return (
    <Input
      label={`${field.label}${field.required ? ' *' : ''}`}
      value={value !== undefined && value !== null ? String(value) : ''}
      onChangeText={(text) => onChange(text)}
      placeholder={field.placeholder}
      multiline={field.type === 'textarea'}
      numberOfLines={field.type === 'textarea' ? 3 : 1}
      keyboardType={field.type === 'number' || field.type === 'rating' ? 'numeric' : 'default'}
      style={field.type === 'textarea' ? styles.textarea : undefined}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  choiceRow: {
    flexDirection: 'row',
    gap: 10,
  },
  choiceBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
  },
  choiceAccept: {
    borderColor: '#059669',
    backgroundColor: '#ecfdf5',
  },
  choiceDecline: {
    borderColor: '#e11d48',
    backgroundColor: '#fff1f2',
  },
  choiceText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textMuted,
  },
  choiceTextAccept: {
    color: '#047857',
  },
  choiceTextDecline: {
    color: '#be123c',
  },
  fields: {
    gap: 14,
  },
  mealBlock: {
    gap: 8,
  },
  mealLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  mealGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mealChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#f8fafc',
  },
  mealChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  mealChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  mealChipTextActive: {
    color: colors.primary,
  },
  textarea: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  checkLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
});
