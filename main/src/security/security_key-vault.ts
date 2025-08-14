/**
 * Security Key Vault - Boot-time vault validation and alert trigger
 * Implements secure vault operations with integrity checking
 */

import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logging';

export interface VaultConfig {
  vaultPath: string;
  keyDerivationRounds: number;
  encryptionAlgorithm: string;
  integrityCheckInterval: number; // minutes
  alertOnFailure: boolean;
}

export interface VaultEntry {
  id: string;
  key: string;
  value: string;
  metadata: {
    created: Date;
    lastAccessed: Date;
    accessCount: number;
    classification: 'public' | 'internal' | 'confidential' | 'secret';
  };
  integrity: {
    hash: string;
    lastVerified: Date;
  };
}

export interface VaultStatus {
  isValid: boolean;
  entriesCount: number;
  lastIntegrityCheck: Date;
  corruptedEntries: string[];
  alertTriggered: boolean;
  errors: string[];
}

class SecurityKeyVault {
  private config: VaultConfig;
  private masterKey: Buffer | null = null;
  private vault: Map<string, VaultEntry> = new Map();
  private vaultLogger = logger.createChildLogger('security-vault');
  private integrityTimer: NodeJS.Timer | null = null;
  private alertCallbacks: ((status: VaultStatus) => void)[] = [];

  constructor(config: Partial<VaultConfig> = {}) {
    this.config = {
      vaultPath: join(process.cwd(), 'security', 'vault'),
      keyDerivationRounds: 100000,
      encryptionAlgorithm: 'aes-256-gcm',
      integrityCheckInterval: 30, // 30 minutes
      alertOnFailure: true,
      ...config
    };

    this.initializeVault();
    this.startIntegrityChecking();
  }

  /**
   * Boot-time vault validation - critical security check
   */
  async bootTimeValidation(): Promise<VaultStatus> {
    this.vaultLogger.info('Starting boot-time vault validation', 'vault-boot-check');
    
    try {
      // Check vault directory exists
      if (!existsSync(this.config.vaultPath)) {
        mkdirSync(this.config.vaultPath, { recursive: true });
        this.vaultLogger.warn('Vault directory did not exist, created new vault', 'vault-boot-check');
      }

      // Load and verify vault integrity
      const status = await this.performIntegrityCheck();
      
      if (!status.isValid) {
        this.vaultLogger.security(
          `CRITICAL: Vault integrity validation failed during boot`,
          'vault-boot-check',
          {
            corruptedEntries: status.corruptedEntries,
            errors: status.errors,
            entriesCount: status.entriesCount
          },
          {
            tags: ['vault-integrity-failure', 'boot-critical', 'security-alert']
          }
        );

        // Trigger alert if configured
        if (this.config.alertOnFailure) {
          await this.triggerVaultIntegrityAlert(status);
        }
      } else {
        this.vaultLogger.info(
          `Vault integrity validation passed: ${status.entriesCount} entries verified`,
          'vault-boot-check',
          {
            entriesCount: status.entriesCount,
            lastCheck: status.lastIntegrityCheck
          }
        );
      }

      return status;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.vaultLogger.error(
        `Boot-time vault validation failed: ${errorMessage}`,
        'vault-boot-check',
        { error: errorMessage }
      );

      const failureStatus: VaultStatus = {
        isValid: false,
        entriesCount: 0,
        lastIntegrityCheck: new Date(),
        corruptedEntries: [],
        alertTriggered: false,
        errors: [errorMessage]
      };

      if (this.config.alertOnFailure) {
        await this.triggerVaultIntegrityAlert(failureStatus);
      }

      return failureStatus;
    }
  }

  /**
   * Store encrypted value in vault
   */
  async store(key: string, value: string, classification: VaultEntry['metadata']['classification'] = 'internal'): Promise<boolean> {
    try {
      if (!this.masterKey) {
        throw new Error('Vault not initialized - master key missing');
      }

      const entryId = this.generateEntryId();
      const encryptedValue = this.encrypt(value);
      const hash = this.calculateHash(key + value);

      const entry: VaultEntry = {
        id: entryId,
        key,
        value: encryptedValue,
        metadata: {
          created: new Date(),
          lastAccessed: new Date(),
          accessCount: 0,
          classification
        },
        integrity: {
          hash,
          lastVerified: new Date()
        }
      };

      this.vault.set(key, entry);
      await this.persistVault();

      this.vaultLogger.audit(
        `Vault entry stored: ${key}`,
        'vault-store',
        {
          entryId,
          classification,
          keyLength: key.length,
          valueLength: value.length
        },
        {
          tags: ['vault-operation', 'data-store']
        }
      );

      return true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.vaultLogger.error(
        `Failed to store vault entry: ${errorMessage}`,
        'vault-store',
        { key, error: errorMessage }
      );
      return false;
    }
  }

