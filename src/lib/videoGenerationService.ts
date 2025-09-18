/**
 * Video Generation Service
 * This service handles the actual video generation using various providers
 */

export interface VideoGenerationRequest {
  prompt: string;
  aspectRatio: string;
  duration: number;
  style: string;
  theme?: string;
}

export interface VideoGenerationResponse {
  videoUrl: string;
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  estimatedTime?: number;
}

class VideoGenerationService {
  /**
   * Generate a video using the best available service
   */
  async generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
    console.log('🎬 Starting video generation:', request);
    console.log('🎨 Theme:', request.theme);
    console.log('📐 Aspect ratio:', request.aspectRatio);
    console.log('⏱️ Duration:', request.duration);
    
    try {
      // Create a dynamic video using HTML5 Canvas
      const videoUrl = await this.createDynamicVideo(request);
      
      console.log('✅ Video generation successful:', videoUrl);
      
      return {
        videoUrl,
        jobId: `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        status: 'completed',
        estimatedTime: request.duration * 2
      };
    } catch (error) {
      console.error('❌ Error generating video:', error);
      throw new Error('Failed to generate video. Please try again.');
    }
  }

  /**
   * Create a dynamic video using HTML5 Canvas
   * This creates a real video based on the content
   */
  private async createDynamicVideo(request: VideoGenerationRequest): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        // Create a canvas element
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Canvas not supported'));
          return;
        }

        // Set canvas size based on aspect ratio
        const aspectRatio = request.aspectRatio.split(':');
        const width = aspectRatio[0] === '9' ? 720 : aspectRatio[0] === '16' ? 1280 : 1080;
        const height = aspectRatio[1] === '16' ? 1280 : aspectRatio[1] === '9' ? 720 : 1080;
        
        canvas.width = width;
        canvas.height = height;

        // Create a real video using MediaRecorder
        this.createVideoWithMediaRecorder(canvas, ctx, width, height, request)
          .then(videoUrl => resolve(videoUrl))
          .catch(error => {
            console.error('MediaRecorder failed, using fallback:', error);
            // Fallback to static image
            this.createStaticVideo(canvas, ctx, width, height, request)
              .then(videoUrl => resolve(videoUrl))
              .catch(reject);
          });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Create a video using MediaRecorder API
   */
  private async createVideoWithMediaRecorder(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, width: number, height: number, request: VideoGenerationRequest): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        // Create a video stream from canvas
        const stream = canvas.captureStream(30); // 30 FPS
        
        // Create MediaRecorder
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp9'
        });

        const chunks: Blob[] = [];
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          const videoUrl = URL.createObjectURL(blob);
          console.log('🎬 Generated real video URL:', videoUrl);
          resolve(videoUrl);
        };

        // Start recording
        mediaRecorder.start();

        // Animate the canvas
        const duration = request.duration * 1000; // Convert to milliseconds
        const startTime = Date.now();
        
        const animate = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          
          // Clear canvas
          ctx.fillStyle = this.getBackgroundColor(request.theme || 'business');
          ctx.fillRect(0, 0, width, height);

          // Add gradient overlay
          const gradient = ctx.createLinearGradient(0, 0, 0, height);
          gradient.addColorStop(0, 'rgba(0,0,0,0.3)');
          gradient.addColorStop(1, 'rgba(0,0,0,0.7)');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, width, height);

          // Add animated elements
          this.addAnimatedElements(ctx, width, height, request, progress);

          // Add text content
          this.addTextContent(ctx, width, height, request, progress);

          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            // Stop recording
            mediaRecorder.stop();
          }
        };

        animate();

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Create a static video (fallback)
   */
  private async createStaticVideo(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, width: number, height: number, request: VideoGenerationRequest): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        // Create a single frame
        ctx.fillStyle = this.getBackgroundColor(request.theme || 'business');
        ctx.fillRect(0, 0, width, height);

        // Add gradient overlay
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, 'rgba(0,0,0,0.3)');
        gradient.addColorStop(1, 'rgba(0,0,0,0.7)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Add animated elements
        this.addAnimatedElements(ctx, width, height, request, 0.5);

        // Add text content
        this.addTextContent(ctx, width, height, request, 0.5);

        // Convert to blob
        canvas.toBlob((blob) => {
          if (blob) {
            const videoUrl = URL.createObjectURL(blob);
            console.log('🎬 Generated static video URL:', videoUrl);
            resolve(videoUrl);
          } else {
            reject(new Error('Failed to create video blob'));
          }
        }, 'image/png');

      } catch (error) {
        reject(error);
      }
    });
  }


  /**
   * Add animated elements to the frame based on content theme
   */
  private addAnimatedElements(ctx: CanvasRenderingContext2D, width: number, height: number, request: VideoGenerationRequest, progress: number) {
    const centerX = width / 2;
    const centerY = height / 2;
    const theme = request.theme || 'business';

    // Theme-specific animated elements
    if (theme === 'tech' || theme === 'software') {
      this.addTechElements(ctx, width, height, progress);
    } else if (theme === 'product' || theme === 'demo') {
      this.addProductElements(ctx, width, height, progress);
    } else if (theme === 'marketing' || theme === 'ad') {
      this.addMarketingElements(ctx, width, height, progress);
    } else if (theme === 'ecommerce' || theme === 'retail') {
      this.addEcommerceElements(ctx, width, height, progress);
    } else if (theme === 'education' || theme === 'learning') {
      this.addEducationElements(ctx, width, height, progress);
    } else if (theme === 'health' || theme === 'fitness') {
      this.addHealthElements(ctx, width, height, progress);
    } else {
      this.addBusinessElements(ctx, width, height, progress);
    }
  }

  /**
   * Add tech-themed animated elements
   */
  private addTechElements(ctx: CanvasRenderingContext2D, width: number, height: number, progress: number) {
    const centerX = width / 2;
    const centerY = height / 2;

    // Circuit-like lines
    ctx.strokeStyle = `rgba(0, 255, 255, ${0.3 + Math.sin(progress * Math.PI * 4) * 0.2})`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(0, height * (i / 5) + Math.sin(progress * Math.PI * 2 + i) * 20);
      ctx.lineTo(width, height * (i / 5) + Math.sin(progress * Math.PI * 2 + i) * 20);
      ctx.stroke();
    }

    // Floating data points
    for (let i = 0; i < 8; i++) {
      const x = (width / 8) * i + Math.sin(progress * Math.PI * 2 + i) * 30;
      const y = centerY + Math.cos(progress * Math.PI * 2 + i) * 50;
      ctx.fillStyle = `rgba(0, 255, 255, ${0.6 + Math.sin(progress * Math.PI * 2 + i) * 0.3})`;
      ctx.fillRect(x - 2, y - 2, 4, 4);
    }
  }

  /**
   * Add product-themed animated elements
   */
  private addProductElements(ctx: CanvasRenderingContext2D, width: number, height: number, progress: number) {
    const centerX = width / 2;
    const centerY = height / 2;

    // Product showcase circles
    for (let i = 0; i < 3; i++) {
      const radius = 40 + Math.sin(progress * Math.PI * 2 + i) * 15;
      const x = centerX + Math.cos(progress * Math.PI * 2 + i) * 80;
      const y = centerY + Math.sin(progress * Math.PI * 2 + i) * 80;
      
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 165, 0, ${0.2 + i * 0.1})`;
      ctx.fill();
    }

    // Highlight lines
    ctx.strokeStyle = `rgba(255, 165, 0, ${0.5 + Math.sin(progress * Math.PI * 2) * 0.3})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, height * progress);
    ctx.lineTo(width, height * (1 - progress));
    ctx.stroke();
  }

  /**
   * Add marketing-themed animated elements
   */
  private addMarketingElements(ctx: CanvasRenderingContext2D, width: number, height: number, progress: number) {
    const centerX = width / 2;
    const centerY = height / 2;

    // Burst effect
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const distance = 100 + Math.sin(progress * Math.PI * 2 + i) * 30;
      const x = centerX + Math.cos(angle) * distance;
      const y = centerY + Math.sin(angle) * distance;
      
      ctx.fillStyle = `rgba(255, 0, 150, ${0.4 + Math.sin(progress * Math.PI * 2 + i) * 0.3})`;
      ctx.fillRect(x - 3, y - 3, 6, 6);
    }

    // Pulsing center
    const pulseRadius = 60 + Math.sin(progress * Math.PI * 4) * 20;
    ctx.beginPath();
    ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 0, 150, ${0.1 + Math.sin(progress * Math.PI * 2) * 0.1})`;
    ctx.fill();
  }

