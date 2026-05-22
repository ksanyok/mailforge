import {
  Controller, Get, Param, Req, Res, Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Public } from '../../core/decorators/public.decorator';
import { TrackingService } from './tracking.service';

const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64',
);

@Controller('t')
export class TrackingController {
  private readonly logger = new Logger(TrackingController.name);

  constructor(private readonly trackingService: TrackingService) {}

  /** Open tracking pixel */
  @Public()
  @Get('o/:token')
  async trackOpen(
    @Param('token') token: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    res.set({
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    });
    res.send(TRANSPARENT_GIF);

    // Fire and forget
    this.trackingService
      .handleOpen(token, req.get('user-agent') ?? '', this.getClientIp(req))
      .catch((err) => this.logger.error(`Open tracking error: ${err.message}`));
  }

  /** Click tracking redirect */
  @Public()
  @Get('c/:token')
  async trackClick(
    @Param('token') token: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.trackingService.handleClick(
      token,
      req.get('user-agent') ?? '',
      this.getClientIp(req),
    ).catch((err) => {
      this.logger.error(`Click tracking error: ${err.message}`);
      return null;
    });

    if (result?.targetUrl) {
      return res.redirect(301, result.targetUrl);
    }
    return res.status(404).send('Link not found');
  }

  /** Unsubscribe page */
  @Public()
  @Get('u/:token')
  async unsubscribe(
    @Param('token') token: string,
    @Res() res: Response,
  ) {
    const result = await this.trackingService.handleUnsubscribe(token);

    const html = result?.success
      ? `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Unsubscribed</title>
<style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f9fafb;}
.card{background:#fff;border-radius:12px;padding:48px;text-align:center;max-width:400px;box-shadow:0 1px 3px rgba(0,0,0,.1);}
h2{color:#111;margin-bottom:8px;}p{color:#6b7280;}</style>
</head><body><div class="card"><h2>✅ You've been unsubscribed</h2>
<p>You won't receive any more emails from this sender.</p></div></body></html>`
      : `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Already unsubscribed</title>
<style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f9fafb;}
.card{background:#fff;border-radius:12px;padding:48px;text-align:center;max-width:400px;box-shadow:0 1px 3px rgba(0,0,0,.1);}</style>
</head><body><div class="card"><h2>You are already unsubscribed</h2></div></body></html>`;

    res.set('Content-Type', 'text/html');
    res.send(html);
  }

  private getClientIp(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.socket.remoteAddress ||
      ''
    );
  }
}
