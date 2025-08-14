/**
 * Agent Marketplace - Plugin and logic marketplace transactions
 * Manages buying, selling, and trading of logic modules and plugins with token integration
 */

import { logger } from '../utils/logging';
import { tokenKernel } from './tokenKernel';
import { tokenPromotion } from './tokenPromotion';

export interface MarketplaceItem {
  id: string;
  type: 'logic_module' | 'plugin' | 'data_model' | 'evaluation_framework';
  name: string;
  description: string;
  version: string;
  seller: string;
  sellerAgent: string;
  price: number;
  currency: 'JRVI_TOKEN';
  category: string;
  tags: string[];
  ratings: Rating[];
  averageRating: number;
  downloads: number;
  revenue: number;
  metadata: {
    codeHash?: string;
    dependencies: string[];
    compatibility: string[];
    documentation: string;
    testCoverage: number;
    securityAudit?: SecurityAudit;
    [key: string]: any;
  };
  listing: {
    isActive: boolean;
    listedAt: Date;
    updatedAt: Date;
    expiresAt?: Date;
  };
  traceId: string;
  brandAffinity: string[];
}

export interface MarketplaceTransaction {
  id: string;
  type: 'purchase' | 'sale' | 'license' | 'subscription' | 'royalty';
  itemId: string;
  buyer: string;
  buyerAgent: string;
  seller: string;
  sellerAgent: string;
  amount: number;
  currency: 'JRVI_TOKEN';
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'disputed';
  metadata: {
    licenseType?: 'single_use' | 'unlimited' | 'commercial' | 'non_commercial';
    subscriptionPeriod?: number;
    royaltyRate?: number;
    reason?: string;
    [key: string]: any;
  };
  timestamp: Date;
  completedAt?: Date;
  traceId: string;
  brandAffinity: string[];
}

export interface Rating {
  id: string;
  itemId: string;
  rater: string;
  raterAgent: string;
  rating: number; // 1-5 stars
  review: string;
  dimensions: {
    quality: number;
    usability: number;
    documentation: number;
    performance: number;
    support: number;
  };
  verified: boolean; // Verified purchase
  timestamp: Date;
  traceId: string;
}

export interface SecurityAudit {
  id: string;
  auditor: string;
  auditDate: Date;
  version: string;
  status: 'passed' | 'failed' | 'warning';
  vulnerabilities: SecurityVulnerability[];
  score: number; // 0-100
  recommendations: string[];
  expiresAt: Date;
}

export interface SecurityVulnerability {
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  description: string;
  impact: string;
  remediation: string;
  cweId?: string;
}

export interface MarketplaceStats {
  totalItems: number;
  activeListings: number;
  totalTransactions: number;
  totalVolume: number;
  topCategories: Array<{ category: string; count: number }>;
  topSellers: Array<{ seller: string; revenue: number }>;
  averagePrice: number;
  averageRating: number;
}

class AgentMarketplace {
  private marketplaceItems: Map<string, MarketplaceItem> = new Map();
  private transactions: Map<string, MarketplaceTransaction> = new Map();
  private ratings: Map<string, Rating> = new Map();
  private escrowHoldings: Map<string, number> = new Map();
  private marketplaceLogger = logger.createChildLogger('agent-marketplace');

  constructor() {
    this.startMarketplaceCleanup();
  }

  /**
   * List item for sale in marketplace
   */
  async listItem(
    seller: string,
    item: {
      type: MarketplaceItem['type'];
      name: string;
      description: string;
      version: string;
      sellerAgent: string;
      price: number;
      category: string;
      tags: string[];
      metadata: MarketplaceItem['metadata'];
      brandAffinity?: string[];
      expiresIn?: number; // Days until listing expires
    }
  ): Promise<string> {
    const traceId = this.generateTraceId();
    
    // Validate seller account
    const sellerAccount = await tokenKernel.getAccount(seller);
    if (!sellerAccount) {
      throw new Error(`Seller account ${seller} not found`);
    }

    // Validate item metadata and security
    await this.validateItemSecurity(item);

    const marketplaceItem: MarketplaceItem = {
      id: this.generateId(),
      type: item.type,
      name: item.name,
      description: item.description,
      version: item.version,
      seller,
      sellerAgent: item.sellerAgent,
      price: item.price,
      currency: 'JRVI_TOKEN',
      category: item.category,
      tags: item.tags,
      ratings: [],
      averageRating: 0,
      downloads: 0,
      revenue: 0,
      metadata: item.metadata,
      listing: {
        isActive: true,
        listedAt: new Date(),
        updatedAt: new Date(),
        expiresAt: item.expiresIn ? new Date(Date.now() + item.expiresIn * 24 * 60 * 60 * 1000) : undefined
      },
      traceId,
      brandAffinity: item.brandAffinity || ['JRVI']
    };

    this.marketplaceItems.set(marketplaceItem.id, marketplaceItem);

    this.marketplaceLogger.audit(
      `Item listed in marketplace: ${item.name}`,
      'marketplace-listing',
      {
        itemId: marketplaceItem.id,
        seller,
        sellerAgent: item.sellerAgent,
        type: item.type,
        price: item.price,
        category: item.category,
        traceId
      },
      {
        tags: ['marketplace-listing', item.type],
        brandAffinity: marketplaceItem.brandAffinity,
        lineage: [traceId]
      }
    );

    return marketplaceItem.id;
  }

