/**
 * Token Dashboard Tab - Dashboard component for token balances, promotion proposals, and consensus status
 * Provides a comprehensive view of the JRVI token economy and governance system
 */

import React, { useState, useEffect } from 'react';
import { hudEnhancer, ConsensusVisualization, TokenVisualization, HUDPayloadData } from '../ui/hudEnhancer';
import { tokenPromotion, PromotionProposal, DemotionProposal } from '../kernel/tokenPromotion';

interface TokenDashboardProps {
  userAddress?: string;
  compactMode?: boolean;
}

interface DashboardMetrics {
  tokenBalance: number;
  stakedBalance: number;
  votingPower: number;
  reputation: number;
  activeProposals: number;
  consensusScore: number;
  pendingRewards: number;
}

interface ProposalSummary {
  id: string;
  title: string;
  type: 'promotion' | 'demotion';
  status: string;
  consensusScore?: number;
  votingEndTime: Date;
  userVoted: boolean;
  userStaked: boolean;
}

export default function TokenDashboard({ userAddress = 'user-default', compactMode = false }: TokenDashboardProps) {
  const [hudPayload, setHudPayload] = useState<HUDPayloadData | null>(null);
  const [tokenVisualization, setTokenVisualization] = useState<TokenVisualization | null>(null);
  const [consensusVisualizations, setConsensusVisualizations] = useState<ConsensusVisualization[]>([]);
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics>({
    tokenBalance: 0,
    stakedBalance: 0,
    votingPower: 0,
    reputation: 0,
    activeProposals: 0,
    consensusScore: 0,
    pendingRewards: 0
  });
  const [proposalSummaries, setProposalSummaries] = useState<ProposalSummary[]>([]);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'proposals' | 'consensus' | 'transactions'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Subscribe to HUD updates
    const subscriberId = `token-dashboard-${userAddress}`;
    
    hudEnhancer.subscribe(subscriberId, (payload) => {
      setHudPayload(payload);
      updateDashboardMetrics(payload);
    });

    // Load initial data
    loadDashboardData();

    return () => {
      hudEnhancer.unsubscribe(subscriberId);
    };
  }, [userAddress]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load token visualization
      const tokenViz = await hudEnhancer.generateTokenVisualization(userAddress);
      setTokenVisualization(tokenViz);

      // Load consensus visualizations
      const consensusViz = await hudEnhancer.generateConsensusVisualization(userAddress);
      setConsensusVisualizations(consensusViz);

      // Load proposal summaries
      const proposals = await loadProposalSummaries();
      setProposalSummaries(proposals);

      // Update metrics
      if (tokenViz) {
        updateDashboardMetricsFromToken(tokenViz);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadProposalSummaries = async (): Promise<ProposalSummary[]> => {
    const activePromotions = tokenPromotion.getActivePromotions();
    const activeDemotions = tokenPromotion.getActiveDemotions();
    
    const summaries: ProposalSummary[] = [];

    // Add promotion proposals
    for (const proposal of activePromotions) {
      const userVoted = proposal.votes.some(vote => vote.voter === userAddress);
      const userStaked = proposal.supportingStakes.some(stake => stake.staker === userAddress) || 
                         proposal.proposer === userAddress;

      summaries.push({
        id: proposal.id,
        title: proposal.title,
        type: 'promotion',
        status: proposal.status,
        consensusScore: proposal.consensusScore,
        votingEndTime: proposal.votingEndTime,
        userVoted,
        userStaked
      });
    }

    // Add demotion proposals
    for (const proposal of activeDemotions) {
      const userVoted = proposal.votes.some(vote => vote.voter === userAddress);

      summaries.push({
        id: proposal.id,
        title: `Demotion: ${proposal.logicId}`,
        type: 'demotion',
        status: proposal.status,
        votingEndTime: proposal.votingEndTime,
        userVoted,
        userStaked: false
      });
    }

    return summaries.sort((a, b) => a.votingEndTime.getTime() - b.votingEndTime.getTime());
  };

  const updateDashboardMetrics = (payload: HUDPayloadData) => {
    setDashboardMetrics(prev => ({
      ...prev,
      activeProposals: payload.consensusData.activeProposals,
      consensusScore: payload.consensusData.averageConsensusScore
    }));
  };

  const updateDashboardMetricsFromToken = (tokenViz: TokenVisualization) => {
    setDashboardMetrics(prev => ({
      ...prev,
      tokenBalance: tokenViz.accountBalance,
      stakedBalance: tokenViz.stakedBalance,
      votingPower: tokenViz.votingPower,
      reputation: tokenViz.reputation,
      pendingRewards: tokenViz.stakingPositions.reduce((sum, pos) => sum + pos.rewards, 0)
    }));
  };

  const formatNumber = (num: number, decimals: number = 0): string => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(num);
  };

  const formatTimeRemaining = (endTime: Date): string => {
    const now = new Date();
    const timeRemaining = endTime.getTime() - now.getTime();
    
    if (timeRemaining <= 0) return 'Expired';
    
    const days = Math.floor(timeRemaining / (24 * 60 * 60 * 1000));
    const hours = Math.floor((timeRemaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      case 'voting': return 'text-blue-600 bg-blue-100';
      case 'staking': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getConsensusScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="text-red-600">⚠️</div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error Loading Dashboard</h3>
            <p className="text-sm text-red-600 mt-1">{error}</p>
            <button
              onClick={loadDashboardData}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (compactMode) {
    return (
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Token Dashboard</h3>
        
        {/* Compact Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{formatNumber(dashboardMetrics.tokenBalance)}</div>
            <div className="text-xs text-gray-500">Balance</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{formatNumber(dashboardMetrics.stakedBalance)}</div>
            <div className="text-xs text-gray-500">Staked</div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-600">Voting Power:</span>
            <span className="font-medium">{formatNumber(dashboardMetrics.votingPower, 1)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Active Proposals:</span>
            <span className="font-medium">{dashboardMetrics.activeProposals}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Avg Consensus:</span>
            <span className={`font-medium ${getConsensusScoreColor(dashboardMetrics.consensusScore)}`}>
              {formatNumber(dashboardMetrics.consensusScore, 1)}%
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-blue-600 text-xl">🪙</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Token Balance</p>
              <p className="text-2xl font-semibold text-gray-900">{formatNumber(dashboardMetrics.tokenBalance)}</p>
              <p className="text-xs text-gray-500">JRVI Tokens</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-green-600 text-xl">🔒</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Staked Balance</p>
              <p className="text-2xl font-semibold text-gray-900">{formatNumber(dashboardMetrics.stakedBalance)}</p>
              <p className="text-xs text-gray-500">
                Pending: {formatNumber(dashboardMetrics.pendingRewards)} rewards
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <span className="text-purple-600 text-xl">⚡</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Voting Power</p>
              <p className="text-2xl font-semibold text-gray-900">{formatNumber(dashboardMetrics.votingPower, 1)}</p>
              <p className="text-xs text-gray-500">
                Reputation: {formatNumber(dashboardMetrics.reputation, 1)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <span className="text-orange-600 text-xl">📊</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Avg Consensus</p>
              <p className={`text-2xl font-semibold ${getConsensusScoreColor(dashboardMetrics.consensusScore)}`}>
                {formatNumber(dashboardMetrics.consensusScore, 1)}%
              </p>
              <p className="text-xs text-gray-500">
                {dashboardMetrics.activeProposals} active proposals
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview', icon: '📈' },
              { id: 'proposals', label: 'Proposals', icon: '📋' },
              { id: 'consensus', label: 'Consensus', icon: '🤝' },
              { id: 'transactions', label: 'Transactions', icon: '💳' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {selectedTab === 'overview' && (
            <div className="space-y-6">
              {/* System Status */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">System Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium text-gray-900">Token Economy</h4>
                    <div className="mt-2 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Supply:</span>
                        <span>{hudPayload ? formatNumber(hudPayload.tokenData.totalSupply) : '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Circulating:</span>
                        <span>{hudPayload ? formatNumber(hudPayload.tokenData.circulatingSupply) : '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Staking Ratio:</span>
                        <span>{hudPayload ? `${hudPayload.tokenData.stakingRatio.toFixed(1)}%` : '-'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium text-gray-900">Consensus Activity</h4>
                    <div className="mt-2 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Active Evaluators:</span>
                        <span>{hudPayload ? hudPayload.swarmData.activeEvaluators : '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Pending Tasks:</span>
                        <span>{hudPayload ? hudPayload.swarmData.pendingTasks : '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Avg Response:</span>
                        <span>{hudPayload ? `${hudPayload.swarmData.averageResponseTime.toFixed(0)}min` : '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              {tokenVisualization && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b">
                      <h4 className="font-medium text-gray-900">Recent Transactions</h4>
                    </div>
                    <div className="divide-y">
                      {tokenVisualization.recentTransactions.slice(0, 5).map((tx, index) => (
                        <div key={index} className="px-4 py-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900 capitalize">{tx.type.replace('_', ' ')}</p>
                            <p className="text-xs text-gray-500">{tx.description}</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-medium ${tx.type === 'earn' ? 'text-green-600' : 'text-gray-900'}`}>
                              {tx.type === 'earn' ? '+' : ''}{formatNumber(tx.amount)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {tx.timestamp.toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedTab === 'proposals' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Active Proposals</h3>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
                  Create Proposal
                </button>
              </div>
              
              <div className="space-y-3">
                {proposalSummaries.map(proposal => (
                  <div key={proposal.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-gray-900">{proposal.title}</h4>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(proposal.status)}`}>
                            {proposal.status}
                          </span>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            proposal.type === 'promotion' ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'
                          }`}>
                            {proposal.type}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                          <span>Ends: {formatTimeRemaining(proposal.votingEndTime)}</span>
                          {proposal.consensusScore && (
                            <span className={getConsensusScoreColor(proposal.consensusScore)}>
                              Consensus: {proposal.consensusScore.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {proposal.userStaked && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-blue-600 bg-blue-100">
                            Staked
                          </span>
                        )}
                        {proposal.userVoted && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-green-600 bg-green-100">
                            Voted
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {proposalSummaries.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>No active proposals</p>
                    <p className="text-sm">Create a proposal to get started</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedTab === 'consensus' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Consensus Visualizations</h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {consensusVisualizations.map(viz => (
                  <div key={viz.proposalId} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-gray-900">{viz.proposalTitle}</h4>
                      <span className={`text-sm font-medium ${getConsensusScoreColor(viz.overallScore)}`}>
                        {viz.overallScore.toFixed(1)}%
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      {Object.entries(viz.dimensionScores).map(([dimension, score]) => (
                        <div key={dimension}>
                          <div className="flex justify-between text-sm">
                            <span className="capitalize text-gray-600">{dimension.replace('_', ' ')}</span>
                            <span className="font-medium">{score.toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                score >= 80 ? 'bg-green-500' : 
                                score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${score}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                      <span>{viz.participantCount} participants</span>
                      <span>Confidence: {viz.confidence.toFixed(0)}%</span>
                      {viz.timeToConsensus && (
                        <span>Time: {viz.timeToConsensus}h</span>
                      )}
                    </div>
                  </div>
                ))}
                
                {consensusVisualizations.length === 0 && (
                  <div className="col-span-2 text-center py-8 text-gray-500">
                    <p>No consensus data available</p>
                    <p className="text-sm">Submit proposals to see consensus visualizations</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedTab === 'transactions' && tokenVisualization && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Transaction History</h3>
              
              <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {tokenVisualization.recentTransactions.map((tx, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            tx.type === 'earn' ? 'text-green-600 bg-green-100' :
                            tx.type === 'stake' ? 'text-blue-600 bg-blue-100' :
                            tx.type === 'burn' ? 'text-red-600 bg-red-100' :
                            'text-gray-600 bg-gray-100'
                          }`}>
                            {tx.type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {tx.type === 'earn' ? '+' : ''}{formatNumber(tx.amount)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                          {tx.description}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {tx.timestamp.toLocaleDateString()} {tx.timestamp.toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}