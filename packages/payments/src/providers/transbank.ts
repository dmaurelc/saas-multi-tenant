// Transbank Webpay Plus + Oneclick Payment Provider Implementation
import { WebpayPlus, Oneclick, Options, Environment } from 'transbank-sdk';
import crypto from 'crypto';
import type {
  PaymentProvider,
  CheckoutSession,
  CheckoutOptions,
  PlanId,
  WebhookEvent,
  WebhookResult,
  PaymentMethod,
  Subscription,
} from '../types.js';

interface TransbankConfig {
  commerceCode: string;
  apiKey: string;
  environment: 'TEST' | 'LIVE';
  oneclick?: {
    commerceCode: string;
    apiKey: string;
  };
}

// Types for Oneclick operations
export interface OneclickInscriptionStartResponse {
  token: string;
  urlWebpay: string;
}

export interface OneclickInscriptionFinishResponse {
  responseCode: number;
  tbkUser: string;
  authorizationCode: string;
  cardType: string;
  cardNumber: string;
}

export interface OneclickAuthorizeRequest {
  username: string;
  tbkUser: string;
  buyOrder: string;
  amount: number;
  commerceCode: string;
}

export class TransbankProvider implements PaymentProvider {
  name = 'transbank' as const;
  private webpayPlus: any;
  private oneclick?: any;
  private oneclickTransaction?: any;
  private environment: Environment;

  constructor(config: TransbankConfig) {
    // Configure Webpay Plus for one-time payments
    const webpayOptions = new Options(
      config.commerceCode,
      config.apiKey,
      config.environment === 'LIVE' ? Environment.Production : Environment.Integration
    );
    // WebpayPlus uses static methods with configured options
    this.webpayPlus = WebpayPlus;
    this.webpayPlus.configure(webpayOptions);
    this.environment =
      config.environment === 'LIVE' ? Environment.Production : Environment.Integration;

    // Initialize Oneclick if configured
    if (config.oneclick) {
      const oneclickOptions = new Options(
        config.oneclick.commerceCode,
        config.oneclick.apiKey,
        this.environment
      );
      // Oneclick uses static methods with configured options
      this.oneclick = Oneclick.MallInscription;
      this.oneclick.configure(oneclickOptions);
      this.oneclickTransaction = Oneclick.MallTransaction;
      this.oneclickTransaction.configure(oneclickOptions);
    }
  }

  async createCheckoutSession(
    planId: string,
    tenantId: string,
    options: CheckoutOptions
  ): Promise<CheckoutSession> {
    // Get amount from plan
    const amount = this.getPlanAmount(planId);

    // Generate unique session ID
    const sessionId = crypto.randomUUID();
    const buyOrder = `tenant-${tenantId}-${planId}-${Date.now()}`;

    try {
      // Create Webpay Plus transaction
      const response = await this.webpayPlus.create(
        buyOrder,
        sessionId,
        amount,
        options.successUrl,
        options.cancelUrl
      );

      return {
        sessionId: response.token,
        checkoutUrl: response.url,
        planId: planId as PlanId,
        provider: 'transbank',
      };
    } catch (error) {
      console.error('Error creating Transbank checkout:', error);
      throw new Error('Failed to create Transbank checkout session');
    }
  }

  async getSubscription(_providerSubscriptionId: string): Promise<Subscription | null> {
    // Transbank doesn't have subscriptions like Stripe
    // Each payment is a one-time transaction
    // For Oneclick, we store subscription references in our database
    return null;
  }

  async cancelSubscription(_providerSubscriptionId: string): Promise<void> {
    // For Oneclick, we can delete the inscription
    // This is handled via deleteOneclickInscription method
    throw new Error('Use deleteOneclickInscription to cancel Oneclick subscription');
  }

  async listPaymentMethods(_tenantId: string): Promise<PaymentMethod[]> {
    // For Webpay Plus, no payment methods are stored
    // For Oneclick, they should be fetched from the database
    return [];
  }

