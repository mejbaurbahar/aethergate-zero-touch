import { describe, it, expect } from 'vitest';
import { ReflexLoop } from '../src/core/reflex-loop';
import {
  EcommerceCheckoutSpec,
  FlawedAICandidateImplementation,
  CheckoutInput,
} from '../src/scenarios/ecommerce-checkout';

describe('AetherGate ReflexLoop (Self-Healing)', () => {
  it('autonomously triangulates root causes and heals flawed candidate without human intervention', async () => {
    const reflex = new ReflexLoop(3);

    const sampleTestCases: Array<{ input: CheckoutInput; actor?: any }> = [
      {
        input: {
          tenantId: 'tenant_primary',
          userId: 'usr_fuzz_1',
          customerPhone: '01987445646',
          items: [{ id: 'item_1', name: 'Summer Linen Shirt', price: 24.99, quantity: 1 }],
          shippingFee: 0,
          currency: 'USD',
          idempotencyKey: 'idem_key_001',
        },
        actor: { id: 'usr_fuzz_1', tenantId: 'tenant_primary', role: 'user' },
      },
    ];

    const result = await reflex.heal(
      EcommerceCheckoutSpec,
      FlawedAICandidateImplementation,
      sampleTestCases,
      [],
    );

    expect(result.healed).toBe(true);
    expect(result.humanInterventionsRequired).toBe(0);
    expect(result.healedImplementation).toBeDefined();
    expect(result.attempts.length).toBeGreaterThanOrEqual(1);

    // Verify the healed output no longer leaks unmasked phone or applies false discounts
    const healedOutput = await result.healedImplementation!.execute(sampleTestCases[0].input, {
      input: sampleTestCases[0].input,
      actor: sampleTestCases[0].actor,
    });

    expect(healedOutput.output.discountApplied).toBe(0);
    expect(healedOutput.output.promotionalMessage).toBeNull();
    expect(healedOutput.output.customerPhone).toContain('XXXXXX');
  });
});
