import { validateDraft } from '../core/validation';
import type { ClothingDraft, FieldErrors, ValidationResult } from '../types';

/** The storable shape a successful validation produces. */
export type ValidClothingItem = Extract<ValidationResult, { ok: true }>['value'];

const FIELD_NAMES: (keyof ClothingDraft)[] = ['date', 'item', 'purchase', 'sale'];

/** Local calendar date as `YYYY-MM-DD`. Avoids the UTC shift of `toISOString()`. */
export function todayIso(now: Date = new Date()): string {
  const year = String(now.getFullYear()).padStart(4, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface FormView {
  /** Focuses the first invalid field, or resets the form on success. */
  renderErrors(errors: FieldErrors): void;
  reset(): void;
}

function field(form: HTMLFormElement, name: keyof ClothingDraft): HTMLInputElement {
  const control = form.elements.namedItem(name);
  if (!(control instanceof HTMLInputElement)) {
    throw new Error(`Missing form control: ${name}`);
  }
  return control;
}

/**
 * Owns the add-item form: reads raw strings, delegates all decisions to
 * `validateDraft`, and reports failures inline and accessibly.
 */
export function createFormView(
  form: HTMLFormElement,
  onValid: (value: ValidClothingItem) => void,
): FormView {
  function showErrors(errors: FieldErrors): void {
    for (const name of FIELD_NAMES) {
      const message = errors[name] ?? '';
      const control = field(form, name);
      const errorNode = form.querySelector<HTMLElement>(`#${name}-error`);

      if (errorNode) errorNode.textContent = message;
      if (message) {
        control.setAttribute('aria-invalid', 'true');
      } else {
        control.removeAttribute('aria-invalid');
      }
      control.classList.toggle('field__control--invalid', Boolean(message));
    }

    const firstInvalid = FIELD_NAMES.find((name) => errors[name]);
    if (firstInvalid) field(form, firstInvalid).focus();
  }

  function reset(): void {
    form.reset();
    field(form, 'date').value = todayIso();
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const draft: ClothingDraft = {
      date: field(form, 'date').value,
      item: field(form, 'item').value,
      purchase: field(form, 'purchase').value,
      sale: field(form, 'sale').value,
    };

    const result = validateDraft(draft);
    if (!result.ok) {
      showErrors(result.errors);
      return;
    }

    showErrors({});
    onValid(result.value);
  });

  // Clear a field's error as soon as the user starts fixing it.
  form.addEventListener('input', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    const name = target.name as keyof ClothingDraft;
    if (!FIELD_NAMES.includes(name)) return;
    if (!target.getAttribute('aria-invalid')) return;
    const errorNode = form.querySelector<HTMLElement>(`#${name}-error`);
    if (errorNode) errorNode.textContent = '';
    target.removeAttribute('aria-invalid');
    target.classList.remove('field__control--invalid');
  });

  reset();

  return {
    renderErrors: showErrors,
    reset,
  };
}