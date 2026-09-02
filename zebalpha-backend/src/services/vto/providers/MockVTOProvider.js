import { VirtualTryOnProvider } from './VirtualTryOnProvider.js';

export class MockVTOProvider extends VirtualTryOnProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'MockDevEngine';
  }

  async generateTryOn({ personImageBase64, garmentImageUrl, category = 'upper_body', productId }) {
    const startTime = Date.now();

    console.log('[VirtualTryOn][MockDevEngine] Processing VTO in Developer Simulation Mode...');
    console.log(`[VirtualTryOn][MockDevEngine] Product ID: ${productId}, Garment: ${garmentImageUrl?.slice(0, 60)}..., Category: ${category}`);
    console.log('[VirtualTryOn][MockDevEngine] TIP: To use a live AI model, set VIRTUAL_TRYON_PROVIDER=replicate (or fashn/fal) and VIRTUAL_TRYON_API_KEY in your .env');

    // Simulate realistic AI model neural inference delay (2.5 seconds)
    await new Promise((resolve) => setTimeout(resolve, 2500));

    // If person image is provided, return it with subtle high-contrast transformation or garment image
    const returnImage = garmentImageUrl || (personImageBase64.startsWith('data:') ? personImageBase64 : `data:image/jpeg;base64,${personImageBase64}`);

    return {
      success: true,
      imageUrl: returnImage,
      processingTimeMs: Date.now() - startTime,
      provider: 'mock-dev-engine',
      isDevelopmentMock: true,
      notice: 'Running on MockDevEngine. Configure VIRTUAL_TRYON_API_KEY with Replicate/Fashn/Fal in .env for production AI generation.'
    };
  }
}
