/**
 * VAST Parser Service
 * Handles parsing and analysis of VAST/VPAID tags
 */

export interface TagAnalysis {
  vastVersion?: string;
  hasLinear: boolean;
  hasNonLinear: boolean;
  hasCompanions: boolean;
  mediaMimes: string[];
  duration?: string; // "HH:MM:SS"
  skipOffset?: string;
  clickThrough?: string;
  omid: boolean;
  vpaid: { present: boolean; model?: 'JS'|'Flash'; version?: '1.0'|'2.0' } | null;
  mezzanine: boolean;
  verificationCount: number;
  ssaiFriendly: boolean;
  warnings: string[];
  errors: string[];
}

export interface MediaFile {
  url: string;
  type: string;
  delivery: string;
  bitrate?: number;
  width?: number;
  height?: number;
  apiFramework?: string;
}

export interface VastAd {
  id: string;
  sequence?: number;
  linear?: {
    duration?: string;
    skipOffset?: string;
    mediaFiles: MediaFile[];
    clickThrough?: string;
    trackingEvents: Array<{ event: string; url: string }>;
  };
  nonLinear?: {
    mediaFiles: MediaFile[];
    clickThrough?: string;
  };
  companions?: Array<{
    width: number;
    height: number;
    mediaFiles: MediaFile[];
    clickThrough?: string;
  }>;
  verifications?: Array<{
    vendor: string;
    apiFramework: string;
    resource: string;
  }>;
}

class VastParserService {
  /**
   * Parse VAST XML and return analysis
   */
  async parseVastTag(xmlContent: string): Promise<TagAnalysis> {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlContent, 'application/xml');
    
