/**
 * Change Archaeologist — Production-Test Correlation Graph Model Generator
 *
 * Derives a deterministic, typed presentation graph model strictly from
 * validated AnalysisReport data without inventing intermediate history,
 * synthetic dependencies, or unverified runtime causality.
 */

import type {
  AnalysisReport,
  CorrelationGraphModel,
  CorrelationGraphNode,
  CorrelationGraphEdge,
  GraphSummary,
  SourceSpan,
  CorrelationStatus,
} from "../types/index.js";

/**
 * Sanitizes a file path or string to be safe for DOM/SVG IDs.
 */
function sanitizeId(input: string): string {
  return input.replace(/[^a-zA-Z0-9_-]/g, "_");
}

/**
 * Derives unique evidence IDs linked to a structural change from findings.
 */
function getEvidenceIdsForStructuralChange(
  scId: string,
  report: AnalysisReport
): readonly string[] {
  const evSet = new Set<string>();

  for (const finding of report.findings) {
    if (finding.structuralChangeIds.includes(scId)) {
      for (const obs of finding.observed) {
        for (const evId of obs.evidenceIds) {
          evSet.add(evId);
        }
      }
    }
  }

  if (report.correlationItems) {
    for (const item of report.correlationItems) {
      if (item.structuralChangeId === scId) {
        for (const evId of item.evidenceIds) {
          evSet.add(evId);
        }
      }
    }
  }

  return Array.from(evSet);
}

/**
 * Derives finding IDs linked to a structural change.
 */
function getFindingIdsForStructuralChange(
  scId: string,
  report: AnalysisReport
): readonly string[] {
  const findingSet = new Set<string>();
  for (const finding of report.findings) {
    if (finding.structuralChangeIds.includes(scId)) {
      findingSet.add(finding.id);
    }
  }
  return Array.from(findingSet);
}

/**
 * Pure generator constructing a CorrelationGraphModel from an AnalysisReport.
 */
