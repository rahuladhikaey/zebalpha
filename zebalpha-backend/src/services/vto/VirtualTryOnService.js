import { config } from '../../config/index.js';
import { ReplicateVTOProvider } from './providers/ReplicateVTOProvider.js';
import { FashnVTOProvider } from './providers/FashnVTOProvider.js';
import { FalVTOProvider } from './providers/FalVTOProvider.js';
import { MockVTOProvider } from './providers/MockVTOProvider.js';

class VirtualTryOnService {
  constructor() {
    this.providers = new Map();
    this.initProviders();
  }

  initProviders() {
    const vtoConfig = config.virtualTryOn || {};

    // Register all supported providers
    this.providers.set('replicate', new ReplicateVTOProvider(vtoConfig));
    this.providers.set('fashn', new FashnVTOProvider(vtoConfig));
    this.providers.set('fal', new FalVTOProvider(vtoConfig));
    this.providers.set('mock', new MockVTOProvider(vtoConfig));
  }

  /**
   * Returns active provider according to config or falls back to mock if no API key is present
   */
  getActiveProvider() {
    const configuredProvider = (config.virtualTryOn?.provider || 'mock').toLowerCase();
    const apiKey = config.virtualTryOn?.apiKey;

    // If a live provider is requested but no API key is provided, log warning and use mock provider
    if (configuredProvider !== 'mock' && !apiKey) {
      console.warn(`[VirtualTryOnService] Configured provider '${configuredProvider}' lacks VIRTUAL_TRYON_API_KEY. Falling back to MockDevEngine.`);
      return this.providers.get('mock');
    }

    const provider = this.providers.get(configuredProvider);
    if (!provider) {
      console.warn(`[VirtualTryOnService] Unknown provider '${configuredProvider}'. Using MockDevEngine.`);
      return this.providers.get('mock');
    }

    return provider;
  }

  /**
   * Main Virtual Try-On Execution Pipeline
   * Implements Privacy-First Ephemeral In-Memory Execution
   */
  async processVirtualTryOn({ personImage, garmentImage, category = 'upper_body', productId }) {
    let ephemeralPersonBuffer = personImage;

    try {
      // 1. Validation
      if (!ephemeralPersonBuffer) {
        throw new Error('Person image data is required.');
      }
      if (!garmentImage) {
        throw new Error('Garment product image URL is required.');
      }

      // 2. Select active provider
      const provider = this.getActiveProvider();
      console.log(`[VirtualTryOnService] Dispatching VTO generation using provider: ${provider.name} for product: ${productId}`);

      // 3. Execute AI generation
      const result = await provider.generateTryOn({
        personImageBase64: ephemeralPersonBuffer,
        garmentImageUrl: garmentImage,
        category,
        productId
      });

      return {
        ...result,
        productId,
        createdAt: new Date().toISOString()
      };
    } catch (err) {
      console.error('[VirtualTryOnService] Execution Error:', err.message);

      // Provide human-friendly error messages
      let friendlyMessage = 'Virtual Try-On is temporarily unavailable. Please try again.';
      if (err.message.includes('timed out')) {
        friendlyMessage = 'This is taking longer than expected. Please try again.';
      } else if (err.message.toLowerCase().includes('person') || err.message.toLowerCase().includes('face') || err.message.toLowerCase().includes('human')) {
        friendlyMessage = "We couldn't detect a person clearly. Please upload a clear photo showing your upper body.";
      } else if (err.message.toLowerCase().includes('multiple people')) {
        friendlyMessage = 'Please use a photo with only one person.';
      }

      const error = new Error(friendlyMessage);
      error.originalError = err.message;
      error.status = 502;
      throw error;
    } finally {
      // 4. Zero-Retention Memory Cleanup
      // Explicitly dereference ephemeral buffer to expedite Node.js V8 garbage collection
      ephemeralPersonBuffer = null;
    }
  }
}

export const virtualTryOnService = new VirtualTryOnService();
export default virtualTryOnService;
