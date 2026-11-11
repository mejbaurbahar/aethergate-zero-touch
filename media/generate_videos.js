const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const MEDIA_DIR = __dirname;
const REPO_DIR = path.resolve(__dirname, '..');

function run(cmd) {
  console.log(`[EXEC] ${cmd.slice(0, 100)}...`);
  return execSync(cmd, { stdio: 'pipe' }).toString();
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML SLIDE TEMPLATE GENERATOR
// ─────────────────────────────────────────────────────────────────────────────
function createSlideHtml(title, subtitle, badge, contentHtml) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 1920px;
      height: 1080px;
      background: #090d16;
      color: #f8fafc;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 60px 80px;
      position: relative;
    }
    .grid-bg {
      position: absolute;
      inset: 0;
      background-image: 
        linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px);
      background-size: 60px 60px;
      pointer-events: none;
    }
    .glow {
      position: absolute;
      top: -150px;
      right: -150px;
      width: 600px;
      height: 600px;
      background: radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, transparent 70%);
      pointer-events: none;
    }
    .header {
      position: relative;
      z-index: 10;
    }
    .badge {
      display: inline-block;
      padding: 8px 18px;
      background: rgba(56, 189, 248, 0.15);
      border: 1px solid rgba(56, 189, 248, 0.4);
      color: #38bdf8;
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      border-radius: 9999px;
      margin-bottom: 20px;
    }
    h1 {
      font-size: 54px;
      font-weight: 800;
      line-height: 1.15;
      background: linear-gradient(135deg, #ffffff 40%, #94a3b8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 12px;
    }
    .subtitle {
      font-size: 24px;
      color: #94a3b8;
      font-weight: 500;
    }
    .content {
      position: relative;
      z-index: 10;
      flex: 1;
      margin: 40px 0;
      display: flex;
      gap: 40px;
    }
    .footer {
      position: relative;
      z-index: 10;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      padding-top: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #64748b;
      font-size: 18px;
      font-weight: 600;
    }
    .footer .author {
      color: #f1f5f9;
    }
    .card {
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      padding: 32px;
      backdrop-filter: blur(16px);
      flex: 1;
    }
    .metric-val {
      font-size: 48px;
      font-weight: 900;
      color: #38bdf8;
      margin-bottom: 8px;
      font-family: 'JetBrains Mono', monospace;
    }
    .metric-val.green { color: #4ade80; }
    .metric-val.purple { color: #c084fc; }
    .metric-val.red { color: #f87171; }
    .metric-lbl {
      font-size: 18px;
      color: #94a3b8;
      font-weight: 600;
    }
    .code-box {
      background: #020617;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 16px;
      padding: 24px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 17px;
      line-height: 1.6;
      color: #e2e8f0;
      width: 100%;
      overflow: hidden;
    }
    .code-box .green { color: #4ade80; }
    .code-box .cyan { color: #38bdf8; }
    .code-box .yellow { color: #facc15; }
    .code-box .red { color: #f87171; }
    .code-box .magenta { color: #e879f9; }
    .code-box .gray { color: #64748b; }
    .pill {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 700;
      margin-right: 8px;
    }
    .pill.green { background: rgba(74, 222, 128, 0.2); color: #4ade80; border: 1px solid #4ade80; }
    .pill.red { background: rgba(248, 113, 113, 0.2); color: #f87171; border: 1px solid #f87171; }
  </style>
</head>
<body>
  <div class="grid-bg"></div>
  <div class="glow"></div>
  <div class="header">
    <div class="badge">${badge}</div>
    <h1>${title}</h1>
    <div class="subtitle">${subtitle}</div>
  </div>
  <div class="content">
    ${contentHtml}
  </div>
  <div class="footer">
    <div>AI-Native Quality Engineer Quest • Zero-Touch Release</div>
    <div class="author">Mejbaur Bahar Fagun (Senior SDET & QA Lead)</div>
  </div>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE DEFINITIONS FOR VIDEO 1 (TECHNICAL DEMO)
// ─────────────────────────────────────────────────────────────────────────────
const demoScenes = [
  {
    id: 'demo_01_intro',
    title: 'AetherGate: Autonomous Release Engine',
    subtitle: 'Zero-Touch Release, Security First — Quest Demonstration',
    badge: 'STAGE 01 • OVERVIEW',
    text: `Hello everyone, my name is Mejbaur Bahar Fagun. Today I am demonstrating AetherGate, an autonomous spec-to-release verification and self-healing quality gate designed for the AI-Native Quality Engineer Quest. Software quality can now become an inherent, autonomous property of development rather than something humans repeatedly verify.`,
    content: `
      <div class="card" style="flex: 1.2;">
        <h3 style="font-size: 26px; margin-bottom: 24px; color: #f8fafc;">The Verification Bottleneck Paradox</h3>
        <p style="font-size: 20px; line-height: 1.7; color: #cbd5e1; margin-bottom: 24px;">
          While generative AI writes code in seconds, releases remain blocked by human cognitive throughput. Teams spend 60% of lead time reviewing pull requests, investigating flaky CI breaks, and triaging production escapes.
        </p>
        <div style="background: rgba(56, 189, 248, 0.1); border-left: 4px solid #38bdf8; padding: 18px; border-radius: 0 12px 12px 0;">
          <div style="font-size: 18px; font-weight: 700; color: #38bdf8; margin-bottom: 6px;">The Quest Challenge:</div>
          <div style="font-size: 16px; color: #cbd5e1;">Sub-One-Hour Lead Time & Near-Zero Human Intervention without sacrificing security.</div>
        </div>
      </div>
      <div style="display: flex; flex-direction: column; gap: 24px; flex: 0.8;">
        <div class="card">
          <div class="metric-val green">&lt; 15s</div>
          <div class="metric-lbl">Lead Time Achieved (Target: &lt; 60m)</div>
        </div>
        <div class="card">
          <div class="metric-val purple">0</div>
          <div class="metric-lbl">Human PR Interventions Required</div>
        </div>
        <div class="card">
          <div class="metric-val green">100%</div>
          <div class="metric-lbl">Mutation Kill Score (Threshold: &ge; 85%)</div>
        </div>
      </div>
    `,
  },
  {
    id: 'demo_02_architecture',
    title: '5-Stage Invariant Verification Architecture',
    subtitle: 'Replacing Subjective PR Reviews with Formal Invariant Engines',
    badge: 'STAGE 02 • ARCHITECTURE',
    text: `AetherGate replaces subjective human PR reviews with five deterministic verification layers. First, a Spec Engine defining machine-executable invariants. Second, a Multi-Vector Adversarial Engine using Fast-Check property fuzzing and BOLA penetration probes. Third, an Autonomous Self-Healing Reflex Loop. Fourth, a Mutation Hardening Gate killing 100 percent of artificial logic mutants. And fifth, a Cryptographic Release Attestation Engine.`,
    content: `
      <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; margin-top: 20px;">
          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 14px; padding: 20px;">
            <div style="color: #38bdf8; font-weight: 800; font-size: 16px; margin-bottom: 12px;">STAGE 1</div>
            <div style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">Spec Engine</div>
            <div style="font-size: 14px; color: #94a3b8;">Pre/Post conditions & mathematical invariants defined in code.</div>
          </div>
          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 14px; padding: 20px;">
            <div style="color: #facc15; font-weight: 800; font-size: 16px; margin-bottom: 12px;">STAGE 2</div>
            <div style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">Adversarial Prober</div>
            <div style="font-size: 14px; color: #94a3b8;">Fast-Check property sweeps, BOLA access attacks, race conditions.</div>
          </div>
          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 14px; padding: 20px;">
            <div style="color: #4ade80; font-weight: 800; font-size: 16px; margin-bottom: 12px;">STAGE 3</div>
            <div style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">Reflex Loop</div>
            <div style="font-size: 14px; color: #94a3b8;">Autonomous root-cause triangulation & invariant-constrained repairs.</div>
          </div>
          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 14px; padding: 20px;">
            <div style="color: #c084fc; font-weight: 800; font-size: 16px; margin-bottom: 12px;">STAGE 4</div>
            <div style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">Mutation Gate</div>
            <div style="font-size: 14px; color: #94a3b8;">Injects AST mutants to verify test harness kill power (&ge;85%).</div>
          </div>
          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 14px; padding: 20px;">
            <div style="color: #38bdf8; font-weight: 800; font-size: 16px; margin-bottom: 12px;">STAGE 5</div>
            <div style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">Attestation</div>
            <div style="font-size: 14px; color: #94a3b8;">SHA-256 HMAC cryptographic certificate authorizing continuous rollout.</div>
          </div>
        </div>
        <div style="margin-top: 30px; background: rgba(74, 222, 128, 0.08); border: 1px solid rgba(74, 222, 128, 0.3); border-radius: 14px; padding: 20px;">
          <div style="font-size: 18px; font-weight: 700; color: #4ade80; margin-bottom: 6px;">Zero-Corruption Invariant Guarantee:</div>
          <div style="font-size: 16px; color: #cbd5e1;">The Self-Healing Reflex Loop has write access strictly to the implementation. It is mathematically forbidden from weakening the specification or invariants.</div>
        </div>
      </div>
    `,
  },
  {
    id: 'demo_03_defects',
    title: 'Evaluating Real-World E-Commerce Defects',
    subtitle: 'Flawed Candidate Implementation Ingested by AetherGate',
    badge: 'STAGE 03 • DEFECT AUDIT',
    text: `In our flagship e-commerce scenario, the candidate implementation has five real-world flaws: a false promotional discount claim without active coupons, customer phone number privacy leakage, and cross-tenant authorization vulnerabilities. Let us see how AetherGate diagnoses and repairs them autonomously.`,
    content: `
      <div class="card">
        <h3 style="font-size: 22px; margin-bottom: 20px; color: #f87171;">Injected Real-World Defects:</h3>
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <div style="background: rgba(248, 113, 113, 0.1); border-left: 4px solid #f87171; padding: 16px; border-radius: 0 10px 10px 0;">
            <div style="font-weight: 700; color: #f87171; font-size: 17px;">1. False Discount Claim</div>
            <div style="font-size: 15px; color: #cbd5e1;">Agent claimed an active promotional discount of $5 without any coupon code being provided.</div>
          </div>
          <div style="background: rgba(248, 113, 113, 0.1); border-left: 4px solid #f87171; padding: 16px; border-radius: 0 10px 10px 0;">
            <div style="font-weight: 700; color: #f87171; font-size: 17px;">2. Customer Phone PII Exposure</div>
            <div style="font-size: 15px; color: #cbd5e1;">Returned raw phone number 01987445646 in public confirmation instead of masked format.</div>
          </div>
          <div style="background: rgba(248, 113, 113, 0.1); border-left: 4px solid #f87171; padding: 16px; border-radius: 0 10px 10px 0;">
            <div style="font-weight: 700; color: #f87171; font-size: 17px;">3. Broken Object Level Authorization (BOLA)</div>
            <div style="font-size: 15px; color: #cbd5e1;">Missing tenant boundary isolation allowed unauthorized cross-tenant operations.</div>
          </div>
        </div>
      </div>
      <div class="card" style="background: #020617;">
        <div style="color: #94a3b8; font-size: 14px; margin-bottom: 12px; font-family: monospace;">src/scenarios/ecommerce-checkout.ts</div>
        <pre class="code-box" style="font-size: 14px; border: none; padding: 0;">
<span class="gray">// Candidate Implementation Flaws</span>
<span class="cyan">const</span> subtotal = items.<span class="yellow">reduce</span>(...);
<span class="red">// BUG 1: False discount claim</span>
<span class="cyan">const</span> discountApplied = <span class="magenta">5.0</span>; 
<span class="cyan">const</span> promotionalMessage = <span class="green">'Great offer!'</span>;

<span class="red">// BUG 2: Leaves customer phone unmasked</span>
<span class="cyan">const</span> customerPhone = input.customerPhone;

<span class="red">// BUG 3: BOLA vulnerability</span>
<span class="gray">// Missing tenant ownership check!</span>
        </pre>
      </div>
    `,
  },
  {
    id: 'demo_04_terminal',
    title: 'Live Autonomous Execution & Self-Healing',
    subtitle: 'Full Pipeline Run: 100% Healed in 0.03 Seconds with Zero Human Touches',
    badge: 'STAGE 04 • LIVE VERIFICATION',
    text: `Here is the live terminal execution of AetherGate. The gate ingests the flawed code, detects five initial violations, and fires the Autonomous Self-Healing Reflex Loop. In three rapid iterations, it repairs pricing integrity, masks customer phone numbers, and enforces identity shields. 110 adversarial probes pass, and 100 percent of synthetic mutants are killed.`,
    content: `
      <div class="code-box" style="font-size: 16px; line-height: 1.5; flex: 1;">
<span class="cyan">======================= AETHERGATE VERIFICATION REPORT =======================</span>
<span class="yellow">1. Spec Compliance & Initial Scan:</span>
   Initial Flaws Detected: <span class="red">5</span> (False discount + Unmasked PII + BOLA cross-tenant leak)
<span class="yellow">2. Autonomous Self-Healing Reflex Loop:</span>
   Triggered:             <span class="green">YES (Automatic)</span>
   Healing Iterations:    <span class="green">3</span>
   Autonomous Resolution: <span class="green">100% HEALED</span>
   Human Touches:         <span class="green">0 (Zero Human Intervention)</span>
<span class="yellow">3. Adversarial Multi-Vector Probes:</span>
   Total Probes Executed: <span class="cyan">110</span>
   Security / BOLA Leaks: <span class="green">0 (Shield Invariant Enforced)</span>
<span class="yellow">4. Mutation Hardening Gate:</span>
   Mutants Killed:        <span class="green">4 / 4</span>
   Mutation Score:        <span class="green">100%</span> (Threshold: &ge; 85%)
   Mutation Verdict:      <span class="green">PASSED</span>
<span class="yellow">5. Release Attestation & Lead Time:</span>
   Total Lead Time:       <span class="green">0.03s</span> (Sub-1-Hour Target: <span class="green">MET &lt; 15s</span>)
   Attestation ID:        <span class="yellow">att_99875d7a57a304c2</span>
   Release Status:        <span class="pill green">VERIFIED FOR ZERO-TOUCH RELEASE</span>
   Continuous CD Action:  <span class="green">AUTOMATICALLY PROMOTED TO PRODUCTION</span>
<span class="cyan">===============================================================================</span>
      </div>
    `,
  },
  {
    id: 'demo_05_ci_cd',
    title: 'Continuous Integration in GitHub Actions',
    subtitle: 'Proven Deterministic Pipeline Execution on Public Repository',
    badge: 'STAGE 05 • CI/CD EVIDENCE',
    text: `To prove that AetherGate operates in a production continuous delivery workflow, here is the public GitHub Actions pipeline on repository mejbaurbahar slash aethergate-zero-touch. In this run, the pipeline installed dependencies, typechecked specifications, ran all test suites, and verified the cryptographic attestation in just 21 seconds.`,
    content: `
      <div class="card" style="flex: 1.2;">
        <h3 style="font-size: 24px; margin-bottom: 20px; color: #f8fafc;">GitHub Actions Workflow: Zero-Touch CI</h3>
        <div style="display: flex; flex-direction: column; gap: 14px;">
          <div style="background: rgba(74, 222, 128, 0.1); border: 1px solid rgba(74, 222, 128, 0.3); border-radius: 12px; padding: 18px; display: flex; align-items: center; justify-content: space-between;">
            <div>
              <div style="font-size: 18px; font-weight: 700; color: #4ade80;">✔ AetherGate Zero-Touch Release CI</div>
              <div style="font-size: 14px; color: #94a3b8;">Branch: main • Push event • Completed successfully</div>
            </div>
            <div style="font-size: 22px; font-weight: 900; color: #4ade80; font-family: monospace;">21s</div>
          </div>
          <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 18px;">
            <div style="font-size: 16px; font-weight: 600; color: #e2e8f0; margin-bottom: 6px;">Pipeline Quality Gates:</div>
            <div style="font-size: 14px; color: #94a3b8; line-height: 1.6;">
              1. Typecheck Spec & Gate (tsc --noEmit)<br>
              2. Run Vitest Invariant Suites (4/4 passed in 2.20s)<br>
              3. Execute AetherGate Self-Healing Demonstration<br>
              4. Verify Cryptographic Attestation Output<br>
              5. Upload Release Attestation Artifact
            </div>
          </div>
        </div>
      </div>
      <div class="card" style="flex: 0.8; display: flex; flex-direction: column; justify-content: center; text-align: center;">
        <div class="metric-val green">21s</div>
        <div class="metric-lbl" style="margin-bottom: 24px;">Total CI Run Duration</div>
        <div style="font-size: 16px; color: #cbd5e1; line-height: 1.6;">
          Target: &lt; 3600 seconds (1 hour)<br>
          <strong style="color: #4ade80;">Achieved 171x Faster</strong> than target with 0 human touches!
        </div>
      </div>
    `,
  },
  {
    id: 'demo_06_conclusion',
    title: 'Cryptographic Attestation & Release Verdict',
    subtitle: 'Zero-Touch Release with Mathematical and Empirical Certainty',
    badge: 'STAGE 06 • ATTESTATION',
    text: `AetherGate proves that software releases do not require slow human PR reviews to be secure and reliable. By elevating humans to Intent Authors and letting machine-executable invariant gates handle verification, adversarial probing, and self-healing, we achieve true zero-touch releases with mathematical confidence. Thank you.`,
    content: `
      <div class="card" style="flex: 1;">
        <h3 style="font-size: 22px; margin-bottom: 16px; color: #38bdf8;">release-attestation.json</h3>
        <pre class="code-box" style="font-size: 14px; padding: 16px;">
{
  <span class="yellow">"attestationId"</span>: <span class="green">"att_99875d7a57a304c2"</span>,
  <span class="yellow">"status"</span>: <span class="green">"VERIFIED_FOR_ZERO_TOUCH_RELEASE"</span>,
  <span class="yellow">"verdict"</span>: <span class="green">"AUTONOMOUS_PASS"</span>,
  <span class="yellow">"leadTime"</span>: { <span class="cyan">"totalDurationMs"</span>: <span class="magenta">33</span>, <span class="cyan">"subOneHourMet"</span>: <span class="green">true</span> },
  <span class="yellow">"qualityMetrics"</span>: {
    <span class="cyan">"humanInterventions"</span>: <span class="magenta">0</span>,
    <span class="cyan">"mutationScore"</span>: <span class="magenta">100</span>,
    <span class="cyan">"securityVulnerabilities"</span>: <span class="magenta">0</span>,
    <span class="cyan">"selfHealingIterations"</span>: <span class="magenta">3</span>
  },
  <span class="yellow">"provenance"</span>: {
    <span class="cyan">"cryptographicSeal"</span>: <span class="gray">"99875d7a57a304c2c22329adad72a0ea015e3c1b..."</span>
  }
}
        </pre>
      </div>
      <div class="card" style="flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <h3 style="font-size: 26px; color: #f8fafc; margin-bottom: 16px;">Final Assessment</h3>
          <p style="font-size: 18px; line-height: 1.7; color: #cbd5e1; margin-bottom: 24px;">
            AetherGate successfully demonstrates that high-velocity software releases and rigorous security engineering are not mutually exclusive.
          </p>
          <div style="background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 12px; padding: 16px;">
            <div style="font-weight: 700; color: #38bdf8; margin-bottom: 4px;">Repository & Verification Evidence:</div>
            <div style="font-size: 15px; color: #94a3b8; font-family: monospace;">github.com/mejbaurbahar/aethergate-zero-touch</div>
          </div>
        </div>
        <div style="padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 16px; color: #94a3b8;">Presented for: Match Hire Quest</span>
          <span class="pill green">SUBMISSION READY</span>
        </div>
      </div>
    `,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE DEFINITIONS FOR VIDEO 2 (CAREER PATH & LEVERAGE)
// ─────────────────────────────────────────────────────────────────────────────
const careerScenes = [
  {
    id: 'career_01_profile',
    title: 'Career Path & Career Leverage Presentation',
    subtitle: 'Mejbaur Bahar Fagun — Senior SDET & QA Engineering Lead',
    badge: 'PART 01 • ENGINEERING FOUNDATION',
    text: `Hello everyone, my name is Mejbaur Bahar Fagun. I am a QA Engineering Lead and Senior SDET with over 8 years of experience building enterprise test infrastructure, test automation frameworks, and for the past 3+ years, architecting GenAI evaluation pipelines and model testing systems.`,
    content: `
      <div class="card" style="flex: 1.2;">
        <h3 style="font-size: 28px; color: #f8fafc; margin-bottom: 16px;">Professional Identity</h3>
        <p style="font-size: 19px; line-height: 1.7; color: #cbd5e1; margin-bottom: 24px;">
          Proven track record defining technical quality strategies, roadmaps, and benchmark scoring frameworks across cross-functional engineering teams. Experienced in architecting production-grade Python and TypeScript test harnesses with Playwright, Cypress, and PyTest across 2,000+ automated test suites.
        </p>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 16px;">
            <div style="font-size: 14px; color: #94a3b8; margin-bottom: 4px;">LOCATION</div>
            <div style="font-size: 18px; font-weight: 700; color: #f8fafc;">Dhaka, Bangladesh</div>
          </div>
          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 16px;">
            <div style="font-size: 14px; color: #94a3b8; margin-bottom: 4px;">SPECIALTY</div>
            <div style="font-size: 18px; font-weight: 700; color: #38bdf8;">AI Evaluation & SDET</div>
          </div>
        </div>
      </div>
      <div style="display: flex; flex-direction: column; gap: 20px; flex: 0.8;">
        <div class="card">
          <div class="metric-val">8+ Yrs</div>
          <div class="metric-lbl">Enterprise Test Engineering Experience</div>
        </div>
        <div class="card">
          <div class="metric-val green">3+ Yrs</div>
          <div class="metric-lbl">GenAI & LLM Model Evaluation Systems</div>
        </div>
      </div>
    `,
  },
  {
    id: 'career_02_work_history',
    title: 'Work History & Technical Leadership',
    subtitle: 'Proven Leadership in High-Growth AI & SaaS Organizations',
    badge: 'PART 02 • WORK HISTORY',
    text: `Currently, as Lead QA Engineer at Sofof Tech in Saudi Arabia, I define technical quality strategies and evaluation roadmaps for GenAI initiatives, balancing model risk, delivery velocity, and engineering investment. Previously, as Senior QA Engineer at Markopolo.ai, I architected Playwright and TypeScript test frameworks integrated into GitHub Actions, reducing our regression cycle by 81 percent, from four hours to 45 minutes.`,
    content: `
      <div class="card" style="flex: 1;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <span style="font-size: 20px; font-weight: 800; color: #38bdf8;">Sofof Tech</span>
          <span style="font-size: 15px; color: #94a3b8;">09/2026 – Present • Jeddah, KSA</span>
        </div>
        <div style="font-size: 18px; font-weight: 700; color: #f8fafc; margin-bottom: 12px;">Lead QA Engineer (AI) / Senior SQA Engineer</div>
        <ul style="font-size: 15px; color: #cbd5e1; line-height: 1.6; padding-left: 20px;">
          <li>Architect and deploy shared AI evaluation systems and test automation frameworks supporting multiple LLM/TTS models and multimodal apps.</li>
          <li>Establish consistent evaluation benchmarks and weighted scoring frameworks, calibrating automated evaluators with human judgments.</li>
          <li>Drive quality planning for major launches, connecting model performance, system reliability, and user trust.</li>
        </ul>
      </div>
      <div class="card" style="flex: 1;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <span style="font-size: 20px; font-weight: 800; color: #4ade80;">Markopolo.ai</span>
          <span style="font-size: 15px; color: #94a3b8;">10/2025 – 08/2026 • Dhaka, BD</span>
        </div>
        <div style="font-size: 18px; font-weight: 700; color: #f8fafc; margin-bottom: 12px;">Senior Software Engineer QA</div>
        <ul style="font-size: 15px; color: #cbd5e1; line-height: 1.6; padding-left: 20px;">
          <li>Led QA for AI-driven TTS and NLP models; built 200+ automated evaluation tests covering model accuracy and prompt injection resistance.</li>
          <li>Architected Playwright + TS/Python test framework integrated with GitHub Actions CI/CD; cut regression cycles from 4h to 45m (81% faster).</li>
          <li>Managed 8-engineer QA team integrating AI-assisted tools for test design.</li>
        </ul>
      </div>
    `,
  },
  {
    id: 'career_03_certifications',
    title: 'Adversarial Security & Ethical Hacking',
    subtitle: 'Security-First Engineering: CEH & CAP Certifications',
    badge: 'PART 03 • SECURITY FOUNDATION',
    text: `My technical foundation also includes being a Certified Ethical Hacker and Certified AppSec Practitioner. This gives me an adversarial, security-first mindset: I do not just verify whether software works under happy paths; I design systems that actively prevent BOLA authorization leaks, privilege escalation, and injection vulnerabilities before release.`,
    content: `
      <div class="card" style="flex: 1;">
        <h3 style="font-size: 24px; color: #f8fafc; margin-bottom: 20px;">Professional Certifications</h3>
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <div style="background: rgba(56, 189, 248, 0.1); border-left: 4px solid #38bdf8; padding: 18px; border-radius: 0 12px 12px 0;">
            <div style="font-size: 20px; font-weight: 800; color: #38bdf8;">CEH — Certified Ethical Hacker</div>
            <div style="font-size: 15px; color: #cbd5e1; margin-top: 4px;">Penetration testing, network vulnerability discovery, and adversarial vector modeling.</div>
          </div>
          <div style="background: rgba(192, 132, 252, 0.1); border-left: 4px solid #c084fc; padding: 18px; border-radius: 0 12px 12px 0;">
            <div style="font-size: 20px; font-weight: 800; color: #c084fc;">CAP — Certified AppSec Practitioner</div>
            <div style="font-size: 15px; color: #cbd5e1; margin-top: 4px;">OWASP Top 10 mitigation, secure API contract enforcement, and multi-tenant isolation.</div>
          </div>
        </div>
      </div>
      <div class="card" style="flex: 1;">
        <h3 style="font-size: 24px; color: #f8fafc; margin-bottom: 20px;">The Adversarial Quality Mindset</h3>
        <p style="font-size: 17px; line-height: 1.7; color: #cbd5e1; margin-bottom: 20px;">
          Conventional QA focuses on expected outcomes. An AI-native Quality Engineer must think adversarially:
        </p>
        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 16px; font-size: 15px; color: #94a3b8; line-height: 1.6;">
          • Broken Object Level Authorization (BOLA/IDOR) Probing<br>
          • Concurrency & Race-Condition Double Spend Checks<br>
          • Automated AST Mutation Invariant Kill Power
        </div>
      </div>
    `,
  },
  {
    id: 'career_04_leverage',
    title: 'Career Leverage: Autonomous AI Quality',
    subtitle: 'My Deliberate 1+ Year Public Investment in AI-Native Release Gates',
    badge: 'PART 04 • STRATEGIC LEVERAGE',
    text: `Regarding Career Leverage: Over the past year and a half, I made a conscious, strategic decision to focus on one high-leverage direction: Autonomous Quality Engineering and Deterministic Evaluation for AI-Native Systems. While the industry was obsessing solely over code generation speed, I recognized that the real bottleneck was the Verification Asymmetry Dilemma.`,
    content: `
      <div class="card" style="flex: 1.2;">
        <h3 style="font-size: 24px; color: #38bdf8; margin-bottom: 16px;">The Deliberate Leverage Direction</h3>
        <p style="font-size: 18px; line-height: 1.7; color: #cbd5e1; margin-bottom: 20px;">
          Code generation has accelerated 100x, but human verification remains a bottleneck. My public investment has focused on building machine-verifiable evaluation gates that eliminate manual review fatigue.
        </p>
        <div style="background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 12px; padding: 18px;">
          <div style="font-size: 17px; font-weight: 700; color: #38bdf8; margin-bottom: 8px;">Key Public Contributions & Focus:</div>
          <div style="font-size: 15px; color: #cbd5e1; line-height: 1.6;">
            1. Open frameworks for GenAI & LLM benchmark scoring.<br>
            2. Shift from manual human PR reviews to machine-executable invariant contracts.<br>
            3. Automated adversarial security and mutation gates in CI/CD.
          </div>
        </div>
      </div>
      <div class="card" style="flex: 0.8; display: flex; flex-direction: column; justify-content: center;">
        <div class="metric-val purple">1+ Year</div>
        <div class="metric-lbl" style="margin-bottom: 20px;">Public Strategic Focus</div>
        <div style="font-size: 16px; color: #cbd5e1; line-height: 1.6;">
          From traditional manual testing $\to$<br>
          <strong style="color: #38bdf8;">Autonomous AI-Native Quality Engineering</strong>
        </div>
      </div>
    `,
  },
  {
    id: 'career_05_quest_connection',
    title: 'Quest Connection: The Future of Release',
    subtitle: 'AetherGate as the Direct Culmination of My Career Leverage',
    badge: 'PART 05 • QUEST SYNTHESIS',
    text: `This quest directly represents the culmination of this career leverage. AetherGate proves that software quality can become an autonomous, machine-verifiable property of development. By combining machine-executable contracts, adversarial testing, and invariant-constrained self-healing, we achieve zero-touch releases that are faster and safer than human-gated processes. Thank you.`,
    content: `
      <div class="card" style="flex: 1;">
        <h3 style="font-size: 24px; color: #4ade80; margin-bottom: 16px;">Why This Quest Matters</h3>
        <p style="font-size: 18px; line-height: 1.7; color: #cbd5e1; margin-bottom: 20px;">
          The AI-Native Quality Engineer Quest is the exact embodiment of what I have prepared for over the past 8 years:
        </p>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 14px;">
            <strong style="color: #38bdf8;">SDET Infrastructure:</strong> Fast-Check generative property testing and 100% mutation kill power.
          </div>
          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 14px;">
            <strong style="color: #facc15;">Security Engineering:</strong> Invariant-level BOLA and injection defense.
          </div>
          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 14px;">
            <strong style="color: #4ade80;">Autonomous Systems:</strong> Millisecond self-healing and cryptographic release attestations.
          </div>
        </div>
      </div>
      <div class="card" style="flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <h3 style="font-size: 24px; color: #f8fafc; margin-bottom: 16px;">Engineering Vision</h3>
          <p style="font-size: 17px; line-height: 1.7; color: #94a3b8;">
            The future of software quality is not writing more repetitive test scripts or reading PR diffs under cognitive fatigue. It is designing self-healing, mathematically attested release gates.
          </p>
        </div>
        <div style="background: rgba(74, 222, 128, 0.1); border: 1px solid rgba(74, 222, 128, 0.4); border-radius: 12px; padding: 18px; text-align: center;">
          <div style="font-size: 20px; font-weight: 800; color: #4ade80;">Ready for AI-Native Quality Engineering</div>
          <div style="font-size: 15px; color: #cbd5e1; margin-top: 4px;">Mejbaur Bahar Fagun • linkedin.com/in/mejbaur</div>
        </div>
      </div>
    `,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// VIDEO COMPILATION FUNCTION
// ─────────────────────────────────────────────────────────────────────────────
async function generateVideo(videoName, scenes, outputFileName) {
  console.log(`\n================== GENERATING ${videoName} ==================`);
  const sceneClips = [];

  for (let i = 0; i < scenes.length; i++) {
    const sc = scenes[i];
    const prefix = `${videoName.toLowerCase().replace(/\s+/g, '_')}_scene_${i + 1}`;
    const htmlPath = path.join(MEDIA_DIR, `${prefix}.html`);
    const imgPath = path.join(MEDIA_DIR, `${prefix}.png`);
    const aiffPath = path.join(MEDIA_DIR, `${prefix}.aiff`);
    const mp3Path = path.join(MEDIA_DIR, `${prefix}.mp3`);
    const clipPath = path.join(MEDIA_DIR, `${prefix}.mp4`);

    console.log(`\n[SCENE ${i + 1}/${scenes.length}] ${sc.title}`);

    // 1. Write HTML
    const html = createSlideHtml(sc.title, sc.subtitle, sc.badge, sc.content);
    fs.writeFileSync(htmlPath, html, 'utf-8');

    // 2. Generate Audio with macOS say
    console.log(`  -> Generating speech audio...`);
    run(`say -v "Daniel" -o "${aiffPath}" "${sc.text.replace(/"/g, '\\"')}"`);
    run(`ffmpeg -i "${aiffPath}" -y "${mp3Path}" 2>/dev/null`);

    // 3. Get exact audio duration
    const durationStr = run(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${mp3Path}"`
    ).trim();
    const duration = parseFloat(durationStr) + 0.8; // Add 0.8s buffer
    console.log(`  -> Audio duration: ${duration.toFixed(2)}s`);

    // 4. Render HTML to 1080p PNG using Chrome
    console.log(`  -> Rendering 1920x1080 slide image...`);
    run(
      `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --screenshot="${imgPath}" --window-size=1920,1080 --default-background-color=000000 "file://${htmlPath}" 2>/dev/null`
    );

    // 5. Combine slide image and audio into MP4 scene clip
    console.log(`  -> Encoding MP4 clip...`);
    run(
      `ffmpeg -loop 1 -i "${imgPath}" -i "${mp3Path}" -c:v libx264 -tune stillimage -c:a aac -b:a 192k -pix_fmt yuv420p -t ${duration} -y "${clipPath}" 2>/dev/null`
    );

    sceneClips.push(clipPath);
  }

  // 6. Concatenate all scene clips into the final video
  console.log(`\n[CONCAT] Merging all clips into ${outputFileName}...`);
  const listFile = path.join(MEDIA_DIR, `${videoName.toLowerCase().replace(/\s+/g, '_')}_list.txt`);
  const listContent = sceneClips.map((c) => `file '${c}'`).join('\n');
  fs.writeFileSync(listFile, listContent, 'utf-8');

  const finalVideoPath = path.join(MEDIA_DIR, outputFileName);
  run(`ffmpeg -f concat -safe 0 -i "${listFile}" -c copy -y "${finalVideoPath}" 2>/dev/null`);

  const finalDuration = run(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${finalVideoPath}"`
  ).trim();
  console.log(`✔ Generated ${outputFileName}: ${(parseFloat(finalDuration) / 60).toFixed(2)} minutes (${finalDuration}s)`);

  return finalVideoPath;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  const demoVideoPath = await generateVideo('AetherGate Demo', demoScenes, 'aethergate-demo-video.mp4');
  const careerVideoPath = await generateVideo('Career Path & Leverage', careerScenes, 'career-path-leverage-video.mp4');

  console.log('\n================== VIDEO PRODUCTION COMPLETE ==================');
  console.log(`1. Demo Video:   ${demoVideoPath}`);
  console.log(`2. Career Video: ${careerVideoPath}`);
}

main().catch((err) => {
  console.error('Fatal error during video production:', err);
  process.exit(1);
});
