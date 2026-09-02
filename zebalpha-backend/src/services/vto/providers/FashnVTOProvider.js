import axios from 'axios';
import { VirtualTryOnProvider } from './VirtualTryOnProvider.js';

export class FashnVTOProvider extends VirtualTryOnProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'FashnAI';
    this.apiKey = config.apiKey;
    this.apiUrl = config.apiUrl || 'https://api.fashn.ai/v1';
    this.timeoutMs = config.timeoutMs || 65000;
  }

  async generateTryOn({ personImageBase64, garmentImageUrl, category = 'upper_body', productId }) {
    const startTime = Date.now();
    if (!this.apiKey) {
      throw new Error('Fashn.ai API key (VIRTUAL_TRYON_API_KEY) is not configured.');
    }

    // Map internal category to Fashn.ai categories
    let fashnCategory = 'tops';
    if (category === 'lower_body') fashnCategory = 'bottoms';
    else if (category === 'dresses') fashnCategory = 'one-pieces';

    const humanImg = personImageBase64.startsWith('data:')
      ? personImageBase64
      : `data:image/jpeg;base64,${personImageBase64}`;

    const requestBody = {
      model_image: humanImg,
      garment_image: garmentImageUrl,
      category: fashnCategory,
      nsfw_filter: true,
      cover_feet: false,
      adjust_hands: true,
      restore_background: true
    };

    // 1. Submit job
    const runRes = await axios.post(`${this.apiUrl}/run`, requestBody, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    const jobId = runRes.data?.id;
    if (!jobId) {
      throw new Error('Failed to initiate virtual try-on task with Fashn.ai');
    }

    // 2. Poll status
    const deadline = Date.now() + this.timeoutMs;
    let jobData = runRes.data;

    while (jobData.status !== 'completed' && jobData.status !== 'failed') {
      if (Date.now() > deadline) {
        throw new Error('Fashn.ai try-on processing timed out.');
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const statusRes = await axios.get(`${this.apiUrl}/status/${jobId}`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        timeout: 10000
      });
      jobData = statusRes.data;
    }

    if (jobData.status !== 'completed') {
      const errMsg = jobData.error?.message || 'Virtual try-on generation failed on Fashn.ai';
      throw new Error(errMsg);
    }

    const outputUrl = jobData.output?.[0];
    if (!outputUrl) {
      throw new Error('Fashn.ai did not return an output image.');
    }

    return {
      success: true,
      imageUrl: outputUrl,
      processingTimeMs: Date.now() - startTime,
      provider: 'fashn',
      metadata: { jobId, executionTime: jobData.execution_time }
    };
  }
}
