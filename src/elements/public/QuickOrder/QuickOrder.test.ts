import { fixture, expect, html, elementUpdated, oneEvent, aTimeout } from '@open-wc/testing';
import * as sinon from 'sinon';
import { ProductItem, QuickOrder } from './QuickOrder';
import { MockProduct } from '../../../mocks/ProductItem';
import { Dropdown, ErrorScreen } from '../../private/index';

/**
 * Avoid CustomElementsRegistry collisions
 *
 * not using defineCE because lit-html doesn't support dynamic tags by default.
 */
class TestQuickOrder extends QuickOrder {
  public static get scopedElements(): Record<string, unknown> {
    return {
      'x-error-screen': ErrorScreen,
      'vaadin-button': customElements.get('vaadin-button'),
      'x-dropdown': Dropdown,
      'x-product': ProductItem,
    };
  }
}

class TestRegularQuickOrder extends QuickOrder {
  constructor() {
    super();
  }
}

class TestMockProduct extends MockProduct {
  constructor() {
    super();
  }
}

customElements.define('x-product', MockProduct);
customElements.define('quick-order', TestQuickOrder);
customElements.define('quick-order-item', TestMockProduct);
customElements.define('quick-order-regular', TestRegularQuickOrder);

describe('The form should allow new products to be added and removed', async function () {
  it('Should recognize new products added as JS array', async function () {
    const el = await fixture(html`
      <quick-order
        store="test.foxycart.com"
        currency="usd"
        products='[{"name":"Cub Puppy","price":"75.95"},{"name":"Bird Dog","price":"64.95"}]'
      >
      </quick-order>
    `);
    await elementUpdated(el);
    const products = el.querySelectorAll('[product]');
    expect(products).to.have.lengthOf(2);
  });

  it('Should recognize new products added as product item tags', async function () {
    const el = await fixture(html`
      <quick-order currency="usd" store="test.foxycart.com">
        <quick-order-item name="p1" price="10"></quick-order-item>
        <quick-order-item name="p2" price="10"></quick-order-item>
        <quick-order-item name="p3" price="10"></quick-order-item>
      </quick-order>
    `);
    await elementUpdated(el);
    // Products will be found in the DOM even if not recognized by QuickOrder
    // So we check if the price was properly updated
    expect((el as QuickOrder).total).to.equal(30);
  });

  it('Should recognize changes to JS array', async function () {
    const el = await fixture(html`
      <quick-order
        currency="usd"
        store="test.foxycart.com"
        products='[{"name": "p1", "price": "1"}, {"name": "p2", "price": "2"}]'
      ></quick-order>
    `);
    await elementUpdated(el);
    let products = el.querySelectorAll('[product]');
    expect(products).to.have.lengthOf(2);
    // Increase the number of products
    (el as QuickOrder).products = [
      { name: 'p1', price: 1 },
      { name: 'p2', price: 2 },
      { name: 'p3', price: 3 },
    ];
    await elementUpdated(el);
    products = el.querySelectorAll('[product]');
    expect(products).to.have.lengthOf(3);
    // Decrease the number of products
    (el as QuickOrder).products = [(el as QuickOrder).products[0]];
    await elementUpdated(el);
    products = el.querySelectorAll('[product]');
    expect(products).to.have.lengthOf(1);
  });

  it('Should recognize new products added later as product item tags', async function () {
    const el = await formWith2products(10, 10);
    expect((el as QuickOrder).total).to.equal(20);
    const lateProduct = new MockProduct();
    lateProduct.price = 20;
    el.appendChild(lateProduct);
    await elementUpdated(el);
    expect((el as QuickOrder).total).to.equal(40);
  });

  it('Should recognize child products removed from the DOM', async function () {
    const el = await formWith2products(10, 10);
    const toRemove = el.querySelector('#first');
    if (toRemove) {
      el.removeChild(toRemove);
    }
    await elementUpdated(el);
    expect((el as QuickOrder).total).to.equal(10);
  });

  it('Should add new valid products', async function () {
    const el = await formWith2products(10, 10);
    (el as TestQuickOrder).addProducts([{ name: 'p3', price: 10 }]);
    await elementUpdated(el);
    const products = el.querySelectorAll('[product]');
    expect(products).to.exist;
    expect(products.length).to.equal(3);
  });

  it('Should remove products by product id', async function () {
    const el = await formWith2products(10, 10);
    let products = el.querySelectorAll('[product]');
    const pid = (products[0] as MockProduct).pid;
    el.removeProducts([pid]);
    await elementUpdated(el);
    products = el.querySelectorAll('[product]');
    expect(products).to.exist;
    expect(products.length).to.equal(1);
  });

  it('Should provide new products its currency', async function () {
    // Create the QuickOrder instance directly to avoid overrwriting createProduct
    const el = await fixture(html`<quick-order-regular currency="usd"></quick-order-regular>`);
    const p = (el as QuickOrder).createProduct({});
    expect((p as ProductItem).currency).to.equal('usd');
  });

  it('Should listen to changes in child elements', async function () {
    const el = await formWith2products(10, 10);
    await elementUpdated(el);
    const input = document.createElement('input');
    const listener = oneEvent(input, 'change');
    const changeSpy = sinon.spy(el as any, '__productChange');
    el.appendChild(input);
    await elementUpdated(el);
    input.dispatchEvent(new CustomEvent('change', { detail: 'changing' }));
    await listener;
    await aTimeout(3);
    expect(changeSpy.called).to.be.true;
    expect(changeSpy.firstCall.args[0].detail).to.equal('changing');
  });
});

