import { html, property } from 'lit-element';
import { concatTruthy } from '../../../utils/concat-truthy';
import { Translatable } from '../../../mixins/translatable';
import { MonthdayPickerChangeEvent } from './MonthdayPickerChangeEvent';

export class MonthdayPicker extends Translatable {
  protected static readonly _allDays = Array.from(new Array(31), (_, i) => i + 1);

  @property({ type: Boolean })
  public disabled = false;

  @property({ type: Array })
  public value: number[] = [];

  protected _getLabelClass(day: number) {
    let base = 'flex items-center justify-center m-xs p-s rounded text-m font-medium ';

    base += 'sm:p-0 sm:h-m sm:w-l ';
    base += this.value.includes(day) ? 'text-base ' : 'bg-shade-5 ';

    if (day < 29) base += this.value.includes(day) ? 'bg-primary' : 'text-primary';
    if (day > 28) base += this.value.includes(day) ? 'bg-error' : 'text-error';

    return base;
  }

  public render() {
    return html`
      <div class="space-y-s">
        <div
          class="flex flex-wrap -mx-xs -mb-xs"
          style="max-width: 364px; font-feature-settings: 'tnum' 1;"
        >
          ${MonthdayPicker._allDays.map(day => {
            return html`
              <label class=${this._getLabelClass(day)}>
                ${day.toLocaleString(this.lang, { minimumIntegerDigits: 2 })}
                <input
                  type="checkbox"
                  class="sr-only"
                  ?disabled=${this.disabled}
                  ?checked=${this.value.includes(day)}
                  @change=${(evt: Event) => this._handleChange(evt, day)}
                />
              </label>
            `;
          })}
        </div>

        ${concatTruthy(
          this.value.length > 0 &&
            html`
              <p class="text-s text-tertiary leading-s">
                ${this._i18n.t('monthday-picker.hint', { days: this.value })}
                ${concatTruthy(
                  [29, 30, 31].some(day => this.value.includes(day)) &&
                    this._i18n.t('monthday-picker.warning')
                )}
              </p>
            `
        )}
      </div>
    `;
  }

  protected _handleChange(evt: Event, day: number) {
    evt.stopPropagation();
    this._toggle(day);
    this._sendChange();
  }

  protected _sendChange() {
    this.dispatchEvent(new MonthdayPickerChangeEvent(this.value));
  }

  protected _toggle(value: number) {
    const index = this.value.indexOf(value);
    this.value = index === -1 ? [...this.value, value] : this.value.filter((_, i) => i !== index);
  }
}