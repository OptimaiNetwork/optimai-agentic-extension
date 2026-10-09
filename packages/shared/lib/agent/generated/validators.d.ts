/**
 * Types for the generated validators.
 *
 * Hand-written because Ajv's standalone output is JavaScript: this declares the
 * shape, and the *contents* are generated. The predicate returns `unknown`
 * rather than a card type on purpose — passing the schema is a structural
 * result, and the semantic invariants a schema cannot express (stance counts
 * summing to the sample, a flow's edges pointing at declared nodes) are checked
 * in `validation.ts` afterwards. Narrowing here would let a caller skip them.
 */
export interface GeneratedValidator {
  (data: unknown): boolean
  errors?: { instancePath?: string; message?: string }[] | null
}

export declare const validateResearchCard: GeneratedValidator
export declare const validateVisualizationSpec: GeneratedValidator
export declare const validateActivitySnapshot: GeneratedValidator

/** Repeated elements, validated item by item so one bad item costs one item. */
export declare const validateResearchPostSnapshot: GeneratedValidator
export declare const validateStanceAnnotation: GeneratedValidator
export declare const validateComparisonRow: GeneratedValidator
export declare const validatePriceReading: GeneratedValidator
export declare const validateActivityStep: GeneratedValidator
