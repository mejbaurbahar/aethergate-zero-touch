import { describe, it, expect } from 'vitest';
import { MutationEngine } from '../src/core/mutation-engine';
import {
  EcommerceCheckoutSpec,
  checkoutMutants,
  CheckoutInput,
} from '../src/scenarios/ecommerce-checkout';
import { CandidateImplementation } from '../src/core/adversarial-engine';

describe('AetherGate MutationEngine', () => {
  it('kills 100% of injected mutants on a compliant implementation', async () => {
    const engine = new MutationEngine(85);

    // Clean reference implementation
    const cleanImpl: CandidateImplementation<any, any> = {
      id: 'impl_clean_reference',
      execute: async (input: CheckoutInput, ctx?: any) => {
        if (ctx?.actor && input?.tenantId && ctx.actor.tenantId !== input.tenantId) {
          throw new Error('Access Denied');
        }
        const subtotal = input.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const discountApplied = input.couponCode ? 5.0 : 0.0;
        const finalTotal = subtotal - discountApplied + input.shippingFee;
        const raw = String(input.customerPhone);
        const customerPhone = `${raw.slice(0, 4)}XXXXXX${raw.slice(-3)}`;

        return {
          output: {
            orderId: 'NRJ-99999',
            status: 'CONFIRMED',
            subtotal,
            discountApplied,
            shippingFee: input.shippingFee,
            finalTotal,
            currency: input.currency,
            customerPhone,
            promotionalMessage: input.couponCode ? 'Valid Discount' : null,
          },
        };
      },
    };

    const sampleTestCases: Array<{ input: CheckoutInput; actor?: any }> = [
      {
        input: {
          tenantId: 'tenant_primary',
          userId: 'usr_fuzz_1',
          customerPhone: '01987445646',
          items: [{ id: 'item_1', name: 'Shirt', price: 20, quantity: 1 }],
          shippingFee: 0,
          currency: 'USD',
          idempotencyKey: 'idem_key_001',
        },
        actor: { id: 'usr_fuzz_1', tenantId: 'tenant_primary', role: 'user' },
      },
      {
        input: {
          tenantId: 'tenant_primary',
          userId: 'usr_victim',
          customerPhone: '01987445646',
          items: [{ id: 'item_1', name: 'Shirt', price: 20, quantity: 1 }],
          shippingFee: 0,
          currency: 'USD',
          idempotencyKey: 'idem_key_002',
        },
        actor: { id: 'hacker', tenantId: 'tenant_malicious', role: 'user' },
      },
    ];

    const report = await engine.evaluate(
      EcommerceCheckoutSpec,
      cleanImpl,
      checkoutMutants,
      sampleTestCases,
    );

    expect(report.passed).toBe(true);
    expect(report.mutationScore).toBe(100);
    expect(report.killedMutants).toBe(4);
    expect(report.survivedMutants).toBe(0);
  });
});
