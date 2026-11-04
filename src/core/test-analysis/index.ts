/**
 * Change Archaeologist - Test Analysis Subsystem
 */

export {
  TestLocator,
  type TestDeclaration,
  type TestDeclarationKind,
} from "./test-locator.js";

export {
  AssertionExtractor,
  type AssertionDescriptor,
  type ExtractionResult,
} from "./assertion-extractor.js";

export {
  TestChangeComparator,
  type CompareTestFileInput,
  type FileComparisonResult,
} from "./test-change-comparator.js";

export {
  TestAnalysisService,
  analyzeTestChanges,
  type TestAnalysisServiceOptions,
} from "./test-analysis-service.js";

