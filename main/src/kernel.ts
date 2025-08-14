// Kernel Enforcement for JRVI
// Usage: import { enforceKernel } from './kernel'; enforceKernel(context)
// Phase 11: Extended with device awareness and tone monitoring compliance

import { logger } from './utils/logging';

interface KernelContext {
  persona: string;
  deviceId?: string;
  deviceAction?: string;
  toneContext?: any;
  traceId?: string;
  complianceRequired?: boolean;
}

export interface AuditInfo {
  persona: string;
  traceId: string;
  timestamp: Date;
  compliance: boolean;
  reviewRequired: boolean;
  tags: string[];
}

export function enforceKernel(context: KernelContext) {
  // Check for required fields, persona, compliance
  if (!context || !context.persona) {
    logger.error(
      'Kernel enforcement failed: missing persona',
      'kernel-enforcement',
      { context }
    );
    throw new Error('Kernel enforcement failed: missing persona');
  }

  // Device-specific validations
  if (context.deviceId) {
    if (!context.traceId) {
      logger.error(
        'Kernel enforcement failed: device operations require traceId',
        'kernel-enforcement',
        { context }
      );
      throw new Error('Kernel enforcement failed: device operations require traceId');
    }

    // Validate device action compliance
    if (context.deviceAction && context.complianceRequired) {
      if (!validateDeviceActionCompliance(context)) {
        logger.error(
          'Kernel enforcement failed: device action compliance violation',
          'kernel-enforcement',
          { context }
        );
        throw new Error('Kernel enforcement failed: device action compliance violation');
      }
    }
  }

  // Validate toneContext if present
  if (context.toneContext) {
    if (typeof context.toneContext !== 'object' || Array.isArray(context.toneContext)) {
      logger.error(
        'Kernel enforcement failed: invalid toneContext format',
        'kernel-enforcement',
        { context }
      );
      throw new Error('Kernel enforcement failed: invalid toneContext format');
    }
    // Additional toneContext validation can be added here
  }

  // Add more checks as needed for JRVI Core Principles
  logger.info(
    'Kernel enforcement passed',
    'kernel-enforcement',
    { context }
  );
  return true;
}

/**
 * Validate device action compliance with JRVI principles
 */
function validateDeviceActionCompliance(context: KernelContext): boolean {
  // Basic compliance checks
  if (!context.persona) return false;
  if (!context.traceId) return false;

  // Enforce stricter traceId format: must be UUID or start with trace_/audit_
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (
    !context.traceId.startsWith('trace_') &&
    !context.traceId.startsWith('audit_') &&
    !uuidRegex.test(context.traceId)
  ) {
    return false;
  }
  

  // Device-specific compliance
  if (context.deviceAction) {
    // Ensure device actions are auditable
    if (!context.traceId.startsWith('trace_') && !context.traceId.startsWith('audit_')) {
      return false;
    }
  }

  return true;
}

/**
 * Generate audit entry for kernel enforcement
 */
export function generateKernelAuditEntry(context: KernelContext): AuditInfo {
  return {
    persona: context.persona,
    traceId: context.traceId || `kernel_${Date.now()}`,
    timestamp: new Date(),
    compliance: true,
    reviewRequired: false,
    tags: [
      'kernel_enforcement',
      ...(context.deviceId ? ['device_aware'] : []),
      ...(context.deviceAction ? ['device_action'] : [])
    ]
  };
}