    // Check for parsing errors
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      throw new Error('Invalid XML format');
    }

    const vast = doc.querySelector('VAST');
    if (!vast) {
      throw new Error('No VAST element found');
    }

    const analysis: TagAnalysis = {
      vastVersion: vast.getAttribute('version') || 'Unknown',
      hasLinear: false,
      hasNonLinear: false,
      hasCompanions: false,
      mediaMimes: [],
      omid: false,
      vpaid: { present: false },
      mezzanine: false,
      verificationCount: 0,
      ssaiFriendly: true,
      warnings: [],
      errors: []
    };

    try {
      // Parse ads
      const ads = this.parseAds(doc);
      
      // Analyze each ad
      for (const ad of ads) {
        if (ad.linear) {
          analysis.hasLinear = true;
          analysis.mediaMimes.push(...ad.linear.mediaFiles.map(m => m.type));
          
          if (ad.linear.duration) {
            analysis.duration = ad.linear.duration;
          }
          if (ad.linear.skipOffset) {
            analysis.skipOffset = ad.linear.skipOffset;
          }
          if (ad.linear.clickThrough) {
            analysis.clickThrough = ad.linear.clickThrough;
          }
        }
        
        if (ad.nonLinear) {
          analysis.hasNonLinear = true;
          analysis.mediaMimes.push(...ad.nonLinear.mediaFiles.map(m => m.type));
        }
        
        if (ad.companions && ad.companions.length > 0) {
          analysis.hasCompanions = true;
        }
        
        if (ad.verifications) {
          analysis.verificationCount += ad.verifications.length;
          analysis.omid = ad.verifications.some(v => v.apiFramework === 'omid');
        }
      }

      // Remove duplicate MIME types
      analysis.mediaMimes = [...new Set(analysis.mediaMimes)];

      // Check for VPAID
      const vpaidFiles = this.findVpaidFiles(doc);
      if (vpaidFiles.length > 0) {
        analysis.vpaid = { present: true };
        
        // Determine VPAID model and version
        for (const file of vpaidFiles) {
          if (file.type === 'application/javascript') {
            analysis.vpaid.model = 'JS';
            analysis.vpaid.version = this.detectVpaidVersion(doc, 'JS');
          } else if (file.type === 'application/x-shockwave-flash') {
            analysis.vpaid.model = 'Flash';
            analysis.vpaid.version = '1.0';
          }
        }
        
        analysis.ssaiFriendly = false;
      }

      // Check for mezzanine files
      analysis.mezzanine = this.hasMezzanineFiles(doc);

      // Generate warnings and recommendations
      this.generateWarnings(analysis);

    } catch (error: any) {
      analysis.errors.push(`Parsing error: ${error.message}`);
    }

    return analysis;
  }

  /**
   * Parse all ads from VAST document
   */
  private parseAds(doc: Document): VastAd[] {
    const ads: VastAd[] = [];
    const adElements = doc.querySelectorAll('Ad');

    adElements.forEach(adEl => {
      const ad: VastAd = {
        id: adEl.getAttribute('id') || `ad_${ads.length}`,
        sequence: adEl.getAttribute('sequence') ? parseInt(adEl.getAttribute('sequence')!) : undefined
      };

      // Parse Linear creative
      const linearEl = adEl.querySelector('Linear');
      if (linearEl) {
        ad.linear = this.parseLinearCreative(linearEl);
      }

      // Parse NonLinear creative
      const nonLinearEl = adEl.querySelector('NonLinearAds');
      if (nonLinearEl) {
        ad.nonLinear = this.parseNonLinearCreative(nonLinearEl);
      }

      // Parse Companions
      const companionsEl = adEl.querySelector('CompanionAds');
      if (companionsEl) {
        ad.companions = this.parseCompanions(companionsEl);
      }

      // Parse Verifications
      const verificationsEl = adEl.querySelector('AdVerifications');
      if (verificationsEl) {
        ad.verifications = this.parseVerifications(verificationsEl);
      }

      ads.push(ad);
    });

    return ads;
  }

  /**
   * Parse Linear creative
   */
  private parseLinearCreative(linearEl: Element): VastAd['linear'] {
    const linear: VastAd['linear'] = {
      mediaFiles: [],
      trackingEvents: []
    };

    // Duration
    const durationEl = linearEl.querySelector('Duration');
    if (durationEl) {
      linear.duration = durationEl.textContent || undefined;
    }

    // Skip offset
    linear.skipOffset = linearEl.getAttribute('skipoffset') || undefined;

    // Media files
    const mediaFiles = linearEl.querySelectorAll('MediaFile');
    mediaFiles.forEach(fileEl => {
      const mediaFile: MediaFile = {
        url: fileEl.textContent || '',
        type: fileEl.getAttribute('type') || '',
        delivery: fileEl.getAttribute('delivery') || 'progressive',
        bitrate: fileEl.getAttribute('bitrate') ? parseInt(fileEl.getAttribute('bitrate')!) : undefined,
        width: fileEl.getAttribute('width') ? parseInt(fileEl.getAttribute('width')!) : undefined,
        height: fileEl.getAttribute('height') ? parseInt(fileEl.getAttribute('height')!) : undefined,
        apiFramework: fileEl.getAttribute('apiFramework') || undefined
      };
      linear.mediaFiles.push(mediaFile);
    });

    // Click through
    const clickThroughEl = linearEl.querySelector('ClickThrough');
    if (clickThroughEl) {
      linear.clickThrough = clickThroughEl.textContent || undefined;
    }

    // Tracking events
    const trackingEl = linearEl.querySelector('TrackingEvents');
    if (trackingEl) {
      const events = trackingEl.querySelectorAll('Tracking');
      events.forEach(eventEl => {
        const event = eventEl.getAttribute('event');
        const url = eventEl.textContent;
        if (event && url) {
          linear.trackingEvents.push({ event, url });
        }
      });
    }

    return linear;
  }

  /**
   * Parse NonLinear creative
   */
  private parseNonLinearCreative(nonLinearEl: Element): VastAd['nonLinear'] {
    const nonLinear: VastAd['nonLinear'] = {
      mediaFiles: []
    };

    const mediaFiles = nonLinearEl.querySelectorAll('MediaFile');
    mediaFiles.forEach(fileEl => {
      const mediaFile: MediaFile = {
        url: fileEl.textContent || '',
        type: fileEl.getAttribute('type') || '',
        delivery: fileEl.getAttribute('delivery') || 'progressive',
        width: fileEl.getAttribute('width') ? parseInt(fileEl.getAttribute('width')!) : undefined,
        height: fileEl.getAttribute('height') ? parseInt(fileEl.getAttribute('height')!) : undefined,
        apiFramework: fileEl.getAttribute('apiFramework') || undefined
      };
      nonLinear.mediaFiles.push(mediaFile);
    });

    const clickThroughEl = nonLinearEl.querySelector('ClickThrough');
    if (clickThroughEl) {
      nonLinear.clickThrough = clickThroughEl.textContent || undefined;
    }

    return nonLinear;
  }

  /**
   * Parse Companions
   */
  private parseCompanions(companionsEl: Element): VastAd['companions'] {
    const companions: VastAd['companions'] = [];
    const companionEls = companionsEl.querySelectorAll('Companion');

    companionEls.forEach(companionEl => {
      const companion = {
        width: parseInt(companionEl.getAttribute('width') || '0'),
        height: parseInt(companionEl.getAttribute('height') || '0'),
        mediaFiles: [] as MediaFile[],
        clickThrough: undefined as string | undefined
      };

      const mediaFiles = companionEl.querySelectorAll('MediaFile');
      mediaFiles.forEach(fileEl => {
        const mediaFile: MediaFile = {
          url: fileEl.textContent || '',
          type: fileEl.getAttribute('type') || '',
          delivery: fileEl.getAttribute('delivery') || 'progressive',
          width: fileEl.getAttribute('width') ? parseInt(fileEl.getAttribute('width')!) : undefined,
          height: fileEl.getAttribute('height') ? parseInt(fileEl.getAttribute('height')!) : undefined,
          apiFramework: fileEl.getAttribute('apiFramework') || undefined
        };
        companion.mediaFiles.push(mediaFile);
      });

      const clickThroughEl = companionEl.querySelector('ClickThrough');
      if (clickThroughEl) {
        companion.clickThrough = clickThroughEl.textContent || undefined;
      }

      companions.push(companion);
    });

    return companions;
  }

  /**
   * Parse Verifications
   */
  private parseVerifications(verificationsEl: Element): VastAd['verifications'] {
    const verifications: VastAd['verifications'] = [];
    const verificationEls = verificationsEl.querySelectorAll('Verification');

    verificationEls.forEach(verificationEl => {
      const vendor = verificationEl.getAttribute('vendor') || '';
      const jsResources = verificationEl.querySelectorAll('JavaScriptResource');
      
      jsResources.forEach(jsEl => {
        const apiFramework = jsEl.getAttribute('apiFramework') || '';
        const resource = jsEl.textContent || '';
        
        verifications.push({
          vendor,
          apiFramework,
          resource
        });
      });
    });

    return verifications;
  }

  /**
   * Find VPAID media files
   */
  private findVpaidFiles(doc: Document): MediaFile[] {
    const vpaidFiles: MediaFile[] = [];
    const mediaFiles = doc.querySelectorAll('MediaFile[apiFramework="VPAID"]');

    mediaFiles.forEach(fileEl => {
      const mediaFile: MediaFile = {
        url: fileEl.textContent || '',
        type: fileEl.getAttribute('type') || '',
        delivery: fileEl.getAttribute('delivery') || 'progressive',
        bitrate: fileEl.getAttribute('bitrate') ? parseInt(fileEl.getAttribute('bitrate')!) : undefined,
        width: fileEl.getAttribute('width') ? parseInt(fileEl.getAttribute('width')!) : undefined,
        height: fileEl.getAttribute('height') ? parseInt(fileEl.getAttribute('height')!) : undefined,
        apiFramework: 'VPAID'
      };
      vpaidFiles.push(mediaFile);
    });

    return vpaidFiles;
  }

  /**
   * Detect VPAID version
   */
  private detectVpaidVersion(doc: Document, model: 'JS' | 'Flash'): '1.0' | '2.0' {
    // Look for VPAID version indicators in AdSystem, AdTitle, or AdParameters
    const adSystem = doc.querySelector('AdSystem');
    if (adSystem && adSystem.textContent?.includes('VPAID 2.0')) {
      return '2.0';
    }

    const adTitle = doc.querySelector('AdTitle');
    if (adTitle && adTitle.textContent?.includes('VPAID 2.0')) {
      return '2.0';
    }

    const adParameters = doc.querySelector('AdParameters');
    if (adParameters && adParameters.textContent?.includes('VPAID 2.0')) {
      return '2.0';
    }

    // Default to 2.0 for JS, 1.0 for Flash
    return model === 'JS' ? '2.0' : '1.0';
  }

  /**
   * Check for mezzanine files
   */
  private hasMezzanineFiles(doc: Document): boolean {
    const mezzanineFiles = doc.querySelectorAll('MediaFile[delivery="progressive"]');
    return mezzanineFiles.length > 0;
  }

  /**
   * Generate warnings and recommendations
   */
  private generateWarnings(analysis: TagAnalysis): void {
    if (analysis.vpaid?.present) {
      analysis.warnings.push('VPAID detected. Most CTV environments block VPAID execution. Expect playback/measurement issues. Use VAST 4 + OMID or SIMID for CTV.');
    }
    
    if (!analysis.omid && !analysis.vpaid?.present) {
      analysis.warnings.push('Add OMID verification for viewability and brand-safety measurement.');
    }

    if (analysis.vpaid?.model === 'Flash') {
      analysis.warnings.push('VPAID Flash is deprecated and not supported.');
    }

    // Check for SSAI compatibility
    if (analysis.vpaid?.present) {
      analysis.ssaiFriendly = false;
    } else if (analysis.mediaMimes.some(mime => mime.includes('javascript') || mime.includes('flash'))) {
      analysis.ssaiFriendly = false;
      analysis.warnings.push('Contains JavaScript or Flash media files. Not SSAI-friendly.');
    }

    // Check for common issues
    if (analysis.hasLinear && !analysis.clickThrough) {
      analysis.warnings.push('Linear creative missing click-through URL.');
    }

    if (analysis.verificationCount === 0) {
      analysis.warnings.push('No verification resources found. Consider adding viewability measurement.');
    }

    // Check MIME type support
    const unsupportedMimes = analysis.mediaMimes.filter(mime => 
      !mime.includes('video/mp4') && 
      !mime.includes('video/webm') && 
      !mime.includes('video/ogg') &&
      !mime.includes('image/')
    );
    
    if (unsupportedMimes.length > 0) {
      analysis.warnings.push(`Unsupported media types detected: ${unsupportedMimes.join(', ')}`);
    }
  }

  /**
   * Get best playable media file for preview
   */
  getBestMediaFile(analysis: TagAnalysis): MediaFile | null {
    if (!analysis.hasLinear) return null;

    // This would be implemented to select the best media file
    // based on browser support, resolution, bitrate, etc.
    return null;
  }

  /**
   * Format duration from HH:MM:SS to seconds
   */
  formatDurationToSeconds(duration: string): number {
    const parts = duration.split(':').map(Number);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return 0;
  }

  /**
   * Format seconds to HH:MM:SS
   */
  formatSecondsToDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  }
}

export const vastParserService = new VastParserService();

