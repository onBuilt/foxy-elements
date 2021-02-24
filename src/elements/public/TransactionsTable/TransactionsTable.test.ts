import './index';

import { Data } from './types';
import { I18nElement } from '../I18n';
import { TransactionsTableElement } from './TransactionsTableElement';
import { expect } from '@open-wc/testing';
import { generateTests } from '../NucleonElement/generateTests';

type Refs = {
  summaries: I18nElement[];
  statuses: I18nElement[];
  wrapper: HTMLDivElement;
  totals: I18nElement[];
  dates: I18nElement[];
  links: HTMLAnchorElement[];
  i18n: HTMLElement[];
  ids: HTMLSpanElement[];
};

describe('TransactionsTable', () => {
  generateTests<Data, TransactionsTableElement, Refs>({
    parent: 'https://demo.foxycart.com/s/admin/stores/0/transactions?customer_id=0&zoom=items',
    href: 'https://demo.foxycart.com/s/admin/stores/0/transactions?customer_id=0&zoom=items',
    tag: 'foxy-transactions-table',
    isEmptyValid: true,
    maxTestsPerState: 5,
    assertions: {
      busy({ refs, element }) {
        expect(refs.wrapper).to.have.attribute('aria-busy', 'true');
        refs.i18n?.forEach(ref => expect(ref).to.have.attribute('lang', element.lang));
      },

      fail({ refs, element }) {
        expect(refs.wrapper).to.have.attribute('aria-busy', 'false');
        refs.i18n?.forEach(ref => expect(ref).to.have.attribute('lang', element.lang));
      },

      idle({ refs, element }) {
        expect(refs.wrapper).to.have.attribute('aria-busy', 'false');
        refs.i18n?.forEach(ref => expect(ref).to.have.attribute('lang', element.lang));

        element.data?._embedded['fx:transactions'].forEach((transaction, index) => {
          const summaryRef = refs.summaries[index];
          const statusRef = refs.statuses[index];
          const totalRef = refs.totals[index];
          const dateRef = refs.dates[index];
          const linkRef = refs.links[index];
          const idRef = refs.ids[index];

          expect(statusRef).to.have.attribute('key', `status_${transaction.status}`);
          expect(dateRef).to.have.attribute('key', 'date');
          expect(dateRef).to.have.deep.property('opts', { value: transaction.transaction_date });
          expect(linkRef).to.have.attribute('href', transaction._links['fx:receipt'].href);
          expect(idRef).to.contain.text(transaction.id.toString());

          {
            const items = transaction._embedded['fx:items'];
            const opts = {
              most_expensive_item: [...items].sort((a, b) => a.price - b.price)[0],
              count: items.length,
            };

            expect(summaryRef).to.have.attribute('key', 'summary');
            expect(summaryRef).to.have.deep.property('opts', opts);
          }

          {
            const value = `${transaction.total_order} ${transaction.currency_code}`;

            expect(totalRef).to.have.attribute('key', 'total');
            expect(totalRef).to.have.deep.property('opts', { value });
          }
        });
      },
    },
  });
});