describe('The form should remain valid', async function () {
  let xhr: sinon.SinonFakeXMLHttpRequestStatic;
  let requests: sinon.SinonFakeXMLHttpRequest[];
  let logSpy: sinon.SinonStub;

  beforeEach(function () {
    xhr = sinon.useFakeXMLHttpRequest();
    requests = [];
    xhr.onCreate = (xhr: sinon.SinonFakeXMLHttpRequest) => {
      sinon.stub((xhr as unknown) as XMLHttpRequest, 'send');
      requests.push(xhr);
    };
    logSpy = sinon.stub(console, 'error');
  });

  afterEach(function () {
    xhr.restore();
    logSpy.restore();
  });

  it('Should not send a new order with empty products', async function () {
    const el = await fixture(html`
      <quick-order currency="usd" store="test.foxycart.com">
        <quick-order-item name="p1" price="10.00" quantity="0"></quick-order-item>
        <quick-order-item name="p2" price="10.00" quantity="0"></quick-order-item>
      </quick-order>
    `);
    await elementUpdated(el);
    const submitBtn = el.shadowRoot?.querySelector('[data-testid=submit]');
    expect(submitBtn).to.exist;
    if (submitBtn) {
      (submitBtn as HTMLInputElement).click();
      expect(requests).to.be.empty;
    }
  });

  it('Should not allow negative prices or quantities', async function () {
    const el = await fixture(html`
      <quick-order currency="usd" store="test.foxycart.com">
        <quick-order-item name="p1" price="-10.00"></quick-order-item>
        <quick-order-item name="p2" price="10.00" quantity="-3"></quick-order-item>
        <quick-order-item name="p3" price="10.00" quantity="3"></quick-order-item>
      </quick-order>
    `);
    await elementUpdated(el);
    const submitBtn = el.shadowRoot?.querySelector('[data-testid=submit]');
    expect(submitBtn).to.exist;
    if (submitBtn) {
      logSpy.reset();
      (submitBtn as HTMLInputElement).click();
      interface withSend {
        send?: { args: any[] };
      }
      interface FakeRequest extends sinon.SinonFakeXMLHttpRequest, withSend {}
      const r: FakeRequest = requests[0];
      const fd: FormData = r.send!.args[0][0];
      expect(fd).to.exist;
      if (fd) {
        expect(valuesFromField(fd, 'price').every(v => Number(v) >= 0)).to.be.true;
      }
    }
  });

  interface FrequencyFormatTest {
    it: string;
    frequencies: string[] | null | string;
    logHappens: boolean;
  }
  const frequencyTests: FrequencyFormatTest[] = [
    {
      it: 'Should accept valid frequencies',
      frequencies: ['5d', '10d', '15d', '1m', '1y', '.5m'],
      logHappens: false,
    },
    {
      it: 'Should reject numeric frequencies',
      frequencies: ['5', '10d'],
      logHappens: true,
    },
    {
      it: 'Should reject empty string frequencies',
      frequencies: [''],
      logHappens: true,
    },
    {
      it: 'Should not accept string frequencies, it must be an array',
      frequencies: '5d, 10d',
      logHappens: true,
    },
    {
      it: 'Should not accept null frequency, it must be an array, ',
      frequencies: null,
      logHappens: true,
    },
  ];

  for (const t of frequencyTests) {
    it(t.it, async function () {
      const el = await fixture(html`
        <quick-order
          store="test.foxycart.com"
          currency="usd"
          frequencies="${JSON.stringify(t.frequencies)}"
        >
          <quick-order-item name="p3" price="10.00" quantity="3"></quick-order-item>
        </quick-order>
      `);
      await elementUpdated(el);
      expect(logSpy.calledWith('Invalid frequency')).to.equal(t.logHappens);
    });
  }

  interface DateFormatTest {
    it: string;
    dates: string[];
    dateType: string;
    logMessage: string;
    logHappens: boolean;
  }
  const tomorrow = new Date(new Date().getTime() + 24 * 60 * 60 * 1000);
  const tomorrowStr = tomorrow.toISOString().replace(/(-|T.*)/g, '');
  const dateFormatsTests: DateFormatTest[] = [
    {
      it: 'Should accept valid start date formats',
      dates: ['20201010', '20', '2', '1d', '12w', '2y', '10m'],
      logMessage: 'Invalid start date',
      dateType: 'start',
      logHappens: false,
    },
    {
      it: 'Should not accept invalid start date formats',
      dates: ['202010100', '80', '.5m', 'tomorrow', 'today', '-1'],
      logMessage: 'Invalid start date',
      dateType: 'start',
      logHappens: true,
    },
    {
      it: 'Should accept valid end date formats',
      dates: [tomorrowStr, '20', '2', '1d', '12w', '2y', '10m'],
      logMessage: 'Invalid end date',
      dateType: 'end',
      logHappens: false,
    },
    {
      it: 'Should not accept invalid end date formats',
      dates: ['20191010', '219810100', '80', '.5m', 'tomorrow', '-1'],
      dateType: 'end',
      logMessage: 'Invalid end date',
      logHappens: true,
    },
  ];
  for (const t of dateFormatsTests) {
    it(t.it, async function () {
      for (const d of t.dates) {
        const el = await fixture(html`
          <quick-order
            currency="usd"
            store="test.foxycart.com"
            frequencies='["5d", "10d"]'
            sub_enddate="${t.dateType == 'end' ? d : ''}"
            sub_startdate="${t.dateType == 'start' ? d : ''}"
          >
            <quick-order-item name="p3" price="10.00"></quick-order-item>
          </quick-order>
        `);
        await elementUpdated(el);
        expect(logSpy.calledWith(t.logMessage)).to.equal(t.logHappens);
      }
    });
  }
});

