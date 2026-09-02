import axios from 'axios';
import { VirtualTryOnProvider } from './VirtualTryOnProvider.js';

export class ReplicateVTOProvider extends VirtualTryOnProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'Replicate';
    this.apiKey = config.apiKey;
    this.modelId = config.modelId || 'cuuupid/idm-vton:c871bb9b046607b680486f0690f3c443d6f794da9199cf8618b3240b2d422a83';
    this.timeoutMs = config.timeoutMs || 65000;
  }

  async generateTryOn({ personImageBase64, garmentImageUrl, category = 'upper_body', productId }) {
    const startTime = Date.now();
    if (!this.apiKey) {
      throw new Error('Replicate API key (VIRTUAL_TRYON_API_KEY) is not configured.');
    }

    // Ensure person image has valid data URI format for Replicate
    const humanImg = personImageBase64.startsWith('data:') 
      ? personImageBase64 
      : `data:image/jpeg;base64,${personImageBase64}`;

    // Extract model version if supplied as owner/model:version
    const versionMatch = this.modelId.includes(':') ? this.modelId.split(':')[1] : null;

    const requestBody = {
      input: {
        human_img: humanImg,
        garm_img: garmentImageUrl,
        garment_des: `High-quality ${category.replace('_', ' ')} garment`,
        category: category === 'outerwear' ? 'upper_body' : category,
        crop: true,
        steps: 30,
        seed: 42
      }
    };

    if (versionMatch) {
      requestBody.version = versionMatch;
    }

    // 1. Initiate prediction
    const createRes = await axios.post('https://api.replicate.com/v1/predictions', requestBody, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        Prefer: 'wait' // Replicate will hold connection for up to 60s if ready
      },
      timeout: this.timeoutMs
    });

    let prediction = createRes.data;

    // 2. If not finished in initial wait, poll until succeeded or timeout
    const pollUrl = prediction.urls?.get || `https://api.replicate.com/v1/predictions/${prediction.id}`;
    const deadline = Date.now() + this.timeoutMs;

    while (prediction.status !== 'succeeded' && prediction.status !== 'failed' && prediction.status !== 'canceled') {
      if (Date.now() > deadline) {
        throw new Error('Virtual try-on processing timed out. Please try again.');
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const pollRes = await axios.get(pollUrl, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        timeout: 10000
      });
      prediction = pollRes.data;
    }

    if (prediction.status !== 'succeeded') {
      const errMsg = prediction.error || 'AI generation failed during model inference.';
      throw new Error(errMsg);
    }

    // Replicate output may be a URL string or an array of URLs
    const outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;

    if (!outputUrl) {
      throw new Error('No image was returned by the AI Try-On model.');
    }

    return {
      success: true,
      imageUrl: outputUrl,
      processingTimeMs: Date.now() - startTime,
      provider: 'replicate',
      metadata: {
        predictionId: prediction.id,
        metrics: prediction.metrics
      }
    };
  }
}
