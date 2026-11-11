import { z } from 'zod';
import * as fc from 'fast-check';
import { MachineExecutableSpec } from '../core/spec-engine';
import { CandidateImplementation } from '../core/adversarial-engine';
import { Mutant } from '../core/mutation-engine';

// ─────────────────────────────────────────────────────────────────────────────
// DOMAIN SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

export interface CheckoutInput {
  tenantId: string;
  userId: string;
  customerPhone: string;
  items: Array<{ id: string; name: string; price: number; quantity: number }>;
  shippingFee: number;
  couponCode?: string | null;
  currency: 'BDT' | 'USD' | 'SAR';
  idempotencyKey: string;
}

export interface CheckoutOutput {
  orderId: string;
  status: 'CONFIRMED' | 'REJECTED';
  subtotal: number;
  discountApplied: number;
  shippingFee: number;
  finalTotal: number;
  currency: 'BDT' | 'USD' | 'SAR';
  customerPhone: string;
  promotionalMessage: string | null;
}

export const CheckoutInputSchema = z.object({
  tenantId: z.string().min(1),
  userId: z.string().min(1),
  customerPhone: z.string().min(7),
  items: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      price: z.number().positive(),
      quantity: z.number().int().positive(),
    }),
  ).min(1),
  shippingFee: z.number().nonnegative(),
  couponCode: z.string().nullable().optional(),
  currency: z.enum(['BDT', 'USD', 'SAR']),
  idempotencyKey: z.string().min(1),
});

export const CheckoutOutputSchema = z.object({
  orderId: z.string(),
  status: z.enum(['CONFIRMED', 'REJECTED']),
  subtotal: z.number().nonnegative(),
  discountApplied: z.number().nonnegative(),
  shippingFee: z.number().nonnegative(),
  finalTotal: z.number().nonnegative(),
  currency: z.enum(['BDT', 'USD', 'SAR']),
  customerPhone: z.string(),
  promotionalMessage: z.string().nullable(),
});

// ─────────────────────────────────────────────────────────────────────────────
// MACHINE-EXECUTABLE SPECIFICATION
// ─────────────────────────────────────────────────────────────────────────────