describe('The form should be aware of its products', async function () {
  it('Shows the total price of the products added as tags', async function () {
    const el = await fixture(html`
      <quick-order currency="usd" store="test.foxycart.com">
        <quick-order-item name="p1" price="10.00" quantity="3"></quick-order-item>
        <quick-order-item name="p2" price="10.00" quantity="1"></quick-order-item>
        <quick-order-item name="p3" price="10.00" quantity="2"></quick-order-item>
        <quick-order-item name="p4" price="10.00" quantity="1"></quick-order-item>
      </quick-order>
    `);
    await elementUpdated(el);
    expect((el as QuickOrder).total).to.equal(70);
  });

  it('Shows the total price of the products added as arrays ', async function () {
    const el = await fixture(html`
      <quick-order
        store="test.foxycart.com"
        products='[ {"name": "p1", "price":"10.00"}, {"name": "p2", "price":"10.00"}, {"name": "p3", "price":"10.00", "quantity": "2"}, {"name":"p4","price": "10"} ]'
      >
      </quick-order>
    `);
    await elementUpdated(el);
    expect((el as TestQuickOrder).total).to.equal(50);
  });

  it('Update the total price as quantities change', async function () {
    const el = await fixture(html`
      <quick-order currency="usd" store="test.foxycart.com">
        <quick-order-item name="p1" price="10.00" quantity="3"></quick-order-item>
        <quick-order-item name="p2" price="10.00"></quick-order-item>
        <quick-order-item name="p3" price="10.00" quantity="2"></quick-order-item>
        <quick-order-item name="p4" price="10.00"></quick-order-item>
      </quick-order>
    `);
    await elementUpdated(el);
    expect((el as QuickOrder).total).to.equal(70);
    const firstProduct = el.querySelector('[product]');
    expect(firstProduct).to.exist;
    const m = firstProduct as MockProduct;
    m.quantity = 30;
    m.dispatchEvent(new Event('change'));
    await elementUpdated(el);
    expect((el as QuickOrder).total).to.equal(340);
  });
});

