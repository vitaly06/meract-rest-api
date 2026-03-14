import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  RawBodyRequest,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { S3Service } from 'src/s3/s3.service';
import { AddProductDto } from './dto/add-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import Stripe from 'stripe';
import { Request } from 'express';

@Injectable()
export class MeractShopService {
  private readonly stripe: Stripe;

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-02-25.clover',
    });
  }

  // ─── Admin: Add product ───────────────────────────────────────────────────────

  async addProduct(
    userId: number,
    dto: AddProductDto,
    photo: Express.Multer.File,
  ) {
    if (!(await this.checkRole(userId))) {
      throw new ForbiddenException('Insufficient rights');
    }

    const save: any = { ...dto };

    if (dto.oldPrice) {
      if (dto.oldPrice < dto.price) {
        throw new BadRequestException(
          'The old price must be higher than the new price.',
        );
      }
      save.discount = Number(
        (((dto.oldPrice - dto.price) / dto.oldPrice) * 100).toFixed(2),
      );
    }

    if (photo) {
      const s3Data = await this.s3Service.uploadFile(photo);
      save.imageUrl = s3Data?.url || null;
    }

    await this.prisma.shopProduct.create({ data: save });
    return { message: 'Product added successfully' };
  }

  // ─── Admin: Update product ────────────────────────────────────────────────────

  async updateProduct(
    id: number,
    userId: number,
    dto: UpdateProductDto,
    photo?: Express.Multer.File,
  ) {
    if (!(await this.checkRole(userId))) {
      throw new ForbiddenException('Insufficient rights');
    }

    const product = await this.prisma.shopProduct.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');

    const update: any = { ...dto };

    const newPrice = dto.price ?? product.price;
    const newOldPrice = dto.oldPrice ?? product.oldPrice;

    if (newOldPrice) {
      if (newOldPrice < newPrice) {
        throw new BadRequestException(
          'The old price must be higher than the new price.',
        );
      }
      update.discount = Number(
        (((newOldPrice - newPrice) / newOldPrice) * 100).toFixed(2),
      );
    } else {
      update.discount = null;
      update.oldPrice = null;
    }

    if (photo) {
      const s3Data = await this.s3Service.uploadFile(photo);
      update.imageUrl = s3Data?.url || null;
    }

    const updated = await this.prisma.shopProduct.update({
      where: { id },
      data: update,
    });
    return updated;
  }

  // ─── List ─────────────────────────────────────────────────────────────────────

  async findAll() {
    return await this.prisma.shopProduct.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Admin: Delete product ────────────────────────────────────────────────────

  async deleteProduct(id: number, userId: number) {
    if (!(await this.checkRole(userId))) {
      throw new ForbiddenException('Insufficient rights');
    }
    const product = await this.prisma.shopProduct.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');

    await this.prisma.shopProduct.delete({ where: { id } });
    return { message: 'The item has been successfully removed.' };
  }

  // ─── Stripe: create PaymentIntent ────────────────────────────────────────────

  async createPaymentIntent(productId: number, userId: number) {
    const product = await this.prisma.shopProduct.findUnique({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('Product not found');

    // price in dollars → cents
    const amountCents = Math.round(product.price * 100);

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      metadata: {
        userId: String(userId),
        productId: String(productId),
        echoAmount: String(product.currency),
      },
    });

    // Save pending record
    await this.prisma.stripePayment.create({
      data: {
        userId,
        productId,
        paymentIntentId: paymentIntent.id,
        amount: amountCents,
        currency: 'usd',
        status: 'pending',
        echoAwarded: product.currency,
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      amount: amountCents,
      currency: 'usd',
      echoAmount: product.currency,
    };
  }

  // ─── Stripe: webhook ─────────────────────────────────────────────────────────

  async handleWebhook(req: RawBodyRequest<Request>) {
    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: Stripe.Event;

    if (webhookSecret) {
      try {
        event = this.stripe.webhooks.constructEvent(
          req.rawBody,
          sig,
          webhookSecret,
        );
      } catch (err) {
        throw new BadRequestException(`Webhook error: ${err.message}`);
      }
    } else {
      // Dev mode without signing secret
      event = req.body as Stripe.Event;
    }

    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object as Stripe.PaymentIntent;
      await this.handlePaymentSucceeded(intent);
    }

    return { received: true };
  }

  private async handlePaymentSucceeded(intent: Stripe.PaymentIntent) {
    const payment = await this.prisma.stripePayment.findUnique({
      where: { paymentIntentId: intent.id },
    });

    if (!payment || payment.status === 'succeeded') return;

    await this.prisma.$transaction([
      // Mark payment as succeeded
      this.prisma.stripePayment.update({
        where: { paymentIntentId: intent.id },
        data: { status: 'succeeded' },
      }),
      // Add echo to user balance
      this.prisma.user.update({
        where: { id: payment.userId },
        data: { balance: { increment: payment.echoAwarded } },
      }),
      // Create transaction record
      this.prisma.transaction.create({
        data: {
          type: 'PURCHASE',
          amount: payment.echoAwarded,
          userId: payment.userId,
        },
      }),
    ]);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  private async checkRole(id: number): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
    if (!user) return false;
    return ['admin', 'main admin'].includes(user.role.name);
  }
}