  /**
   * Purchase item from marketplace
   */
  async purchaseItem(
    buyer: string,
    itemId: string,
    metadata: {
      buyerAgent: string;
      licenseType?: 'single_use' | 'unlimited' | 'commercial' | 'non_commercial';
      reason: string;
    }
  ): Promise<string> {
    const item = this.marketplaceItems.get(itemId);
    if (!item) {
      throw new Error(`Marketplace item ${itemId} not found`);
    }

    if (!item.listing.isActive) {
      throw new Error(`Item ${itemId} is not available for purchase`);
    }

    if (item.listing.expiresAt && new Date() > item.listing.expiresAt) {
      item.listing.isActive = false;
      throw new Error(`Item ${itemId} listing has expired`);
    }

    const traceId = this.generateTraceId();
    
    // Validate buyer account and balance
    const buyerAccount = await tokenKernel.getAccount(buyer);
    if (!buyerAccount) {
      throw new Error(`Buyer account ${buyer} not found`);
    }

    if (buyerAccount.balance < item.price) {
      throw new Error(
        `Insufficient balance. Required: ${item.price}, Available: ${buyerAccount.balance}`
      );
    }

    // Create transaction
    const transaction: MarketplaceTransaction = {
      id: this.generateId(),
      type: 'purchase',
      itemId,
      buyer,
      buyerAgent: metadata.buyerAgent,
      seller: item.seller,
      sellerAgent: item.sellerAgent,
      amount: item.price,
      currency: 'JRVI_TOKEN',
      status: 'pending',
      metadata: {
        licenseType: metadata.licenseType || 'single_use',
        reason: metadata.reason
      },
      timestamp: new Date(),
      traceId,
      brandAffinity: item.brandAffinity
    };

    this.transactions.set(transaction.id, transaction);

    try {
      // Transfer tokens from buyer to escrow
      await this.transferToEscrow(buyer, item.price, transaction.id, metadata.buyerAgent);
      
      // Complete transaction
      await this.completeTransaction(transaction.id);

      this.marketplaceLogger.audit(
        `Item purchased: ${item.name} by ${buyer}`,
        'marketplace-purchase',
        {
          transactionId: transaction.id,
          itemId,
          buyer,
          buyerAgent: metadata.buyerAgent,
          seller: item.seller,
          amount: item.price,
          licenseType: metadata.licenseType,
          traceId
        },
        {
          tags: ['marketplace-purchase', item.type],
          brandAffinity: item.brandAffinity,
          lineage: [traceId]
        }
      );

      return transaction.id;

    } catch (error) {
      transaction.status = 'failed';
      this.marketplaceLogger.error(
        `Purchase failed: ${error}`,
        'marketplace-purchase',
        {
          transactionId: transaction.id,
          itemId,
          buyer,
          error: error instanceof Error ? error.message : String(error),
          traceId
        }
      );
      throw error;
    }
  }

