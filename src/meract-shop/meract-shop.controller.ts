import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { MeractShopService } from './meract-shop.service';
import { AddProductDto } from './dto/add-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { RequestWithUser } from 'src/auth/interfaces/request-with-user.dto';
import { ApiBody, ApiConsumes, ApiOperation } from '@nestjs/swagger';

@Controller('meract-shop')
export class MeractShopController {
  constructor(private readonly meractShopService: MeractShopService) {}

  // ─── Products ─────────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Get all products' })
  @Get('find-all')
  async findAll() {
    return await this.meractShopService.findAll();
  }

  @ApiOperation({ summary: 'Add product (admin)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['price', 'currency', 'photo'],
      properties: {
        price: { type: 'number', format: 'float', example: 8.99 },
        currency: { type: 'number', format: 'float', example: 50 },
        oldPrice: { type: 'number', format: 'float', example: 9.99 },
        photo: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('photo'))
  @Post('add-product')
  async addProduct(
    @Body() dto: AddProductDto,
    @Req() req: RequestWithUser,
    @UploadedFile() photo: Express.Multer.File,
  ) {
    return await this.meractShopService.addProduct(req.user.sub, dto, photo);
  }

  @ApiOperation({ summary: 'Update product (admin)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        price: { type: 'number', format: 'float' },
        currency: { type: 'number', format: 'float' },
        oldPrice: { type: 'number', format: 'float' },
        photo: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('photo'))
  @Patch(':id')
  async updateProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
    @Req() req: RequestWithUser,
    @UploadedFile() photo?: Express.Multer.File,
  ) {
    return await this.meractShopService.updateProduct(
      id,
      req.user.sub,
      dto,
      photo,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteById(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestWithUser,
  ) {
    return await this.meractShopService.deleteProduct(id, req.user.sub);
  }

  // ─── Stripe ───────────────────────────────────────────────────────────────────

  @ApiOperation({
    summary: 'Create Stripe PaymentIntent for a product',
    description:
      'Returns clientSecret for Stripe.js. After payment confirmed on frontend, echo is credited via webhook.',
  })
  @UseGuards(JwtAuthGuard)
  @Post('buy/:productId')
  async createPaymentIntent(
    @Param('productId', ParseIntPipe) productId: number,
    @Req() req: RequestWithUser,
  ) {
    return await this.meractShopService.createPaymentIntent(
      productId,
      req.user.sub,
    );
  }

  @ApiOperation({
    summary: 'Stripe webhook — called by Stripe on payment success',
  })
  @Post('webhook')
  async stripeWebhook(@Req() req: any) {
    return await this.meractShopService.handleWebhook(req);
  }
}
