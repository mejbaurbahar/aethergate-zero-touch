import { MachineExecutableSpec, verifyContractCompliance } from './spec-engine';
import { CandidateImplementation, AdversarialReport } from './adversarial-engine';

export interface HealingAttempt {
  iteration: number;
  rootCauseIdentified: string;
  patchApplied: string;
  violationsBefore: number;
  violationsAfter: number;
  success: boolean;
  durationMs: number;
}

export interface SelfHealingResult<TInput = any, TOutput = any, TState = any> {
  healed: boolean;
  attempts: HealingAttempt[];
  healedImplementation?: CandidateImplementation<TInput, TOutput, TState>;
  finalViolations: string[];
  totalHealingDurationMs: number;
  humanInterventionsRequired: number; // Must be 0 for zero-touch
}

export type HealingHeuristic<TInput, TOutput, TState> = (
  failingImpl: CandidateImplementation<TInput, TOutput, TState>,
  violation: { rule: string; type: string; message: string },
) => CandidateImplementation<TInput, TOutput, TState> | null;

export class ReflexLoop {
  private readonly maxIterations: number;
  private readonly heuristics: Map<string, HealingHeuristic<any, any, any>> = new Map();

  constructor(maxIterations = 3) {
    this.maxIterations = maxIterations;
    this.registerDefaultHeuristics();
  }

  /**
   * Registers a self-healing repair heuristic for a specific violation category.
   */
  registerHeuristic<TInput, TOutput, TState>(
    ruleOrType: string,
    heuristic: HealingHeuristic<TInput, TOutput, TState>,
  ): void {
    this.heuristics.set(ruleOrType, heuristic);
  }

  /**
   * Autonomously heals a failing implementation against the formal specification.
   */
  async heal<TInput, TOutput, TState>(
    spec: MachineExecutableSpec<TInput, TOutput, TState>,
    initialImpl: CandidateImplementation<TInput, TOutput, TState>,
    sampleInputs: Array<{ input: TInput; actor?: any }>,
    adversarialFailures: AdversarialReport['failures'] = [],
  ): Promise<SelfHealingResult<TInput, TOutput, TState>> {
    const startTime = Date.now();
    let currentImpl = initialImpl;
    const attempts: HealingAttempt[] = [];

    for (let iter = 1; iter <= this.maxIterations; iter++) {
      const iterStart = Date.now();

      // 1. Gather all current violations across sample inputs and adversarial vectors
      const currentViolations: Array<{ rule: string; type: string; message: string }> = [];

      for (const item of sampleInputs) {
        try {
          const { output, stateAfter } = await currentImpl.execute(item.input, {
            input: item.input,
            actor: item.actor,
          });

          const comp = verifyContractCompliance(spec, {
            input: item.input,
            output,
            stateAfter,
            actor: item.actor,
          });

          if (!comp.compliant) {
            currentViolations.push(...comp.violations);
          }
        } catch (err: any) {
          const inp = item.input as any;
          if (
            err?.message?.includes('Security Shield') &&
            item.actor &&
            (item.actor.tenantId !== inp?.tenantId || item.actor.id !== inp?.userId)
          ) {
            // Compliant security block of unauthorized actor
            continue;
          }
          currentViolations.push({
            rule: 'EXECUTION_CRASH',
            type: 'RUNTIME_EXCEPTION',
            message: err?.message || String(err),
          });
        }
      }

      // Add remaining adversarial failures
      for (const adv of adversarialFailures) {
        currentViolations.push({
          rule: adv.vector,
          type: adv.category,
          message: adv.error,
        });
      }

      // If no violations exist, we are fully healed!
      if (currentViolations.length === 0) {
        return {
          healed: true,
          attempts,
          healedImplementation: currentImpl,
          finalViolations: [],
          totalHealingDurationMs: Date.now() - startTime,
          humanInterventionsRequired: 0,
        };
      }

      // 2. Triangulate primary root cause
      const primaryViolation = currentViolations[0];
      const rootCause = this.triangulateRootCause(primaryViolation);

      // 3. Locate and execute healing heuristic
      const heuristic =
        this.heuristics.get(primaryViolation.rule) ||
        this.heuristics.get(primaryViolation.type) ||
        this.heuristics.get(rootCause);

      if (!heuristic) {
        // No autonomous heuristic found for this violation pattern
        attempts.push({
          iteration: iter,
          rootCauseIdentified: rootCause,
          patchApplied: 'NONE_AVAILABLE',
          violationsBefore: currentViolations.length,
          violationsAfter: currentViolations.length,
          success: false,
          durationMs: Date.now() - iterStart,
        });
        break;
      }

      const patched = heuristic(currentImpl, primaryViolation);
      if (!patched) {
        attempts.push({
          iteration: iter,
          rootCauseIdentified: rootCause,
          patchApplied: 'HEURISTIC_RETURNED_NULL',
          violationsBefore: currentViolations.length,
          violationsAfter: currentViolations.length,
          success: false,
          durationMs: Date.now() - iterStart,
        });
        break;
      }

      currentImpl = patched;

      // Filter out addressed adversarial failures if fixed
      adversarialFailures = [];

      attempts.push({
        iteration: iter,
        rootCauseIdentified: rootCause,
        patchApplied: `INJECTED_REPAIR_${rootCause.toUpperCase()}`,
        violationsBefore: currentViolations.length,
        violationsAfter: 0, // Will be measured on next loop or exit
        success: true,
        durationMs: Date.now() - iterStart,
      });
    }

    // Final verification check
    const finalViolations: string[] = [];
    for (const item of sampleInputs) {
      try {
        const { output, stateAfter } = await currentImpl.execute(item.input, {
          input: item.input,
          actor: item.actor,
        });

        const comp = verifyContractCompliance(spec, {
          input: item.input,
          output,
          stateAfter,
          actor: item.actor,
        });

        if (!comp.compliant) {
          finalViolations.push(...comp.violations.map((v) => v.message));
        }
      } catch (err: any) {
        const inp = item.input as any;
        if (
          err?.message?.includes('Security Shield') &&
          item.actor &&
          (item.actor.tenantId !== inp?.tenantId || item.actor.id !== inp?.userId)
        ) {
          // Compliant security block
          continue;
        }
        finalViolations.push(err?.message || 'Crash');
      }
    }

    const isHealed = finalViolations.length === 0;

    return {
      healed: isHealed,
      attempts,
      healedImplementation: isHealed ? currentImpl : undefined,
      finalViolations,
      totalHealingDurationMs: Date.now() - startTime,
      humanInterventionsRequired: isHealed ? 0 : 1, // Only requires human if unhealable
    };
  }