  async handleWebhook(event: WebhookEvent): Promise<WebhookResult> {
    try {
      const tbkEvent = event.data as any;

      // Transbank sends a POST to the return URL with transaction data
      // We need to acknowledge the transaction
      switch (event.eventType) {
        case 'transaction.completed':
          await this.handleTransactionCompleted(tbkEvent);
          break;

        case 'transaction.failed':
          await this.handleTransactionFailed(tbkEvent);
          break;

        default:
          console.log(`Unhandled Transbank event: ${event.eventType}`);
      }

      return { success: true, processed: true };
    } catch (error) {
      console.error('Error handling Transbank webhook:', error);
      return {
        success: false,
        processed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  verifyWebhookSignature(_rawPayload: string, _signature: string): boolean {
    // Transbank uses token-based verification, not HMAC signatures
    // The token is validated when calling commitTransaction
    return true;
  }

  async getPortalUrl(_tenantId: string): Promise<string> {
    // Transbank doesn't have a customer portal like Stripe
    return '';
  }

  // ============================================
  // ONECLICK SPECIFIC METHODS
  // ============================================

  /**
   * Start Oneclick inscription process
   * Initiates the card enrollment flow
   */
  async startOneclickInscription(
    username: string,
    email: string,
    responseUrl: string
  ): Promise<OneclickInscriptionStartResponse> {
    if (!this.oneclick) {
      throw new Error('Oneclick is not configured');
    }

    try {
      const response = await this.oneclick.start(username, email, responseUrl);
      return {
        token: response.token,
        urlWebpay: response.url_webpay,
      };
    } catch (error) {
      console.error('Error starting Oneclick inscription:', error);
      throw new Error('Failed to start Oneclick inscription');
    }
  }

  /**
   * Finish Oneclick inscription process
   * Called after user completes enrollment on Webpay page
   */
  async finishOneclickInscription(token: string): Promise<OneclickInscriptionFinishResponse> {
    if (!this.oneclick) {
      throw new Error('Oneclick is not configured');
    }

    try {
      const response = await this.oneclick.finish(token);
      return {
        responseCode: response.response_code,
        tbkUser: response.tbk_user,
        authorizationCode: response.authorization_code,
        cardType: response.card_type,
        cardNumber: response.card_number,
      };
    } catch (error) {
      console.error('Error finishing Oneclick inscription:', error);
      throw new Error('Failed to finish Oneclick inscription');
    }
  }

  /**
   * Delete Oneclick inscription
   * Removes the stored card for recurring payments
   */
  async deleteOneclickInscription(tbkUser: string, username: string): Promise<void> {
    if (!this.oneclick) {
      throw new Error('Oneclick is not configured');
    }

    try {
      await this.oneclick.delete(tbkUser, username);
    } catch (error) {
      console.error('Error deleting Oneclick inscription:', error);
      throw new Error('Failed to delete Oneclick inscription');
    }
  }

  /**
   * Authorize a recurring payment using Oneclick
   * Charges the enrolled card without user interaction
   */
  async authorizeOneclickPayment(request: OneclickAuthorizeRequest): Promise<{
    success: boolean;
    authorizationCode?: string;
    responseCode?: number;
    status?: string;
    transactionId?: string;
  }> {
    if (!this.oneclickTransaction) {
      throw new Error('Oneclick is not configured');
    }

    try {
      // Create transaction detail
      // Note: Oneclick Mall uses child commerce codes for different stores
      // For a simple implementation, we use the same commerce code
      const { TransactionDetail } = await import('transbank-sdk');

      const details = [
        new TransactionDetail(request.amount, request.commerceCode, `${request.buyOrder}-child`),
      ];

      const response = await this.oneclickTransaction.authorize(
        request.username,
        request.tbkUser,
        request.buyOrder,
        details
      );

      // Check if authorization was successful
      const detail = response.details?.[0];
      const success = detail?.response_code === 0;

      return {
        success,
        authorizationCode: detail?.authorization_code,
        responseCode: detail?.response_code,
        status: detail?.status,
        transactionId: response.buy_order,
      };
    } catch (error) {
      console.error('Error authorizing Oneclick payment:', error);
      throw new Error('Failed to authorize Oneclick payment');
    }
  }

  /**
   * Get status of an Oneclick transaction
   */
  async getOneclickTransactionStatus(buyOrder: string): Promise<{
    status: string;
    amount?: number;
    authorizationCode?: string;
  }> {
    if (!this.oneclickTransaction) {
      throw new Error('Oneclick is not configured');
    }

    try {
      const response = await this.oneclickTransaction.status(buyOrder);
      const detail = response.details?.[0];

      return {
        status: detail?.status || response.status,
        amount: detail?.amount,
        authorizationCode: detail?.authorization_code,
      };
    } catch (error) {
      console.error('Error getting Oneclick transaction status:', error);
      throw new Error('Failed to get Oneclick transaction status');
    }
  }

  /**
   * Refund an Oneclick transaction
   */
  async refundOneclickTransaction(
    buyOrder: string,
    childCommerceCode: string,
    childBuyOrder: string,
    amount: number
  ): Promise<void> {
    if (!this.oneclickTransaction) {
      throw new Error('Oneclick is not configured');
    }

    try {
      await this.oneclickTransaction.refund(buyOrder, childCommerceCode, childBuyOrder, amount);
    } catch (error) {
      console.error('Error refunding Oneclick transaction:', error);
      throw new Error('Failed to refund Oneclick transaction');
    }
  }

  // ============================================
  // WEBPAY PLUS METHODS (one-time payments)
  // ============================================

  /**
   * Confirm a Webpay Plus transaction after user returns
   */
  async confirmTransaction(token: string): Promise<{
    success: boolean;
    amount: number;
    status: string;
    buyOrder: string;
  }> {
    try {
      const response = await this.webpayPlus.commit(token);

      return {
        success: response.status === 'AUTHORIZED',
        amount: response.amount,
        status: response.status,
        buyOrder: response.buy_order,
      };
    } catch (error) {
      console.error('Error confirming Transbank transaction:', error);
      throw error;
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(token: string): Promise<{
    status: string;
    amount: number;
    buyOrder: string;
  }> {
    try {
      const response = await this.webpayPlus.status(token);

      return {
        status: response.status,
        amount: response.amount,
        buyOrder: response.buy_order,
      };
    } catch (error) {
      console.error('Error getting Transbank transaction status:', error);
      throw error;
    }
  }

  /**
   * Refund a Webpay Plus transaction
   */
  async refundTransaction(token: string, amount: number): Promise<void> {
    try {
      await this.webpayPlus.refund(token, amount);
    } catch (error) {
      console.error('Error refunding Transbank transaction:', error);
      throw error;
    }
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private getPlanAmount(planId: string): number {
    const prices: Record<string, number> = {
      PRO: 29000,
      BUSINESS: 79000,
      ENTERPRISE: 0, // Custom pricing
    };

    const amount = prices[planId];
    if (amount === undefined) {
      throw new Error(`No price configured for plan: ${planId}`);
    }

    return amount;
  }

  private async handleTransactionCompleted(transaction: any) {
    // In Transbank, after the user completes payment on the Webpay page,
    // they are redirected back with a token
    // We need to call commitTransaction to finalize

    const token = transaction.token;
    if (!token) {
      console.error('No token in Transbank transaction');
      return;
    }

    try {
      // Commit the transaction to get final status
      const response = await this.webpayPlus.commit(token);

      // Create payment record in database
      // This would be called via the API that imports this module
      console.log(`Transbank transaction completed:`, {
        token: response.token,
        amount: response.amount,
        status: response.status,
        buyOrder: response.buy_order,
      });

      // Parse buyOrder to get tenant and plan info
      // Format: tenant-{tenantId}-{planId}-{timestamp}
      const match = response.buy_order.match(/tenant-(.+?)-(.+?)-\d+/);
      if (match) {
        const [, tenantId, planId] = match;
        console.log(`Payment for tenant ${tenantId}, plan ${planId}`);
      }
    } catch (error) {
      console.error('Error committing Transbank transaction:', error);
    }
  }

  private async handleTransactionFailed(transaction: any) {
    console.log(`Transbank transaction failed:`, transaction);
  }
}

export default TransbankProvider;
