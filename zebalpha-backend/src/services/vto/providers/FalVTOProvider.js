import axios from 'axios';
import { VirtualTryOnProvider } from './VirtualTryOnProvider.js';

export class FalVTOProvider extends VirtualTryOnProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'FalAI';
    this.apiKey = config.apiKey;
    this.modelId = config.modelId || 'fal-ai/idm-vton';
    this.timeoutMs = config.timeoutMs || 45000;
  }

  async generateTryOn({ personImageBase64, garmentImageUrl, category = 'upper_body', productId }) {
    const startTime = Date.now();
    if (!this.apiKey) {
      throw new Error('Fal.ai API key (VIRTUAL_TRYON_API_KEY) is not configured.');
    }

    const humanImg = personImageBase64.startsWith('data:')
      ? personImageBase64
      : `data:image/jpeg;base64,${personImageBase64}`;

    const requestBody = {
      human_image_url: humanImg,
      garment_image_url: garmentImageUrl,
      description: `Luxury ${category.replace('_', ' ')} apparel`,
      category: category === 'outerwear' ? 'upper_body' : category
    };

    const endpoint = `https://fal.run/${this.modelId}`;

    const res = await axios.post(endpoint, requestBody, {
      headers: {
        Authorization: `Key ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: this.timeoutMs
    });

    const outputImage = res.data?.image?.url || res.data?.images?.[0]?.url;
    if (!outputImage) {
      throw new Error('Fal.ai did not return a valid virtual try-on image result.');
    }

    return {
      success: true,
      imageUrl: outputImage,
      processingTimeMs: Date.now() - startTime,
      provider: 'fal',
      metadata: { seed: res.data?.seed }
    };
  }
}