  /**
   * Rate and review purchased item
   */
  async rateItem(
    rater: string,
    itemId: string,
    rating: {
      raterAgent: string;
      rating: number;
      review: string;
      dimensions: Rating['dimensions'];
    }
  ): Promise<string> {
    const item = this.marketplaceItems.get(itemId);
    if (!item) {
      throw new Error(`Marketplace item ${itemId} not found`);
    }

    // Verify purchase
    const verifiedPurchase = this.hasVerifiedPurchase(rater, itemId);
    
    const ratingEntry: Rating = {
      id: this.generateId(),
      itemId,
      rater,
      raterAgent: rating.raterAgent,
      rating: Math.max(1, Math.min(5, rating.rating)), // Clamp to 1-5
      review: rating.review,
      dimensions: rating.dimensions,
      verified: verifiedPurchase,
      timestamp: new Date(),
      traceId: this.generateTraceId()
    };

    this.ratings.set(ratingEntry.id, ratingEntry);
    item.ratings.push(ratingEntry);

    // Update average rating
    this.updateItemRating(item);

    this.marketplaceLogger.audit(
      `Item rated: ${item.name} - ${rating.rating} stars`,
      'marketplace-rating',
      {
        ratingId: ratingEntry.id,
        itemId,
        rater,
        raterAgent: rating.raterAgent,
        rating: rating.rating,
        verified: verifiedPurchase,
        traceId: ratingEntry.traceId
      },
      {
        tags: ['marketplace-rating'],
        brandAffinity: item.brandAffinity,
        lineage: [ratingEntry.traceId]
      }
    );

    return ratingEntry.id;
  }

