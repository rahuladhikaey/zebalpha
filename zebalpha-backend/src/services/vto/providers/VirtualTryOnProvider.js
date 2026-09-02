/**
 * Base Abstract Class for Virtual Try-On Providers
 * All third-party AI integrations must inherit and implement generateTryOn()
 */
export class VirtualTryOnProvider {
  constructor(config = {}) {
    this.name = 'BaseProvider';
    this.config = config;
  }

  /**
   * Generates a virtual try-on image
   * @param {Object} params
   * @param {string} params.personImageBase64 - Base64 Data URI or buffer representation of the person
   * @param {string} params.garmentImageUrl - URL of the garment image
   * @param {string} [params.category='upper_body'] - 'upper_body' | 'lower_body' | 'dresses' | 'outerwear'
   * @param {string|number} [params.productId] - Product ID
   * @param {Object} [params.options] - Custom options per provider
   * @returns {Promise<{ success: boolean, imageUrl: string, processingTimeMs: number, provider: string, metadata?: any }>}
   */
  async generateTryOn(params) {
    throw new Error(`generateTryOn() not implemented on ${this.constructor.name}`);
  }
}
