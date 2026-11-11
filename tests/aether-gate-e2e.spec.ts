import { describe, it, expect } from 'vitest';
import { AetherGate } from '../src/core/aether-gate';
import {
  EcommerceCheckoutSpec,
  FlawedAICandidateImplementation,
  arbitraryCheckoutInput,
  checkoutMutants,
  CheckoutInput,
} from '../src/scenarios/ecommerce-checkout';

describe('AetherGate End-to-End Pipeline', () => {
  it('executes full zero-touch release with sub-1-hour lead time and zero human touch', async () => {
    const gate = new AetherGate();

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
      {
        input: {
          tenantId: 'tenant_primary',
          userId: 'victim_user_123',
          customerPhone: '01711223344',
          items: [{ id: 'item_2', name: 'Silk Scarf', price: 15.0, quantity: 2 }],
          shippingFee: 10,
          currency: 'USD',
          idempotencyKey: 'idem_key_002',
        },
        actor: { id: 'attacker_foreign', tenantId: 'tenant_other_hacker', role: 'user' },
      },
    ];

    const result = await gate.evaluateRelease({
      spec: EcommerceCheckoutSpec,
      candidateImplementation: FlawedAICandidateImplementation,
      arbitraryInput: arbitraryCheckoutInput,
      sampleTestCases,
      mutants: checkoutMutants,
      enableSelfHealing: true,
    });

    // 1. Engineering Goal 1: Sub-One-Hour Lead Time
    expect(result.totalLeadTimeMs).toBeLessThan(3600 * 1000); // Must be < 1 hr (actual is < 1s!)
    expect(result.attestation.leadTime.subOneHourTargetMet).toBe(true);

    // 2. Engineering Goal 2: Near-Zero Human Intervention
    expect(result.attestation.qualityMetrics.humanInterventionsRequired).toBe(0);
    expect(result.attestation.qualityMetrics.nearZeroInterventionTargetMet).toBe(true);

    // 3. Self-Healing verification
    expect(result.stageResults.selfHealing.triggered).toBe(true);
    expect(result.stageResults.selfHealing.healed).toBe(true);

    // 4. Security & Mutation Hardening
    expect(result.stageResults.mutationHardening.score).toBeGreaterThanOrEqual(85);
    expect(result.stageResults.adversarialProbing.failuresCount).toBe(0);

    // 5. Final Release Attestation
    expect(result.attestation.status).toBe('VERIFIED_FOR_ZERO_TOUCH_RELEASE');
    expect(result.attestation.verdict).toBe('AUTONOMOUS_PASS');
    expect(result.attestation.provenance.cryptographicSeal).toBeDefined();
  });
});