  /**
   * Search marketplace items
   */
  searchItems(criteria: {
    type?: MarketplaceItem['type'];
    category?: string;
    tags?: string[];
    minRating?: number;
    maxPrice?: number;
    seller?: string;
    query?: string;
  }): MarketplaceItem[] {
    let items = Array.from(this.marketplaceItems.values())
      .filter(item => item.listing.isActive);

    if (criteria.type) {
      items = items.filter(item => item.type === criteria.type);
    }

    if (criteria.category) {
      items = items.filter(item => item.category === criteria.category);
    }

    if (criteria.tags && criteria.tags.length > 0) {
      items = items.filter(item => 
        criteria.tags!.some(tag => item.tags.includes(tag))
      );
    }

    if (criteria.minRating) {
      items = items.filter(item => item.averageRating >= criteria.minRating!);
    }

    if (criteria.maxPrice) {
      items = items.filter(item => item.price <= criteria.maxPrice!);
    }

    if (criteria.seller) {
      items = items.filter(item => item.seller === criteria.seller);
    }

    if (criteria.query) {
      const query = criteria.query.toLowerCase();
      items = items.filter(item => 
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return items.sort((a, b) => {
      // Sort by rating first, then by downloads
      if (a.averageRating !== b.averageRating) {
        return b.averageRating - a.averageRating;
      }
      return b.downloads - a.downloads;
    });
  }

  /**
   * Get marketplace statistics
   */
  getMarketplaceStats(): MarketplaceStats {
    const items = Array.from(this.marketplaceItems.values());
    const activeItems = items.filter(item => item.listing.isActive);
    const transactions = Array.from(this.transactions.values())
      .filter(tx => tx.status === 'completed');

    const totalVolume = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const categoryStats = new Map<string, number>();
    const sellerStats = new Map<string, number>();

    for (const item of items) {
      categoryStats.set(item.category, (categoryStats.get(item.category) || 0) + 1);
      sellerStats.set(item.seller, (sellerStats.get(item.seller) || 0) + item.revenue);
    }

    const topCategories = Array.from(categoryStats.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topSellers = Array.from(sellerStats.entries())
      .map(([seller, revenue]) => ({ seller, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const averagePrice = items.length > 0 
      ? items.reduce((sum, item) => sum + item.price, 0) / items.length 
      : 0;

    const ratingsWithValues = items.flatMap(item => item.ratings).filter(r => r.rating > 0);
    const averageRating = ratingsWithValues.length > 0
      ? ratingsWithValues.reduce((sum, r) => sum + r.rating, 0) / ratingsWithValues.length
      : 0;

    return {
      totalItems: items.length,
      activeListings: activeItems.length,
      totalTransactions: transactions.length,
      totalVolume,
      topCategories,
      topSellers,
      averagePrice,
      averageRating
    };
  }

  /**
   * Get item by ID
   */
  getItem(itemId: string): MarketplaceItem | null {
    return this.marketplaceItems.get(itemId) || null;
  }

  /**
   * Get transaction by ID
   */
  getTransaction(transactionId: string): MarketplaceTransaction | null {
    return this.transactions.get(transactionId) || null;
  }

  /**
   * Get transaction history for user
   */
  getTransactionHistory(
    user: string,
    options?: {
      type?: MarketplaceTransaction['type'];
      status?: MarketplaceTransaction['status'];
      limit?: number;
    }
  ): MarketplaceTransaction[] {
    let transactions = Array.from(this.transactions.values())
      .filter(tx => tx.buyer === user || tx.seller === user);

    if (options?.type) {
      transactions = transactions.filter(tx => tx.type === options.type);
    }

    if (options?.status) {
      transactions = transactions.filter(tx => tx.status === options.status);
    }

    transactions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (options?.limit) {
      transactions = transactions.slice(0, options.limit);
    }

    return transactions;
  }

  /**
   * Get ratings for item
   */
  getItemRatings(itemId: string): Rating[] {
    return Array.from(this.ratings.values())
      .filter(rating => rating.itemId === itemId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  private async validateItemSecurity(item: any): Promise<void> {
    // Basic validation - in real implementation would include comprehensive security checks
    if (!item.metadata.documentation || item.metadata.documentation.length < 100) {
      throw new Error('Item must have adequate documentation');
    }

    if (item.metadata.testCoverage < 50) {
      throw new Error('Item must have at least 50% test coverage');
    }

    // Check for prohibited content
    const prohibitedKeywords = ['malware', 'virus', 'exploit', 'backdoor'];
    const content = (item.description + item.metadata.documentation).toLowerCase();
    
    for (const keyword of prohibitedKeywords) {
      if (content.includes(keyword)) {
        throw new Error(`Item contains prohibited content: ${keyword}`);
      }
    }
  }

  private async transferToEscrow(
    from: string,
    amount: number,
    transactionId: string,
    agent: string
  ): Promise<void> {
    // Transfer tokens to escrow
    await tokenKernel.burnTokens(from, amount, {
      agent,
      reason: `Marketplace escrow for transaction ${transactionId}`,
      evidence: [{ transactionId, amount }]
    });

    // Hold in escrow
    this.escrowHoldings.set(transactionId, amount);
  }

  private async completeTransaction(transactionId: string): Promise<void> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    const escrowAmount = this.escrowHoldings.get(transactionId);
    if (!escrowAmount) {
      throw new Error(`No escrow found for transaction ${transactionId}`);
    }

    // Release from escrow to seller
    await tokenKernel.earnTokens(
      transaction.seller,
      'system_contribution',
      {
        agent: transaction.sellerAgent,
        reason: `Marketplace sale: ${transaction.itemId}`,
        evidence: [{ transactionId, itemId: transaction.itemId }]
      }
    );

    // Update transaction status
    transaction.status = 'completed';
    transaction.completedAt = new Date();

    // Update item stats
    const item = this.marketplaceItems.get(transaction.itemId);
    if (item) {
      item.downloads += 1;
      item.revenue += transaction.amount;
    }

    // Remove from escrow
    this.escrowHoldings.delete(transactionId);
  }

  private hasVerifiedPurchase(user: string, itemId: string): boolean {
    return Array.from(this.transactions.values()).some(tx => 
      tx.buyer === user && 
      tx.itemId === itemId && 
      tx.status === 'completed'
    );
  }

  private updateItemRating(item: MarketplaceItem): void {
    if (item.ratings.length === 0) {
      item.averageRating = 0;
      return;
    }

    const totalRating = item.ratings.reduce((sum, r) => sum + r.rating, 0);
    item.averageRating = totalRating / item.ratings.length;
  }

  private startMarketplaceCleanup(): void {
    setInterval(() => {
      const now = new Date();
      
      // Clean up expired listings
      for (const [itemId, item] of this.marketplaceItems) {
        if (item.listing.expiresAt && now > item.listing.expiresAt && item.listing.isActive) {
          item.listing.isActive = false;
          
          this.marketplaceLogger.audit(
            `Marketplace listing expired: ${item.name}`,
            'marketplace-cleanup',
            {
              itemId,
              seller: item.seller,
              expiredAt: now,
              traceId: item.traceId
            },
            {
              tags: ['listing-expired'],
              brandAffinity: item.brandAffinity,
              lineage: [item.traceId]
            }
          );
        }
      }

      // Clean up failed transactions older than 24 hours
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      for (const [txId, transaction] of this.transactions) {
        if (transaction.status === 'failed' && transaction.timestamp < dayAgo) {
          this.transactions.delete(txId);
          this.escrowHoldings.delete(txId);
        }
      }
    }, 60000); // Check every minute
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  private generateTraceId(): string {
    return 'mkt-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 6);
  }
}

// Singleton instance
export const agentMarketplace = new AgentMarketplace();

export default agentMarketplace;