export function buildCorrelationGraphModel(report: AnalysisReport): CorrelationGraphModel {
  const nodes: CorrelationGraphNode[] = [];
  const edges: CorrelationGraphEdge[] = [];

  const isIncomplete =
    report.status.startsWith("INCOMPLETE") ||
    report.headFunction === null ||
    report.baseFunction === null;

  let incompleteReason: string | null = null;
  if (isIncomplete) {
    if (report.limitations.length > 0) {
      incompleteReason = report.limitations[0];
    } else if (report.headFunction === null) {
      incompleteReason = `Target function '${report.request.targetFunctionName}' was deleted or renamed in HEAD revision.`;
    } else {
      incompleteReason = `Analysis status '${report.status}' prevented complete correlation graph generation.`;
    }
  }

  // 1. Production Target Function Node
  const targetFnId = "node-target-fn";
  const functionStatus =
    report.headFunction !== null && report.headFunction !== undefined
      ? "PRESENT"
      : report.status === "INCOMPLETE_FUNCTION_MISSING" || report.headFunction === null
      ? "DELETED"
      : "UNAVAILABLE";

  const targetFnSpan: SourceSpan | null =
    report.headFunction?.span ?? report.baseFunction?.span ?? null;

  const structuralChanges = report.structuralChanges;
  const testChanges = report.testChanges;
  const declarationChanges = report.declarationChanges ?? [];

  const targetFnY =
    structuralChanges.length > 0
      ? 60 + Math.max(0, (structuralChanges.length - 1) * 150) / 2
      : 80;

  nodes.push({
    id: targetFnId,
    type: "productionFunction",
    position: { x: 50, y: targetFnY },
    data: {
      id: targetFnId,
      entityId: report.request.targetFunctionName,
      category: "PRODUCTION_FUNCTION",
      title: `${report.request.targetFunctionName}()`,
      subtitle: report.request.targetFilePath,
      filePath: report.request.targetFilePath,
      span: targetFnSpan,
      functionStatus,
      evidenceIds: [],
      findingIds: [],
      epistemicTag: "OBSERVED",
      isSourceAvailable: report.headFunction !== null || report.baseFunction !== null,
      rawEntity: null,
    },
  });

  // 2. Structural Change Nodes (Production Side)
  structuralChanges.forEach((sc, index) => {
    const scNodeId = `node-sc-${sc.id}`;
    const evidenceIds = getEvidenceIdsForStructuralChange(sc.id, report);
    const findingIds = getFindingIdsForStructuralChange(sc.id, report);

    // Find correlation status for this structural change
    let corrStatus: CorrelationStatus | null = null;
    if (report.correlationItems) {
      const match = report.correlationItems.find((c) => c.structuralChangeId === sc.id);
      if (match) corrStatus = match.status;
    }

    nodes.push({
      id: scNodeId,
      type: "structuralChange",
      position: { x: 410, y: 60 + index * 150 },
      data: {
        id: scNodeId,
        entityId: sc.id,
        category: "STRUCTURAL_CHANGE",
        title: sc.id,
        subtitle: sc.category,
        filePath: report.request.targetFilePath,
        span: sc.afterSpan ?? sc.beforeSpan,
        changeType: sc.changeType,
        correlationStatus: corrStatus,
        evidenceIds,
        findingIds,
        epistemicTag: "OBSERVED",
        isSourceAvailable: sc.afterSpan !== null || sc.beforeSpan !== null,
        rawEntity: sc,
      },
    });

    // Edge: Target Function -> Structural Change
    edges.push({
      id: `edge-target-sc-${sc.id}`,
      source: targetFnId,
      target: scNodeId,
      sourceHandle: "source-right",
      targetHandle: "target-left",
      type: "containment",
      data: {
        id: `edge-target-sc-${sc.id}`,
        category: "TARGET_CONTAINS_CHANGE",
        label: "contains mutation",
        status: null,
        classification: null,
        rationale: `Target function '${report.request.targetFunctionName}' contains structural mutation ${sc.id}`,
        evidenceIds,
        sourceEntityId: report.request.targetFunctionName,
        targetEntityId: sc.id,
        epistemicTag: "OBSERVED",
      },
    });
  });

  // 3. Test File Nodes and Test Changes (Test Side)
  // Group test changes by file
  const testFilesMap = new Map<string, string>(); // filePath -> fileNodeId
  testChanges.forEach((tc) => {
    if (!testFilesMap.has(tc.posixTestFilePath)) {
      const tfNodeId = `node-tf-${sanitizeId(tc.posixTestFilePath)}`;
      testFilesMap.set(tc.posixTestFilePath, tfNodeId);
    }
  });
  declarationChanges.forEach((tdc) => {
    if (!testFilesMap.has(tdc.posixTestFilePath)) {
      const tfNodeId = `node-tf-${sanitizeId(tdc.posixTestFilePath)}`;
      testFilesMap.set(tdc.posixTestFilePath, tfNodeId);
    }
  });

  // Render Test File Nodes (far right column)
  let tfIndex = 0;
  testFilesMap.forEach((tfNodeId, filePath) => {
    const matchingTc = testChanges.find((tc) => tc.posixTestFilePath === filePath);
    const testFileY =
      testChanges.length > 0
        ? 60 + Math.max(0, (testChanges.length - 1) * 150) / 2 + tfIndex * 150
        : 80 + tfIndex * 150;

    nodes.push({
      id: tfNodeId,
      type: "testFile",
      position: { x: 1290, y: testFileY },
      data: {
        id: tfNodeId,
        entityId: filePath,
        category: "TEST_FILE",
        title: filePath.split("/").pop() ?? filePath,
        subtitle: filePath,
        filePath,
        span: null,
        changeType: matchingTc?.fileChangeStatus ?? "MODIFIED",
        evidenceIds: [],
        findingIds: [],
        epistemicTag: "OBSERVED",
        isSourceAvailable: true,
        rawEntity: matchingTc ?? null,
      },
    });
    tfIndex++;
  });

  // Render Test Change Nodes (middle test column)
  testChanges.forEach((tc, index) => {
    const tcNodeId = `node-tc-${tc.id}`;
    const tfNodeId = testFilesMap.get(tc.posixTestFilePath);

    // Collect evidence IDs for this test change
    const evIds: string[] = [];
    if (report.correlationItems) {
      for (const item of report.correlationItems) {
        if (item.testChangeId === tc.id) {
          for (const evId of item.evidenceIds) {
            evIds.push(evId);
          }
        }
      }
    }

    nodes.push({
      id: tcNodeId,
      type: "testChange",
      position: { x: 930, y: 60 + index * 150 },
      data: {
        id: tcNodeId,
        entityId: tc.id,
        category: "TEST_CHANGE",
        title: tc.id,
        subtitle: `${tc.assertionChanges.length} assertion change(s)`,
        filePath: tc.posixTestFilePath,
        span: tc.assertionChanges[0]?.afterSpan ?? tc.assertionChanges[0]?.beforeSpan ?? null,
        changeType: tc.fileChangeStatus,
        evidenceIds: Array.from(new Set(evIds)),
        findingIds: [],
        epistemicTag: "OBSERVED",
        isSourceAvailable: tc.assertionChanges.length > 0,
        rawEntity: tc,
      },
    });

    // Edge: Test File -> Test Change
    if (tfNodeId) {
      edges.push({
        id: `edge-tf-tc-${tc.id}`,
        source: tfNodeId,
        target: tcNodeId,
        sourceHandle: "source-left",
        targetHandle: "target-right",
        type: "containment",
        data: {
          id: `edge-tf-tc-${tc.id}`,
          category: "TEST_FILE_CONTAINS_CHANGE",
          label: tc.fileChangeStatus,
          status: null,
          classification: null,
          rationale: `Test file '${tc.posixTestFilePath}' contains change ${tc.id}`,
          evidenceIds: evIds,
          sourceEntityId: tc.posixTestFilePath,
          targetEntityId: tc.id,
          epistemicTag: "OBSERVED",
        },
      });
    }
  });

  // Render Test Declaration Nodes (if any)
  declarationChanges.forEach((tdc, index) => {
    const tdcNodeId = `node-tdc-${tdc.id}`;
    const tfNodeId = testFilesMap.get(tdc.posixTestFilePath);

    nodes.push({
      id: tdcNodeId,
      type: "testDeclaration",
      position: { x: 930, y: 60 + (testChanges.length + index) * 150 },
      data: {
        id: tdcNodeId,
        entityId: tdc.id,
        category: "TEST_DECLARATION",
        title: tdc.id,
        subtitle: tdc.fullTitle,
        filePath: tdc.posixTestFilePath,
        span: tdc.afterSpan ?? tdc.beforeSpan ?? null,
        changeType: tdc.changeType,
        evidenceIds: [],
        findingIds: [],
        epistemicTag: "OBSERVED",
        isSourceAvailable: tdc.afterSpan !== null || tdc.beforeSpan !== null,
        rawEntity: tdc,
      },
    });

    // Edge: Test File -> Test Declaration
    if (tfNodeId) {
      edges.push({
        id: `edge-tf-tdc-${tdc.id}`,
        source: tfNodeId,
        target: tdcNodeId,
        sourceHandle: "source-left",
        targetHandle: "target-right",
        type: "containment",
        data: {
          id: `edge-tf-tdc-${tdc.id}`,
          category: "TEST_FILE_CONTAINS_DECLARATION",
          label: tdc.changeType,
          status: null,
          classification: null,
          rationale: `Test file '${tdc.posixTestFilePath}' contains declaration ${tdc.id}`,
          evidenceIds: [],
          sourceEntityId: tdc.posixTestFilePath,
          targetEntityId: tdc.id,
          epistemicTag: "OBSERVED",
        },
      });
    }
  });

  // 4. Cross-Side Correlation Edges: Structural Change <-> Test Change
  let strongCount = 0;
  let weakCount = 0;
  let noneCount = 0;
  let uncertainCount = 0;

  if (report.correlationItems && report.correlationItems.length > 0) {
    report.correlationItems.forEach((item) => {
      // Update status counts
      if (item.status === "STRONG") strongCount++;
      else if (item.status === "WEAK") weakCount++;
      else if (item.status === "NONE") noneCount++;
      else if (item.status === "UNCERTAIN") uncertainCount++;

      // Only draw edge if both structuralChangeId and testChangeId exist in report
      if (item.structuralChangeId && item.testChangeId) {
        const sourceNodeId = `node-sc-${item.structuralChangeId}`;
        const targetNodeId = `node-tc-${item.testChangeId}`;

        // Verify both nodes exist in the graph model
        const sourceExists = nodes.some((n) => n.id === sourceNodeId);
        const targetExists = nodes.some((n) => n.id === targetNodeId);

        if (sourceExists && targetExists) {
          edges.push({
            id: `edge-corr-${item.id}`,
            source: sourceNodeId,
            target: targetNodeId,
            sourceHandle: "source-right",
            targetHandle: "target-left",
            type: "correlation",
            data: {
              id: `edge-corr-${item.id}`,
              category: "CORRELATED_WITH",
              label: `${item.status} CORRELATION`,
              status: item.status,
              classification: item.classification,
              rationale: item.rationale,
              evidenceIds: item.evidenceIds,
              sourceEntityId: item.structuralChangeId,
              targetEntityId: item.testChangeId,
              epistemicTag: "INFERRED",
            },
          });
        }
      }
    });
  }

  const productionNodeCount = nodes.filter(
    (n) => n.data.category === "PRODUCTION_FUNCTION" || n.data.category === "STRUCTURAL_CHANGE"
  ).length;

  const testNodeCount = nodes.filter(
    (n) =>
      n.data.category === "TEST_FILE" ||
      n.data.category === "TEST_CHANGE" ||
      n.data.category === "TEST_DECLARATION"
  ).length;

  const correlationEdgeCount = edges.filter(
    (e) => e.data.category === "CORRELATED_WITH"
  ).length;

  const summary: GraphSummary = {
    productionNodeCount,
    testNodeCount,
    correlationEdgeCount,
    strongCount,
    weakCount,
    noneCount,
    uncertainCount,
  };

  const isEmpty = nodes.length <= 1 && structuralChanges.length === 0 && testChanges.length === 0;

  const drawnEdgeIds = new Set(edges.map((e) => e.id));
  const unattachedItems = (report.correlationItems ?? []).filter(
    (item) => !drawnEdgeIds.has(`edge-corr-${item.id}`)
  );

  return {
    nodes,
    edges,
    summary,
    unattachedItems,
    isIncomplete,
    incompleteReason,
    isEmpty,
  };
}