  /**
   * Add e-commerce themed animated elements
   */
  private addEcommerceElements(ctx: CanvasRenderingContext2D, width: number, height: number, progress: number) {
    const centerX = width / 2;
    const centerY = height / 2;

    // Shopping cart elements
    for (let i = 0; i < 6; i++) {
      const x = (width / 6) * i + Math.sin(progress * Math.PI * 2 + i) * 20;
      const y = centerY + Math.cos(progress * Math.PI * 2 + i) * 40;
      
      // Product boxes
      ctx.fillStyle = `rgba(0, 200, 100, ${0.3 + Math.sin(progress * Math.PI * 2 + i) * 0.2})`;
      ctx.fillRect(x - 15, y - 15, 30, 30);
      
      // Price tags
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fillRect(x - 10, y + 10, 20, 8);
    }
  }

  /**
   * Add education-themed animated elements
   */
  private addEducationElements(ctx: CanvasRenderingContext2D, width: number, height: number, progress: number) {
    const centerX = width / 2;
    const centerY = height / 2;

    // Book pages flipping
    for (let i = 0; i < 3; i++) {
      const pageX = centerX + (i - 1) * 60;
      const pageY = centerY - 40;
      const pageWidth = 40;
      const pageHeight = 50;
      
      ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + Math.sin(progress * Math.PI * 2 + i) * 0.2})`;
      ctx.fillRect(pageX - pageWidth/2, pageY - pageHeight/2, pageWidth, pageHeight);
      
      // Page lines
      ctx.strokeStyle = `rgba(0, 0, 0, ${0.5 + Math.sin(progress * Math.PI * 2 + i) * 0.3})`;
      ctx.lineWidth = 1;
      for (let j = 0; j < 5; j++) {
        ctx.beginPath();
        ctx.moveTo(pageX - pageWidth/2 + 5, pageY - pageHeight/2 + 10 + j * 8);
        ctx.lineTo(pageX + pageWidth/2 - 5, pageY - pageHeight/2 + 10 + j * 8);
        ctx.stroke();
      }
    }

    // Graduation cap
    const capX = centerX;
    const capY = centerY + 60;
    ctx.fillStyle = `rgba(255, 215, 0, ${0.6 + Math.sin(progress * Math.PI * 2) * 0.3})`;
    ctx.fillRect(capX - 20, capY - 10, 40, 20);
    
    // Tassel
    ctx.strokeStyle = `rgba(255, 215, 0, ${0.8 + Math.sin(progress * Math.PI * 2) * 0.2})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(capX + 15, capY - 10);
    ctx.lineTo(capX + 20, capY - 20);
    ctx.stroke();
  }

  /**
   * Add health-themed animated elements
   */
  private addHealthElements(ctx: CanvasRenderingContext2D, width: number, height: number, progress: number) {
    const centerX = width / 2;
    const centerY = height / 2;

    // Heartbeat line
    ctx.strokeStyle = `rgba(255, 0, 0, ${0.6 + Math.sin(progress * Math.PI * 4) * 0.4})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < width; i += 10) {
      const y = centerY + Math.sin((i / width) * Math.PI * 4 + progress * Math.PI * 2) * 30;
      if (i === 0) {
        ctx.moveTo(i, y);
      } else {
        ctx.lineTo(i, y);
      }
    }
    ctx.stroke();

    // Floating health icons
    const icons = ['❤️', '💪', '🏃', '🧘'];
    for (let i = 0; i < 4; i++) {
      const x = (width / 4) * i + Math.sin(progress * Math.PI * 2 + i) * 40;
      const y = centerY + Math.cos(progress * Math.PI * 2 + i) * 80;
      
      ctx.fillStyle = `rgba(255, 0, 0, ${0.4 + Math.sin(progress * Math.PI * 2 + i) * 0.3})`;
      ctx.fillRect(x - 15, y - 15, 30, 30);
    }

    // Pulse circles
    for (let i = 0; i < 3; i++) {
      const radius = 50 + Math.sin(progress * Math.PI * 2 + i) * 20;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 0, 0, ${0.1 + Math.sin(progress * Math.PI * 2 + i) * 0.1})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  /**
   * Add business-themed animated elements
   */
  private addBusinessElements(ctx: CanvasRenderingContext2D, width: number, height: number, progress: number) {
    const centerX = width / 2;
    const centerY = height / 2;

    // Professional grid
    ctx.strokeStyle = `rgba(2, 179, 229, ${0.2 + Math.sin(progress * Math.PI * 2) * 0.1})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(0, height * (i / 5));
      ctx.lineTo(width, height * (i / 5));
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(width * (i / 5), 0);
      ctx.lineTo(width * (i / 5), height);
      ctx.stroke();
    }

    // Floating business icons
    for (let i = 0; i < 4; i++) {
      const x = (width / 4) * i + Math.sin(progress * Math.PI * 2 + i) * 30;
      const y = centerY + Math.cos(progress * Math.PI * 2 + i) * 60;
      
      ctx.fillStyle = `rgba(2, 179, 229, ${0.4 + Math.sin(progress * Math.PI * 2 + i) * 0.3})`;
      ctx.fillRect(x - 10, y - 10, 20, 20);
    }
  }

  /**
   * Add text content to the frame based on the actual input
   */
  private addTextContent(ctx: CanvasRenderingContext2D, width: number, height: number, request: VideoGenerationRequest, progress: number) {
    const centerX = width / 2;
    const centerY = height / 2;

    let mainTitle = 'Your Video Ad';
    let subtitle = 'Generated with AI';
    let keyBenefit = '';
    let targetAudience = '';
    let cta = 'Learn More';

    const prompt = request.prompt;
    console.log('📝 Parsing video content from prompt:', prompt);

    // Attempt to parse the prompt as a JSON object first
    try {
      const jsonMatch = prompt.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        const parsedJson = JSON.parse(jsonMatch[1]);
        mainTitle = parsedJson.title || mainTitle;
        subtitle = parsedJson.summary || subtitle;
        console.log('🎯 Extracted from JSON:', { mainTitle, subtitle });
      }
    } catch (e) {
      console.warn('Could not parse JSON from prompt, falling back to line-by-line parsing.', e);
    }

    const lines = prompt.split('\n').filter(line => line.trim());

    // Fallback/supplementary parsing for non-JSON parts or if JSON parsing failed
    for (const line of lines) {
      if (line.includes('Key Benefit:') || line.includes('Key benefit:')) {
        const match = line.match(/Key Benefit:\s*(.+)/i); // Case-insensitive
        if (match) {
          keyBenefit = match[1];
          console.log('💡 Extracted key benefit:', keyBenefit);
        }
      } else if (line.includes('Target Audience:') || line.includes('Target audience:')) {
        const match = line.match(/Target Audience:\s*(.+)/i);
        if (match) {
          targetAudience = match[1];
          console.log('👥 Extracted target audience:', targetAudience);
        }
      } else if (line.includes('CTA:') || line.includes('Call to Action:')) {
        const match = line.match(/CTA:\s*(.+)/i);
        if (match) {
          cta = match[1];
          console.log('📢 Extracted CTA:', cta);
        }
      }
    }

    // If mainTitle is still generic and subtitle is from JSON, try to get a better mainTitle from subtitle
    if (mainTitle === 'Your Video Ad' && subtitle !== 'Generated with AI') {
      const firstSentence = subtitle.split('.')[0];
      if (firstSentence.length > 0) {
        mainTitle = firstSentence;
        subtitle = ''; // Clear subtitle if it was used for title
      }
    }
    
    // If no structured content found, use the raw prompt
    if (mainTitle === 'Your Video Ad' && prompt.length > 0) {
      const words = prompt.split(' ').slice(0, 8);
      mainTitle = words.join(' ');
      if (prompt.length > 50) {
        subtitle = prompt.substring(0, 100) + '...';
      }
    }

    // Main title with animation
    ctx.fillStyle = 'white';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    
    // Animate title appearance
    const titleOpacity = Math.min(progress * 3, 1);
    ctx.globalAlpha = titleOpacity;
    ctx.fillText(mainTitle, centerX, centerY - 80);
    ctx.globalAlpha = 1;

    // Key benefit (if available)
    if (keyBenefit && progress > 0.2) {
      ctx.font = '20px Arial';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillText(keyBenefit, centerX, centerY - 20);
    }

    // Subtitle with fade in
    if (progress > 0.3) {
      ctx.font = '18px Arial';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fillText(subtitle, centerX, centerY + 20);
    }

    // Target audience (if available)
    if (targetAudience && progress > 0.5) {
      ctx.font = '16px Arial';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillText(`For: ${targetAudience}`, centerX, centerY + 60);
    }

    // Progress indicator
    const barWidth = width * 0.6;
    const barHeight = 6;
    const barX = (width - barWidth) / 2;
    const barY = centerY + 100;

    // Background bar
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Progress bar with animation
    ctx.fillStyle = '#02b3e5';
    ctx.fillRect(barX, barY, barWidth * progress, barHeight);

    // CTA button (if available)
    if (progress > 0.7) {
      const buttonWidth = 120;
      const buttonHeight = 40;
      const buttonX = centerX - buttonWidth / 2;
      const buttonY = centerY + 140;

      // Button background
      ctx.fillStyle = '#02b3e5';
      ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

      // Button text
      ctx.fillStyle = 'white';
      ctx.font = 'bold 16px Arial';
      ctx.fillText(cta, centerX, buttonY + 25);
    }

    // Theme indicator
    if (request.theme) {
      ctx.font = '14px Arial';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fillText(`Theme: ${request.theme}`, centerX, centerY + 200);
    }
  }

  /**
   * Get background color based on theme
   */
  private getBackgroundColor(theme: string): string {
    const colors = {
      business: '#1a1a2e',
      tech: '#16213e',
      product: '#0f3460',
      marketing: '#533483',
      ecommerce: '#2d1b69',
      education: '#1e3c72',
      health: '#2c5530',
      learning: '#1e3c72',
      fitness: '#2c5530',
      wellness: '#2c5530'
    };
    return colors[theme as keyof typeof colors] || colors.business;
  }


  /**
   * Generate video using external service (placeholder for future implementation)
   */
  private async generateWithExternalService(request: VideoGenerationRequest): Promise<string> {
    // This would integrate with services like:
    // - Luma AI
    // - Runway ML
    // - Pika Labs
    // - Stable Video Diffusion
    
    console.log('🚀 Would call external video generation service:', request);
    
    // For now, return a contextual sample video
    const themeVideos = {
      business: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      tech: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      product: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      marketing: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
      ecommerce: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
      education: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
      health: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
    };

    const theme = request.theme || 'business';
    return themeVideos[theme as keyof typeof themeVideos] || themeVideos.business;
  }
}

export const videoGenerationService = new VideoGenerationService();