describe('The form should add frequency fields', async function () {
  it('Should provide field to choose frequencies', async function () {
    const el = await fixture(html`
      <quick-order currency="usd" store="test.foxycart.com" frequencies='["1m", "3m"]'>
        <quick-order-item name="p1" price="10.00"></quick-order-item>
      </quick-order>
    `);
    await elementUpdated(el);
    const freqInput = el.shadowRoot?.querySelector('[name=frequency]');
    expect(freqInput).to.exist;
  });
});

describe('The form submits a valid POST to forxycart', async function () {
  const sig64 = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  const signatures = { name: sig64, code: sig64, price: sig64, quantity: sig64 };
  let xhr: sinon.SinonFakeXMLHttpRequestStatic;
  let requests: sinon.SinonFakeXMLHttpRequest[];
  let logSpy: sinon.SinonStub;

  beforeEach(function () {
    xhr = sinon.useFakeXMLHttpRequest();
    requests = [];
    xhr.onCreate = (xhr: sinon.SinonFakeXMLHttpRequest) => {
      sinon.stub((xhr as unknown) as XMLHttpRequest, 'send');
      requests.push(xhr);
    };
    logSpy = sinon.stub(console, 'error');
  });

  afterEach(function () {
    xhr.restore();
    logSpy.restore();
  });

  it('Prepends ids to the products', async function () {
    const el = await formWith2products(10, 10);
    const s = getSubmissionSpy(el as TestQuickOrder, requests);
    expect(s.called).to.equal(true);
    expect(s.callCount).to.equal(1);
    for (const k of s.firstCall.args[0].keys()) {
      expect(k.match(/^\d+:.*$/).index).to.equal(0);
    }
  });

  it('Concatenates signatures', async function () {
    const el = await fixture(html`
      <quick-order currency="usd" store="test.foxycart.com">
        <quick-order-item name="p1" code="MyCode" price="10.00" quantity="3"></quick-order-item>
        <quick-order-item name="p2" code="MyCode2" price="10.00" quantity="1"></quick-order-item>
      </quick-order>
    `);
    await elementUpdated(el);
    const products = el.querySelectorAll('[product]');
    expect(products).to.exist;
    products!.forEach(p => {
      (p as MockProduct).signatures = signatures;
    });
    const s = getSubmissionSpy(el as TestQuickOrder, requests);
    expect(s.called).to.equal(true);
    expect(s.callCount).to.equal(1);
    for (const k of s.firstCall.args[0].keys()) {
      expect(k).to.match(/.*\|\|a{64}$/);
    }
  });

  it('Concatenates open to custom fields', async function () {
    const el = await fixture(html`
      <quick-order currency="usd" store="test.foxycart.com">
        <quick-order-item name="p1" code="MyCode" price="10.00" quantity="3"></quick-order-item>
      </quick-order>
    `);
    const open = { color: true };
    await elementUpdated(el);
    const products = el.querySelectorAll('[product]');
    expect(products).to.exist;
    (signatures as any).color = signatures.name;
    products!.forEach(p => {
      (p as MockProduct).signatures = signatures;
      (p as MockProduct).open = open;
      (p as MockProduct).color = 'blue';
    });
    const s = getSubmissionSpy(el as TestQuickOrder, requests);
    expect(s.callCount).to.equal(1);
    let found = false;
    for (const k of s.firstCall.args[0].keys()) {
      if (k.match(/\d+:color\|\|a{64}\|\|open$/)) {
        found = true;
      }
    }
    expect(found).to.equal(true);
  });

  it('Does not create empty frequency field', async function () {
    const el = await fixture(html`
      <quick-order currency="usd" store="test.foxycart.com" frequencies="">
        <quick-order-item name="p1" code="MyCode" price="10.00" quantity="3"></quick-order-item>
      </quick-order>
    `);
    await elementUpdated(el);
    const frequencyField = el.shadowRoot?.querySelector('[name=frequency]');
    expect(frequencyField).not.to.exist;
  });

  it('Sends valid subscription fields', async function () {
    const el = await fixture(html`
      <quick-order
        currency="usd"
        store="test.foxycart.com"
        frequencies='["1d", "2d", "10d"]'
        sub_startdate="1m"
        sub_enddate="1y"
      >
        <quick-order-item name="p1" code="MyCode" price="10.00" quantity="3"></quick-order-item>
      </quick-order>
    `);
    await elementUpdated(el);
    const frequencyField = el.shadowRoot?.querySelector('[name=frequency]');
    expect(frequencyField).to.exist;
    frequencyField?.dispatchEvent(new CustomEvent('change', { detail: '1d' }));
    await elementUpdated(el);
    const s = getSubmissionSpy(el as TestQuickOrder, requests);
    expect(s.callCount).to.equal(1);
    const fd: FormData = s.firstCall.args[0];
    expect(fd.get('sub_frequency')).to.exist.and.to.equal('1d');
  });

  it('Avoids sending empty subscription fields', async function () {
    const el = await fixture(html`
      <quick-order currency="usd" store="test.foxycart.com" sub_frequency="1m">
        <quick-order-item name="p1" code="MyCode" price="10.00" quantity="3"></quick-order-item>
      </quick-order>
    `);
    await elementUpdated(el);
    const s = getSubmissionSpy(el as TestQuickOrder, requests);
    expect(s.callCount).to.equal(1);
    const fd: FormData = s.firstCall.args[0];
    expect(fd.get('sub_startdate')).not.to.exist;
    expect(fd.get('sub_enddate')).not.to.exist;
  });
});

