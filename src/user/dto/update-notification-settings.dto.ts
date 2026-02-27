import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationSettingsDto {
  @ApiPropertyOptional({ description: 'Все уведомления' })
  @IsOptional()
  @IsBoolean()
  notifyAll?: boolean;

  @ApiPropertyOptional({ description: 'Прогресс ACT' })
  @IsOptional()
  @IsBoolean()
  notifyActProgress?: boolean;

  @ApiPropertyOptional({ description: 'Приглашение и одобрение гильдий' })
  @IsOptional()
  @IsBoolean()
  notifyGuildInvites?: boolean;

  @ApiPropertyOptional({ description: 'Упоминания в чатах' })
  @IsOptional()
  @IsBoolean()
  notifyChatMentions?: boolean;

  @ApiPropertyOptional({
    description: 'Обновления статуса ACT в реальном времени',
  })
  @IsOptional()
  @IsBoolean()
  notifyActStatusRealtime?: boolean;
}
