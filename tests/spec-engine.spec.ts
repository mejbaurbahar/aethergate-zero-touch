import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { MachineExecutableSpec, verifyContractCompliance } from '../src/core/spec-engine';

describe('AetherGate SpecEngine', () => {
  const dummySpec: MachineExecutableSpec<{ amount: number }, { balance: number }> = {
    id: 'test_spec_01',
    name: 'Balance Spec',
    version: '1.0.0',
    domain: 'Finance',
    inputSchema: z.object({ amount: z.number().positive() }),
    outputSchema: z.object({ balance: z.number().nonnegative() }),
    preconditions: [
      {
        name: 'POSITIVE_AMOUNT',
        check: (input) => input.amount > 0,
        failMessage: 'Amount must be strictly positive',
      },
    ],
    postconditions: [
      {
        name: 'NON_NEGATIVE_BALANCE',
        check: (_input, output) => output.balance >= 0,
        failMessage: 'Balance cannot be negative',
      },
    ],
    invariants: [
      {
        id: 'INV_SOLVENCY',
        name: 'Solvency Invariant',
        severity: 'CRITICAL',
        description: 'Account balance must never drop below 0',
        validate: (ctx) => ({
          passed: (ctx.output?.balance ?? 0) >= 0,
          code: 'SOLVENCY_OK',
          message: 'Solvent',
        }),
      },
    ],
    securityPolicies: [
      {
        id: 'SEC_USER_ISOLATION',
        type: 'BOLA',
        description: 'Tenant match check',
        verify: (ctx) => ({
          passed: ctx.actor?.tenantId === 'tenant_1',
          code: 'TENANT_MATCH',
          message: 'Tenant check verified',
        }),
      },
    ],
  };

  it('verifies compliant execution cleanly', () => {
    const res = verifyContractCompliance(dummySpec, {
      input: { amount: 50 },
      output: { balance: 100 },
      actor: { id: 'u1', tenantId: 'tenant_1', role: 'user' },
    });

    expect(res.compliant).toBe(true);
    expect(res.violations).toHaveLength(0);
  });

  it('rejects schema violation when input is negative', () => {
    const res = verifyContractCompliance(dummySpec, {
      input: { amount: -20 },
      output: { balance: 100 },
      actor: { id: 'u1', tenantId: 'tenant_1', role: 'user' },
    });

    expect(res.compliant).toBe(false);
    expect(res.violations[0].type).toBe('SCHEMA_VIOLATION');
  });

  it('detects BOLA security violation when tenant mismatches', () => {
    const res = verifyContractCompliance(dummySpec, {
      input: { amount: 10 },
      output: { balance: 20 },
      actor: { id: 'attacker', tenantId: 'tenant_hacker', role: 'user' },
    });

    expect(res.compliant).toBe(false);
    expect(res.violations.some((v) => v.type === 'SECURITY_BOLA')).toBe(true);
  });
});
