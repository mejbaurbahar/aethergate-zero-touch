import { MachineExecutableSpec, verifyContractCompliance, InvariantContext } from './spec-engine';
import { CandidateImplementation } from './adversarial-engine';

export interface MutationReport {
  totalMutants: number;
  killedMutants: number;
  survivedMutants: number;
  mutationScore: number; // percentage (0 - 100)
  passed: boolean;
  mutantDetails: Array<{
    id: string;
    description: string;
    killed: boolean;
    detectedBy?: string;
  }>;
}

export interface Mutant<TInput, TOutput, TState> {
  id: string;
  description: string;
  mutate: (impl: CandidateImplementation<TInput, TOutput, TState>) => CandidateImplementation<TInput, TOutput, TState>;
}

export class MutationEngine {
  private readonly passingThreshold: number;

  constructor(passingThreshold = 85) {
    this.passingThreshold = passingThreshold;
  }

  /**
   * Applies synthetic mutants and measures whether the invariant suite kills them.
   */
  async evaluate<TInput, TOutput, TState>(
    spec: MachineExecutableSpec<TInput, TOutput, TState>,
    baseImplementation: CandidateImplementation<TInput, TOutput, TState>,
    mutants: Mutant<TInput, TOutput, TState>[],
    sampleTestCases: Array<{ input: TInput; actor?: InvariantContext['actor'] }>,
  ): Promise<MutationReport> {
    let killed = 0;
    const details: MutationReport['mutantDetails'] = [];

    for (const mutant of mutants) {
      const corruptedImpl = mutant.mutate(baseImplementation);
      let wasKilled = false;
      let detectedBy: string | undefined;

      for (const tc of sampleTestCases) {
        try {
          const { output, stateAfter } = await corruptedImpl.execute(tc.input, {
            input: tc.input,
            actor: tc.actor,
          });

          const res = verifyContractCompliance(spec, {
            input: tc.input,
            output,
            stateAfter,
            actor: tc.actor,
          });

          if (!res.compliant) {
            wasKilled = true;
            detectedBy = res.violations.map((v) => v.rule).join(', ');
            break;
          }
        } catch (err: any) {
          // If the mutant caused a crash or explicit rejection caught by invariant, it is killed
          wasKilled = true;
          detectedBy = `EXCEPTION: ${err?.message || 'Crash'}`;
          break;
        }
      }

      if (wasKilled) {
        killed++;
      }

      details.push({
        id: mutant.id,
        description: mutant.description,
        killed: wasKilled,
        detectedBy,
      });
    }

    const total = mutants.length;
    const score = total > 0 ? (killed / total) * 100 : 100;

    return {
      totalMutants: total,
      killedMutants: killed,
      survivedMutants: total - killed,
      mutationScore: Number(score.toFixed(1)),
      passed: score >= this.passingThreshold,
      mutantDetails: details,
    };
  }
}