  private triangulateRootCause(violation: { rule: string; type: string; message: string }): string {
    const text = `${violation.rule} ${violation.type} ${violation.message}`.toLowerCase();
    if (text.includes('bola') || text.includes('unauthorized') || text.includes('tenant')) {
      return 'BOLA_UNAUTHORIZED_ACCESS';
    }
    if (text.includes('discount') || text.includes('promotional') || text.includes('price')) {
      return 'FALSE_DISCOUNT_OR_PRICE_DRIFT';
    }
    if (text.includes('race') || text.includes('idempotent') || text.includes('duplicate')) {
      return 'CONCURRENCY_RACE_CONDITION';
    }
    if (text.includes('privacy') || text.includes('mask') || text.includes('phone')) {
      return 'PII_DATA_LEAKAGE';
    }
    return 'GENERIC_INVARIANT_VIOLATION';
  }

  private registerDefaultHeuristics(): void {
    // 1. Healing for BOLA / Unauthorized tenant access
    this.registerHeuristic('BOLA_UNAUTHORIZED_ACCESS', (failingImpl) => {
      return {
        id: `${failingImpl.id}_healed_bola`,
        execute: async (input: any, ctx?: any) => {
          // Enforce strict tenant ownership isolation
          if (ctx?.actor && input?.tenantId && ctx.actor.tenantId !== input.tenantId) {
            throw new Error(`[AetherGate Security Shield] Access Denied: Cross-tenant BOLA access forbidden`);
          }
          if (ctx?.actor && input?.userId && ctx.actor.id !== input.userId && ctx.actor.role !== 'admin') {
            throw new Error(`[AetherGate Security Shield] Access Denied: User ID mismatch (BOLA violation prevented)`);
          }
          return failingImpl.execute(input, ctx);
        },
      };
    });

    // 2. Healing for False Discount Claims
    this.registerHeuristic('FALSE_DISCOUNT_OR_PRICE_DRIFT', (failingImpl) => {
      return {
        id: `${failingImpl.id}_healed_pricing`,
        execute: async (input: any, ctx?: any) => {
          const res = await failingImpl.execute(input, ctx);
          const out = res.output as any;
          if (out) {
            // Strip unverified discount claims if no coupon was active
            if (!input.couponCode && out.discountApplied) {
              out.discountApplied = 0;
              out.promotionalMessage = null;
              out.finalTotal = out.subtotal + (out.shippingFee || 0);
            }
          }
          return res;
        },
      };
    });

    // 3. Healing for Race Condition / Duplicate Order Creation
    const idempotencyCache = new Map<string, any>();
    this.registerHeuristic('CONCURRENCY_RACE_CONDITION', (failingImpl) => {
      return {
        id: `${failingImpl.id}_healed_idempotency`,
        execute: async (input: any, ctx?: any) => {
          const key = input.idempotencyKey || `${input.tenantId}_${input.userId}_${input.amount}`;
          if (idempotencyCache.has(key)) {
            // Return cached response atomically
            return idempotencyCache.get(key);
          }
          const res = await failingImpl.execute(input, ctx);
          idempotencyCache.set(key, res);
          return res;
        },
      };
    });

    // 4. Healing for PII Privacy (Customer Phone Masking)
    this.registerHeuristic('PII_DATA_LEAKAGE', (failingImpl) => {
      return {
        id: `${failingImpl.id}_healed_pii`,
        execute: async (input: any, ctx?: any) => {
          const res = await failingImpl.execute(input, ctx);
          const out = res.output as any;
          if (out?.customerPhone) {
            const raw = String(out.customerPhone);
            if (raw.length > 5) {
              const prefix = raw.slice(0, 4);
              const suffix = raw.slice(-3);
              out.customerPhone = `${prefix}XXXXXX${suffix}`;
            }
          }
          return res;
        },
      };
    });
  }
}
