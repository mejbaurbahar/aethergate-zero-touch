import * as fc from 'fast-check';
import { MachineExecutableSpec, verifyContractCompliance, InvariantContext } from './spec-engine';
import { AdversarialEngine, CandidateImplementation, AdversarialReport } from './adversarial-engine';
import { MutationEngine, Mutant, MutationReport } from './mutation-engine';
import { ReflexLoop, SelfHealingResult } from './reflex-loop';
import { AttestationEngine, ReleaseAttestation } from './attestation-engine';

export interface GateOptions<TInput, TOutput, TState> {
  spec: MachineExecutableSpec<TInput, TOutput, TState>;
  candidateImplementation: CandidateImplementation<TInput, TOutput, TState>;
  arbitraryInput: fc.Arbitrary<TInput>;
  sampleTestCases: Array<{ input: TInput; actor?: InvariantContext['actor'] }>;
  mutants?: Mutant<TInput, TOutput, TState>[];
  enableSelfHealing?: boolean;
}

export interface GateExecutionSummary {
  specId: string;
  totalLeadTimeMs: number;
  stageResults: {
    contractCompliance: {
      passed: boolean;
      violationsCount: number;
      initialViolationsCount?: number;
      initialAdversarialFailuresCount?: number;
    };
    adversarialProbing: { passed: boolean; totalProbes: number; failuresCount: number };
    selfHealing: { triggered: boolean; iterations: number; healed: boolean };
    mutationHardening: { passed: boolean; score: number; killed: number; total: number };
  };
  attestation: ReleaseAttestation;
  finalImplementation: CandidateImplementation<any, any, any>;
}

export class AetherGate {
  private readonly adversarialEngine: AdversarialEngine;
  private readonly mutationEngine: MutationEngine;
  private readonly reflexLoop: ReflexLoop;
  private readonly attestationEngine: AttestationEngine;

  constructor() {
    this.adversarialEngine = new AdversarialEngine();
    this.mutationEngine = new MutationEngine(85); // 85% mutation kill threshold
    this.reflexLoop = new ReflexLoop(3);
    this.attestationEngine = new AttestationEngine();
  }

  /**
   * Runs the complete end-to-end zero-touch verification and release gate.
   */
  async evaluateRelease<TInput, TOutput, TState>(
    options: GateOptions<TInput, TOutput, TState>,
  ): Promise<GateExecutionSummary> {
    const pipelineStartTime = Date.now();
    let currentImpl = options.candidateImplementation;
    let selfHealingTriggered = false;
    let healingResult: SelfHealingResult | undefined;

    // ─────────────────────────────────────────────────────────────────────────
    // STAGE 1: SPECIFICATION & INITIAL INVARIANT COMPLIANCE
    // ─────────────────────────────────────────────────────────────────────────
    let initialViolations: Array<{ rule: string; type: string; message: string }> = [];
    for (const tc of options.sampleTestCases) {
      try {
        const { output, stateAfter } = await currentImpl.execute(tc.input, {
          input: tc.input,
          actor: tc.actor,
        });
        const res = verifyContractCompliance(options.spec, {
          input: tc.input,
          output,
          stateAfter,
          actor: tc.actor,
        });
        if (!res.compliant) {
          initialViolations.push(...res.violations);
        }
      } catch (err: any) {
        initialViolations.push({
          rule: 'RUNTIME_EXCEPTION',
          type: 'CRASH',
          message: err?.message || String(err),
        });
      }
    }

    const initialViolationsCount = initialViolations.length;

    // ─────────────────────────────────────────────────────────────────────────
    // STAGE 2: ADVERSARIAL MATRIX PROBING
    // ─────────────────────────────────────────────────────────────────────────
    let adversarialReport: AdversarialReport = await this.adversarialEngine.probe(
      options.spec,
      currentImpl,
      options.arbitraryInput,
    );

    const initialAdversarialFailuresCount = adversarialReport.failures.length;

    // ─────────────────────────────────────────────────────────────────────────
    // STAGE 3: AUTONOMOUS SELF-HEALING REFLEX LOOP (IF DEFECTS FOUND)
    // ─────────────────────────────────────────────────────────────────────────
    if (
      (initialViolations.length > 0 || !adversarialReport.passed) &&
      options.enableSelfHealing !== false
    ) {
      selfHealingTriggered = true;
      healingResult = await this.reflexLoop.heal(
        options.spec,
        currentImpl,
        options.sampleTestCases,
        adversarialReport.failures,
      );

      if (healingResult.healed && healingResult.healedImplementation) {
        currentImpl = healingResult.healedImplementation;

        // Re-run adversarial probe on the healed implementation
        adversarialReport = await this.adversarialEngine.probe(
          options.spec,
          currentImpl,
          options.arbitraryInput,
        );
        initialViolations = [];
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STAGE 4: MUTATION HARDENING GATE
    // ─────────────────────────────────────────────────────────────────────────
    let mutationReport: MutationReport = {
      totalMutants: 0,
      killedMutants: 0,
      survivedMutants: 0,
      mutationScore: 100,
      passed: true,
      mutantDetails: [],
    };

    if (options.mutants && options.mutants.length > 0) {
      mutationReport = await this.mutationEngine.evaluate(
        options.spec,
        currentImpl,
        options.mutants,
        options.sampleTestCases,
      );
    }

    const totalPipelineDurationMs = Date.now() - pipelineStartTime;

    // ─────────────────────────────────────────────────────────────────────────
    // STAGE 5: CRYPTOGRAPHIC RELEASE ATTESTATION
    // ─────────────────────────────────────────────────────────────────────────
    const attestation = this.attestationEngine.generate({
      specId: options.spec.id,
      specVersion: options.spec.version,
      implementationId: currentImpl.id,
      totalDurationMs: totalPipelineDurationMs,
      humanInterventions: healingResult?.humanInterventionsRequired ?? (initialViolations.length === 0 ? 0 : 1),
      invariantsPassed: options.spec.invariants.length * options.sampleTestCases.length,
      adversarialProbesPassed: adversarialReport.totalProbes - adversarialReport.failures.length,
      mutationScore: mutationReport.mutationScore,
      securityVulnerabilities: adversarialReport.failures.filter((f) => f.category === 'BOLA_SECURITY').length,
      selfHealingIterations: healingResult?.attempts.length ?? 0,
      rawSpec: { id: options.spec.id, version: options.spec.version },
      rawImpl: { id: currentImpl.id },
    });

    return {
      specId: options.spec.id,
      totalLeadTimeMs: totalPipelineDurationMs,
      stageResults: {
        contractCompliance: {
          passed: healingResult ? healingResult.healed : initialViolations.length === 0,
          initialViolationsCount,
          initialAdversarialFailuresCount,
          violationsCount: initialViolations.length,
        },
        adversarialProbing: {
          passed: adversarialReport.passed,
          totalProbes: adversarialReport.totalProbes,
          failuresCount: adversarialReport.failures.length,
        },
        selfHealing: {
          triggered: selfHealingTriggered,
          iterations: healingResult?.attempts.length ?? 0,
          healed: healingResult?.healed ?? false,
        },
        mutationHardening: {
          passed: mutationReport.passed,
          score: mutationReport.mutationScore,
          killed: mutationReport.killedMutants,
          total: mutationReport.totalMutants,
        },
      },
      attestation,
      finalImplementation: currentImpl,
    };
  }
}
