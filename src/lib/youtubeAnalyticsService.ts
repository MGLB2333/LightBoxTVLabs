import { supabase } from './supabase';
import { googleAdsService } from './googleAdsService';

export interface YouTubeCampaign {
  id: string;
  name: string;
  status: string;
  startDate: string;
  endDate?: string;
  budget: number;
  budgetType: string;
  impressions: number;
  views: number;
  clicks: number;
  cost: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpm: number;
  viewRate: number;
  averageCpv: number;
}

export interface YouTubeMetrics {
  totalImpressions: number;
  totalViews: number;
  totalClicks: number;
  totalCost: number;
  totalConversions: number;
  averageCtr: number;
  averageCpc: number;
  averageCpm: number;
  averageViewRate: number;
  averageCpv: number;
  totalBudget: number;
  budgetSpent: number;
  budgetRemaining: number;
}

export interface YouTubePerformanceData {
  date: string;
  impressions: number;
  views: number;
  clicks: number;
  cost: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpm: number;
  viewRate: number;
  cpv: number;
}

class YouTubeAnalyticsService {
  // Get all YouTube campaigns from Google Ads
  async getYouTubeCampaigns(): Promise<YouTubeCampaign[]> {
    try {
      const connection = await googleAdsService.checkConnection();
      if (!connection) {
        throw new Error('No Google Ads connection found');
      }

      // Get all campaigns from Google Ads
      const allCampaigns = await googleAdsService.getCampaigns(connection);
      
      // Filter for YouTube campaigns - look for campaigns with video ads
      // In a real implementation, you would query for campaigns with video ad groups
      const youtubeCampaigns = allCampaigns.filter(campaign => {
        const name = campaign.name.toLowerCase();
        return name.includes('youtube') || 
               name.includes('video') || 
               name.includes('brand awareness') ||
               name.includes('display') ||
               name.includes('video action') ||
               name.includes('video reach');
      });

      // If no YouTube campaigns found, return all campaigns (for testing)
      const campaignsToProcess = youtubeCampaigns.length > 0 ? youtubeCampaigns : allCampaigns;

      // Transform to YouTube campaign format with additional YouTube-specific metrics
      return campaignsToProcess.map(campaign => {
        // For YouTube campaigns, views are typically 20-60% of impressions
        // This is a rough estimate - in a real implementation, you'd get this from the API
        const estimatedViewRate = 0.3; // 30% view rate (industry average)
        const estimatedViews = Math.round(campaign.impressions * estimatedViewRate);
        const estimatedCpv = estimatedViews > 0 ? campaign.cost / estimatedViews : 0;
        
        return {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          startDate: campaign.startDate,
          endDate: campaign.endDate,
          budget: campaign.budget,
          budgetType: campaign.budgetType,
          impressions: campaign.impressions,
          views: estimatedViews,
          clicks: campaign.clicks,
          cost: campaign.cost,
          conversions: campaign.conversions,
          ctr: campaign.ctr,
          cpc: campaign.cpc,
          cpm: campaign.cpm,
          viewRate: Math.round(estimatedViewRate * 10000) / 100,
          averageCpv: Math.round(estimatedCpv * 100) / 100
        };
      });
    } catch (error) {
      console.error('Error fetching YouTube campaigns:', error);
      throw error;
    }
  }

  // Get YouTube campaign by ID
  async getYouTubeCampaign(campaignId: string): Promise<YouTubeCampaign | null> {
    const campaigns = await this.getYouTubeCampaigns();
    return campaigns.find(campaign => campaign.id === campaignId) || null;
  }