  /**
   * Retrieve and decrypt value from vault
   */
  async retrieve(key: string): Promise<string | null> {
    try {
      const entry = this.vault.get(key);
      if (!entry) {
        this.vaultLogger.warn(`Vault entry not found: ${key}`, 'vault-retrieve');
        return null;
      }

      if (!this.masterKey) {
        throw new Error('Vault not initialized - master key missing');
      }

      // Update access metadata
      entry.metadata.lastAccessed = new Date();
      entry.metadata.accessCount++;

      const decryptedValue = this.decrypt(entry.value);
      
      // Verify integrity
      const expectedHash = this.calculateHash(key + decryptedValue);
      if (expectedHash !== entry.integrity.hash) {
        this.vaultLogger.security(
          `SECURITY ALERT: Vault entry integrity violation detected`,
          'vault-retrieve',
          {
            key,
            entryId: entry.id,
            expectedHash,
            actualHash: entry.integrity.hash
          },
          {
            tags: ['vault-integrity-violation', 'security-alert']
          }
        );
        return null;
      }

      this.vaultLogger.audit(
        `Vault entry retrieved: ${key}`,
        'vault-retrieve',
        {
          entryId: entry.id,
          classification: entry.metadata.classification,
          accessCount: entry.metadata.accessCount
        }
      );

      return decryptedValue;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.vaultLogger.error(
        `Failed to retrieve vault entry: ${errorMessage}`,
        'vault-retrieve',
        { key, error: errorMessage }
      );
      return null;
    }
  }

  /**
   * Perform comprehensive integrity check
   */
  async performIntegrityCheck(): Promise<VaultStatus> {
    const status: VaultStatus = {
      isValid: true,
      entriesCount: this.vault.size,
      lastIntegrityCheck: new Date(),
      corruptedEntries: [],
      alertTriggered: false,
      errors: []
    };

    try {
      this.vaultLogger.info('Starting vault integrity check', 'vault-integrity');

      for (const [key, entry] of this.vault.entries()) {
        try {
          // Decrypt and verify each entry
          const decryptedValue = this.decrypt(entry.value);
          const expectedHash = this.calculateHash(key + decryptedValue);
          
          if (expectedHash !== entry.integrity.hash) {
            status.corruptedEntries.push(entry.id);
            status.isValid = false;
            
            this.vaultLogger.security(
              `Integrity violation detected in vault entry`,
              'vault-integrity',
              {
                key,
                entryId: entry.id,
                expectedHash,
                actualHash: entry.integrity.hash
              }
            );
          } else {
            // Update last verified timestamp
            entry.integrity.lastVerified = new Date();
          }

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          status.corruptedEntries.push(entry.id);
          status.errors.push(`Entry ${entry.id}: ${errorMessage}`);
          status.isValid = false;
        }
      }

      if (status.isValid) {
        this.vaultLogger.info(
          `Vault integrity check passed: ${status.entriesCount} entries verified`,
          'vault-integrity'
        );
      } else {
        this.vaultLogger.security(
          `Vault integrity check failed: ${status.corruptedEntries.length} corrupted entries`,
          'vault-integrity',
          {
            corruptedEntries: status.corruptedEntries,
            errors: status.errors
          }
        );
      }

      return status;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      status.isValid = false;
      status.errors.push(errorMessage);
      
      this.vaultLogger.error(
        `Vault integrity check failed: ${errorMessage}`,
        'vault-integrity',
        { error: errorMessage }
      );

      return status;
    }
  }

  /**
   * Register alert callback for vault integrity failures
   */
  onVaultIntegrityAlert(callback: (status: VaultStatus) => void): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * Trigger vault integrity alert
   */
  private async triggerVaultIntegrityAlert(status: VaultStatus): Promise<void> {
    try {
      status.alertTriggered = true;
      
      this.vaultLogger.security(
        'CRITICAL SECURITY ALERT: Vault integrity failure detected',
        'vault-alert',
        {
          corruptedEntries: status.corruptedEntries,
          errors: status.errors,
          timestamp: new Date().toISOString()
        },
        {
          tags: ['critical-security-alert', 'vault-failure']
        }
      );

      // Notify all registered callbacks
      for (const callback of this.alertCallbacks) {
        try {
          callback(status);
        } catch (error) {
          this.vaultLogger.error(
            `Alert callback failed: ${error instanceof Error ? error.message : String(error)}`,
            'vault-alert'
          );
        }
      }

    } catch (error) {
      this.vaultLogger.error(
        `Failed to trigger vault integrity alert: ${error instanceof Error ? error.message : String(error)}`,
        'vault-alert'
      );
    }
  }

