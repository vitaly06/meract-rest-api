import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { TransferMoneyDto } from './dto/transfer-money.dto';
import { RequestWithUser } from 'src/auth/interfaces/request-with-user.dto';

@Controller('payment')
@UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('transfer-money')
  async transferMoney(
    @Body() dto: TransferMoneyDto,
    @Req() req: RequestWithUser,
  ) {
    return await this.paymentService.transferMoney(req.user.sub, dto);
  }

  @Get('transactions')
  async getMyTransactions(@Req() req: RequestWithUser) {
    return await this.paymentService.getMyTransactions(req.user.sub);
  }

  @Get('transactions/:id')
  async getTransactionById(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ) {
    return await this.paymentService.getTransactionById(+id, req.user.sub);
  }
}
