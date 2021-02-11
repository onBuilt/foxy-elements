import { ScopedElementsMap, ScopedElementsMixin } from '@open-wc/scoped-elements';
import { CSSResult, CSSResultArray } from 'lit-element';
import { html, TemplateResult } from 'lit-html';
import { Primitive } from 'lit-html/lib/parts';
import { Skeleton } from '..';
import { Themeable } from '../../../mixins/themeable';
import { addBreakpoints } from '../../../utils/add-breakpoints';
import { classMap } from '../../../utils/class-map';
import { NucleonElement } from '../../public/NucleonElement/index';

export type Collection<TCurie extends string = any, TResource = any> = {
  readonly _links: Record<'next' | 'self', { href: string }>;
  readonly _embedded: Record<TCurie, readonly TResource[]>;
  readonly total_items: number;
  readonly returned_items: number;
  readonly offset: number;
  readonly limit: number;
};

export interface Column<T extends Collection> {
  mdAndUp?: boolean;
  header: () => TemplateResult | Primitive;
  cell: (resource: T['_embedded'][keyof T['_embedded']][number]) => TemplateResult | Primitive;
}

export abstract class NucleonTableElement<TData extends Collection> extends ScopedElementsMixin(
  NucleonElement
)<TData> {
  static get scopedElements(): ScopedElementsMap {
    return {
      'x-skeleton': Skeleton,
      'foxy-i18n': customElements.get('foxy-i18n'),
    };
  }

  static get styles(): CSSResult | CSSResultArray {
    return Themeable.styles;
  }

  private __removeBreakpoints?: () => void;

  connectedCallback(): void {
    super.connectedCallback();
    this.__removeBreakpoints = addBreakpoints(this);
  }

  render(columns?: Column<TData>[]): TemplateResult {
    const { state } = this;
    const data = state.context.data;

    return html`
      <div class="relative" aria-busy=${state.matches('busy')} aria-live="polite">
        ${!state.matches('idle')
          ? html`
              <div class="divide-y divide-contrast-10">
                ${new Array(this._getLimit()).fill(0).map(() => {
                  return html`
                    <div class="h-l flex items-center">
                      <x-skeleton
                        class="w-full"
                        variant=${state.matches('fail') ? 'error' : 'busy'}
                      >
                        &nbsp;
                      </x-skeleton>
                    </div>
                  `;
                })}
              </div>
            `
          : html`
              <table class="w-full">
                <thead class="sr-only">
                  <tr>
                    ${columns?.map(column => {
                      return html`
                        <th class=${classMap({ 'hidden md:table-cell': !!column.mdAndUp })}>
                          ${column.header()}
                        </th>
                      `;
                    })}
                  </tr>
                </thead>

                <tbody class="divide-y divide-contrast-10 ">
                  ${Object.values(data?._embedded ?? {}).map(embeds => {
                    return embeds.map(resource => {
                      return html`
                        <tr>
                          ${columns?.map((column, columnIndex) => {
                            return html`
                              <td
                                class=${classMap({
                                  'truncate h-l font-lumo text-body text-m': true,
                                  'hidden md:table-cell': !!column.mdAndUp,
                                  'text-right': columnIndex === columns.length - 1,
                                })}
                              >
                                ${column.cell(resource)}
                              </td>
                            `;
                          })}
                        </tr>
                      `;
                    });
                  })}
                </tbody>
              </table>
            `}
      </div>
    `;
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.__removeBreakpoints?.();
  }

  protected _getLimit(): number {
    const defaultLimit = 20;

    try {
      const strLimit = new URL(this.href ?? '').searchParams.get('limit');
      const intLimit = strLimit ? parseInt(strLimit) : defaultLimit;
      return isNaN(intLimit) ? defaultLimit : intLimit;
    } catch {
      return defaultLimit;
    }
  }
}