  /**
   * Initialize vault system
   */
  private initializeVault(): void {
    try {
      // Ensure vault directory exists
      if (!existsSync(this.config.vaultPath)) {
        mkdirSync(this.config.vaultPath, { recursive: true });
      }

      // Initialize master key
      this.initializeMasterKey();

      // Load existing vault if present
      this.loadVault();

      this.vaultLogger.info('Security vault initialized', 'vault-init', {
        vaultPath: this.config.vaultPath,
        algorithm: this.config.encryptionAlgorithm,
        entriesLoaded: this.vault.size
      });

    } catch (error) {
      this.vaultLogger.error(
        `Failed to initialize vault: ${error instanceof Error ? error.message : String(error)}`,
        'vault-init'
      );
      throw error;
    }
  }

  /**
   * Initialize or derive master key
   */
  private initializeMasterKey(): void {
    // In production, this would use a proper key derivation mechanism
    // For now, using a deterministic key derived from system properties
    const keyMaterial = process.env.VAULT_KEY || 'default-vault-key-material';
    this.masterKey = createHash('sha256')
      .update(keyMaterial)
      .digest();
  }

  /**
   * Load vault from persistent storage
   */
  private loadVault(): void {
    try {
      const vaultFile = join(this.config.vaultPath, 'vault.dat');
      if (existsSync(vaultFile)) {
        const encryptedData = readFileSync(vaultFile);
        const decryptedData = this.decrypt(encryptedData.toString());
        const vaultData = JSON.parse(decryptedData);
        
        for (const entryData of vaultData) {
          const entry: VaultEntry = {
            ...entryData,
            metadata: {
              ...entryData.metadata,
              created: new Date(entryData.metadata.created),
              lastAccessed: new Date(entryData.metadata.lastAccessed)
            },
            integrity: {
              ...entryData.integrity,
              lastVerified: new Date(entryData.integrity.lastVerified)
            }
          };
          this.vault.set(entry.key, entry);
        }
      }
    } catch (error) {
      this.vaultLogger.warn(
        `Failed to load existing vault: ${error instanceof Error ? error.message : String(error)}`,
        'vault-load'
      );
    }
  }

  /**
   * Persist vault to storage
   */
  private async persistVault(): Promise<void> {
    try {
      const vaultData = Array.from(this.vault.values());
      const serializedData = JSON.stringify(vaultData, null, 0);
      const encryptedData = this.encrypt(serializedData);
      
      const vaultFile = join(this.config.vaultPath, 'vault.dat');
      writeFileSync(vaultFile, encryptedData);
      
    } catch (error) {
      this.vaultLogger.error(
        `Failed to persist vault: ${error instanceof Error ? error.message : String(error)}`,
        'vault-persist'
      );
      throw error;
    }
  }

  /**
   * Start periodic integrity checking
   */
  private startIntegrityChecking(): void {
    const intervalMs = this.config.integrityCheckInterval * 60 * 1000;
    
    this.integrityTimer = setInterval(async () => {
      const status = await this.performIntegrityCheck();
      if (!status.isValid && this.config.alertOnFailure) {
        await this.triggerVaultIntegrityAlert(status);
      }
    }, intervalMs);

    this.vaultLogger.info(
      `Started periodic integrity checking every ${this.config.integrityCheckInterval} minutes`,
      'vault-init'
    );
  }

  /**
   * Encrypt data using master key
   */
  private encrypt(data: string): string {
    if (!this.masterKey) throw new Error('Master key not initialized');
    
    const iv = randomBytes(16);
    const cipher = createCipheriv(this.config.encryptionAlgorithm, this.masterKey, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = (cipher as any).getAuthTag();
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt data using master key
   */
  private decrypt(encryptedData: string): string {
    if (!this.masterKey) throw new Error('Master key not initialized');
    
    const parts = encryptedData.split(':');
    if (parts.length !== 3) throw new Error('Invalid encrypted data format');
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = createDecipheriv(this.config.encryptionAlgorithm, this.masterKey, iv);
    (decipher as any).setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Calculate integrity hash
   */
  private calculateHash(data: string): string {
    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate unique entry ID
   */
  private generateEntryId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Get vault statistics
   */
  getVaultStats(): {
    entriesCount: number;
    totalSize: number;
    lastIntegrityCheck: Date | null;
    isHealthy: boolean;
  } {
    const lastCheck = this.vault.size > 0 
      ? Math.max(...Array.from(this.vault.values()).map(e => e.integrity.lastVerified.getTime()))
      : null;

    return {
      entriesCount: this.vault.size,
      totalSize: JSON.stringify(Array.from(this.vault.values())).length,
      lastIntegrityCheck: lastCheck ? new Date(lastCheck) : null,
      isHealthy: this.vault.size === 0 || (lastCheck && Date.now() - lastCheck < 60 * 60 * 1000) // Healthy if checked within last hour
    };
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown(): Promise<void> {
    if (this.integrityTimer) {
      clearInterval(this.integrityTimer);
      this.integrityTimer = null;
    }

    await this.persistVault();
    this.vaultLogger.info('Security vault shutdown complete', 'vault-shutdown');
  }
}

// Singleton instance
export const securityKeyVault = new SecurityKeyVault();

export default securityKeyVault;