/**
 * DocIntel post-generation validators.
 * Run after strict JSON parse (guaranteed by schema) to catch semantic issues:
 * word budgets, Mermaid syntax, array lengths.
 */

// ─── Types ─────────────────────────────────────────────────

export interface ValidationError {
  field: string;
  message: string;
}

// ─── Word Count ────────────────────────────────────────────

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function validateWordBudget(
  fieldName: string,
  text: string,
  maxWords: number,
): ValidationError | null {
  const count = countWords(text);
  if (count > maxWords) {
    return {
      field: fieldName,
      message: `${fieldName} is ${count} words, max is ${maxWords}. Shorten to fit.`,
    };
  }
  return null;
}

// ─── Array Length ───────────────────────────────────────────

export function validateArrayLength(
  fieldName: string,
  arr: unknown[],
  target: number,
  tolerance: number = 1,
): ValidationError | null {
  if (arr.length < target - tolerance || arr.length > target + tolerance) {
    return {
      field: fieldName,
      message: `${fieldName} has ${arr.length} items, expected ${target} (±${tolerance}). Adjust count.`,
    };
  }
  return null;
}

// ─── Mermaid Syntax ────────────────────────────────────────

export async function validateMermaidSyntax(
  fieldName: string,
  source: string,
): Promise<ValidationError | null> {
  try {
    const mermaid = await import('mermaid');
    await mermaid.default.parse(source);
    return null;
  } catch (err) {
    return {
      field: fieldName,
      message: `${fieldName} has invalid Mermaid syntax: ${err instanceof Error ? err.message : String(err)}. Fix the syntax.`,
    };
  }
}

// ─── Composite Validators ──────────────────────────────────

export interface ComplexityTargets {
  summaryWords: number;
  insightCount: number;
  diagramCount: number;
}

export function validateSummary(
  parsed: Record<string, unknown>,
  targets: ComplexityTargets,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const summary = validateWordBudget('executive_summary', String(parsed.executive_summary ?? ''), targets.summaryWords);
  if (summary) errors.push(summary);
  const brief = validateWordBudget('audience_brief', String(parsed.audience_brief ?? ''), 200);
  if (brief) errors.push(brief);
  const title = validateWordBudget('title', String(parsed.title ?? ''), 10);
  if (title) errors.push(title);
  return errors;
}

export function validateInsights(
  parsed: Record<string, unknown>,
  targets: ComplexityTargets,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const insights = parsed.key_insights as unknown[] ?? [];
  const insightLen = validateArrayLength('key_insights', insights, targets.insightCount, 2);
  if (insightLen) errors.push(insightLen);
  return errors;
}

export async function validateVisuals(
  parsed: Record<string, unknown>,
  targets: ComplexityTargets,
): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];
  const diagrams = (parsed.diagrams as Array<Record<string, unknown>>) ?? [];
  const count = validateArrayLength('diagrams', diagrams, targets.diagramCount, 1);
  if (count) errors.push(count);
  for (let i = 0; i < diagrams.length; i++) {
    const src = String(diagrams[i]?.mermaid_source ?? '');
    if (src.trim()) {
      const err = await validateMermaidSyntax(`diagrams[${i}].mermaid_source`, src);
      if (err) errors.push(err);
    }
  }
  return errors;
}

// ─── Retry Message Builder ─────────────────────────────────

export function buildRetryMessage(errors: ValidationError[]): string {
  const errorText = errors.map((e) => `- ${e.field}: ${e.message}`).join('\n');
  return `Validation Error found:\n${errorText}\nRecall the function correctly, fix the errors`;
}