  // Get aggregated metrics for all campaigns or specific campaign
  async getYouTubeMetrics(campaignId?: string): Promise<YouTubeMetrics> {
    const campaigns = await this.getYouTubeCampaigns();
    
    let filteredCampaigns = campaigns;
    if (campaignId && campaignId !== 'all') {
      filteredCampaigns = campaigns.filter(campaign => campaign.id === campaignId);
    }

    if (filteredCampaigns.length === 0) {
      return {
        totalImpressions: 0,
        totalViews: 0,
        totalClicks: 0,
        totalCost: 0,
        totalConversions: 0,
        averageCtr: 0,
        averageCpc: 0,
        averageCpm: 0,
        averageViewRate: 0,
        averageCpv: 0,
        totalBudget: 0,
        budgetSpent: 0,
        budgetRemaining: 0
      };
    }

    const totalImpressions = filteredCampaigns.reduce((sum, campaign) => sum + campaign.impressions, 0);
    const totalViews = filteredCampaigns.reduce((sum, campaign) => sum + campaign.views, 0);
    const totalClicks = filteredCampaigns.reduce((sum, campaign) => sum + campaign.clicks, 0);
    const totalCost = filteredCampaigns.reduce((sum, campaign) => sum + campaign.cost, 0);
    const totalConversions = filteredCampaigns.reduce((sum, campaign) => sum + campaign.conversions, 0);
    const totalBudget = filteredCampaigns.reduce((sum, campaign) => sum + campaign.budget, 0);

    const averageCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const averageCpc = totalClicks > 0 ? totalCost / totalClicks : 0;
    const averageCpm = totalImpressions > 0 ? (totalCost / totalImpressions) * 1000 : 0;
    const averageViewRate = totalImpressions > 0 ? (totalViews / totalImpressions) * 100 : 0;
    const averageCpv = totalViews > 0 ? totalCost / totalViews : 0;

    return {
      totalImpressions,
      totalViews,
      totalClicks,
      totalCost,
      totalConversions,
      averageCtr,
      averageCpc,
      averageCpm,
      averageViewRate,
      averageCpv,
      totalBudget,
      budgetSpent: totalCost,
      budgetRemaining: totalBudget - totalCost
    };
  }

  // Get daily performance data for charts
  async getYouTubePerformanceData(campaignId?: string, days: number = 365): Promise<YouTubePerformanceData[]> {
    try {
      const connection = await googleAdsService.checkConnection();
      if (!connection) {
        throw new Error('No Google Ads connection found');
      }

      // Get campaigns to determine the date range
      const campaigns = await this.getYouTubeCampaigns();
      let filteredCampaigns = campaigns;
      if (campaignId && campaignId !== 'all') {
        filteredCampaigns = campaigns.filter(campaign => campaign.id === campaignId);
      }

      if (filteredCampaigns.length === 0) {
        return [];
      }

      // For now, return empty array since we don't have real daily performance data
      // In a real implementation, this would query the Google Ads API for daily metrics
      console.warn('Daily performance data not implemented - requires additional Google Ads API calls');
      return [];
    } catch (error) {
      console.error('Error fetching YouTube performance data:', error);
      throw error;
    }
  }

  // Save YouTube campaign data to local database
  async syncYouTubeCampaigns(): Promise<void> {
    try {
      const campaigns = await this.getYouTubeCampaigns();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('youtube_campaigns')
        .upsert(
          campaigns.map(campaign => ({
            campaign_id: campaign.id,
            user_id: user.id,
            name: campaign.name,
            status: campaign.status,
            start_date: campaign.startDate,
            end_date: campaign.endDate,
            budget: campaign.budget,
            budget_type: campaign.budgetType,
            impressions: campaign.impressions,
            views: campaign.views,
            clicks: campaign.clicks,
            cost: campaign.cost,
            conversions: campaign.conversions,
            ctr: campaign.ctr,
            cpc: campaign.cpc,
            cpm: campaign.cpm,
            view_rate: campaign.viewRate,
            average_cpv: campaign.averageCpv,
            last_sync: new Date().toISOString()
          })),
          { onConflict: 'campaign_id,user_id' }
        );

      if (error) throw error;
    } catch (error) {
      console.error('Error syncing YouTube campaigns:', error);
      throw error;
    }
  }
}

export const youtubeAnalyticsService = new YouTubeAnalyticsService(); 