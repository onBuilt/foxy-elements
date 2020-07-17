import '@vaadin/vaadin-text-field/vaadin-text-field';
import { html, property } from 'lit-element';
import { Translatable } from '../../../../../mixins/translatable';
import { MonthdayPicker, WeekdayPicker, Choice } from '../../../../private/index';
import { AllowedDaysChangeEvent } from './AllowedDaysChangeEvent';

import {
  WeekdayPickerChangeEvent,
  MonthdayPickerChangeEvent,
  ChoiceChangeEvent,
} from '../../../../private/events';

export interface Rule {
  type: 'day' | 'month';
  days: number[];
}

export class AllowedDays extends Translatable {
  public static get scopedElements() {
    return {
      'x-monthday-picker': MonthdayPicker,
      'x-weekday-picker': WeekdayPicker,
      'x-choice': Choice,
    };
  }

  private readonly __items = ['all', 'month', 'day'] as const;

  private get __choice() {
    return this.__items[this.value === undefined ? 0 : this.value.type === 'month' ? 1 : 2];
  }

  @property({ type: Boolean })
  public disabled = false;

  @property({ type: Object })
  public value?: Rule;

  public constructor() {
    super('customer-portal-settings');
  }

  public render() {
    return html`
      <x-choice
        data-testid="choice"
        .value=${this.__choice}
        .items=${this.__items}
        .disabled=${this.disabled}
        .getText=${this.__getText.bind(this)}
        @change=${this.__handleChoiceChange}
      >
        ${this.value?.type === 'month'
          ? html`
              <x-monthday-picker
                slot="month"
                data-testid="monthday-picker"
                .lang=${this.lang}
                .disabled=${this.disabled}
                .value=${this.value.days}
                @change=${this.__handleNewValueChange}
              >
              </x-monthday-picker>
            `
          : this.value?.type === 'day'
          ? html`
              <x-weekday-picker
                slot="day"
                data-testid="weekday-picker"
                .lang=${this.lang}
                .disabled=${this.disabled}
                .value=${this.value.days}
                @change=${this.__handleNewValueChange}
              >
              </x-weekday-picker>
            `
          : ''}
      </x-choice>
    `;
  }

  private __handleNewValueChange(evt: WeekdayPickerChangeEvent | MonthdayPickerChangeEvent) {
    this.value!.days = evt.detail;
    this.__sendChange();
  }

  private __handleChoiceChange(evt: ChoiceChangeEvent) {
    this.value =
      evt.detail === this.__items[0]
        ? undefined
        : evt.detail === this.__items[1]
        ? { type: 'month', days: [] }
        : { type: 'day', days: [] };

    this.__sendChange();
  }

  private __sendChange() {
    this.dispatchEvent(new AllowedDaysChangeEvent(this.value));
  }

  private __getText(value: string) {
    return this._i18n.t(`ndmod.${value}`);
  }
}