describe('The form reveals its state to the user', async function () {
  let xhr: sinon.SinonFakeXMLHttpRequestStatic;
  let requests: sinon.SinonFakeXMLHttpRequest[];
  let logSpy: sinon.SinonStub;

  beforeEach(function () {
    xhr = sinon.useFakeXMLHttpRequest();
    requests = [];
    xhr.onCreate = (xhr: sinon.SinonFakeXMLHttpRequest) => {
      sinon.stub((xhr as unknown) as XMLHttpRequest, 'send');
      requests.push(xhr);
    };
    logSpy = sinon.stub(console, 'error');
  });

  afterEach(function () {
    xhr.restore();
    logSpy.restore();
  });

  it('Disables submit button when no product is valid', async function () {
    const el = await fixture(html`
      <quick-order currency="usd" store="test.foxycart.com" frequencies='["1d", "2d", "10d"]'>
        <quick-order-item name="p1" code="MyCode" price="10.00" quantity="0"></quick-order-item>
      </quick-order>
    `);
    await elementUpdated(el);
    expect(el.shadowRoot?.querySelector('[data-testid=submit][disabled]')).to.exist;
  });

  it('Dispataches event upon server response', async function () {
    const el = await fixture(html`
      <quick-order currency="usd" store="test.foxycart.com" frequencies='["1d", "2d", "10d"]'>
        <quick-order-item name="p1" price="10.00"></quick-order-item>
      </quick-order>
    `);
    await elementUpdated(el);
    const callback = sinon.spy();
    el.addEventListener('load', callback);
    const listener = oneEvent(el, 'load');
    getSubmissionSpy(el as TestQuickOrder, requests);
    requests[0].respond(200, { 'Content-Type': 'application/json' }, '[1,2]');
    await listener;
    expect(callback.called).to.be.true;
  });
});

/** Helper functions **/

async function formWith2products(price1: number, price2: number) {
  const el = await fixture(html`
    <quick-order currency="usd" store="test.foxycart.com">
      <quick-order-item id="first" name="p1" price="${price1}"></quick-order-item>
      <quick-order-item id="second" name="p2" price="${price2}"></quick-order-item>
    </quick-order>
  `);
  await elementUpdated(el);
  return el as TestQuickOrder;
}

/**
 * Returns FormDataEntryValues for fields with a particular name, following
 * FoxyCart convention
 */
function valuesFromField(formData: FormData, name: string): FormDataEntryValue[] {
  const re = new RegExp(`\\d+:${name}(||.*)?`);
  const values: FormDataEntryValue[] = [];
  formData.forEach((value, key) => {
    if (key.match(re)) {
      values.push(value);
    }
  });
  return values;
}

function getSubmissionSpy(
  el: TestQuickOrder,
  requests: sinon.SinonFakeXMLHttpRequest[]
): sinon.SinonSpy {
  const submitBtn = el.shadowRoot?.querySelector('[data-testid=submit]');
  expect(submitBtn, '1').to.exist;
  (submitBtn! as HTMLInputElement).click();
  expect(requests[0], '2').to.exist;
  const r = requests[0];
  expect(r.method).to.equal('POST');
  const s: sinon.SinonSpy = (r as any).send;
  return s;
}
