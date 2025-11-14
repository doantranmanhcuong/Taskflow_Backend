import { All, Body, Controller, Headers, Param, Req, Res } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /* ---------------- AUTH ---------------- */
  @All('auth/:path')
  async authRoute(@Param('path') path, @Req() req, @Res() res, @Body() body, @Headers() headers) {
    const result = await this.appService.forward('auth', req.method, `/auth/${path}`, body, headers);
    return res.json(result);
  }

  /* ---------------- USER ---------------- */
  @All('users/:path')
  async userRoute(@Param('path') path, @Req() req, @Res() res, @Body() body, @Headers() headers) {
    if (req.userId) headers['x-user-id'] = req.userId;
    const result = await this.appService.forward('users', req.method, `/users/${path}`, body, headers);
    return res.json(result);
  }

  /* ------------- TASK (1 segment) ------------- */
  @All('tasks/:p1')
  async task1(
    @Param('p1') p1: string,
    @Req() req,
    @Res() res,
    @Body() body,
    @Headers() headers,
  ) {
    console.log('[GATEWAY] TASK p1 =', p1);

    if (req.userId) headers['x-user-id'] = req.userId;

    const result = await this.appService.forward(
      'tasks',
      req.method,
      `/tasks/${p1}`,
      body,
      headers,
    );

    return res.json(result);
  }

  /* ------------- TASK (2 segments) ------------- */
  @All('tasks/:p1/:p2')
  async task2(
    @Param('p1') p1: string,
    @Param('p2') p2: string,
    @Req() req,
    @Res() res,
    @Body() body,
    @Headers() headers,
  ) {
    console.log('[GATEWAY] TASK p1 =', p1, ' p2 =', p2);

    if (req.userId) headers['x-user-id'] = req.userId;

    const path = `${p1}/${p2}`;

    const result = await this.appService.forward(
      'tasks',
      req.method,
      `/tasks/${path}`,
      body,
      headers,
    );

    return res.json(result);
  }
}
