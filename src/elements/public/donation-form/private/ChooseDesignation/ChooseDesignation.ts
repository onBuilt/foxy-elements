import { LitElement, html, customElement, property, query } from 'lit-element';
import { Translatable } from '../../../../../mixins/translatable';

/**
 * An element to select a value for donation
 *
 * @slot - This element has a slot
 * @csspart button - The button
 */
export class ChooseDesignation extends Translatable {
  @property({ type: String })
  name = 'value';

  @property({ type: String })
  label = '';

  @property({ type: String })
  inputType = 'checkbox';

  designationOptions: string[] = [];

  // Is the "Other field active"?
  activeOther = false;

  // Should there be a "Other" field?
  @property({ type: Boolean })
  hasValueOther = false;

  @property({ type: Array })
  value: string[] = [];

  @query('#foxy-select-designations')
  selectDesignations: any;

  @query('vaadin-text-field')
  input?: HTMLInputElement;

  updated() {
    this.dispatchEvent(new Event('change'));
  }

  firstUpdated() {
    this.selectDesignations.addEventListener(
      'selected-values-changed',
      this.handleValue.handleEvent
    );
  }

  handleValue = {
    handleEvent: () => {
      if (this.selectDesignations.value) {
        // Verify that "other" field is checked
        this.activeOther = this.selectDesignations.value.includes('other');
        // Rebuilds this.value with the value
        this.value = [].concat(this.selectDesignations.value.filter((i: string) => i != 'other'));
        // Includes the value from "other"
        if (this.activeOther) {
          this.value.push(this.input!.value);
        }
      } else if (this.selectDesignations.selectedValues) {
        this.activeOther = !!this.selectDesignations.selectedValues.find(
          (i: number) => i == this.designationOptions.length
        );
        this.value = this.selectDesignations.selectedValues.map(
          (i: number) => this.designationOptions[i] || this.input?.value
        );
      }
    },
  };

  render() {
    return html`
      <slot></slot>

      ${this.designationOptions.length
        ? this.inputType == 'select'
          ? this.renderSelect()
          : this.renderRadio()
        : ''}

      <vaadin-text-field
        ?hidden=${!this.activeOther}
        type="text"
        label=${this._i18n.t('Other:')}
        name="other"
        placeholder=${this._i18n.t('Enter a custom designation')}
        @change=${this.handleValue}
      ></vaadin-text-field>
    `;
  }

  renderSelect() {
    return html`
      <vaadin-list-box id="foxy-select-designations" multiple>
        <label>${this.label}</label>
        ${this.designationOptions.map(o => html`<vaadin-item value="${o}">${o}</vaadin-item>`)}
        <vaadin-item value="other">Other</vaadin-item>
      </vaadin-list-box>
    `;
  }
  renderRadio() {
    return html`
      <vaadin-checkbox-group
        id="foxy-select-designations"
        @change=${this.handleValue}
        theme="vertical"
        label="${this.label}"
      >
        ${this.designationOptions.map(
          (o, index) =>
            html`<vaadin-checkbox value="${o}" ?checked=${index == 0 ? 1 : 0}>
              ${o}
            </vaadin-checkbox>`
        )}
        ${this.hasValueOther
          ? html`<vaadin-checkbox value="other">${this._i18n.t('Other')}</vaadin-checkbox>`
          : ''}
      </vaadin-checkbox-group>
    `;
  }
}
