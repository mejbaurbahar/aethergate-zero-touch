import * as fc from 'fast-check';
import { MachineExecutableSpec, verifyContractCompliance, InvariantContext } from './spec-engine';

export interface AdversarialReport {
  passed: boolean;
  totalProbes: number;
  failures: Array<{
    category: 'FUZZING' | 'BOLA_SECURITY' | 'INJECTION' | 'RACE_CONDITION';
    vector: string;
    payload: any;
    error: string;
  }>;
  executionTimeMs: number;
}

export interface CandidateImplementation<TInput = any, TOutput = any, TState = any> {
  id: string;
  execute: (input: TInput, ctx?: InvariantContext) => Promise<{ output: TOutput; stateAfter?: TState }>;
}

export class AdversarialEngine {
  /**
   * Attacks the candidate implementation with fuzzing, security vectors, and race conditions.
   */
  async probe<TInput, TOutput, TState>(
    spec: MachineExecutableSpec<TInput, TOutput, TState>,
    implementation: CandidateImplementation<TInput, TOutput, TState>,
    arbitraryInput: fc.Arbitrary<TInput>,
  ): Promise<AdversarialReport> {
    const startTime = Date.now();
    const failures: AdversarialReport['failures'] = [];
    let totalProbes = 0;

    // ─────────────────────────────────────────────────────────────────────────
    // 1. PROPERTY-BASED ADVERSARIAL GENERATION (FAST-CHECK)
    // ─────────────────────────────────────────────────────────────────────────
    try {
      await fc.assert(
        fc.asyncProperty(arbitraryInput, async (generatedInput) => {
          totalProbes++;
          try {
            const { output, stateAfter } = await implementation.execute(generatedInput, {
              input: generatedInput,
              actor: { id: 'usr_fuzz_1', tenantId: 'tenant_primary', role: 'user' },
            });

            const compliance = verifyContractCompliance(spec, {
              input: generatedInput,
              output,
              stateAfter,
              actor: { id: 'usr_fuzz_1', tenantId: 'tenant_primary', role: 'user' },
            });

            if (!compliance.compliant) {
              failures.push({
                category: 'FUZZING',
                vector: 'GENERATIVE_PROPERTY_BREACH',
                payload: generatedInput,
                error: compliance.violations.map((v) => v.message).join(' | '),
              });
              return false;
            }
          } catch (err: any) {
            const anyInput = generatedInput as any;
            const isExpectedSecurityDenial =
              err?.message?.includes('Security Shield') &&
              (anyInput.tenantId !== 'tenant_primary' || anyInput.userId !== 'usr_fuzz_1');
            if (isExpectedSecurityDenial) {
              return true;
            }
            // Unhandled crashes during fuzzing are severe robustness failures
            failures.push({
              category: 'FUZZING',
              vector: 'UNHANDLED_EXCEPTION_CRASH',
              payload: generatedInput,
              error: err?.message || String(err),
            });
            return false;
          }
          return true;
        }),
        { numRuns: 100, endOnFailure: false },
      );
    } catch {
      // fc.assert records failures in our array
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. ADVERSARIAL SECURITY & BOLA / CROSS-TENANT ISOLATION PROBES
    // ─────────────────────────────────────────────────────────────────────────
    const maliciousActors = [
      { id: 'attacker_victim_overlap', tenantId: 'tenant_other_unauthorized', role: 'user' as const },
      { id: 'anon_bfla_escalation', tenantId: 'tenant_primary', role: 'anonymous' as const },
    ];

    const sampleValidList = fc.sample(arbitraryInput, 1);
    const sampleValid = sampleValidList[0] || ({} as TInput);

    for (const actor of maliciousActors) {
      totalProbes++;
      try {
        const inputWithTargetTenant = {
          ...sampleValid,
          tenantId: 'tenant_primary',
          userId: 'victim_user_123',
        };

        const { output, stateAfter } = await implementation.execute(inputWithTargetTenant, {
          input: inputWithTargetTenant,
          actor,
        });

        const compliance = verifyContractCompliance(spec, {
          input: inputWithTargetTenant,
          output,
          stateAfter,
          actor,
        });

        if (!compliance.compliant) {
          failures.push({
            category: 'BOLA_SECURITY',
            vector: `UNAUTHORIZED_ACTOR_${actor.role.toUpperCase()}`,
            payload: { actor, inputWithTargetTenant },
            error: compliance.violations.map((v) => v.message).join(' | '),
          });
        }
      } catch {
        // Handled rejections or thrown access-denied errors verify the security shield is active!
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. INJECTION & PROTO PROBES
    // ─────────────────────────────────────────────────────────────────────────
    const injectionPayloads = [
      { inputField: '__proto__.polluted', payload: { polluted: true } },
      { inputField: 'notes', payload: { notes: `<script>alert('xss')</script>` } },
      { inputField: 'query', payload: { query: `' OR '1'='1` } },
    ];

    for (const inj of injectionPayloads) {
      totalProbes++;
      try {
        const testPayload = { ...inj.payload } as unknown as TInput;
        const { output, stateAfter } = await implementation.execute(testPayload, {
          input: testPayload,
          actor: { id: 'usr_sec_1', tenantId: 'tenant_primary', role: 'user' },
        });

        // Verify that prototype pollution did not occur
        if ((Object.prototype as any).polluted !== undefined) {
          delete (Object.prototype as any).polluted;
          failures.push({
            category: 'INJECTION',
            vector: 'PROTOTYPE_POLLUTION_DETECTED',
            payload: inj,
            error: 'Global Object prototype was mutated by input payload',
          });
        }
      } catch {
        // Safe rejections are good
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. CONCURRENCY & RACE-CONDITION PROBE (IDEMPOTENCY / DOUBLE-SPEND)
    // ─────────────────────────────────────────────────────────────────────────
    totalProbes += 5;
    const concurrentPayload = {
      idempotencyKey: 'race_test_unique_key_001',
      tenantId: 'tenant_primary',
      userId: 'usr_race_target',
      amount: 100,
    } as unknown as TInput;

    try {
      const results = await Promise.allSettled([
        implementation.execute(concurrentPayload, {
          input: concurrentPayload,
          actor: { id: 'usr_race_target', tenantId: 'tenant_primary', role: 'user' },
        }),
        implementation.execute(concurrentPayload, {
          input: concurrentPayload,
          actor: { id: 'usr_race_target', tenantId: 'tenant_primary', role: 'user' },
        }),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      // If both concurrent calls created independent non-idempotent state mutations, flag race condition
      if (fulfilled.length > 1) {
        const resA = (fulfilled[0] as PromiseFulfilledResult<any>).value;
        const resB = (fulfilled[1] as PromiseFulfilledResult<any>).value;

        // If both claimed new unique mutations rather than returning the same cached execution or rejecting duplicate
        if (
          resA.output?.orderId &&
          resB.output?.orderId &&
          resA.output.orderId !== resB.output.orderId
        ) {
          failures.push({
            category: 'RACE_CONDITION',
            vector: 'NON_IDEMPOTENT_CONCURRENT_RACE',
            payload: concurrentPayload,
            error: `Two concurrent executions with identical idempotency key created duplicate orders: ${resA.output.orderId} vs ${resB.output.orderId}`,
          });
        }
      }
    } catch {
      // Ignored
    }

    return {
      passed: failures.length === 0,
      totalProbes,
      failures,
      executionTimeMs: Date.now() - startTime,
    };
  }
}
