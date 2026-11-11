import { z } from 'zod';

export interface InvariantResult {
  passed: boolean;
  code: string;
  message: string;
  metadata?: Record<string, any>;
}

export interface InvariantContext<TInput = any, TOutput = any, TState = any> {
  input: TInput;
  output?: TOutput;
  stateBefore?: TState;
  stateAfter?: TState;
  actor?: {
    id: string;
    tenantId: string;
    role: 'anonymous' | 'user' | 'admin' | 'superadmin';
  };
}

export interface InvariantRule<TInput = any, TOutput = any, TState = any> {
  id: string;
  name: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  description: string;
  validate: (ctx: InvariantContext<TInput, TOutput, TState>) => InvariantResult;
}

export interface SecurityPolicy {
  id: string;
  type: 'BOLA' | 'BFLA' | 'INJECTION' | 'DATA_LEAK' | 'IDEMPOTENCY';
  description: string;
  verify: (ctx: InvariantContext) => InvariantResult;
}

export interface MachineExecutableSpec<TInput = any, TOutput = any, TState = any> {
  id: string;
  name: string;
  version: string;
  domain: string;
  inputSchema: z.ZodType<TInput>;
  outputSchema: z.ZodType<TOutput>;
  preconditions: Array<{
    name: string;
    check: (input: TInput, stateBefore?: TState) => boolean;
    failMessage: string;
  }>;
  postconditions: Array<{
    name: string;
    check: (input: TInput, output: TOutput, stateBefore?: TState, stateAfter?: TState) => boolean;
    failMessage: string;
  }>;
  invariants: InvariantRule<TInput, TOutput, TState>[];
  securityPolicies: SecurityPolicy[];
}

/**
 * Validates whether an operation execution strictly satisfies the formal contract.
 */
export function verifyContractCompliance<TInput, TOutput, TState>(
  spec: MachineExecutableSpec<TInput, TOutput, TState>,
  execution: {
    input: unknown;
    output?: unknown;
    stateBefore?: TState;
    stateAfter?: TState;
    actor?: InvariantContext['actor'];
  },
): {
  compliant: boolean;
  violations: Array<{ rule: string; type: string; message: string }>;
} {
  const violations: Array<{ rule: string; type: string; message: string }> = [];

  // 1. Schema Validation
  const inputParsed = spec.inputSchema.safeParse(execution.input);
  if (!inputParsed.success) {
    violations.push({
      rule: 'INPUT_SCHEMA',
      type: 'SCHEMA_VIOLATION',
      message: inputParsed.error.message,
    });
    return { compliant: false, violations };
  }

  const typedInput = inputParsed.data;

  // 2. Preconditions
  for (const pre of spec.preconditions) {
    if (!pre.check(typedInput, execution.stateBefore)) {
      violations.push({
        rule: pre.name,
        type: 'PRECONDITION_FAILED',
        message: pre.failMessage,
      });
    }
  }

  if (execution.output !== undefined) {
    // 3. Output Schema Validation
    const outputParsed = spec.outputSchema.safeParse(execution.output);
    if (!outputParsed.success) {
      violations.push({
        rule: 'OUTPUT_SCHEMA',
        type: 'SCHEMA_VIOLATION',
        message: outputParsed.error.message,
      });
    } else {
      const typedOutput = outputParsed.data;

      // 4. Postconditions
      for (const post of spec.postconditions) {
        if (!post.check(typedInput, typedOutput, execution.stateBefore, execution.stateAfter)) {
          violations.push({
            rule: post.name,
            type: 'POSTCONDITION_FAILED',
            message: post.failMessage,
          });
        }
      }
    }
  }

  // 5. Invariant Checks
  const ctx: InvariantContext<TInput, TOutput, TState> = {
    input: typedInput,
    output: execution.output as TOutput,
    stateBefore: execution.stateBefore,
    stateAfter: execution.stateAfter,
    actor: execution.actor,
  };

  for (const inv of spec.invariants) {
    const res = inv.validate(ctx);
    if (!res.passed) {
      violations.push({
        rule: inv.id,
        type: 'INVARIANT_BROKEN',
        message: `[${inv.severity}] ${inv.name}: ${res.message}`,
      });
    }
  }

  // 6. Security Policies
  for (const sec of spec.securityPolicies) {
    const res = sec.verify(ctx);
    if (!res.passed) {
      violations.push({
        rule: sec.id,
        type: `SECURITY_${sec.type}`,
        message: `${sec.description}: ${res.message}`,
      });
    }
  }

  return {
    compliant: violations.length === 0,
    violations,
  };
}
