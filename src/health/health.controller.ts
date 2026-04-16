import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { accessSync, constants, existsSync } from 'fs';
import { join } from 'path';

@Controller('health')
export class HealthController {
  @Get('ready')
  ready() {
    const uploadsDir = join(process.cwd(), 'uploads');
    const actsDir = join(uploadsDir, 'acts');

    const uploadsExists = existsSync(uploadsDir);
    const actsExists = existsSync(actsDir);

    if (!uploadsExists || !actsExists) {
      throw new ServiceUnavailableException({
        status: 'error',
        uploadsDir,
        actsDir,
        uploadsExists,
        actsExists,
        message: 'Uploads directories are not ready',
      });
    }

    accessSync(actsDir, constants.R_OK);

    return {
      status: 'ok',
      uploadsDir,
      actsDir,
      uploadsExists,
      actsExists,
    };
  }
}