export const EcommerceCheckoutSpec: MachineExecutableSpec<CheckoutInput, CheckoutOutput> = {
  id: 'spec_ecom_checkout_v1',
  name: 'Enterprise Checkout & Order State Machine',
  version: '1.2.0',
  domain: 'Ecommerce/Payments',
  inputSchema: CheckoutInputSchema,
  outputSchema: CheckoutOutputSchema,
  preconditions: [
    {
      name: 'VALID_CART_ITEMS',
      check: (input) => input.items.length > 0 && input.items.every((i) => i.quantity > 0 && i.price > 0),
      failMessage: 'Order must contain at least 1 valid item with positive price and quantity',
    },
    {
      name: 'VALID_CURRENCY',
      check: (input) => ['BDT', 'USD', 'SAR'].includes(input.currency),
      failMessage: 'Currency must be BDT, USD, or SAR',
    },
  ],
  postconditions: [
    {
      name: 'ARITHMETIC_INTEGRITY',
      check: (input, output) => {
        const expectedSubtotal = input.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const mathCheck = Math.abs(output.finalTotal - (expectedSubtotal - output.discountApplied + output.shippingFee)) < 0.01;
        return mathCheck;
      },
      failMessage: 'finalTotal does not match subtotal - discount + shippingFee',
    },
    {
      name: 'CONFIRMED_ORDER_ID_EXISTS',
      check: (_input, output) => Boolean(output.orderId && output.orderId.startsWith('NRJ-')),
      failMessage: 'Confirmed orders must have a valid persistent order identifier starting with NRJ-',
    },
  ],
  invariants: [
    {
      id: 'INV_NO_FALSE_DISCOUNT',
      name: 'No False Discount Claims Without Active Promotion',
      severity: 'CRITICAL',
      description: 'The agent must never claim or apply discounts unless a validated coupon exists',
      validate: (ctx) => {
        if (!ctx.input.couponCode && (ctx.output?.discountApplied ?? 0) > 0) {
          return {
            passed: false,
            code: 'FALSE_DISCOUNT',
            message: `Discounts applied (${ctx.output?.discountApplied}) without valid active couponCode`,
          };
        }
        if (!ctx.input.couponCode && ctx.output?.promotionalMessage) {
          return {
            passed: false,
            code: 'MISLEADING_PROMOTION',
            message: `Agent emitted promotional claim without active coupon`,
          };
        }
        return { passed: true, code: 'OK', message: 'Valid discount policy' };
      },
    },
    {
      id: 'INV_PII_MASKING',
      name: 'Customer Phone Masking in Presentation',
      severity: 'HIGH',
      description: 'Customer phone number must be masked in customer-facing outputs to protect privacy',
      validate: (ctx) => {
        if (ctx.output?.customerPhone && !ctx.output.customerPhone.includes('XXXXXX')) {
          return {
            passed: false,
            code: 'PII_LEAK',
            message: `Customer phone number ${ctx.output.customerPhone} is not masked (expected format +880 19XXXXXX646)`,
          };
        }
        return { passed: true, code: 'OK', message: 'PII correctly masked' };
      },
    },
  ],
  securityPolicies: [
    {
      id: 'SEC_BOLA_ISOLATION',
      type: 'BOLA',
      description: 'Broken Object Level Authorization Shield',
      verify: (ctx) => {
        if (ctx.actor) {
          if (ctx.actor.tenantId !== ctx.input.tenantId) {
            return {
              passed: false,
              code: 'CROSS_TENANT_VIOLATION',
              message: `Actor tenant ${ctx.actor.tenantId} cannot execute checkout for tenant ${ctx.input.tenantId}`,
            };
          }
          if (ctx.actor.id !== ctx.input.userId && ctx.actor.role !== 'admin') {
            return {
              passed: false,
              code: 'BOLA_USER_MISMATCH',
              message: `Actor ${ctx.actor.id} cannot manipulate cart of user ${ctx.input.userId}`,
            };
          }
        }
        return { passed: true, code: 'OK', message: 'Authorization verified' };
      },
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// CANDIDATE IMPLEMENTATIONS (FLAWED vs HEALED)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The initial AI-generated candidate implementation exhibiting the exact 3 bugs
 * observed in the QA report:
 * 1. Claims false discount without coupon.
 * 2. Does not mask customer phone number.
 * 3. Lacks BOLA ownership verification.
 */
export const FlawedAICandidateImplementation: CandidateImplementation<CheckoutInput, CheckoutOutput> = {
  id: 'impl_ai_candidate_flawed_v1',
  execute: async (input: CheckoutInput) => {
    const subtotal = input.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // BUG 1: AI hallucinated a false 10% discount promo
    const discountApplied = 5.0; // False discount!
    const promotionalMessage = 'We have a great offer for you!';

    const finalTotal = subtotal - discountApplied + input.shippingFee;

    // BUG 2: Leaves customer phone unmasked
    const customerPhone = input.customerPhone;

    // BUG 3: Does not check BOLA / tenant context (handled by caller or shield)

    const orderId = `NRJ-${Math.floor(10000 + Math.random() * 90000)}`;

    return {
      output: {
        orderId,
        status: 'CONFIRMED',
        subtotal,
        discountApplied,
        shippingFee: input.shippingFee,
        finalTotal,
        currency: input.currency,
        customerPhone,
        promotionalMessage,
      },
    };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ARBITRARY INPUT GENERATOR (FOR ADVERSARIAL FAST-CHECK)
// ─────────────────────────────────────────────────────────────────────────────

export const arbitraryCheckoutInput: fc.Arbitrary<CheckoutInput> = fc.record({
  tenantId: fc.constantFrom('tenant_primary', 'tenant_retail_bd'),
  userId: fc.constantFrom('usr_fuzz_1', 'usr_fuzz_2'),
  customerPhone: fc.constantFrom('01987445646', '01711223344', '+8801987445646'),
  items: fc.array(
    fc.record({
      id: fc.string({ minLength: 3, maxLength: 8 }),
      name: fc.constantFrom('Summer Linen Shirt', 'Denim Jacket', 'Silk Scarf'),
      price: fc.integer({ min: 10, max: 200 }).map((p) => Number(p.toFixed(2))),
      quantity: fc.integer({ min: 1, max: 5 }),
    }),
    { minLength: 1, maxLength: 4 },
  ),
  shippingFee: fc.constantFrom(0, 60, 100),
  couponCode: fc.constantFrom(null, undefined, 'FAGUN20'),
  currency: fc.constantFrom<'BDT' | 'USD' | 'SAR'>('BDT', 'USD', 'SAR'),
  idempotencyKey: fc.uuid(),
});

// ─────────────────────────────────────────────────────────────────────────────
// SYNTHETIC MUTANTS (FOR MUTATION KILL HARDENING)
// ─────────────────────────────────────────────────────────────────────────────

export const checkoutMutants: Mutant<CheckoutInput, CheckoutOutput, any>[] = [
  {
    id: 'MUTANT_01_REMOVE_DISCOUNT_GUARD',
    description: 'Forces discount to apply even when couponCode is completely missing',
    mutate: (impl) => ({
      id: `${impl.id}_mutant_01`,
      execute: async (input, ctx) => {
        const res = await impl.execute(input, ctx);
        res.output.discountApplied = 20.0;
        res.output.promotionalMessage = 'Fake mutated discount!';
        return res;
      },
    }),
  },
  {
    id: 'MUTANT_02_CORRUPT_ARITHMETIC',
    description: 'Mutates total calculation to add discount instead of subtracting',
    mutate: (impl) => ({
      id: `${impl.id}_mutant_02`,
      execute: async (input, ctx) => {
        const res = await impl.execute(input, ctx);
        res.output.finalTotal = res.output.subtotal + res.output.discountApplied + res.output.shippingFee;
        return res;
      },
    }),
  },
  {
    id: 'MUTANT_03_UNMASK_PHONE_PII',
    description: 'Strips mask from customer phone number',
    mutate: (impl) => ({
      id: `${impl.id}_mutant_03`,
      execute: async (input, ctx) => {
        const res = await impl.execute(input, ctx);
        res.output.customerPhone = input.customerPhone; // Clear raw unmasked
        return res;
      },
    }),
  },
  {
    id: 'MUTANT_04_BYPASS_TENANT_ISOLATION',
    description: 'Swaps tenant ID on execution allowing unauthorized cross-tenant leak',
    mutate: (impl) => ({
      id: `${impl.id}_mutant_04`,
      execute: async (input, ctx) => {
        const modifiedCtx = {
          input,
          ...ctx,
          actor: { id: 'malicious_user', tenantId: 'tenant_foreign_hacker', role: 'user' as const },
        };
        return impl.execute(input, modifiedCtx);
      },
    }),
  },
];
